import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { registrationService } from '../../services/registrationService';
import { liffService } from '../../services/liffService';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Users from 'lucide-react/dist/esm/icons/users';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Key from 'lucide-react/dist/esm/icons/key';
import Lock from 'lucide-react/dist/esm/icons/lock';
import X from 'lucide-react/dist/esm/icons/x';
import clsx from 'clsx';

import SystemModal from '../../components/SystemModal';

const CourseDetail = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [profile, setProfile] = useState(null);

    // Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // success, error, confirm
        onConfirm: null
    });

    // Key Validation
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [keyInput, setKeyInput] = useState('');
    const [keyError, setKeyError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                // async-parallel: Start independent tasks immediately
                const profilePromise = liffService.init().then(() => liffService.getProfile());
                const coursePromise = getDoc(doc(db, 'courses', courseId));

                // Wait for profile to check registration
                const userProfile = await profilePromise;
                setProfile(userProfile);

                // Start registration check immediately upon profile availablity, 
                // while course might still be loading (async-dependencies)
                const registrationPromise = userProfile
                    ? registrationService.checkRegistration(userProfile.userId, courseId)
                    : Promise.resolve(false);

                // Wait for course and registration check in parallel
                const [courseDoc, registered] = await Promise.all([
                    coursePromise,
                    registrationPromise
                ]);

                if (courseDoc.exists()) {
                    setCourse({ id: courseDoc.id, ...courseDoc.data() });
                    setIsRegistered(registered);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [courseId]);

    const handleRegisterClick = () => {
        if (!profile) return liffService.login();
        // If course has no key (legacy), proceed directly
        if (!course.registrationKey) {
            handleRegisterSubmit();
        } else {
            setKeyInput('');
            setKeyError('');
            setShowKeyModal(true);
        }
    };

    const handleRegisterSubmit = () => {
        // Show confirmation modal instead of window.confirm
        setModalConfig({
            isOpen: true,
            title: 'ยืนยันการลงทะเบียน',
            message: `ต้องการลงทะเบียนเรียนคอร์ส "${course.title}" ใช่หรือไม่?`,
            type: 'confirm',
            confirmText: 'ยืนยันลงทะเบียน',
            onConfirm: performRegistration
        });
    };

    const performRegistration = async () => {
        setRegistering(true);
        // Close confirm modal first
        setModalConfig(prev => ({ ...prev, isOpen: false }));

        try {
            await registrationService.register(profile.userId, course.id);
            setIsRegistered(true);
            setShowKeyModal(false);

            // Show success modal
            setModalConfig({
                isOpen: true,
                title: 'ลงทะเบียนสำเร็จ',
                message: 'คุณได้ลงทะเบียนคอร์สนี้เรียบร้อยแล้ว',
                type: 'success',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error) {
            // Show error modal
            setModalConfig({
                isOpen: true,
                title: 'เกิดข้อผิดพลาด',
                message: error.message || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง',
                type: 'error',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setRegistering(false);
        }
    };

    const validateKeyAndRegister = () => {
        if (keyInput.trim().toUpperCase() === course.registrationKey) {
            handleRegisterSubmit();
        } else {
            setKeyError('รหัสไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!course) return (
        <div className="min-h-screen flex items-center justify-center flex-col p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบคอร์สเรียน</h2>
            <button onClick={() => navigate(-1)} className="text-indigo-600 font-bold">กลับหน้าหลัก</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 relative pb-safe">
            {/* Immersive Header */}
            <div className="bg-[#1a1c2e] text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-violet-900/90 z-10"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>

                {/* Nav */}
                <div className="relative z-20 px-6 pt-12 pb-6 flex justify-between items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <button className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                        <Share2 size={20} />
                    </button>
                </div>

                {/* Hero Content */}
                <div className="relative z-20 px-6 pb-20 pt-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-4">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-[10px] font-bold uppercase tracking-wide">Course Open</span>
                    </div>
                    <h1 className="text-3xl font-bold leading-tight mb-4 text-shadow-sm">
                        {course.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-indigo-100 font-medium">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={16} />
                            {course.date}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} />
                            09:00 - 16:00
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body (Overlapping) */}
            <div className="relative z-30 -mt-12 px-6 pb-32">
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 space-y-8">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Capacity</p>
                                <p className="text-sm font-bold text-slate-800">{course.capacity} ที่นั่ง</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Location</p>
                                <p className="text-sm font-bold text-slate-800">On-site</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                            รายละเอียด
                        </h3>
                        <div className="text-slate-600 text-sm leading-relaxed p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                            {course.description || 'ไม่มีรายละเอียดเพิ่มเติมสำหรับคอร์สนี้'}
                        </div>
                    </div>

                    {/* Instructor (Mock) */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-3">ผู้สอน</h3>
                        <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl">
                            <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Instructor" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">อ.ผู้เชี่ยวชาญ พิเศษ</p>
                                <p className="text-xs text-slate-500">Senior Software Engineer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white p-4 border-t border-slate-100 pb-safe z-40">
                {isRegistered ? (
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate(`/liff/assessment/${courseId}`)}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <FileText size={20} />
                            ทำแบบประเมิน
                        </button>
                        <p className="text-center text-xs text-slate-400">เลื่อนขึ้นเพื่ออ่านรายละเอียดคอร์ส</p>
                    </div>
                ) : (
                    <button
                        onClick={handleRegisterClick}
                        disabled={course.status !== 'open' || registering}
                        className={clsx(
                            "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg",
                            course.status === 'open'
                                ? "bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-slate-200"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        )}
                    >
                        {registering ? 'กำลังบันทึก...' : course.status === 'open' ? 'ลงทะเบียนทันที' : 'ปิดรับสมัคร'}
                    </button>
                )}
            </div>

            {/* Key Validation Modal */}
            {showKeyModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">กรุณาระบุรหัสลงทะเบียน</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                คอร์สนี้ต้องใช้รหัสเพื่อลงทะเบียน (ขอรับรหัสจากผู้ดูแลระบบ)
                            </p>

                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    className={clsx(
                                        "w-full text-center px-4 py-3 bg-slate-50 border-2 rounded-xl text-lg font-bold tracking-widest uppercase focus:outline-none focus:ring-4 transition-all",
                                        keyError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-600" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 text-slate-700"
                                    )}
                                    placeholder="ENTER CODE"
                                    maxLength={6}
                                    value={keyInput}
                                    onChange={(e) => {
                                        setKeyInput(e.target.value.toUpperCase());
                                        setKeyError('');
                                    }}
                                />
                                {keyError && (
                                    <p className="text-rose-500 text-xs mt-2 font-medium">{keyError}</p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setShowKeyModal(false)}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={validateKeyAndRegister}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                            >
                                ยืนยันรหัส
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* System Modal for Alerts/Confirms */}
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

export default CourseDetail;
