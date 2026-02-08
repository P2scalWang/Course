import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useSearchParams } from 'react-router-dom';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Eye from 'lucide-react/dist/esm/icons/eye';
import X from 'lucide-react/dist/esm/icons/x';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import User from 'lucide-react/dist/esm/icons/user';
import Download from 'lucide-react/dist/esm/icons/download';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Folder from 'lucide-react/dist/esm/icons/folder';
import Users from 'lucide-react/dist/esm/icons/users';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Circle from 'lucide-react/dist/esm/icons/circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import clsx from 'clsx';
// Removed unused 'xlsx' import (bundle-heavy-dependencies)
import ExcelJS from 'exceljs';

const ResponseViewer = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [responses, setResponses] = useState([]);
    const [courses, setCourses] = useState([]);
    const [formTemplates, setFormTemplates] = useState({});
    const [users, setUsers] = useState({}); // userId -> { displayName, department, position }
    const [registrations, setRegistrations] = useState([]); // Array of { userId, courseId }
    const [loading, setLoading] = useState(true);

    // Navigation State
    // viewMode: 'overview' | 'weeks' | 'detail' | 'individual' | 'userReport'
    const [viewMode, setViewMode] = useState('overview');
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(null); // Week number or 'all'
    const [selectedUserId, setSelectedUserId] = useState(null); // For user report view

    // Filters for Detail View
    const [searchTerm, setSearchTerm] = useState('');
    const [completionFilter, setCompletionFilter] = useState('all'); // 'all' | 'complete' | 'incomplete'

    // Modal State
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        const courseIdParam = searchParams.get('courseId');
        const weekParam = searchParams.get('week');
        const viewParam = searchParams.get('view'); // 'individual' or 'userReport'
        const userIdParam = searchParams.get('userId');

        if (courseIdParam) {
            setSelectedCourseId(courseIdParam);

            if (viewParam === 'userReport' && userIdParam) {
                setViewMode('userReport');
                setSelectedUserId(userIdParam);
                setSelectedWeek(null);
            } else if (viewParam === 'individual') {
                setViewMode('individual');
                setSelectedWeek(null);
                setSelectedUserId(null);
            } else if (weekParam !== null) {
                setSelectedWeek(parseInt(weekParam));
                setViewMode('detail');
                setSelectedUserId(null);
            } else {
                setViewMode('weeks');
                setSelectedWeek(null);
                setSelectedUserId(null);
            }
        } else {
            setViewMode('overview');
            setSelectedCourseId(null);
            setSelectedWeek(null);
            setSelectedUserId(null);
        }
    }, [searchParams]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            // async-parallel: Parallel fetch of all 5 independent datasets
            const [
                responsesSnap,
                coursesSnap,
                formsSnap,
                usersSnap,
                registrationsSnap
            ] = await Promise.all([
                getDocs(query(collection(db, 'responses'), orderBy('submittedAt', 'desc'))),
                getDocs(collection(db, 'courses')),
                getDocs(collection(db, 'formTemplates')),
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'registrations'))
            ]);

            // 1. Process Responses
            const responsesData = responsesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().submittedAt?.toDate?.() || new Date(),
                week: doc.data().week !== undefined ? doc.data().week : 0 // Default to week 0 if missing
            }));
            setResponses(responsesData);

            // 2. Process Courses
            const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(coursesData);

            // 3. Process Forms
            const formsMap = {};
            formsSnap.docs.forEach(doc => {
                formsMap[doc.id] = { name: doc.data().name, questions: doc.data().questions || [] };
            });
            setFormTemplates(formsMap);

            // 4. Process Users
            const usersMap = {};
            usersSnap.docs.forEach(doc => {
                const data = doc.data();
                usersMap[doc.id] = {
                    displayName: data.displayName || data.lineDisplayName || doc.id,
                    department: data.department || '',
                    position: data.position || '',
                    phone: data.phone || '',
                    email: data.email || ''
                };
            });
            setUsers(usersMap);

            // 5. Process Registrations
            const registrationsData = registrationsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRegistrations(registrationsData);

        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Navigation Handlers ---
    const navigate = (params) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null) newParams.delete(key);
            else newParams.set(key, value);
        });
        setSearchParams(newParams);
    };

    const handleCourseSelect = (courseId) => navigate({ courseId, week: null, view: null, userId: null });
    const handleWeekSelect = (week) => navigate({ week });
    const handleIndividualView = () => navigate({ view: 'individual', week: null, userId: null });
    const handleUserReport = (userId) => navigate({ view: 'userReport', userId, week: null });
    const handleBack = () => {
        if (viewMode === 'userReport') {
            navigate({ view: 'individual', userId: null }); // Go back to Individual view
        } else if (viewMode === 'detail' || viewMode === 'individual') {
            navigate({ week: null, view: null, userId: null }); // Go up to Weeks view
        } else if (viewMode === 'weeks') {
            navigate({ courseId: null }); // Go up to Overview
        }
    };

    // --- Helpers ---
    const getCourseName = (courseId) => courses.find(c => c.id === courseId)?.title || 'Unknown Course';
    const getSelectedCourse = (courseId) => courses.find(c => c.id === courseId);
    const getFormName = (formTemplateId) => formTemplates[formTemplateId]?.name || 'Unknown Form';
    const getQuestions = (formTemplateId) => formTemplates[formTemplateId]?.questions || [];

    // Get user info with fallback
    const getUserInfo = (userId) => {
        const user = users[userId];
        return {
            displayName: user?.displayName || userId,
            department: user?.department || '',
            position: user?.position || ''
        };
    };

    // Get questions for a specific week of a course
    const getQuestionsForWeek = (courseId, week) => {
        const course = getSelectedCourse(courseId);
        const formId = course?.weekForms?.[week];
        return formTemplates[formId]?.questions || [];
    };

    // Count linked forms for a course
    const getLinkedFormsCount = (course) => {
        if (!course?.weekForms) return 0;
        return Object.values(course.weekForms).filter(id => id && id !== '').length;
    };

    // --- Derived Data ---

    // Overview: Courses with count
    const coursesWithResponses = courses.map(course => {
        const count = responses.filter(r => r.courseId === course.id).length;
        return { ...course, responseCount: count };
    }).sort((a, b) => b.responseCount - a.responseCount);

    // Weeks: Available weeks for selected course
    const courseResponses = responses.filter(r => r.courseId === selectedCourseId);
    const availableWeeks = [...new Set(courseResponses.map(r => r.week))].sort((a, b) => a - b);

    // Detail: Specific responses
    const filteredResponses = courseResponses.filter(r => {
        if (selectedWeek !== null && r.week !== selectedWeek) return false;
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return (r.userId?.toLowerCase() || '').includes(searchLower);
        }
        return true;
    });

    // Individual Summary Data Construction
    const enrolledUserIds = registrations
        .filter(r => r.courseId === selectedCourseId)
        .map(r => r.userId);

    const respondingUserIds = courseResponses.map(r => r.userId);

    // Union of enrolled users + users who have responded (in case of legacy data)
    const uniqueUsers = [...new Set([...enrolledUserIds, ...respondingUserIds])].sort();

    // Count users who have submitted AT LEAST ONE response
    const submittedUsersCount = uniqueUsers.filter(userId =>
        courseResponses.some(r => r.userId === userId)
    ).length;

    const allWeeks = [0, 2, 4, 6, 8]; // Expected weeks

    // Filtered users for Individual Summary
    const filteredUsers = uniqueUsers.filter(userId => {
        // Search filter
        if (searchTerm && !userId.toLowerCase().includes(searchTerm.toLowerCase())) {
            const userInfo = users[userId];
            if (userInfo && !userInfo.displayName.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            } else if (!userInfo) {
                return false;
            }
        }
        // Completion filter
        if (completionFilter !== 'all') {
            const userResponses = courseResponses.filter(r => r.userId === userId);
            const isComplete = userResponses.length >= allWeeks.length;
            if (completionFilter === 'complete' && !isComplete) return false;
            if (completionFilter === 'incomplete' && isComplete) return false;
        }
        return true;
    });

    // --- Helper function to apply Excel styling (auto-fit columns) ---
    const applyExcelStyles = (worksheet, data) => {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);

        // Calculate optimal column widths based on content
        const colWidths = headers.map((header) => {
            const headerLen = header.length;
            const maxDataLen = data.reduce((max, row) => {
                const cellValue = String(row[header] || '');
                return Math.max(max, cellValue.length);
            }, 0);
            // Add padding, cap at 60 characters max
            return { wch: Math.min(Math.max(headerLen, maxDataLen) + 3, 60) };
        });

        worksheet['!cols'] = colWidths;
    };

    // --- Export Functions with ExcelJS styling ---

    // Helper function to apply styling to a worksheet
    const applyExcelJSStyles = (worksheet, dataRows) => {
        // Track max content length for each column
        const colMaxLengths = {};

        // Initialize with header lengths
        worksheet.columns.forEach(col => {
            colMaxLengths[col.key] = (col.header?.length || 10) + 5;
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD6EAF8' }
            };
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        // Style data rows and track max lengths
        dataRows.forEach((rowData, rowIndex) => {
            const row = worksheet.getRow(rowIndex + 2); // +2 because row 1 is header

            Object.keys(rowData).forEach((key, colIndex) => {
                const value = String(rowData[key] || '');
                if (value.length + 5 > (colMaxLengths[key] || 0)) {
                    colMaxLengths[key] = Math.min(value.length + 5, 120);
                }

                const cell = row.getCell(colIndex + 1);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
            });
        });

        // Apply auto-fit column widths
        worksheet.columns.forEach(col => {
            if (colMaxLengths[col.key]) {
                col.width = colMaxLengths[col.key];
            }
        });
    };

    const exportIndividualSummary = async () => {
        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Summary (completion status with department/position)
        const summaryData = uniqueUsers.map(userId => {
            const userResponses = courseResponses.filter(r => r.userId === userId);
            const userInfo = getUserInfo(userId);
            const row = {
                traineeId: userId,
                name: userInfo.displayName,
                department: userInfo.department || '-',
                position: userInfo.position || '-'
            };
            allWeeks.forEach(week => {
                const hasResponse = userResponses.find(r => r.week === week);
                row[`week${week}`] = hasResponse ? 'Done' : '-';
            });
            row.completion = Math.round((userResponses.length / allWeeks.length) * 100) + '%';
            return row;
        });

        const summarySheet = workbook.addWorksheet('Summary');

        // Define columns for summary
        const summaryColumns = [
            { header: 'Trainee ID', key: 'traineeId', width: 25 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Department', key: 'department', width: 15 },
            { header: 'Position', key: 'position', width: 15 }
        ];
        allWeeks.forEach(week => {
            summaryColumns.push({ header: `Week ${week}`, key: `week${week}`, width: 10 });
        });
        summaryColumns.push({ header: 'Completion %', key: 'completion', width: 12 });

        summarySheet.columns = summaryColumns;
        summaryData.forEach(row => summarySheet.addRow(row));
        applyExcelJSStyles(summarySheet, summaryData);

        // Sheet per Week: Full Questions & Answers
        allWeeks.forEach(week => {
            const weekQuestions = getQuestionsForWeek(selectedCourseId, week);
            const weekResponses = courseResponses.filter(r => r.week === week);

            if (weekResponses.length > 0) {
                const weekSheet = workbook.addWorksheet(`Week ${week}`);

                // Define columns
                const weekColumns = [
                    { header: 'Trainee ID', key: 'traineeId', width: 25 },
                    { header: 'Name', key: 'name', width: 20 },
                    { header: 'Department', key: 'department', width: 15 },
                    { header: 'Position', key: 'position', width: 15 },
                    { header: 'Submitted At', key: 'submittedAt', width: 20 }
                ];
                weekQuestions.forEach((q, idx) => {
                    weekColumns.push({
                        header: `Q${idx + 1}: ${q.text.length > 40 ? q.text.substring(0, 40) + '...' : q.text}`,
                        key: `q${idx}`,
                        width: 30
                    });
                });
                weekSheet.columns = weekColumns;

                const weekData = weekResponses.map(response => {
                    const userInfo = getUserInfo(response.userId);
                    const row = {
                        traineeId: response.userId || 'Anonymous',
                        name: userInfo.displayName,
                        department: userInfo.department || '-',
                        position: userInfo.position || '-',
                        submittedAt: response.submittedAt?.toLocaleString() || '-'
                    };
                    weekQuestions.forEach((q, idx) => {
                        const answer = response.responses?.[idx];
                        row[`q${idx}`] = Array.isArray(answer) ? answer.join(', ') : (answer !== null && answer !== undefined ? String(answer) : '-');
                    });
                    return row;
                });

                weekData.forEach(row => weekSheet.addRow(row));
                applyExcelJSStyles(weekSheet, weekData);
            }
        });

        // Download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${getCourseName(selectedCourseId)}_All_Responses.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportWeekResponses = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Week ${selectedWeek}`);

        const weekQuestions = getQuestionsForWeek(selectedCourseId, selectedWeek);

        // Define columns
        const columns = [
            { header: 'Trainee ID', key: 'traineeId', width: 25 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Department', key: 'department', width: 15 },
            { header: 'Position', key: 'position', width: 15 },
            { header: 'Submitted At', key: 'submittedAt', width: 20 }
        ];
        weekQuestions.forEach((q, idx) => {
            columns.push({
                header: `Q${idx + 1}: ${q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text}`,
                key: `q${idx}`,
                width: 30
            });
        });
        worksheet.columns = columns;

        const data = filteredResponses.map(response => {
            const userInfo = getUserInfo(response.userId);
            const row = {
                traineeId: response.userId || 'Anonymous',
                name: userInfo.displayName,
                department: userInfo.department || '-',
                position: userInfo.position || '-',
                submittedAt: response.submittedAt?.toLocaleString() || '-'
            };
            weekQuestions.forEach((q, idx) => {
                const answer = response.responses?.[idx];
                row[`q${idx}`] = Array.isArray(answer) ? answer.join(', ') : (answer !== null && answer !== undefined ? String(answer) : '-');
            });
            return row;
        });

        data.forEach(row => worksheet.addRow(row));
        applyExcelJSStyles(worksheet, data);

        // Download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${getCourseName(selectedCourseId)}_Week${selectedWeek}_Responses.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Export individual user report (all weeks for one trainee) - Single sheet format with styling
    const exportUserReport = async () => {
        const userAllResponses = courseResponses
            .filter(r => r.userId === selectedUserId)
            .sort((a, b) => a.week - b.week);

        const userInfo = getUserInfo(selectedUserId);

        // Create workbook with ExcelJS for proper styling
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        // Define columns (initial widths, will be auto-fitted later)
        worksheet.columns = [
            { header: 'Week', key: 'week', width: 15 },
            { header: 'No.', key: 'no', width: 6 },
            { header: 'Question', key: 'question', width: 30 },
            { header: 'Answer', key: 'answer', width: 50 }
        ];

        // Track max content length for each column to auto-fit
        const colMaxLengths = { week: 15, no: 6, question: 30, answer: 50 };

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD6EAF8' } // Light blue background
            };
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        // Helper function to add styled row and track column widths
        const addStyledRow = (data, isHeader = false) => {
            const row = worksheet.addRow(data);

            // Track max lengths for auto-fit (add more padding for nicer spacing)
            Object.keys(data).forEach(key => {
                const value = String(data[key] || '');
                if (value.length > (colMaxLengths[key] || 0)) {
                    colMaxLengths[key] = Math.min(value.length + 5, 120); // Add 5 for padding, cap at 120
                }
            });

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
                if (isHeader) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFD6EAF8' }
                    };
                    cell.font = { bold: true };
                }
            });
            return row;
        };

        // Add trainee info section
        addStyledRow({ week: 'Trainee Info', no: '', question: 'Name', answer: userInfo.displayName }, true);
        addStyledRow({ week: '', no: '', question: 'Trainee ID', answer: selectedUserId });
        addStyledRow({ week: '', no: '', question: 'Department', answer: userInfo.department || '-' });
        addStyledRow({ week: '', no: '', question: 'Position', answer: userInfo.position || '-' });
        addStyledRow({ week: '', no: '', question: 'Course', answer: getCourseName(selectedCourseId) });
        addStyledRow({ week: '', no: '', question: 'Total Weeks Submitted', answer: String(userAllResponses.length) });

        // Empty row separator
        worksheet.addRow({});

        // Add each week's data
        userAllResponses.forEach(response => {
            const weekQuestions = getQuestionsForWeek(selectedCourseId, response.week);

            // Week header row
            addStyledRow({
                week: `Week ${response.week}`,
                no: '',
                question: 'Submitted At:',
                answer: response.submittedAt?.toLocaleString() || '-'
            }, true);

            // Questions and answers for this week
            weekQuestions.forEach((q, idx) => {
                const answer = response.responses?.[idx];
                addStyledRow({
                    week: '',
                    no: idx + 1,
                    question: q.text,
                    answer: Array.isArray(answer) ? answer.join(', ') : (answer !== null && answer !== undefined ? String(answer) : '-')
                });
            });

            // Empty row separator between weeks
            worksheet.addRow({});
        });

        // Auto-fit column widths based on content
        worksheet.getColumn('week').width = colMaxLengths.week;
        worksheet.getColumn('no').width = colMaxLengths.no;
        worksheet.getColumn('question').width = colMaxLengths.question;
        worksheet.getColumn('answer').width = colMaxLengths.answer;

        // Generate safe filename
        const safeName = userInfo.displayName.replace(/[^a-zA-Z0-9ก-๙_\-\s]/g, '').trim() || 'User';
        const safeCourseName = getCourseName(selectedCourseId).replace(/[^a-zA-Z0-9ก-๙_\-\s]/g, '').trim() || 'Course';
        const fileName = `${safeName}_${safeCourseName}_Report.xlsx`;

        // Download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleViewDetail = (response) => {
        setSelectedResponse(response);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading data...</div>;

    // =================================================================================
    // RENDER: 1. OVERVIEW MODE (Course Selection)
    // =================================================================================
    if (viewMode === 'overview') {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assessment Responses</h1>
                    <p className="text-slate-500 text-sm">Select a course to view its trainee feedback.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coursesWithResponses.length > 0 ? (
                        coursesWithResponses.map(course => (
                            <div
                                key={course.id}
                                onClick={() => handleCourseSelect(course.id)}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={clsx("p-3 rounded-xl transition-colors", course.responseCount > 0 ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-50 text-slate-400")}>
                                        <FileText size={24} />
                                    </div>
                                    <span className={clsx("text-xs px-2 py-1 rounded-lg font-semibold", course.responseCount > 0 ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-400")}>
                                        {course.responseCount} Responses
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h3>
                                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{course.description || 'No description'}</p>

                                <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-4">
                                    <span className="flex items-center gap-1">
                                        <Layers size={14} />
                                        {getLinkedFormsCount(course)}/5 Forms Linked
                                    </span>
                                    {course.responseCount > 0 && (
                                        <span className="flex items-center gap-1 text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            Select Week <ArrowRight size={14} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                            <div className="inline-flex p-4 bg-slate-50 rounded-full mb-3">
                                <FileText size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No Courses Found</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mt-2">
                                Create a course and link a form to start collecting responses.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Common Header for Level 2 & 3
    const renderHeader = (title, subtitle) => (
        <div className="flex items-center gap-4 mb-6">
            <button
                onClick={handleBack}
                className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {title}
                </h1>
                <p className="text-slate-500 text-sm">{subtitle}</p>
            </div>
        </div>
    );

    // =================================================================================
    // RENDER: 2. WEEKS SELECTION (Folder View)
    // =================================================================================
    if (viewMode === 'weeks') {
        return (
            <div>
                {renderHeader(getCourseName(selectedCourseId), 'Select a week to view responses.')}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Individual Summary Card (Special) */}
                    <div
                        onClick={handleIndividualView}
                        className="bg-white p-6 rounded-2xl border-2 border-dashed border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all group flex flex-col items-center justify-center text-center gap-3 min-h-[160px]"
                    >
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                            <Users size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-700">Individual Summary</h3>
                            <p className="text-xs text-indigo-400 mt-1">View all students & weeks</p>
                        </div>
                    </div>

                    {/* Week Folders */}
                    {availableWeeks.map(week => {
                        const count = courseResponses.filter(r => r.week === week).length;
                        return (
                            <div
                                key={week}
                                onClick={() => handleWeekSelect(week)}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all flex flex-col justify-between min-h-[160px] group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Folder size={24} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 px-2 py-1 bg-slate-50 rounded-lg group-hover:bg-white group-hover:text-blue-500">
                                        Week {week}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">
                                        {week === 0 ? 'Pre-Course (Week 0)' : `Week ${week}`}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{count} assessments submitted</p>
                                </div>
                            </div>
                        );
                    })}

                    {availableWeeks.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            No responses found for this course yet.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // =================================================================================
    // RENDER: 3a. INDIVIDUAL SUMMARY VIEW (Matrix)
    // =================================================================================
    if (viewMode === 'individual') {
        return (
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {getCourseName(selectedCourseId)} / Summary
                            </h1>
                            <p className="text-slate-500 text-sm">Individual submission status across all weeks.</p>
                        </div>
                    </div>
                    <button
                        onClick={exportIndividualSummary}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-sm transition-colors"
                    >
                        <FileSpreadsheet size={18} />
                        Export Excel
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">Submitted:</span>
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded border border-indigo-100">
                            {submittedUsersCount} / {uniqueUsers.length} Trainees
                        </span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Completion Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={completionFilter}
                                onChange={e => setCompletionFilter(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="complete">Complete (100%)</option>
                                <option value="incomplete">Incomplete</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                        {/* Search */}
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search trainee..."
                                className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-4 pl-6 w-48 sticky left-0 bg-slate-50 z-10">Trainee</th>
                                    <th className="p-4 w-32">Department</th>
                                    <th className="p-4 w-32">Position</th>
                                    {allWeeks.map(week => (
                                        <th key={week} className="p-4 text-center w-24 border-l border-slate-100">Week {week}</th>
                                    ))}
                                    <th className="p-4 text-center w-32 border-l border-slate-100">Completion</th>
                                    <th className="p-4 text-center w-32 border-l border-slate-100">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(userId => {
                                    const userResponses = courseResponses.filter(r => r.userId === userId);
                                    const completedCount = userResponses.length;
                                    const completionRate = Math.round((completedCount / allWeeks.length) * 100);
                                    const userInfo = getUserInfo(userId);

                                    return (
                                        <tr key={userId} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 pl-6 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                                                        {userInfo.displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{userInfo.displayName}</div>
                                                        <div className="text-xs text-slate-400">ID: {userId.length > 15 ? userId.slice(0, 15) + '...' : userId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">
                                                {userInfo.department || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">
                                                {userInfo.position || <span className="text-slate-300">-</span>}
                                            </td>
                                            {allWeeks.map(week => {
                                                const hasResponse = userResponses.find(r => r.week === week);
                                                return (
                                                    <td key={week} className="p-4 text-center border-l border-slate-50">
                                                        {hasResponse ? (
                                                            <div className="inline-flex flex-col items-center cursor-pointer" onClick={() => handleViewDetail(hasResponse)}>
                                                                <CheckCircle size={20} className="text-emerald-500" />
                                                                <span className="text-[10px] text-emerald-600 font-medium mt-0.5">Done</span>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex flex-col items-center opacity-30">
                                                                <Circle size={20} className="text-slate-300" />
                                                                <span className="text-[10px] text-slate-400 mt-0.5">-</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 border-l border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${completionRate}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600">{completionRate}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4 border-l border-slate-100 text-center">
                                                <button
                                                    onClick={() => handleUserReport(userId)}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 mx-auto"
                                                >
                                                    <Eye size={14} />
                                                    View Report
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // =================================================================================
    // RENDER: 3b. USER REPORT VIEW (All weeks for one user)
    // =================================================================================
    if (viewMode === 'userReport' && selectedUserId) {
        const userAllResponses = courseResponses.filter(r => r.userId === selectedUserId).sort((a, b) => a.week - b.week);
        const selectedCourse = getSelectedCourse(selectedCourseId);
        const userInfo = getUserInfo(selectedUserId);

        return (
            <div className="space-y-6">
                {/* Custom Header with user info */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{userInfo.displayName}</h1>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span>ID: {selectedUserId.length > 20 ? selectedUserId.slice(0, 20) + '...' : selectedUserId}</span>
                                {userInfo.department && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{userInfo.department}</span>
                                )}
                                {userInfo.position && (
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">{userInfo.position}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={exportUserReport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-sm transition-colors"
                    >
                        <FileSpreadsheet size={18} />
                        Export Report
                    </button>
                </div>

                {userAllResponses.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="inline-flex p-4 bg-slate-100 rounded-full mb-4">
                            <FileText size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No Responses</h3>
                        <p className="text-slate-500 mt-2">ยังไม่มีคำตอบจากผู้ใช้คนนี้</p>
                    </div>
                ) : (
                    userAllResponses.map(response => {
                        const weekQuestions = getQuestionsForWeek(selectedCourseId, response.week);
                        const formId = selectedCourse?.weekForms?.[response.week];
                        const formName = formId ? formTemplates[formId]?.name : 'Unknown Form';

                        return (
                            <div key={response.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Week Header */}
                                <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                            <span className="text-indigo-600 font-bold text-lg">{response.week}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">Week {response.week}</h3>
                                            <p className="text-xs text-slate-500">{formName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Calendar size={14} />
                                        {response.submittedAt?.toLocaleDateString()} {response.submittedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                {/* Questions & Answers */}
                                <div className="p-6 space-y-4">
                                    {weekQuestions.length > 0 ? weekQuestions.map((q, idx) => {
                                        const answer = response.responses?.[idx];
                                        return (
                                            <div key={idx} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                                <div className="flex items-start gap-3">
                                                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-xs font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-700 text-sm">{q.text}</p>
                                                        <div className={clsx(
                                                            "mt-2 p-3 rounded-lg text-sm",
                                                            q.type === 'rating'
                                                                ? "bg-amber-50 text-amber-700 font-medium inline-block"
                                                                : "bg-slate-50 text-slate-700"
                                                        )}>
                                                            {q.type === 'rating' ? (
                                                                <span>★ {answer || '-'}</span>
                                                            ) : (
                                                                <span className="whitespace-pre-wrap">
                                                                    {Array.isArray(answer)
                                                                        ? answer.join(', ')
                                                                        : (answer !== null && answer !== undefined ? String(answer) : '-')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-slate-400 text-sm text-center py-4">ไม่พบข้อมูลคำถามสำหรับ Week นี้</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        );
    }

    // =================================================================================
    // RENDER: 3c. DETAIL MODE (Table for Specific Week)
    // =================================================================================
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {getCourseName(selectedCourseId)} / Week {selectedWeek}
                        </h1>
                        <p className="text-slate-500 text-sm">Viewing {filteredResponses.length} responses for Week {selectedWeek}</p>
                    </div>
                </div>
                <button
                    onClick={exportWeekResponses}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                    <FileSpreadsheet size={18} />
                    Export Excel
                </button>
            </div>

            {/* Quick Stats / Info for Course */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Group:</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-100 flex items-center gap-1">
                        <Folder size={12} />
                        Week {selectedWeek}
                    </span>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search student..."
                        className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table View (Reused) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="p-4 pl-6">Trainee</th>
                                <th className="p-4">Department</th>
                                <th className="p-4">Position</th>
                                <th className="p-4">Submitted At</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredResponses.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-3 bg-slate-50 rounded-full"><Search className="text-slate-300" size={24} /></div>
                                        <p>No responses found for Week {selectedWeek}.</p>
                                    </div>
                                </td></tr>
                            ) : (
                                filteredResponses.map(response => {
                                    const userInfo = getUserInfo(response.userId);
                                    return (
                                        <tr key={response.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => handleViewDetail(response)}>
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-inner border border-white/50">
                                                        {userInfo.displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-700">{userInfo.displayName}</div>
                                                        <div className="text-xs text-slate-400">ID: {response.userId?.length > 15 ? response.userId.slice(0, 15) + '...' : response.userId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">
                                                {userInfo.department || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">
                                                {userInfo.position || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {response.submittedAt?.toLocaleDateString()}
                                                    <span className="text-slate-300 text-xs px-1 border-l border-slate-200 ml-1">
                                                        {response.submittedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleViewDetail(response); }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal (Same as before) */}
            {isModalOpen && selectedResponse && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Response Detail</h2>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    {getCourseName(selectedResponse.courseId)}
                                    <span className="text-slate-300 mx-2">/</span>
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold tracking-wide uppercase">Week {selectedResponse.week}</span>
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                            {/* User Info Card */}
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                    <User />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{selectedResponse.userId || 'Anonymous'}</h3>
                                    <p className="text-xs text-slate-400">ID: {selectedResponse.userId}</p>
                                </div>
                                <div className="ml-auto text-right text-xs text-slate-500">
                                    <p>Submitted</p>
                                    <p className="font-semibold">{selectedResponse.submittedAt?.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Questions & Answers */}
                            {getQuestionsForWeek(selectedResponse.courseId, selectedResponse.week).map((question, index) => (
                                <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center text-xs font-bold border border-indigo-100">
                                            Q{index + 1}
                                        </span>
                                        <h3 className="font-bold text-slate-700 text-sm leading-relaxed">{question.text}</h3>
                                    </div>
                                    <div className="ml-9">
                                        {question.type === 'rating' ? (
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <div
                                                        key={star}
                                                        className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border transition-all",
                                                            selectedResponse.responses[index] == star
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                                                                : "bg-white text-slate-300 border-slate-100"
                                                        )}
                                                    >
                                                        {star}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 text-sm font-medium">
                                                {selectedResponse.responses[index] || '-'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
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

export default ResponseViewer;
