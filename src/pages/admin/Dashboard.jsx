import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Users from 'lucide-react/dist/esm/icons/users';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import { Link } from 'react-router-dom';
import DevSeeder from '../../components/DevSeeder';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-sm">
                <span className="text-emerald-500 flex items-center font-medium">
                    <TrendingUp size={16} className="mr-1" />
                    {trend}
                </span>
                <span className="text-slate-400 ml-2">from last month</span>
            </div>
        )}
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        courses: 0,
        activeCourses: 0,
        trainees: 0, // Placeholder
        responses: 0
    });
    const [recentCourses, setRecentCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Async-parallel: Fetch all data concurrently
                const [coursesSnapshot, responsesSnapshot, registrationsSnapshot, usersSnapshot] = await Promise.all([
                    getDocs(collection(db, 'courses')),
                    getDocs(collection(db, 'responses')),
                    getDocs(collection(db, 'registrations')),
                    getDocs(collection(db, 'users'))
                ]);

                const courses = coursesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // Count unique trainees from registrations OR users collection
                const uniqueUserIds = new Set(registrationsSnapshot.docs.map(d => d.data().userId));
                const traineeCount = Math.max(uniqueUserIds.size, usersSnapshot.size);

                setStats({
                    courses: courses.length,
                    activeCourses: courses.filter(c => c.status === 'open').length,
                    trainees: traineeCount,
                    responses: responsesSnapshot.size
                });

                // Get recent 5 courses
                setRecentCourses(courses.slice(0, 5));

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="p-12 text-center text-slate-400">Loading dashboard...</div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
                <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Courses"
                    value={stats.courses}
                    icon={BookOpen}
                    color="bg-blue-500 text-blue-600"
                />
                <StatCard
                    title="Active Classes"
                    value={stats.activeCourses}
                    icon={CheckCircle}
                    color="bg-emerald-500 text-emerald-600"
                />
                <StatCard
                    title="Total Trainees"
                    value={stats.trainees}
                    icon={Users}
                    color="bg-violet-500 text-violet-600"
                />
                <StatCard
                    title="Assessments"
                    value={stats.responses}
                    icon={FileText}
                    color="bg-amber-500 text-amber-600"
                />
            </div>

            {/* Recent Activity / Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Courses List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Recent Courses</h3>
                        <Link to="/admin/courses" className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
                            View All <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentCourses.map(course => (
                            <div key={course.id} className="group flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{course.title}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} /> {course.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={14} /> {course.capacity} seats
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${course.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {course.status === 'open' ? 'OPEN' : 'CLOSED'}
                                </div>
                            </div>
                        ))}
                        {recentCourses.length === 0 && <div className="text-center text-slate-400 py-4">No courses yet.</div>}
                    </div>
                </div>

                {/* Quick Actions (Sidebar Widget) */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-xl mb-2">Quick Actions</h3>
                        <p className="text-indigo-100 text-sm mb-6">Manage your training center efficiently.</p>

                        <div className="space-y-3">
                            <Link to="/admin/courses" className="block w-full py-3 px-4 bg-white/10 backdrop-blur hover:bg-white/20 rounded-xl text-sm font-medium transition-colors border border-white/10">
                                + Create New Course
                            </Link>
                            <Link to="/admin/forms" className="block w-full py-3 px-4 bg-white/10 backdrop-blur hover:bg-white/20 rounded-xl text-sm font-medium transition-colors border border-white/10">
                                📝 Build Assessment Form
                            </Link>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-indigo-200">Next Scheduled Class</p>
                                <p className="font-semibold">Digital Marketing 101</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DevSeeder />
        </div>
    );
};

export default Dashboard;
