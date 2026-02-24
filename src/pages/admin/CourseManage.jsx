import React, { useState, useEffect } from 'react';
import { courseService } from '../../services/courseService';
import { companyService } from '../../services/companyService';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Send from 'lucide-react/dist/esm/icons/send';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Users from 'lucide-react/dist/esm/icons/users';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Key from 'lucide-react/dist/esm/icons/key';
import Copy from 'lucide-react/dist/esm/icons/copy';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Folder from 'lucide-react/dist/esm/icons/folder';
import Bell from 'lucide-react/dist/esm/icons/bell';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router-dom';

const WEEKS = ['pre', 0, 2, 4, 6, 8];

// Generate random 6-character alphanumeric key
const generateRandomKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0,O,1,I
    let key = '';
    for (let i = 0; i < 6; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
};

const CourseManage = () => {
    const navigate = useNavigate();
    const { companyId } = useParams();
    const [companyName, setCompanyName] = useState('');
    const isUnassigned = companyId === '_unassigned';
    const [courses, setCourses] = useState([]);
    const [forms, setForms] = useState([]);
    const [folders, setFolders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCourse, setCurrentCourse] = useState(null);

    // Single folder filter for all weeks
    const [selectedFolderFilter, setSelectedFolderFilter] = useState('');

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'closed'
    const [showFilters, setShowFilters] = useState(false);

    // Weekly Notification dropdown state
    const [openNotifyDropdown, setOpenNotifyDropdown] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '', // Course end date (Week 0 starts here)
        capacity: 30,
        registrationKey: '',
        weekForms: { pre: '', 0: '', 2: '', 4: '', 6: '', 8: '' },
        weekDates: { pre: '', 0: '', 2: '', 4: '', 6: '', 8: '' }
    });

    useEffect(() => {
        const loadAllData = async () => {
            setIsLoading(true);
            try {
                // Fetch company name
                if (companyId && !isUnassigned) {
                    const snap = await getDoc(doc(db, 'companyFolders', companyId));
                    if (snap.exists()) {
                        setCompanyName(snap.data().name);
                    }
                } else if (isUnassigned) {
                    setCompanyName('Unassigned');
                }

                // Parallel fetch all required data
                await Promise.all([
                    fetchCourses(),
                    fetchForms(),
                    fetchFolders()
                ]);
            } catch (e) {
                console.error("Load error", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, [companyId]);

    const fetchCourses = async () => {
        try {
            let data;
            if (isUnassigned) {
                data = await courseService.getUnassignedCourses();
            } else if (companyId) {
                data = await courseService.getCoursesByCompany(companyId);
            } else {
                data = await courseService.getAllCourses();
            }
            setCourses(data);
        } catch (error) {
            console.error("Failed to load courses", error);
        }
    };

    const fetchForms = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'formTemplates'));
            const formsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setForms(formsData);
        } catch (error) {
            console.error("Failed to load forms", error);
        }
    };

    const fetchFolders = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'formFolders'));
            const foldersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFolders(foldersData);
        } catch (error) {
            console.error("Failed to load folders", error);
        }
    };

    // Get filtered forms based on single folder selection
    const getFilteredForms = () => {
        if (!selectedFolderFilter) return forms; // No filter, show all
        return forms.filter(f => f.folderId === selectedFolderFilter);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentCourse) {
                await courseService.updateCourse(currentCourse.id, formData);
            } else {
                // Generate key for new course if not set
                const dataToSave = {
                    ...formData,
                    companyId: isUnassigned ? null : (companyId || null),
                    registrationKey: formData.registrationKey || generateRandomKey()
                };
                await courseService.createCourse(dataToSave);
            }
            setIsModalOpen(false);
            resetForm();
            fetchCourses();
        } catch (error) {
            alert("Error saving course");
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to delete this course?")) {
            await courseService.deleteCourse(id);
            fetchCourses();
        }
    };

    const handleToggleStatus = async (course) => {
        try {
            await courseService.toggleStatus(course.id, course.status);
            fetchCourses();
        } catch (error) {
            alert("Failed to toggle status");
        }
    };

    const handleMarkFinished = async (course) => {
        if (confirm(`Mark "${course.title}" as finished? This will trigger the follow-up form.`)) {
            try {
                await courseService.markAsFinished(course.id, course.title);
                fetchCourses();
                alert("Class marked as finished! Flex Message notifications sent.");
            } catch (error) {
                alert("Failed to mark as finished");
            }
        }
    };

    // Send weekly notification
    const handleSendWeeklyNotification = async (course, weekNumber) => {
        if (!confirm(`Send ${weekNumber === 'pre' ? 'Pre-training' : (weekNumber === 0 ? 'Week 0' : `Week ${weekNumber} Follow up`)} notification to all trainees in "${course.title}"?`)) {
            return;
        }

        setOpenNotifyDropdown(null);

        try {
            const response = await fetch('/api/notifyWeekly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId: course.id,
                    courseTitle: course.title,
                    weekNumber
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`✅ ${weekNumber === 0 ? 'Action Commitment' : `Week ${weekNumber} Follow up`} notification sent to ${data.sentTo} trainees!`);
            } else {
                throw new Error(data.error || 'Failed to send notification');
            }
        } catch (error) {
            console.error('Weekly notification error:', error);
            alert(`❌ Failed to send notification: ${error.message}`);
        }
    };

    const openEditModal = (course) => {
        setCurrentCourse(course);
        setFormData({
            title: course.title,
            description: course.description,
            date: course.date,
            capacity: course.capacity,
            registrationKey: course.registrationKey || '',
            weekForms: course.weekForms || { pre: '', 0: '', 2: '', 4: '', 6: '', 8: '' },
            weekDates: course.weekDates || { pre: '', 0: '', 2: '', 4: '', 6: '', 8: '' }
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setCurrentCourse(null);
        setFormData({
            title: '',
            description: '',
            date: '',
            capacity: 30,
            registrationKey: '',
            weekForms: { pre: '', 0: '', 2: '', 4: '', 6: '', 8: '' },
            weekDates: { pre: '', 0: '', 2: '', 4: '', 6: '', 8: '' }
        });
    };

    // Copy key to clipboard
    const copyKeyToClipboard = (key) => {
        navigator.clipboard.writeText(key);
        alert('Copied key: ' + key);
    };

    // Regenerate key for a course
    const regenerateKey = () => {
        const newKey = generateRandomKey();
        setFormData({ ...formData, registrationKey: newKey });
    };

    const getFormName = (formId) => {
        const form = forms.find(f => f.id === formId);
        return form?.name || '-';
    };

    // Count linked forms
    const getLinkedFormsCount = (weekForms) => {
        if (!weekForms) return 0;
        return Object.values(weekForms).filter(id => id && id !== '').length;
    };

    // Filtered courses
    const filteredCourses = courses.filter(course => {
        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            if (!course.title?.toLowerCase().includes(search) &&
                !course.description?.toLowerCase().includes(search)) {
                return false;
            }
        }
        // Status filter
        if (statusFilter !== 'all' && course.status !== statusFilter) {
            return false;
        }
        return true;
    });

    // Update week form
    const updateWeekForm = (week, formId) => {
        setFormData({
            ...formData,
            weekForms: { ...formData.weekForms, [week]: formId }
        });
    };

    // Update week date
    const updateWeekDate = (week, dateValue) => {
        setFormData({
            ...formData,
            weekDates: { ...formData.weekDates, [week]: dateValue }
        });
    };

    // Auto-calculate week dates based on course end date
    const autoFillWeekDates = () => {
        if (!formData.date) {
            alert("Please set the Course End Date first.");
            return;
        }
        const baseDate = new Date(formData.date);
        const newWeekDates = {};
        WEEKS.forEach(week => {
            const weekDate = new Date(baseDate);
            if (week === 'pre') {
                weekDate.setDate(weekDate.getDate() - 7); // Pre-training = 1 week before W0
            } else {
                weekDate.setDate(weekDate.getDate() + (week * 7)); // Add weeks
            }
            newWeekDates[week] = weekDate.toISOString().split('T')[0];
        });
        setFormData({ ...formData, weekDates: newWeekDates });
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            {companyId && (
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => navigate('/admin/courses')}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Company Folders
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-400" />
                        {companyName || 'Loading...'}
                    </span>
                </div>
            )}

            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {companyName ? `${companyName} — Courses` : 'Manage Courses'}
                    </h1>
                    <p className="text-slate-500 text-sm">Create and manage your training schedule.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="btn-primary"
                >
                    <Plus size={20} />
                    Create Course
                </button>
            </div>

            {/* Filters / Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open Only</option>
                        <option value="closed">Closed Only</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
                {(searchTerm || statusFilter !== 'all') && (
                    <button
                        onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Course List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="p-5">Course Name</th>
                            <th className="p-5">End Date</th>
                            <th className="p-5">Registration Key</th>
                            <th className="p-5">Linked Forms</th>
                            <th className="p-5">Status</th>
                            <th className="p-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading courses...</td></tr>
                        ) : filteredCourses.length === 0 ? (
                            <tr><td colSpan="5" className="p-12 text-center text-slate-400">
                                <div className="flex flex-col items-center">
                                    <div className="p-4 bg-slate-50 rounded-full mb-3"><BookOpen className="text-slate-300" size={32} /></div>
                                    {courses.length === 0 ? (
                                        <>
                                            <p>No courses found.</p>
                                            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="text-indigo-600 font-medium mt-2 hover:underline">Create your first course</button>
                                        </>
                                    ) : (
                                        <p>No courses match your filters.</p>
                                    )}
                                </div>
                            </td></tr>
                        ) : (
                            filteredCourses.map(course => (
                                <tr key={course.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-5">
                                        <div className="font-semibold text-slate-800">{course.title}</div>
                                        <div className="text-xs text-slate-400 truncate max-w-xs">{course.description || 'No description'}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                                            <Calendar size={16} className="text-indigo-400" />
                                            {course.date}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono border border-slate-200">
                                                {course.registrationKey || '-'}
                                            </code>
                                            {course.registrationKey && (
                                                <button
                                                    onClick={() => copyKeyToClipboard(course.registrationKey)}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    title="Copy Key"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <button
                                            onClick={() => navigate(`/admin/responses?courseId=${course.id}`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold border border-indigo-100 hover:bg-indigo-100 transition-colors group cursor-pointer"
                                        >
                                            <FileText size={14} />
                                            {getLinkedFormsCount(course.weekForms)}/6 Forms
                                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                        </button>
                                    </td>
                                    <td className="p-5">
                                        <span className={clsx(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                                            course.status === 'open' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200"
                                        )}>
                                            <span className={clsx("w-2 h-2 rounded-full", course.status === 'open' ? "bg-emerald-500" : "bg-rose-500")}></span>
                                            {course.status === 'open' ? "OPEN" : "CLOSED"}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleToggleStatus(course)}
                                                title={course.status === 'open' ? "Close Registration" : "Open Registration"}
                                                className={clsx(
                                                    "p-2 rounded-lg transition-colors border shadow-sm",
                                                    course.status === 'open'
                                                        ? "bg-white border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200"
                                                        : "bg-white border-slate-200 text-slate-400 hover:text-emerald-600"
                                                )}
                                            >
                                                {course.status === 'open' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                            </button>

                                            <button
                                                onClick={() => openEditModal(course)}
                                                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-blue-600 hover:border-blue-200 shadow-sm transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>

                                            <button
                                                onClick={() => handleMarkFinished(course)}
                                                disabled={course.isFinished}
                                                title="Finish Class & Send Action Commitment Notification"
                                                className={clsx(
                                                    "p-2 rounded-lg transition-colors border shadow-sm",
                                                    course.isFinished
                                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border-transparent"
                                                        : "bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200"
                                                )}
                                            >
                                                <Send size={18} />
                                            </button>

                                            {/* Weekly Notification Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenNotifyDropdown(openNotifyDropdown === course.id ? null : course.id)}
                                                    disabled={!course.isFinished}
                                                    title="Send Weekly Follow-up Notification"
                                                    className={clsx(
                                                        "p-2 rounded-lg transition-colors border shadow-sm",
                                                        !course.isFinished
                                                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border-transparent"
                                                            : "bg-white border-slate-200 text-amber-600 hover:text-amber-700 hover:border-amber-200"
                                                    )}
                                                >
                                                    <Bell size={18} />
                                                </button>

                                                {openNotifyDropdown === course.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                                                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                                            Send Notification
                                                        </div>
                                                        {[2, 4, 6, 8].map(week => (
                                                            <button
                                                                key={week}
                                                                onClick={() => handleSendWeeklyNotification(course, week)}
                                                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Bell size={14} />
                                                                Week {week} Follow up
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-rose-600 hover:border-rose-200 shadow-sm transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in-up flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">{currentCourse ? 'Edit Course' : 'Create New Course'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Basic Info */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Title</label>
                                <input
                                    type="text"
                                    required
                                    className="input-primary"
                                    placeholder="e.g. Advanced React Workshop"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Course End Date
                                        <span className="text-slate-400 font-normal ml-1 text-xs">(Action Commitment starts here)</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="input-primary"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Capacity</label>
                                    <input
                                        type="number"
                                        required
                                        className="input-primary"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* Registration Key Section */}
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <label className="block text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                                    <Key size={16} className="text-indigo-600" />
                                    Registration Key
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            readOnly
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-indigo-200 rounded-lg text-lg font-mono tracking-widest text-center text-indigo-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={formData.registrationKey || 'Auto-generated on save'}
                                            placeholder="Auto-generated"
                                        />
                                        {formData.registrationKey && (
                                            <button
                                                type="button"
                                                onClick={() => copyKeyToClipboard(formData.registrationKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={regenerateKey}
                                        className="p-2.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-sm"
                                        title="Regenerate Key"
                                    >
                                        <RefreshCw size={20} />
                                    </button>
                                </div>
                                <p className="text-xs text-indigo-600/70 mt-2">
                                    Use this key for trainees to register via LINE LIFF.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                <textarea
                                    className="input-primary"
                                    rows="2"
                                    placeholder="Course details..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            {/* Week Forms Section */}
                            <div className="border-t border-slate-200 pt-5">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Assessment Forms per Week</h3>
                                        <p className="text-xs text-slate-400">Assign different forms for each follow-up week.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={autoFillWeekDates}
                                        className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                                    >
                                        Auto-fill Dates
                                    </button>
                                </div>

                                {/* Single Folder Filter */}
                                <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <label className="block text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                                        <Folder size={16} className="text-indigo-600" />
                                        Filter Forms by Folder
                                    </label>
                                    <select
                                        className="input-primary text-sm"
                                        value={selectedFolderFilter}
                                        onChange={e => setSelectedFolderFilter(e.target.value)}
                                    >
                                        <option value="">📁 All Folders (Show All Forms)</option>
                                        {folders.map(folder => (
                                            <option key={folder.id} value={folder.id}>
                                                📁 {folder.name} ({forms.filter(f => f.folderId === folder.id).length} forms)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    {WEEKS.map(week => (
                                        <div key={week} className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="col-span-2">
                                                <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                                    {week === 'pre' ? 'Pre' : week === 0 ? 'W0 AC' : `W${week} FU`}
                                                </span>
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="date"
                                                    className="input-primary text-sm"
                                                    placeholder="Date"
                                                    value={formData.weekDates[week] || ''}
                                                    onChange={e => updateWeekDate(week, e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-6">
                                                <select
                                                    className="input-primary text-sm"
                                                    value={formData.weekForms[week] || ''}
                                                    onChange={e => updateWeekForm(week, e.target.value)}
                                                >
                                                    <option value="">-- Select Form --</option>
                                                    {getFilteredForms().map(form => (
                                                        <option key={form.id} value={form.id}>
                                                            {form.name} ({form.questions?.length || 0} Qs)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-all active:scale-95"
                                >
                                    {currentCourse ? 'Save Changes' : 'Create Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManage;
