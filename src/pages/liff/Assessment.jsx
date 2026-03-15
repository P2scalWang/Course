import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { liffService } from '../../services/liffService';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Send from 'lucide-react/dist/esm/icons/send';
import Check from 'lucide-react/dist/esm/icons/check';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Lock from 'lucide-react/dist/esm/icons/lock';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Edit3 from 'lucide-react/dist/esm/icons/edit-3';
import clsx from 'clsx';
import SystemModal from '../../components/SystemModal';

const WEEKS = ['pre', 0, 2, 4, 6, 8];

const LiffAssessment = () => {
    const { courseId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    const [course, setCourse] = useState(null);
    const [formTemplate, setFormTemplate] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [submittedWeeks, setSubmittedWeeks] = useState([]);
    const [submittedResponseDocs, setSubmittedResponseDocs] = useState({}); // week -> { docId, responses }
    const [isEditMode, setIsEditMode] = useState(false); // true when editing a submitted response

    // Section navigation
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    // Derived: is the form section-based?
    const hasSections = formTemplate?.sections && formTemplate.sections.length > 0;
    const totalSections = hasSections ? formTemplate.sections.length : 1;

    // For section-based forms, get the current section's questions
    const currentSectionQuestions = hasSections
        ? formTemplate.sections[currentSectionIndex]?.questions || []
        : formTemplate?.questions || [];

    // All questions flat (for progress and answer index mapping)
    const allQuestions = hasSections
        ? formTemplate.sections.flatMap(s => s.questions)
        : formTemplate?.questions || [];

    const completedCount = Object.keys(answers).length;
    const totalCount = allQuestions.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Get the global question index offset for the current section
    const getGlobalIndexOffset = (sectionIdx) => {
        if (!hasSections) return 0;
        let offset = 0;
        for (let i = 0; i < sectionIdx; i++) {
            offset += formTemplate.sections[i].questions.length;
        }
        return offset;
    };

    // Check if all questions in current section are answered
    const isSectionComplete = () => {
        const offset = getGlobalIndexOffset(currentSectionIndex);
        for (let i = 0; i < currentSectionQuestions.length; i++) {
            const answer = answers[offset + i];
            if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
                return false;
            }
        }
        return currentSectionQuestions.length > 0;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [profile, courseDoc] = await Promise.all([
                    liffService.init().then(() => liffService.getProfile()),
                    getDoc(doc(db, 'courses', courseId))
                ]);

                setUserId(profile?.userId || 'anonymous');

                if (!courseDoc.exists()) {
                    setLoading(false);
                    return;
                }
                const courseData = { id: courseDoc.id, ...courseDoc.data() };
                setCourse(courseData);

                const responsesQuery = query(
                    collection(db, 'responses'),
                    where('courseId', '==', courseId),
                    where('userId', '==', profile?.userId || 'anonymous')
                );
                const responsesSnap = await getDocs(responsesQuery);
                const submitted = responsesSnap.docs.map(d => d.data().week);
                setSubmittedWeeks(submitted);

                // Store doc IDs and responses for editing
                const responseDocsMap = {};
                responsesSnap.docs.forEach(d => {
                    const data = d.data();
                    responseDocsMap[data.week] = { docId: d.id, responses: data.responses || [] };
                });
                setSubmittedResponseDocs(responseDocsMap);

                const today = new Date().toISOString().split('T')[0];
                const available = WEEKS.filter(week => {
                    const formId = courseData.weekForms?.[week];
                    if (week === 'pre') return !!formId;
                    const weekDate = courseData.weekDates?.[week];
                    return formId && weekDate && weekDate <= today;
                });
                setAvailableWeeks(available);

                const weekParam = searchParams.get('week');
                if (weekParam !== null) {
                    const weekNum = parseInt(weekParam);
                    if (available.includes(weekNum) && !submitted.includes(weekNum)) {
                        await loadFormForWeek(courseData, weekNum);
                        setSelectedWeek(weekNum);
                    }
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [courseId, searchParams]);

    const loadFormForWeek = async (courseData, week) => {
        const formId = courseData.weekForms?.[week];
        if (formId) {
            const formDoc = await getDoc(doc(db, 'formTemplates', formId));
            if (formDoc.exists()) {
                setFormTemplate({ id: formDoc.id, ...formDoc.data() });
                setAnswers({});
                setCurrentSectionIndex(0);
            }
        }
    };

    const handleWeekSelect = async (week) => {
        setLoading(true);
        await loadFormForWeek(course, week);
        setSelectedWeek(week);

        // If already submitted, pre-populate answers for viewing/editing
        if (submittedWeeks.includes(week) && submittedResponseDocs[week]) {
            const existingResponses = submittedResponseDocs[week].responses;
            const answersMap = {};
            existingResponses.forEach((answer, idx) => {
                if (answer !== null && answer !== undefined && answer !== '') {
                    answersMap[idx] = answer;
                }
            });
            setAnswers(answersMap);
            setIsEditMode(true);
        } else {
            setIsEditMode(false);
        }
        setLoading(false);
    };

    const handleInputChange = (index, value) => {
        setAnswers(prev => ({
            ...prev,
            [index]: value
        }));
    };

    const handleNextSection = () => {
        if (currentSectionIndex < totalSections - 1) {
            setCurrentSectionIndex(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevSection = () => {
        if (currentSectionIndex > 0) {
            setCurrentSectionIndex(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formTemplate || selectedWeek === null) return;

        setSubmitting(true);
        try {
            const responsesArray = allQuestions.map((_, index) => {
                const answer = answers[index];
                return Array.isArray(answer) ? answer.join(', ') : (answer || '');
            });

            if (isEditMode && submittedResponseDocs[selectedWeek]?.docId) {
                // Update existing response
                await updateDoc(doc(db, 'responses', submittedResponseDocs[selectedWeek].docId), {
                    responses: responsesArray,
                    updatedAt: new Date()
                });
            } else {
                // Create new response
                await addDoc(collection(db, 'responses'), {
                    courseId: courseId,
                    formTemplateId: formTemplate.id,
                    userId: userId,
                    week: selectedWeek,
                    responses: responsesArray,
                    submittedAt: new Date()
                });
            }

            setModalConfig({
                isOpen: true,
                title: isEditMode ? 'แก้ไขข้อมูลสำเร็จ!' : 'บันทึกข้อมูลสำเร็จ!',
                message: isEditMode ? 'แก้ไขคำตอบของคุณเรียบร้อยแล้ว' : 'ขอบคุณสำหรับการประเมิน ความคิดเห็นของคุณมีค่าสำหรับเรา',
                type: 'success',
                onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    if (!isEditMode) {
                        setSubmittedWeeks([...submittedWeeks, selectedWeek]);
                    }
                    // Update stored response data
                    setSubmittedResponseDocs(prev => ({
                        ...prev,
                        [selectedWeek]: { ...prev[selectedWeek], responses: responsesArray }
                    }));
                    setSelectedWeek(null);
                    setFormTemplate(null);
                    setAnswers({});
                    setCurrentSectionIndex(0);
                    setIsEditMode(false);
                }
            });
        } catch (error) {
            console.error("Submission Error:", error);
            setModalConfig({
                isOpen: true,
                title: 'เกิดข้อผิดพลาด',
                message: `ไม่สามารถส่งแบบประเมินได้: ${error.message}`,
                type: 'error',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    // ==========================================
    // RENDER: Week Selection Timeline
    // ==========================================
    if (selectedWeek === null) {
        return (
            <div className="min-h-screen bg-slate-50 relative pb-10">
                {/* Header */}
                <div className="bg-white sticky top-0 z-20 pb-4 pt-12 px-6 shadow-sm border-b border-slate-100 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center -ml-2 transition-colors">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Assessment</p>
                        <h1 className="text-lg font-bold text-slate-800 truncate">{course?.title}</h1>
                    </div>
                </div>

                <div className="px-6 py-8">
                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-8 py-2">
                        {WEEKS.map((week, index) => {
                            const isAvailable = availableWeeks.includes(week);
                            const isSubmitted = submittedWeeks.includes(week);
                            const weekDate = course?.weekDates?.[week];

                            return (
                                <div key={week} className="relative">
                                    {/* Timeline Dot */}
                                    <div className={clsx(
                                        "absolute -left-[41px] w-5 h-5 rounded-full border-4 transition-all z-10",
                                        isSubmitted ? "bg-white border-emerald-500" :
                                            isAvailable ? "bg-white border-indigo-600 shadow-[0_0_0_4px_rgba(79,70,229,0.2)]" :
                                                "bg-slate-100 border-slate-300"
                                    )}></div>

                                    <div
                                        onClick={() => isAvailable && handleWeekSelect(week)}
                                        className={clsx(
                                            "rounded-2xl p-5 border-2 transition-all relative overflow-hidden group",
                                            isSubmitted
                                                ? "bg-emerald-50/50 border-emerald-100 cursor-pointer hover:border-emerald-300 active:scale-[0.98]"
                                                : isAvailable
                                                    ? "bg-white border-indigo-100 shadow-lg shadow-indigo-100/50 hover:border-indigo-300 cursor-pointer active:scale-[0.98]"
                                                    : "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={clsx(
                                                "font-black text-3xl",
                                                isSubmitted ? "text-emerald-200" : isAvailable ? "text-indigo-100 group-hover:text-indigo-200" : "text-slate-200"
                                            )}>
                                                {week === 'pre' ? 'Pre' : `W${week}`}
                                            </span>
                                            {isSubmitted ? (
                                                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                                    <Check size={16} strokeWidth={3} />
                                                </div>
                                            ) : isAvailable ? (
                                                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                                                    <FileText size={16} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                                                    <Lock size={16} />
                                                </div>
                                            )}
                                        </div>

                                        <h3 className={clsx(
                                            "font-bold text-lg mb-1",
                                            isSubmitted ? "text-emerald-800" : isAvailable ? "text-slate-800" : "text-slate-400"
                                        )}>
                                            {week === 'pre' ? 'แบบประเมิน Pre-training' : week === 0 ? 'Action Commitment' : `Week ${week} Follow up`}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                            <Calendar size={14} />
                                            {weekDate ? new Date(weekDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'ยังไม่กำหนดวัน'}
                                        </div>

                                        {isSubmitted ? (
                                            <div className="mt-4 flex items-center text-emerald-600 text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                                                ดูคำตอบ / แก้ไข <ChevronRight size={14} />
                                            </div>
                                        ) : isAvailable && (
                                            <div className="mt-4 flex items-center text-indigo-600 text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                                                เริ่มทำแบบประเมิน <ChevronRight size={14} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: Form View with Section Navigation
    // ==========================================
    const isLastSection = currentSectionIndex === totalSections - 1;
    const isFirstSection = currentSectionIndex === 0;
    const currentSection = hasSections ? formTemplate.sections[currentSectionIndex] : null;
    const globalOffset = getGlobalIndexOffset(currentSectionIndex);

    return (
        <div className="min-h-screen bg-white">
            {/* Minimal Header */}
            <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-30 px-6 py-4 pt-12 border-b border-slate-100">
                <div className="flex items-center gap-4 mb-3">
                    <button
                        onClick={() => {
                            if (!isFirstSection) {
                                handlePrevSection();
                            } else {
                                setSelectedWeek(null);
                                setCurrentSectionIndex(0);
                            }
                        }}
                        className="flex items-center gap-1 text-slate-500 font-medium hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        {isFirstSection ? 'ก่อนหน้า' : 'Section ก่อนหน้า'}
                    </button>
                    <div className="flex-1 text-right">
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                            {selectedWeek === 'pre' ? 'Pre-training' : selectedWeek === 0 ? 'Action Commitment' : `Week ${selectedWeek} Follow up`}
                        </span>
                    </div>
                </div>

                {/* Section Step Indicator */}
                {hasSections && totalSections > 1 && (
                    <div className="flex items-center gap-1.5 mb-3">
                        {formTemplate.sections.map((s, idx) => (
                            <div
                                key={idx}
                                className={clsx(
                                    "h-1.5 rounded-full transition-all duration-300 flex-1",
                                    idx < currentSectionIndex ? "bg-indigo-600" :
                                        idx === currentSectionIndex ? "bg-indigo-600" :
                                            "bg-slate-200"
                                )}
                            />
                        ))}
                    </div>
                )}

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Questions Form */}
            <div className={clsx("pb-40 px-6 max-w-lg mx-auto", hasSections && totalSections > 1 ? "pt-40" : "pt-32")}>
                {/* Section Header */}
                {hasSections && currentSection && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {currentSectionIndex + 1} / {totalSections}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{currentSection.title}</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {currentSectionQuestions.length} ข้อ
                        </p>
                    </div>
                )}

                {/* Form title only on first section or non-section forms */}
                {(!hasSections || isFirstSection) && (
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">{formTemplate.name}</h1>
                        {!hasSections && <p className="text-slate-500">ตอบคำถาม {allQuestions.length} ข้อ</p>}
                    </div>
                )}

                {/* Edit Mode Banner */}
                {isEditMode && isFirstSection && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Edit3 size={16} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="font-bold text-amber-800 text-sm">กำลังแก้ไขคำตอบ</p>
                            <p className="text-xs text-amber-600">คุณสามารถแก้ไขคำตอบแล้วกดบันทึกใหม่ได้</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {currentSectionQuestions.map((q, localIndex) => {
                        const globalIndex = globalOffset + localIndex;
                        return (
                            <div key={globalIndex} className="space-y-4 animate-fade-in-up" style={{ animationDelay: `${localIndex * 100}ms` }}>
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                                        {globalIndex + 1}
                                    </span>
                                    <div className="pt-1">
                                        <label className="font-bold text-slate-800 text-lg">
                                            {q.text?.split('\n')[0]}
                                        </label>
                                        {q.text?.includes('\n') && (
                                            <p className="text-sm text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                                                {q.text.split('\n').slice(1).join('\n')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="pl-11">
                                    {q.type === 'short' && (
                                        <textarea
                                            required
                                            rows={3}
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium resize-none"
                                            placeholder="พิมพ์คำตอบของคุณที่นี่..."
                                            value={answers[globalIndex] || ''}
                                            onChange={e => handleInputChange(globalIndex, e.target.value)}
                                        />
                                    )}

                                    {q.type === 'yesno' && (
                                        <div className="flex gap-3">
                                            {['Yes', 'No'].map(opt => (
                                                <label key={opt} className="flex-1 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name={`q-${globalIndex}`}
                                                        value={opt}
                                                        className="peer sr-only"
                                                        checked={answers[globalIndex] === opt}
                                                        onChange={e => handleInputChange(globalIndex, e.target.value)}
                                                        required
                                                    />
                                                    <div className="py-3 px-4 rounded-xl border-2 border-slate-100 bg-white text-center font-bold text-slate-500 transition-all peer-checked:border-indigo-600 peer-checked:text-indigo-600 peer-checked:bg-indigo-50 peer-checked:shadow-inner group-active:scale-95">
                                                        {opt === 'Yes' ? 'ใช่ / เห็นด้วย' : 'ไม่ใช่ / ไม่เห็นด้วย'}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'rating' && (
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                            {[1, 2, 3, 4, 5].map(rating => (
                                                <label key={rating} className="cursor-pointer group relative">
                                                    <input
                                                        type="radio"
                                                        name={`q-${globalIndex}`}
                                                        value={rating}
                                                        className="peer sr-only"
                                                        checked={answers[globalIndex] === String(rating)}
                                                        onChange={e => handleInputChange(globalIndex, e.target.value)}
                                                        required
                                                    />
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-400 transition-all peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:shadow-lg peer-checked:scale-110 group-hover:bg-white group-hover:shadow-sm">
                                                        {rating}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'checkbox' && (
                                        <div className="space-y-2">
                                            {(q.options || []).map((opt, optIndex) => (
                                                <label key={optIndex} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white hover:border-indigo-200 transition-all group">
                                                    <input
                                                        type="checkbox"
                                                        value={opt}
                                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={Array.isArray(answers[globalIndex]) && answers[globalIndex].includes(opt)}
                                                        onChange={e => {
                                                            const rawCurrent = answers[globalIndex];
                                                            const current = Array.isArray(rawCurrent) ? rawCurrent : (rawCurrent ? [rawCurrent] : []);

                                                            const newValue = e.target.checked
                                                                ? [...current, opt]
                                                                : current.filter(v => v !== opt);
                                                            handleInputChange(globalIndex, newValue);
                                                        }}
                                                    />
                                                    <span className="font-medium text-slate-700 group-hover:text-indigo-700">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'multiple_choice' && (
                                        <div className="space-y-2">
                                            {(q.options || []).map((opt, optIndex) => (
                                                <label key={optIndex} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white hover:border-indigo-200 transition-all group">
                                                    <input
                                                        type="radio"
                                                        name={`q-${globalIndex}`}
                                                        value={opt}
                                                        className="w-5 h-5 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={answers[globalIndex] === opt}
                                                        onChange={e => handleInputChange(globalIndex, e.target.value)}
                                                        required
                                                    />
                                                    <span className="font-medium text-slate-700 group-hover:text-indigo-700">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </form>
            </div>

            {/* Sticky Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 pb-safe z-40">
                {hasSections && totalSections > 1 ? (
                    <div className="space-y-3">
                        {/* Section Navigation */}
                        <div className="flex gap-3">
                            {!isFirstSection && (
                                <button
                                    onClick={handlePrevSection}
                                    className="flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
                                >
                                    <ArrowLeft size={18} />
                                    ก่อนหน้า
                                </button>
                            )}
                            {!isLastSection ? (
                                <button
                                    onClick={handleNextSection}
                                    className={clsx(
                                        "flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95",
                                        "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
                                    )}
                                >
                                    ถัดไป
                                    <ArrowRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || progress < 100}
                                    className={clsx(
                                        "flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl",
                                        progress === 100
                                            ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-95"
                                            : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                                    )}
                                >
                                    {submitting ? 'กำลังบันทึก...' : (isEditMode ? 'บันทึกการแก้ไข' : 'ส่งแบบประเมิน')}
                                    {!submitting && <Send size={18} />}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Single section / legacy form - submit button */
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || progress < 100}
                        className={clsx(
                            "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl",
                            progress === 100
                                ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-95"
                                : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                        )}
                    >
                        {submitting ? 'กำลังบันทึก...' : (isEditMode ? 'บันทึกการแก้ไข' : 'ส่งแบบประเมิน')}
                        {!submitting && <Send size={20} />}
                    </button>
                )}
            </div>
            {/* System Modal */}
            <SystemModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm}
                confirmText={modalConfig.confirmText}
            />
        </div>
    );
};

export default LiffAssessment;
