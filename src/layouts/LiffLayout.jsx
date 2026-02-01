import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Home from 'lucide-react/dist/esm/icons/home';
import Book from 'lucide-react/dist/esm/icons/book';
import User from 'lucide-react/dist/esm/icons/user';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import clsx from 'clsx';
import { liffService } from '../services/liffService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const LiffLayout = () => {
    const [isReady, setIsReady] = useState(false);
    const [profile, setProfile] = useState(null); // LINE profile
    const [userProfile, setUserProfile] = useState(null); // Firebase user profile
    const hasRedirected = useRef(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const initLiff = async () => {
            try {
                await liffService.init();
                const lineProfile = await liffService.getProfile();
                setProfile(lineProfile);

                if (lineProfile?.userId) {
                    const userDoc = await getDoc(doc(db, 'users', lineProfile.userId));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data());
                    } else {
                        if (!hasRedirected.current && !location.pathname.includes('/profile')) {
                            hasRedirected.current = true;
                            navigate('/liff/profile', { replace: true });
                        }
                    }
                }
                setIsReady(true);
            } catch (error) {
                console.error('LIFF Init failed', error);
                setIsReady(true);
            }
        };
        initLiff();
    }, []);

    if (!isReady) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-medium animate-pulse">Loading App...</p>
        </div>
    );

    const hideBottomNav = location.pathname.includes('/assessment') || location.pathname.includes('/course/');

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-0 safe-area-inset-bottom">
            <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl overflow-hidden relative border-x border-slate-200/50">
                {/* Content */}
                <div className="animate-fade-in min-h-screen">
                    <Outlet context={{ profile, userProfile, setUserProfile }} />
                </div>

                {/* Bottom Navigation */}
                {!hideBottomNav && (
                    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
                        {/* Gradient Fade above nav */}
                        <div className="h-12 bg-gradient-to-t from-white to-transparent pointer-events-none absolute -top-12 inset-x-0" />

                        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-3 pb-8 md:pb-4 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-2xl">
                            <NavItem to="/liff" icon={<Home size={22} />} label="หน้าแรก" />
                            <NavItem to="/liff/my-courses" icon={<Book size={22} />} label="คอร์สของฉัน" />
                            <NavItem
                                to="/liff/profile"
                                icon={profile?.pictureUrl ? (
                                    <img src={profile.pictureUrl} alt="" className="w-6 h-6 rounded-full border border-slate-200 object-cover" />
                                ) : (
                                    <User size={22} />
                                )}
                                label="โปรไฟล์"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const NavItem = ({ to, icon, label }) => (
    <NavLink
        to={to}
        end={to === '/liff'}
        className={({ isActive }) => clsx(
            "flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all duration-300 relative group",
            isActive ? "text-indigo-600 font-bold" : "text-slate-400 font-medium hover:text-slate-600"
        )}
    >
        {({ isActive }) => (
            <>
                <div className={clsx(
                    "transition-all duration-300 transform",
                    isActive ? "scale-110 -translate-y-0.5" : "scale-100 group-active:scale-95"
                )}>
                    {icon}
                </div>
                <span className="text-[10px] tracking-wide">{label}</span>
                {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full animate-fade-in"></span>
                )}
            </>
        )}
    </NavLink>
);

export default LiffLayout;
