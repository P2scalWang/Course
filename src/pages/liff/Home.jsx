import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Search from 'lucide-react/dist/esm/icons/search';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Users from 'lucide-react/dist/esm/icons/users';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Zap from 'lucide-react/dist/esm/icons/zap';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';

const LiffHome = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { userProfile, profile } = useOutletContext();
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {

            try {
                const snapshot = await getDocs(collection(db, 'courses'));
                const allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter open courses and sort by date
                const openCourses = allCourses
                    .filter(c => c.status === 'open')
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                setCourses(openCourses);
            } catch (error) {
                console.error("Error fetching courses:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const displayName = userProfile?.displayName || profile?.displayName || 'Guest';
    const displayImage = profile?.pictureUrl;

    // Filter courses based on search term
    const filteredCourses = courses.filter(course => {
        const term = searchTerm.toLowerCase();
        return course.title?.toLowerCase().includes(term) ||
            course.description?.toLowerCase().includes(term);
    });

    return (
        <div className="bg-slate-50 min-h-screen pb-32">
            {/* Elegant Header */}
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

                {/* Modern Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหาคอร์สเรียน..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 mt-8 space-y-8">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100/50 text-indigo-600 rounded-lg">
                            <Zap size={16} fill="currentColor" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">คอร์สที่เปิดรับสมัคร</h2>
                    </div>
                    {/* <button className="text-indigo-600 text-xs font-bold hover:underline">ดูทั้งหมด</button> */}
                </div>

                {/* Course List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white rounded-3xl animate-pulse shadow-sm"></div>
                        ))}
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Calendar size={32} />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-1">ไม่พบคอร์สที่ค้นหา</h3>
                        <p className="text-slate-400 text-sm">ลองเปลี่ยนคำค้นหาดูใหม่</p>
                    </div>
                ) : (
                    <div className="grid gap-5">
                        {filteredCourses.map(course => (
                            <div
                                key={course.id}
                                onClick={() => navigate(`/liff/course/${course.id}`)}
                                className="group bg-white rounded-[2rem] p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-indigo-100 hover:shadow-[0_10px_30px_-5px_rgba(79,70,229,0.1)] transition-all duration-300 cursor-pointer active:scale-[0.98] relative overflow-hidden"
                            >
                                {/* Active Indicator Bar */}
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2">
                                            Workshop
                                        </span>
                                        <h3 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                                            {course.title}
                                        </h3>
                                    </div>
                                    <div className="flex-shrink-0 flex flex-col items-center bg-slate-50 rounded-2xl p-2.5 min-w-[3.5rem] border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                            {new Date(course.date).toLocaleString('en-US', { month: 'short' })}
                                        </span>
                                        <span className="text-xl font-extrabold text-slate-800">
                                            {new Date(course.date).getDate()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={14} className="text-slate-400" />
                                        <span>รับ {course.capacity} คน</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span>On-site</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiffHome;
