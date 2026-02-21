import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { registrationService } from '../../services/registrationService';
import { liffService } from '../../services/liffService';
import Search from 'lucide-react/dist/esm/icons/search';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Users from 'lucide-react/dist/esm/icons/users';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Key from 'lucide-react/dist/esm/icons/key';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import X from 'lucide-react/dist/esm/icons/x';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';

const LiffHome = () => {
    const [myCourses, setMyCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();
    const { userProfile, profile } = useOutletContext();

    // Add Course Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [keyInput, setKeyInput] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState('');

    useEffect(() => {
        fetchMyCourses();
    }, []);

    const fetchMyCourses = async () => {
        try {
            // Start LIFF init first (independent)
            await liffService.init();
            const liffProfile = await liffService.getProfile();
            const uid = liffProfile?.userId || 'anonymous';
            setUserId(uid);

            // Parallel fetch: registrations and courses at the same time (async-parallel)
            const [registrations, allCourses] = await Promise.all([
                registrationService.getMyRegistrations(uid),
                courseService.getAllCourses()
            ]);

            // Use Set for O(1) lookups instead of Array.includes (js-set-map-lookups)
            const courseIdsSet = new Set(registrations.map(r => r.courseId));

            if (courseIdsSet.size === 0) {
                setMyCourses([]);
                setLoading(false);
                return;
            }

            const userCourses = allCourses
                .filter(c => courseIdsSet.has(c.id))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            setMyCourses(userCourses);
        } catch (error) {
            console.error("Error fetching my courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourse = async () => {
        if (!keyInput.trim()) {
            setAddError('กรุณากรอก Registration Key');
            return;
        }

        setAddLoading(true);
        setAddError('');
        setAddSuccess('');

        try {
            // Find course by key
            const course = await courseService.getCourseByKey(keyInput.trim());

            if (!course) {
                setAddError('ไม่พบคอร์สที่ตรงกับ Key นี้');
                setAddLoading(false);
                return;
            }

            // Check if already registered
            const alreadyRegistered = await registrationService.checkRegistration(userId, course.id);
            if (alreadyRegistered) {
                setAddError('คุณลงทะเบียนคอร์สนี้แล้ว');
                setAddLoading(false);
                return;
            }

            // Register
            await registrationService.register(userId, course.id);

            setAddSuccess(`เพิ่มคอร์ส "${course.title}" สำเร็จ!`);
            setKeyInput('');

            // Refresh list
            await fetchMyCourses();

            // Auto close modal after 1.5s
            setTimeout(() => {
                setShowAddModal(false);
                setAddSuccess('');
            }, 1500);

        } catch (error) {
            console.error("Error adding course:", error);
            setAddError('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setAddLoading(false);
        }
    };

    const displayName = userProfile?.displayName || profile?.displayName || 'Guest';
    const displayImage = profile?.pictureUrl;

    return (
        <div className="bg-slate-50 min-h-screen pb-32">
            {/* Header */}
            <div className="bg-white px-6 pt-14 pb-8 rounded-b-[2.5rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-20">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">ยินดีต้อนรับกลับ,</p>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                            {displayName}
                        </h1>
                    </div>
                    {displayImage && (
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                            <img src={displayImage} alt="Profile" className="relative w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" />
                        </div>
                    )}
                </div>

                {/* Add Course Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all"
                >
                    <Key size={20} />
                    เพิ่มคอร์สด้วย Key
                </button>
            </div>

            {/* Content Section */}
            <div className="px-6 mt-8 space-y-8">
                {/* Section Header */}
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100/50 text-indigo-600 rounded-lg">
                        <BookOpen size={16} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">คอร์สของฉัน</h2>
                </div>

                {/* Course List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-white rounded-3xl animate-pulse shadow-sm"></div>
                        ))}
                    </div>
                ) : myCourses.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-300">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">ยังไม่มีคอร์สเรียน</h3>
                        <p className="text-slate-400 text-sm mb-6">กดปุ่ม "เพิ่มคอร์สด้วย Key" เพื่อเริ่มต้น</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                        >
                            <Key size={18} />
                            เพิ่มคอร์ส
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {myCourses.map(course => (
                            <div
                                key={course.id}
                                onClick={() => navigate(`/liff/course/${course.id}`)}
                                className="group bg-white rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-indigo-200 hover:shadow-[0_10px_25px_-5px_rgba(79,70,229,0.15)] transition-all duration-300 cursor-pointer active:scale-[0.98] relative overflow-hidden"
                            >
                                {/* Decorative blur */}
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>

                                <div className="relative flex items-center gap-5">
                                    {/* Icon/Date */}
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
                                        <span className="text-[10px] font-bold opacity-80 uppercase">
                                            {new Date(course.date).toLocaleString('en-US', { month: 'short' })}
                                        </span>
                                        <span className="text-xl font-bold">
                                            {new Date(course.date).getDate()}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate mb-1 text-lg group-hover:text-indigo-700 transition-colors">
                                            {course.title}
                                        </h3>

                                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">
                                                <CheckCircle size={12} />
                                                Registered
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                09:00 - 16:00
                                            </span>
                                        </div>
                                    </div>

                                    <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                </div>

                                {/* Footer hint */}
                                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">แตะเพื่อดูรายละเอียด</span>
                                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:underline">
                                        ดูคอร์ส <ChevronRight size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Course Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center">
                    <div className="bg-white w-full max-w-md rounded-t-[2rem] p-6 pb-10 animate-slide-up">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-800">เพิ่มคอร์สใหม่</h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setAddError('');
                                    setAddSuccess('');
                                    setKeyInput('');
                                }}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Input */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Registration Key
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Key size={20} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="กรอก Key ที่ได้รับ..."
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {addError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                                {addError}
                            </div>
                        )}

                        {/* Success Message */}
                        {addSuccess && (
                            <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium flex items-center gap-2">
                                <CheckCircle size={18} />
                                {addSuccess}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleAddCourse}
                            disabled={addLoading}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {addLoading ? 'กำลังตรวจสอบ...' : 'เพิ่มคอร์ส'}
                        </button>
                    </div>
                </div>
            )}

            {/* CSS for animation */}
            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default LiffHome;
