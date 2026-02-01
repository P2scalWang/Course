import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import User from 'lucide-react/dist/esm/icons/user';
import Save from 'lucide-react/dist/esm/icons/save';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Camera from 'lucide-react/dist/esm/icons/camera';

const LiffProfile = () => {
    const navigate = useNavigate();
    const { profile: lineProfile, userProfile, setUserProfile } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);

    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        email: '',
        department: '',
        position: ''
    });

    useEffect(() => {
        const loadProfile = async () => {
            if (!lineProfile?.userId) {
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'users', lineProfile.userId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        displayName: data.displayName || lineProfile.displayName || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        department: data.department || '',
                        position: data.position || ''
                    });
                    setIsNewUser(false);
                } else {
                    setFormData({
                        displayName: lineProfile.displayName || '',
                        phone: '',
                        email: '',
                        department: '',
                        position: ''
                    });
                    setIsNewUser(true);
                }
            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [lineProfile]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!lineProfile?.userId) return;

        setSaving(true);
        try {
            const userData = {
                ...formData,
                lineUserId: lineProfile.userId,
                linePictureUrl: lineProfile.pictureUrl,
                lineDisplayName: lineProfile.displayName,
                updatedAt: new Date()
            };

            if (isNewUser) {
                userData.createdAt = new Date();
            }

            await setDoc(doc(db, 'users', lineProfile.userId), userData, { merge: true });
            if (setUserProfile) setUserProfile(userData);

            navigate('/liff');
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Error saving profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Header / Cover */}
            <div className="bg-indigo-600 h-48 relative overflow-hidden rounded-b-[2rem] shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-8 -mb-8"></div>

                <div className="relative z-10 p-6 pt-12 flex items-center gap-4">
                    {!isNewUser && (
                        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-xl font-bold text-white">
                        {isNewUser ? 'ลงทะเบียนสมาชิก' : 'แก้ไขโปรไฟล์'}
                    </h1>
                </div>
            </div>

            {/* Profile Avatar Card */}
            <div className="px-6 -mt-16 relative z-20">
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 flex flex-col items-center">
                    <div className="relative mb-4">
                        <div className="p-1 bg-white rounded-full shadow-sm">
                            <img
                                src={lineProfile?.pictureUrl}
                                alt="Profile"
                                className="w-24 h-24 rounded-full border-4 border-indigo-50"
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <Camera size={14} />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">{lineProfile?.displayName}</h2>
                    <p className="text-sm text-slate-400 font-medium">LINE User</p>
                </div>
            </div>

            {/* Form */}
            <div className="px-6 mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Info Group */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">ข้อมูลส่วนตัว</h3>

                        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 space-y-2">
                            <div className="relative">
                                <div className="absolute top-3.5 left-4 text-slate-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-800 font-medium placeholder:text-slate-300 outline-none border-b border-slate-100 last:border-0 focus:bg-slate-50 rounded-xl transition-colors"
                                    placeholder="ชื่อ-นามสกุล"
                                    value={formData.displayName}
                                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute top-3.5 left-4 text-slate-400">
                                    <Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-800 font-medium placeholder:text-slate-300 outline-none border-b border-slate-100 last:border-0 focus:bg-slate-50 rounded-xl transition-colors"
                                    placeholder="เบอร์โทรศัพท์"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute top-3.5 left-4 text-slate-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-800 font-medium placeholder:text-slate-300 outline-none rounded-xl focus:bg-slate-50 transition-colors"
                                    placeholder="อีเมล"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Work Info Group */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">ข้อมูลงาน</h3>

                        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 space-y-2">
                            <div className="relative">
                                <div className="absolute top-3.5 left-4 text-slate-400">
                                    <Building2 size={18} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-800 font-medium placeholder:text-slate-300 outline-none border-b border-slate-100 last:border-0 focus:bg-slate-50 rounded-xl transition-colors"
                                    placeholder="แผนก / ฝ่าย"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute top-3.5 left-4 text-slate-400">
                                    <Briefcase size={18} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-800 font-medium placeholder:text-slate-300 outline-none rounded-xl focus:bg-slate-50 transition-colors"
                                    placeholder="ตำแหน่ง"
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 mt-8 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save size={20} />
                                {isNewUser ? 'เริ่มต้นใช้งาน' : 'บันทึกการเปลี่ยนแปลง'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LiffProfile;
