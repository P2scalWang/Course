import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Table from 'lucide-react/dist/esm/icons/table';
import X from 'lucide-react/dist/esm/icons/x';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Search from 'lucide-react/dist/esm/icons/search';
import Download from 'lucide-react/dist/esm/icons/download';
import Eye from 'lucide-react/dist/esm/icons/eye';
import clsx from 'clsx';

const ResponseTable = () => {
    const [responses, setResponses] = useState([]);
    const [courses, setCourses] = useState([]);
    const [formTemplates, setFormTemplates] = useState({});
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);

    // Selectors
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('');

    // Modal for long text
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ question: '', answer: '' });

    // Course dropdown open state
    const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
    const [weekDropdownOpen, setWeekDropdownOpen] = useState(false);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            // Parallelize concurrent independent fetches
            const [responsesSnap, coursesSnap, formsSnap, usersSnap] = await Promise.all([
                getDocs(query(collection(db, 'responses'), orderBy('submittedAt', 'desc'))),
                getDocs(collection(db, 'courses')),
                getDocs(collection(db, 'formTemplates')),
                getDocs(collection(db, 'users'))
            ]);

            // Process Responses
            const responsesData = responsesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().submittedAt?.toDate?.() || new Date(),
                week: doc.data().week !== undefined ? doc.data().week : 0
            }));
            setResponses(responsesData);

            // Process Courses
            const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(coursesData);

            // Process Forms
            const formsMap = {};
            formsSnap.docs.forEach(doc => {
                formsMap[doc.id] = { name: doc.data().name, questions: doc.data().questions || [] };
            });
            setFormTemplates(formsMap);

            // Process Users
            const usersMap = {};
            usersSnap.docs.forEach(doc => {
                usersMap[doc.id] = doc.data();
            });
            setUsers(usersMap);

        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helpers
    const getCourseName = (courseId) => courses.find(c => c.id === courseId)?.title || 'Unknown Course';
    const getSelectedCourse = (courseId) => courses.find(c => c.id === courseId);

    // Get questions for a specific week of a course
    const getQuestionsForWeek = (courseId, week) => {
        const course = getSelectedCourse(courseId);
        const formId = course?.weekForms?.[week];
        return formTemplates[formId]?.questions || [];
    };

    // Get available weeks for selected course
    const getAvailableWeeks = () => {
        if (!selectedCourseId) return [];
        const courseResponses = responses.filter(r => r.courseId === selectedCourseId);
        return [...new Set(courseResponses.map(r => r.week))].sort((a, b) => a - b);
    };

    // Get filtered responses
    const getFilteredResponses = () => {
        return responses.filter(r => {
            if (selectedCourseId && r.courseId !== selectedCourseId) return false;
            if (selectedWeek !== '' && r.week !== parseInt(selectedWeek)) return false;
            return true;
        });
    };

    // Truncate text
    const truncateText = (text, maxLength = 50) => {
        if (text === null || text === undefined) return '-';
        const str = String(text);
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    };

    // Open modal for long text
    const handleReadMore = (question, answer) => {
        setModalContent({ question, answer });
        setModalOpen(true);
    };

    const availableWeeks = getAvailableWeeks();
    const filteredResponses = getFilteredResponses();
    const questions = selectedCourseId && selectedWeek !== '' ? getQuestionsForWeek(selectedCourseId, parseInt(selectedWeek)) : [];

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-400">
                <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p>Loading data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Table className="text-indigo-600" size={28} />
                        Response Table
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">View all responses in spreadsheet format</p>
                </div>
            </div>

            {/* Selectors */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    {/* Course Selector */}
                    <div className="relative min-w-[250px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Select Course</label>
                        <button
                            onClick={() => { setCourseDropdownOpen(!courseDropdownOpen); setWeekDropdownOpen(false); }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-white hover:border-indigo-300 transition-all"
                        >
                            <span className="truncate">
                                {selectedCourseId ? getCourseName(selectedCourseId) : 'Choose a course...'}
                            </span>
                            <ChevronDown size={16} className={clsx("transition-transform", courseDropdownOpen && "rotate-180")} />
                        </button>
                        {courseDropdownOpen && (
                            <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                {courses.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">No courses found</div>
                                ) : (
                                    courses.map(course => (
                                        <button
                                            key={course.id}
                                            onClick={() => {
                                                setSelectedCourseId(course.id);
                                                setSelectedWeek('');
                                                setCourseDropdownOpen(false);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0",
                                                selectedCourseId === course.id && "bg-indigo-50 text-indigo-700 font-medium"
                                            )}
                                        >
                                            <div className="font-medium">{course.title}</div>
                                            <div className="text-xs text-slate-400 mt-0.5 truncate">{course.description || 'No description'}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Week Selector */}
                    <div className="relative min-w-[150px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Select Week</label>
                        <button
                            onClick={() => { setWeekDropdownOpen(!weekDropdownOpen); setCourseDropdownOpen(false); }}
                            disabled={!selectedCourseId}
                            className={clsx(
                                "w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all",
                                selectedCourseId
                                    ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-indigo-300"
                                    : "bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed"
                            )}
                        >
                            <span>{selectedWeek !== '' ? (selectedWeek === 'pre' ? 'Pre-training' : parseInt(selectedWeek) === 0 ? 'Action Commitment' : `Week ${selectedWeek} Follow up`) : 'Choose week...'}</span>
                            <ChevronDown size={16} className={clsx("transition-transform", weekDropdownOpen && "rotate-180")} />
                        </button>
                        {weekDropdownOpen && selectedCourseId && (
                            <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                {availableWeeks.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">No responses yet</div>
                                ) : (
                                    availableWeeks.map(week => (
                                        <button
                                            key={week}
                                            onClick={() => {
                                                setSelectedWeek(week.toString());
                                                setWeekDropdownOpen(false);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0",
                                                selectedWeek === week.toString() && "bg-indigo-50 text-indigo-700 font-medium"
                                            )}
                                        >
                                            {week === 'pre' ? 'Pre-training' : week === 0 ? 'Action Commitment' : `Week ${week} Follow up`}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    {selectedCourseId && selectedWeek !== '' && (
                        <div className="flex items-end gap-4 ml-auto">
                            <div className="text-right">
                                <div className="text-xs text-slate-400">Total Responses</div>
                                <div className="text-lg font-bold text-indigo-600">{filteredResponses.length}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400">Questions</div>
                                <div className="text-lg font-bold text-slate-700">{questions.length}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Instruction or Table */}
            {!selectedCourseId || selectedWeek === '' ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                        <FileText size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Select Course & Week</h3>
                    <p className="text-slate-400 mt-2 max-w-md mx-auto">
                        Please select a course and week from the dropdowns above to view the response table.
                    </p>
                </div>
            ) : filteredResponses.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                        <Search size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No Responses Found</h3>
                    <p className="text-slate-400 mt-2">No responses for this course and week yet.</p>
                </div>
            ) : (
                /* Spreadsheet Table */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm min-w-max">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-4 pl-6 w-48 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        Trainee
                                    </th>
                                    <th className="p-4 w-32">Department</th>
                                    <th className="p-4 w-32">Position</th>
                                    <th className="p-4 w-40">Submitted</th>
                                    {questions.map((q, idx) => (
                                        <th key={idx} className="p-4 min-w-[300px] border-l border-slate-100">
                                            <div className="flex items-start gap-2">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-xs font-bold">
                                                    Q{idx + 1}
                                                </span>
                                                <span className="line-clamp-2 text-xs font-medium text-slate-500">
                                                    {q.text}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredResponses.map(response => {
                                    const user = users[response.userId] || {};
                                    return (
                                        <tr key={response.id} className="hover:bg-indigo-50/30 transition-colors">
                                            {/* Sticky User Column */}
                                            <td className="p-4 pl-6 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-inner border border-white/50">
                                                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : (response.userId ? response.userId.charAt(0).toUpperCase() : 'U')}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-700 truncate max-w-[120px]">
                                                            {user.displayName || response.userId || 'Anonymous'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600">{user.department || '-'}</td>
                                            <td className="p-4 text-slate-600">{user.position || '-'}</td>
                                            {/* Submitted Date */}
                                            <td className="p-4 text-slate-500 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {response.submittedAt?.toLocaleDateString()}
                                                </div>
                                                <div className="text-slate-400 mt-0.5">
                                                    {response.submittedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            {/* Answers */}
                                            {questions.map((q, idx) => {
                                                const answer = response.responses?.[idx];
                                                const answerStr = answer !== null && answer !== undefined ? String(answer) : '';
                                                const isLong = answerStr.length > 60;
                                                const displayText = q.type === 'rating'
                                                    ? `★ ${answer !== null && answer !== undefined ? answer : '-'}`
                                                    : truncateText(Array.isArray(answer) ? answer.join(', ') : answer, 60);

                                                return (
                                                    <td key={idx} className="p-4 border-l border-slate-50">
                                                        <div className="flex items-start gap-2">
                                                            <div className={clsx(
                                                                "flex-1 p-2 rounded-lg text-sm",
                                                                q.type === 'rating'
                                                                    ? "bg-amber-50 text-amber-700 font-medium text-center"
                                                                    : "bg-slate-50 text-slate-700"
                                                            )}>
                                                                {displayText}
                                                            </div>
                                                            {isLong && q.type !== 'rating' && (
                                                                <button
                                                                    onClick={() => handleReadMore(q.text, answer)}
                                                                    className="flex-shrink-0 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded transition-colors font-medium"
                                                                >
                                                                    อ่านต่อ
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Read More Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col animate-fade-in-up overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <h2 className="text-lg font-bold text-slate-800">Full Answer</h2>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{modalContent.question}</p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                                {Array.isArray(modalContent.answer)
                                    ? modalContent.answer.join(', ')
                                    : (modalContent.answer || '-')}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResponseTable;
