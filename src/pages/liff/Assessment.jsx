import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { liffService } from '../../services/liffService';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Send from 'lucide-react/dist/esm/icons/send';
import Check from 'lucide-react/dist/esm/icons/check';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Lock from 'lucide-react/dist/esm/icons/lock';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import clsx from 'clsx';
import SystemModal from '../../components/SystemModal';

const WEEKS = [0, 2, 4, 6, 8];

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

    const completedCount = Object.keys(answers).length;
    const totalCount = formTemplate?.questions?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    useEffect(() => {
        const loadData = async () => {
            try {
                // async-parallel: Fetch LIFF profile and Course data in parallel
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

                const today = new Date().toISOString().split('T')[0];
                const available = WEEKS.filter(week => {
                    const formId = courseData.weekForms?.[week];
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
            }
        }
    };

    const handleWeekSelect = async (week) => {
        if (submittedWeeks.includes(week)) return;
        setLoading(true);
        await loadFormForWeek(course, week);
        setSelectedWeek(week);
        setLoading(false);
    };

    const handleInputChange = (index, value) => {
        setAnswers(prev => ({
            ...prev,
            [index]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formTemplate || selectedWeek === null) return;

        setSubmitting(true);
        try {
            const responsesArray = formTemplate.questions.map((_, index) => {
                const answer = answers[index];
                return Array.isArray(answer) ? answer.join(', ') : (answer || '');
            });
            await addDoc(collection(db, 'responses'), {
                courseId: courseId,
                formTemplateId: formTemplate.id,
                userId: userId,
                week: selectedWeek,
                responses: responsesArray,
                submittedAt: new Date()
            });
            // Success Modal
            setModalConfig({
                isOpen: true,
                title: 'บันทึกข้อมูลสำเร็จ!',
                message: 'ขอบคุณสำหรับการประเมิน ความคิดเห็นของคุณมีค่าสำหรับเรา',
                type: 'success',
                onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    // Logic to reset form (moved from below)
                    setSubmittedWeeks([...submittedWeeks, selectedWeek]);
                    setSelectedWeek(null);
                    setFormTemplate(null);
                    setAnswers({});
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
                            // const hasForm = course?.weekForms?.[week];

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
                                        onClick={() => isAvailable && !isSubmitted && handleWeekSelect(week)}
                                        className={clsx(
                                            "rounded-2xl p-5 border-2 transition-all relative overflow-hidden group",
                                            isSubmitted
                                                ? "bg-emerald-50/50 border-emerald-100 cursor-default"
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
                                                W{week}
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
                                            {week === 0 ? 'แบบประเมินก่อนเรียน' : `แบบประเมินสัปดาห์ที่ ${week}`}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                            <Calendar size={14} />
                                            {weekDate ? new Date(weekDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'ยังไม่กำหนดวัน'}
                                        </div>

                                        {isAvailable && !isSubmitted && (
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
    // RENDER: Form View (Distraction Free)
    // ==========================================
    return (
        <div className="min-h-screen bg-white">
            {/* Minimal Header */}
            <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-30 px-6 py-4 pt-12 border-b border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => setSelectedWeek(null)} className="flex items-center gap-1 text-slate-500 font-medium hover:text-slate-800 transition-colors">
                        <ArrowLeft size={20} />
                        ก่อนหน้า
                    </button>
                    <div className="flex-1 text-right">
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                            Week {selectedWeek}
                        </span>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Questions Form */}
            <div className="pt-32 pb-40 px-6 max-w-lg mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">{formTemplate.name}</h1>
                    <p className="text-slate-500">ตอบคำถาม {formTemplate.questions.length} ข้อ</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {formTemplate.questions.map((q, index) => (
                        <div key={index} className="space-y-4 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                                    {index + 1}
                                </span>
                                <label className="font-bold text-slate-800 text-lg pt-1">
                                    {q.text}
                                </label>
                            </div>

                            <div className="pl-11">
                                {q.type === 'short' && (
                                    <textarea
                                        required
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium resize-none"
                                        placeholder="พิมพ์คำตอบของคุณที่นี่..."
                                        onChange={e => handleInputChange(index, e.target.value)}
                                    />
                                )}

                                {q.type === 'yesno' && (
                                    <div className="flex gap-3">
                                        {['Yes', 'No'].map(opt => (
                                            <label key={opt} className="flex-1 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name={`q-${index}`}
                                                    value={opt}
                                                    className="peer sr-only"
                                                    onChange={e => handleInputChange(index, e.target.value)}
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
                                                    name={`q-${index}`}
                                                    value={rating}
                                                    className="peer sr-only"
                                                    onChange={e => handleInputChange(index, e.target.value)}
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
                                                    onChange={e => {
                                                        const rawCurrent = answers[index];
                                                        const current = Array.isArray(rawCurrent) ? rawCurrent : (rawCurrent ? [rawCurrent] : []);

                                                        const newValue = e.target.checked
                                                            ? [...current, opt]
                                                            : current.filter(v => v !== opt);
                                                        handleInputChange(index, newValue);
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
                                                    name={`q-${index}`}
                                                    value={opt}
                                                    className="w-5 h-5 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    onChange={e => handleInputChange(index, e.target.value)}
                                                    required
                                                />
                                                <span className="font-medium text-slate-700 group-hover:text-indigo-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </form>
            </div>

            {/* Sticky Submit Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 pb-safe z-40">
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
                    {submitting ? 'กำลังส่งคำตอบ...' : 'ส่งแบบประเมิน'}
                    {!submitting && <Send size={20} />}
                </button>
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
