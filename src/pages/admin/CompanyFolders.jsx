import React, { useState, useEffect } from 'react';
import { companyService } from '../../services/companyService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import Folder from 'lucide-react/dist/esm/icons/folder';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';

const FOLDER_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Orange', value: '#f97316' },
];

const CompanyFolders = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [courseCounts, setCourseCounts] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#6366f1'
    });
    const [hoveredCard, setHoveredCard] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [companiesData, coursesSnapshot] = await Promise.all([
                companyService.getAllCompanies(),
                getDocs(collection(db, 'courses'))
            ]);

            // Count courses per company
            const counts = { _unassigned: 0 };
            coursesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const companyId = data.companyId || '_unassigned';
                counts[companyId] = (counts[companyId] || 0) + 1;
            });

            setCompanies(companiesData);
            setCourseCounts(counts);
        } catch (error) {
            console.error("Failed to load data", error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                await companyService.updateCompany(editingCompany.id, formData);
            } else {
                await companyService.createCompany(formData);
            }
            setIsModalOpen(false);
            resetForm();
            loadData();
        } catch (error) {
            alert("Error saving company folder");
        }
    };

    const handleDelete = async (company) => {
        const count = courseCounts[company.id] || 0;
        if (count > 0) {
            alert(`Cannot delete "${company.name}" — it still has ${count} course(s). Please move or delete them first.`);
            return;
        }
        if (confirm(`Delete company folder "${company.name}"?`)) {
            try {
                await companyService.deleteCompany(company.id);
                loadData();
            } catch (error) {
                alert("Failed to delete company folder");
            }
        }
    };

    const openEditModal = (company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            description: company.description || '',
            color: company.color || '#6366f1'
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingCompany(null);
        setFormData({ name: '', description: '', color: '#6366f1' });
    };

    const filteredCompanies = companies.filter(c => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return c.name?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s);
    });

    const unassignedCount = courseCounts['_unassigned'] || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Building2 size={24} className="text-indigo-600" />
                        </div>
                        Company Folders
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Select a company to manage its courses.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="btn-primary"
                >
                    <Plus size={20} />
                    New Company
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Company Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-slate-400 text-sm">Loading companies...</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {/* Company Cards */}
                    {filteredCompanies.map(company => {
                        const count = courseCounts[company.id] || 0;
                        const isHovered = hoveredCard === company.id;
                        return (
                            <div
                                key={company.id}
                                className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer overflow-hidden"
                                onMouseEnter={() => setHoveredCard(company.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                onClick={() => navigate(`/admin/courses/${company.id}`)}
                            >
                                {/* Color accent bar */}
                                <div
                                    className="h-1.5 w-full transition-all duration-300"
                                    style={{
                                        backgroundColor: company.color || '#6366f1',
                                        height: isHovered ? '4px' : '3px'
                                    }}
                                />

                                <div className="p-5">
                                    {/* Folder icon + title */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="p-2.5 rounded-xl transition-all duration-300"
                                                style={{
                                                    backgroundColor: `${company.color || '#6366f1'}15`,
                                                }}
                                            >
                                                {isHovered ? (
                                                    <FolderOpen
                                                        size={24}
                                                        style={{ color: company.color || '#6366f1' }}
                                                        className="transition-all duration-300"
                                                    />
                                                ) : (
                                                    <Folder
                                                        size={24}
                                                        style={{ color: company.color || '#6366f1' }}
                                                        className="transition-all duration-300"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-indigo-700 transition-colors">
                                                    {company.name}
                                                </h3>
                                                {company.description && (
                                                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">
                                                        {company.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => openEditModal(company)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(company)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Course count footer */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <BookOpen size={14} className="text-slate-400" />
                                            <span className="font-medium">{count}</span>
                                            <span>course{count !== 1 ? 's' : ''}</span>
                                        </div>
                                        <ChevronRight
                                            size={16}
                                            className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-300"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Unassigned Courses Card */}
                    {unassignedCount > 0 && (
                        <div
                            className="group relative bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                            onClick={() => navigate('/admin/courses/_unassigned')}
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-slate-100">
                                            <Folder size={24} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-600 text-base leading-tight">
                                                Unassigned
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Courses without a company
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <BookOpen size={14} className="text-slate-400" />
                                        <span className="font-medium">{unassignedCount}</span>
                                        <span>course{unassignedCount !== 1 ? 's' : ''}</span>
                                    </div>
                                    <ChevronRight
                                        size={16}
                                        className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-300"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredCompanies.length === 0 && unassignedCount === 0 && (
                        <div className="col-span-full flex flex-col items-center py-16">
                            <div className="p-4 bg-slate-50 rounded-full mb-3">
                                <Building2 className="text-slate-300" size={40} />
                            </div>
                            <p className="text-slate-400 mb-2">No company folders yet.</p>
                            <button
                                onClick={() => { resetForm(); setIsModalOpen(true); }}
                                className="text-indigo-600 font-medium hover:underline"
                            >
                                Create your first company folder
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingCompany ? 'Edit Company' : 'New Company Folder'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-primary"
                                    placeholder="e.g. บริษัท ABC จำกัด"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                <textarea
                                    className="input-primary"
                                    rows="2"
                                    placeholder="รายละเอียดเพิ่มเติม (optional)"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Folder Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {FOLDER_COLORS.map(color => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: color.value })}
                                            className="w-9 h-9 rounded-xl border-2 transition-all duration-200 hover:scale-110"
                                            style={{
                                                backgroundColor: color.value,
                                                borderColor: formData.color === color.value ? '#1e293b' : 'transparent',
                                                boxShadow: formData.color === color.value ? '0 0 0 2px white, 0 0 0 4px #1e293b' : 'none'
                                            }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: `${formData.color}15` }}
                                    >
                                        <Folder size={20} style={{ color: formData.color }} />
                                    </div>
                                    <span className="font-semibold text-slate-700">
                                        {formData.name || 'Company Name'}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-all active:scale-95"
                                >
                                    {editingCompany ? 'Save Changes' : 'Create Folder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyFolders;
