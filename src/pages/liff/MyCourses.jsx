import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { registrationService } from '../../services/registrationService';
import { liffService } from '../../services/liffService';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Clock from 'lucide-react/dist/esm/icons/clock';

const LiffMyCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyCourses = async () => {
            try {
                // Start pulling all courses immediately (independent of user)
                const allCoursesPromise = courseService.getAllCourses();

                await liffService.init();
                const profile = await liffService.getProfile();
                const userId = profile?.userId || 'anonymous';

                // Fetch registrations after we have user ID
                const [registrations, allCourses] = await Promise.all([
                    registrationService.getMyRegistrations(userId),
                    allCoursesPromise
                ]);

                const courseIds = new Set(registrations.map(r => r.courseId));

                // Sort by date descending for "My Courses" generally (or upcoming first)
                const myCourses = allCourses
                    .filter(c => courseIds.has(c.id))
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                setCourses(myCourses);
            } catch (error) {
                console.error("Error loading my courses", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMyCourses();
    }, []);

    if (loading) return (
        <div className="p-8 text-center space-y-4">
            <div className="h-24 bg-slate-200 rounded-2xl animate-pulse"></div>
            <div className="h-24 bg-slate-200 rounded-2xl animate-pulse"></div>
        </div>
    );

    return (
        <div className="px-6 pt-12 min-h-screen bg-slate-50 pb-32">
            <h1 className="text-2xl font-extrabold text-slate-800 mb-6">คอร์สของฉัน</h1>

            {courses.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm mt-8">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-300">
                        <BookOpen size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">ยังไม่มีคอร์สเรียน</h3>
                    <p className="text-slate-400 text-sm mb-6">คุณยังไม่ได้ลงทะเบียนคอร์สใดๆ</p>
                    <Link to="/liff" className="inline-flex py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-all">
                        สำรวจคอร์สเรียน
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {courses.map(course => (
                        <Link
                            key={course.id}
                            to={`/liff/course/${course.id}`}
                            className="group block bg-white rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-indigo-200 hover:shadow-[0_10px_25px_-5px_rgba(79,70,229,0.15)] transition-all duration-300 active:scale-[0.98] relative overflow-hidden"
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
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiffMyCourses;
