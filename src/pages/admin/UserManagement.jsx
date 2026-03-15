import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { companyService } from '../../services/companyService';
import { ROLES } from '../../lib/permissions';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import X from 'lucide-react/dist/esm/icons/x';
import Shield from 'lucide-react/dist/esm/icons/shield';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Users from 'lucide-react/dist/esm/icons/users';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import clsx from 'clsx';
import SystemModal from '../../components/SystemModal';

const ROLE_CONFIG = {
    [ROLES.ADMIN]: { label: 'Admin', color: 'indigo', icon: ShieldCheck, description: 'เพิ่ม/แก้/ลบ ได้ทุกอย่าง' },
    [ROLES.VIEWER]: { label: 'Viewer', color: 'blue', icon: Eye, description: 'ดู Responses ได้เฉพาะ Company ที่กำหนด' },
    [ROLES.STAFF]: { label: 'Staff', color: 'slate', icon: Shield, description: 'Legacy role' },
};

const UserManagement = () => {
    const { createUser, currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null = create, object = edit
    const [formData, setFormData] = useState({ email: '', password: '', role: ROLES.VIEWER, companyId: '' });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // System Modal
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [roleSnap, companiesData] = await Promise.all([
                getDocs(query(collection(db, 'role'))),
                companyService.getAllCompanies()
            ]);
            const usersData = roleSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
            setUsers(usersData);
            setCompanies(companiesData);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCompanyName = (companyId) => {
        if (!companyId) return '-';
        const company = companies.find(c => c.id === companyId);
        return company?.name || companyId;
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ email: '', password: '', role: ROLES.VIEWER, companyId: '' });
        setFormError('');
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({ email: user.email || '', password: '', role: user.role || ROLES.VIEWER, companyId: user.companyId || '' });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        // Validation
        if (formData.role === ROLES.VIEWER && !formData.companyId) {
            setFormError('กรุณาเลือก Company สำหรับ Viewer');
            return;
        }

        setFormLoading(true);
        try {
            if (editingUser) {
                // Update existing user role doc
                await updateDoc(doc(db, 'role', editingUser.uid), {
                    role: formData.role,
                    companyId: formData.role === ROLES.VIEWER ? formData.companyId : null,
                });
                setModalConfig({
                    isOpen: true,
                    title: 'อัปเดตสำเร็จ',
                    message: `อัปเดตสิทธิ์ของ ${formData.email} เรียบร้อยแล้ว`,
                    type: 'success',
                    onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            } else {
                // Create new user
                if (!formData.email || !formData.password) {
                    setFormError('กรุณากรอก Email และ Password');
                    setFormLoading(false);
                    return;
                }
                if (formData.password.length < 6) {
                    setFormError('Password ต้องมีอย่างน้อย 6 ตัวอักษร');
                    setFormLoading(false);
                    return;
                }

                await createUser(
                    formData.email,
                    formData.password,
                    formData.role,
                    formData.role === ROLES.VIEWER ? formData.companyId : null
                );

                setModalConfig({
                    isOpen: true,
                    title: 'สร้าง User สำเร็จ',
                    message: `สร้าง ${formData.email} เรียบร้อยแล้ว`,
                    type: 'success',
                    onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error:', error);
            if (error.code === 'auth/email-already-in-use') {
                setFormError('Email นี้ถูกใช้งานแล้ว');
            } else if (error.code === 'auth/weak-password') {
                setFormError('Password ต้องมีอย่างน้อย 6 ตัวอักษร');
            } else if (error.code === 'auth/invalid-email') {
                setFormError('รูปแบบ Email ไม่ถูกต้อง');
            } else {
                setFormError(error.message || 'เกิดข้อผิดพลาด');
            }
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = (user) => {
        if (user.uid === currentUser?.uid) {
            setModalConfig({
                isOpen: true,
                title: 'ไม่สามารถลบได้',
                message: 'ไม่สามารถลบบัญชีของตัวเองได้',
                type: 'error',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }
        setModalConfig({
            isOpen: true,
            title: 'ยืนยันการลบ',
            message: `คุณต้องการลบ ${user.email || user.uid} ใช่หรือไม่? (จะลบเฉพาะ role ในระบบ ไม่ได้ลบ Firebase Auth account)`,
            type: 'warning',
            confirmText: 'ลบ',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'role', user.uid));
                    loadData();
                } catch (error) {
                    console.error('Delete error:', error);
                }
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const filteredUsers = users.filter(u => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (u.email?.toLowerCase() || '').includes(s) || (u.role?.toLowerCase() || '').includes(s);
    });

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Users size={24} className="text-indigo-600" />
                        </div>
                        User Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">จัดการผู้ใช้งานและสิทธิ์การเข้าถึง</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary">
                    <Plus size={20} />
                    เพิ่ม User
                </button>
            </div>

            {/* Role Legend */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    {Object.entries(ROLE_CONFIG).filter(([key]) => key !== ROLES.STAFF).map(([key, config]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                            <div className={clsx("w-2.5 h-2.5 rounded-full", `bg-${config.color}-500`)}
                                style={{ backgroundColor: key === ROLES.ADMIN ? '#6366f1' : '#3b82f6' }}
                            />
                            <span className="font-semibold text-slate-700">{config.label}</span>
                            <span className="text-slate-400">— {config.description}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหา email หรือ role..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <span className="text-sm text-slate-400">{filteredUsers.length} users</span>
            </div>

            {/* User Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="p-4 pl-6">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Company</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-400">
                                    ไม่พบ User
                                </td></tr>
                            ) : (
                                filteredUsers.map(user => {
                                    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG[ROLES.STAFF];
                                    const RoleIcon = roleConfig.icon;
                                    const isCurrentUser = user.uid === currentUser?.uid;

                                    return (
                                        <tr key={user.uid} className={clsx("hover:bg-slate-50 transition-colors", isCurrentUser && "bg-indigo-50/30")}>
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                        {(user.email || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-700">{user.email || user.uid}</div>
                                                        {isCurrentUser && <span className="text-[10px] text-indigo-500 font-bold">คุณ</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold",
                                                    user.role === ROLES.ADMIN ? "bg-indigo-100 text-indigo-700" :
                                                    user.role === ROLES.VIEWER ? "bg-blue-100 text-blue-700" :
                                                    "bg-slate-100 text-slate-600"
                                                )}>
                                                    <RoleIcon size={13} />
                                                    {roleConfig.label}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {user.companyId ? (
                                                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                                        <Building2 size={14} className="text-slate-400" />
                                                        {getCompanyName(user.companyId)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs">
                                                {user.createdAt?.toDate?.()?.toLocaleDateString('th-TH') || '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className={clsx(
                                                            "p-2 rounded-lg transition-colors",
                                                            isCurrentUser
                                                                ? "text-slate-200 cursor-not-allowed"
                                                                : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        )}
                                                        disabled={isCurrentUser}
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingUser ? 'แก้ไข User' : 'เพิ่ม User ใหม่'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Error */}
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                                    <AlertCircle size={16} />
                                    {formError}
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="email"
                                        required
                                        disabled={!!editingUser}
                                        className={clsx("w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all", editingUser && "bg-slate-50 text-slate-400")}
                                        placeholder="user@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Password (only for new user) */}
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                            placeholder="อย่างน้อย 6 ตัวอักษร"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[ROLES.VIEWER, ROLES.ADMIN].map(role => {
                                        const config = ROLE_CONFIG[role];
                                        const Icon = config.icon;
                                        return (
                                            <label key={role} className="cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={role}
                                                    className="peer sr-only"
                                                    checked={formData.role === role}
                                                    onChange={() => setFormData({ ...formData, role })}
                                                />
                                                <div className={clsx(
                                                    "p-3 rounded-xl border-2 text-center transition-all",
                                                    "peer-checked:border-indigo-600 peer-checked:bg-indigo-50",
                                                    "border-slate-100 hover:border-slate-200"
                                                )}>
                                                    <Icon size={20} className={clsx("mx-auto mb-1", formData.role === role ? "text-indigo-600" : "text-slate-400")} />
                                                    <p className={clsx("font-bold text-sm", formData.role === role ? "text-indigo-700" : "text-slate-600")}>{config.label}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{config.description}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Company (required for viewer) */}
                            {formData.role === ROLES.VIEWER && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Company <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none bg-white cursor-pointer"
                                            value={formData.companyId}
                                            onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                                        >
                                            <option value="">เลือก Company...</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Viewer จะเห็นเฉพาะ Courses ใน Company นี้เท่านั้น</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                                >
                                    {formLoading ? (
                                        <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</>
                                    ) : (
                                        <>{editingUser ? 'บันทึก' : 'สร้าง User'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* System Modal */}
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

export default UserManagement;
