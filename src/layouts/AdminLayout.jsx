import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Users from 'lucide-react/dist/esm/icons/users';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Table from 'lucide-react/dist/esm/icons/table';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

import { ROLES, PERMISSIONS } from '../lib/permissions';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/admin/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navItems = [
        {
            path: '/admin',
            label: 'Dashboard',
            icon: LayoutDashboard,
            allowedRoles: PERMISSIONS.VIEW_DASHBOARD
        },
        {
            path: '/admin/courses',
            label: 'Manage Courses',
            icon: BookOpen,
            allowedRoles: PERMISSIONS.MANAGE_COURSES
        },
        {
            path: '/admin/forms',
            label: 'Form Builder',
            icon: FileText,
            allowedRoles: PERMISSIONS.MANAGE_FORMS
        },
        {
            path: '/admin/responses',
            label: 'View Responses',
            icon: ClipboardList,
            allowedRoles: PERMISSIONS.VIEW_RESPONSES
        },
        {
            path: '/admin/response-table',
            label: 'Response Table',
            icon: Table,
            allowedRoles: PERMISSIONS.VIEW_RESPONSES
        },
        {
            path: '/admin/calendar',
            label: 'Calendar',
            icon: CalendarIcon,
            allowedRoles: PERMISSIONS.VIEW_RESPONSES
        },
        {
            path: '/admin/trainees',
            label: 'Trainee List',
            icon: Users,
            allowedRoles: PERMISSIONS.MANAGE_TRAINEES
        },
    ];

    // Filter nav items based on user role
    const filteredNavItems = navItems.filter(item => {
        if (!currentUser?.role) return false;
        // If no allowedRoles specified, assume accessible by all authenticated users (or restrict)
        // Here we restrict to only roles explicit in PERMISSIONS
        return item.allowedRoles.includes(currentUser.role);
    });

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const getCurrentPageName = () => {
        const current = navItems.find(item => item.path === location.pathname);
        return current ? current.label : '';
    };

    return (
        <div className="h-screen bg-slate-50 flex font-sans overflow-hidden">
            {/* Sidebar */}
            <aside
                className={clsx(
                    "fixed md:relative z-30 h-screen bg-white shadow-xl md:shadow-none border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0",
                    isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-20 md:translate-x-0 overflow-hidden"
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200">
                            C
                        </div>
                        <span className={clsx("font-bold text-xl text-slate-800 tracking-tight transition-opacity duration-200", !isSidebarOpen && "md:hidden opacity-0")}>
                            CourseFlow
                        </span>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-indigo-50 text-indigo-600 shadow-sm font-semibold"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon
                                size={22}
                                className={clsx("transition-colors flex-shrink-0", ({ isActive }) => isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")}
                            />
                            <span className={clsx("whitespace-nowrap transition-opacity duration-200", !isSidebarOpen && "md:hidden opacity-0")}>
                                {item.label}
                            </span>

                            {/* Tooltip for collapsed mode */}
                            {!isSidebarOpen && (
                                <div className="hidden md:block absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer User Profile */}
                <div className="p-4 border-t border-slate-100 flex-shrink-0">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                            {currentUser?.email?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className={clsx("flex-1 overflow-hidden transition-opacity duration-200", !isSidebarOpen && "md:hidden opacity-0")}>
                            {/* Show Role Badge */}
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-700 truncate">
                                    {currentUser?.role === ROLES.ADMIN ? 'Admin' : 'Staff'}
                                </p>
                                <span className={clsx(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider",
                                    currentUser?.role === ROLES.ADMIN ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                                )}>
                                    {currentUser?.role}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">{currentUser?.email || 'user@courseflow.com'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="ออกจากระบบ"
                            className={clsx("p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all", !isSidebarOpen && "md:hidden opacity-0")}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md z-20 border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none"
                        >
                            {isSidebarOpen ? <Menu size={20} /> : <ChevronRight size={20} />}
                        </button>
                        <h1 className="text-lg font-semibold text-slate-800">{getCurrentPageName()}</h1>
                    </div>
                </header>

                {/* Content - Scrollable */}
                <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;
