import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import Save from 'lucide-react/dist/esm/icons/save';
import X from 'lucide-react/dist/esm/icons/x';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import FolderPlus from 'lucide-react/dist/esm/icons/folder-plus';
import Folder from 'lucide-react/dist/esm/icons/folder';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import clsx from 'clsx';

const FOLDER_COLORS = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f43f5e', // rose
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#0ea5e9', // sky
    '#64748b', // slate
];

const FormBuilder = () => {
    const [forms, setForms] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(null); // null = All Forms
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [formName, setFormName] = useState('');
    const [questions, setQuestions] = useState([]);
    const [editingFormId, setEditingFormId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Folder modal state
    const [folderName, setFolderName] = useState('');
    const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);
    const [editingFolderId, setEditingFolderId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // async-parallel: Parallel fetch folders and forms
            const [foldersSnapshot, formsSnapshot] = await Promise.all([
                getDocs(collection(db, 'formFolders')),
                getDocs(collection(db, 'formTemplates'))
            ]);

            const foldersData = foldersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFolders(foldersData);

            const formsData = formsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setForms(formsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter forms by selected folder
    const filteredForms = selectedFolderId
        ? forms.filter(f => f.folderId === selectedFolderId)
        : forms;

    // --- Folder Functions ---
    const handleSaveFolder = async () => {
        if (!folderName.trim()) {
            alert('Please enter a folder name');
            return;
        }

        try {
            if (editingFolderId) {
                await updateDoc(doc(db, 'formFolders', editingFolderId), {
                    name: folderName,
                    color: folderColor
                });
            } else {
                await addDoc(collection(db, 'formFolders'), {
                    name: folderName,
                    color: folderColor,
                    createdAt: new Date()
                });
            }
            handleCloseFolderModal();
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error saving folder');
        }
    };

    const handleEditFolder = (folder) => {
        setEditingFolderId(folder.id);
        setFolderName(folder.name);
        setFolderColor(folder.color || FOLDER_COLORS[0]);
        setIsFolderModalOpen(true);
    };

    const handleDeleteFolder = async (folderId) => {
        if (confirm('Delete this folder? Forms in this folder will become uncategorized.')) {
            try {
                // Remove folderId from all forms in this folder
                const formsInFolder = forms.filter(f => f.folderId === folderId);
                for (const form of formsInFolder) {
                    await updateDoc(doc(db, 'formTemplates', form.id), { folderId: null });
                }
                // Delete folder
                await deleteDoc(doc(db, 'formFolders', folderId));
                if (selectedFolderId === folderId) {
                    setSelectedFolderId(null);
                }
                fetchData();
            } catch (error) {
                console.error(error);
                alert('Error deleting folder');
            }
        }
    };

    const handleCloseFolderModal = () => {
        setIsFolderModalOpen(false);
        setFolderName('');
        setFolderColor(FOLDER_COLORS[0]);
        setEditingFolderId(null);
    };

    // --- Form Functions ---
    const addQuestion = () => {
        setQuestions([...questions, { text: '', type: 'short', options: [] }]);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        if (field === 'type') {
            if (value === 'checkbox' || value === 'multiple_choice') {
                updated[index].options = updated[index].options?.length > 0 ? updated[index].options : [''];
            } else {
                updated[index].options = [];
            }
        }
        setQuestions(updated);
    };

    const addOption = (questionIndex) => {
        const updated = [...questions];
        updated[questionIndex].options = [...(updated[questionIndex].options || []), ''];
        setQuestions(updated);
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        const updated = [...questions];
        updated[questionIndex].options[optionIndex] = value;
        setQuestions(updated);
    };

    const removeOption = (questionIndex, optionIndex) => {
        const updated = [...questions];
        updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
        setQuestions(updated);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormName('');
        setQuestions([]);
        setEditingFormId(null);
    };

    const handleSaveForm = async () => {
        if (!formName.trim()) {
            alert('Please enter a form name');
            return;
        }
        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }

        try {
            const formData = {
                name: formName,
                questions: questions,
                folderId: selectedFolderId || null
            };

            if (editingFormId) {
                await updateDoc(doc(db, 'formTemplates', editingFormId), formData);
            } else {
                await addDoc(collection(db, 'formTemplates'), {
                    ...formData,
                    createdAt: new Date()
                });
            }
            handleCloseModal();
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error saving form');
        }
    };

    const handleEditForm = (form) => {
        setEditingFormId(form.id);
        setFormName(form.name);
        setQuestions(form.questions || []);
        setIsModalOpen(true);
    };

    const handleDeleteForm = async (id) => {
        if (confirm('Delete this form template?')) {
            await deleteDoc(doc(db, 'formTemplates', id));
            fetchData();
        }
    };

    // Get folder name for display
    const getFolderName = (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        return folder?.name || 'Uncategorized';
    };

    const getFormCountInFolder = (folderId) => {
        return forms.filter(f => f.folderId === folderId).length;
    };

    const uncategorizedCount = forms.filter(f => !f.folderId).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Form Builder</h1>
                    <p className="text-slate-500 text-sm">Create assessment templates organized by folders.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsFolderModalOpen(true)}
                        className="btn-secondary"
                    >
                        <FolderPlus size={18} />
                        New Folder
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary"
                    >
                        <Plus size={20} />
                        Create Form
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : (
                <div className="flex gap-6">
                    {/* Folder Sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Folders</h3>
                            </div>
                            <div className="p-2 max-h-[670px] overflow-y-auto">
                                {/* All Forms */}
                                <button
                                    onClick={() => setSelectedFolderId(null)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group",
                                        selectedFolderId === null
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "hover:bg-slate-50 text-slate-600"
                                    )}
                                >
                                    <LayoutTemplate size={18} className={selectedFolderId === null ? "text-indigo-500" : "text-slate-400"} />
                                    <span className="flex-1 font-medium">All Forms</span>
                                    <span className={clsx(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        selectedFolderId === null ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                                    )}>
                                        {forms.length}
                                    </span>
                                </button>

                                {/* Uncategorized */}
                                {uncategorizedCount > 0 && (
                                    <button
                                        onClick={() => setSelectedFolderId('uncategorized')}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group",
                                            selectedFolderId === 'uncategorized'
                                                ? "bg-slate-200 text-slate-700"
                                                : "hover:bg-slate-50 text-slate-600"
                                        )}
                                    >
                                        <FileText size={18} className="text-slate-400" />
                                        <span className="flex-1 font-medium">Uncategorized</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                            {uncategorizedCount}
                                        </span>
                                    </button>
                                )}

                                {/* Folder List */}
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                    {folders.map(folder => (
                                        <div
                                            key={folder.id}
                                            className={clsx(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group cursor-pointer",
                                                selectedFolderId === folder.id
                                                    ? "bg-indigo-50 text-indigo-700"
                                                    : "hover:bg-slate-50 text-slate-600"
                                            )}
                                            onClick={() => setSelectedFolderId(folder.id)}
                                        >
                                            <Folder
                                                size={18}
                                                style={{ color: folder.color || FOLDER_COLORS[0] }}
                                                fill={selectedFolderId === folder.id ? folder.color || FOLDER_COLORS[0] : 'transparent'}
                                            />
                                            <span className="flex-1 font-medium truncate">{folder.name}</span>
                                            <span className={clsx(
                                                "text-xs px-2 py-0.5 rounded-full",
                                                selectedFolderId === folder.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {getFormCountInFolder(folder.id)}
                                            </span>
                                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }}
                                                    className="p-1 hover:bg-indigo-100 rounded transition-colors"
                                                >
                                                    <Pencil size={14} className="text-indigo-500" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                                    className="p-1 hover:bg-rose-100 rounded transition-colors"
                                                >
                                                    <Trash2 size={14} className="text-rose-500" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {folders.length === 0 && (
                                    <div className="px-3 py-6 text-center text-slate-400 text-sm">
                                        <FolderPlus size={24} className="mx-auto mb-2 opacity-50" />
                                        <p>No folders yet</p>
                                        <button
                                            onClick={() => setIsFolderModalOpen(true)}
                                            className="text-indigo-600 font-medium hover:underline mt-1"
                                        >
                                            Create one
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Forms Grid */}
                    <div className="flex-1">
                        <div className="mb-4 flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-700">
                                {selectedFolderId === null ? 'All Forms' :
                                    selectedFolderId === 'uncategorized' ? 'Uncategorized Forms' :
                                        folders.find(f => f.id === selectedFolderId)?.name || 'Forms'}
                            </h2>
                            <span className="text-sm text-slate-400">
                                ({(selectedFolderId === 'uncategorized' ? forms.filter(f => !f.folderId) : filteredForms).length} forms)
                            </span>
                        </div>

                        {(selectedFolderId === 'uncategorized' ? forms.filter(f => !f.folderId) : filteredForms).length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <LayoutTemplate size={32} className="text-slate-300" />
                                </div>
                                <p className="font-semibold text-lg text-slate-600">No forms in this folder</p>
                                <p className="text-sm mb-6">Create a form to get started.</p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="btn-secondary"
                                >
                                    Create Form
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                                {(selectedFolderId === 'uncategorized' ? forms.filter(f => !f.folderId) : filteredForms).map(form => (
                                    <div key={form.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl"></div>
                                        <div className="flex justify-between items-start mb-4 pl-2">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{form.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md font-medium">
                                                        {form.questions?.length || 0} Questions
                                                    </span>
                                                    {form.folderId && (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md font-medium"
                                                            style={{
                                                                backgroundColor: (folders.find(f => f.id === form.folderId)?.color || '#6366f1') + '20',
                                                                color: folders.find(f => f.id === form.folderId)?.color || '#6366f1'
                                                            }}
                                                        >
                                                            <Folder size={12} />
                                                            {getFolderName(form.folderId)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEditForm(form)}
                                                    className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteForm(form.id)}
                                                    className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 pl-2 border-t border-slate-100 pt-3">
                                            {form.questions?.slice(0, 3).map((q, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-slate-500 truncate">
                                                    <span className="text-slate-300 font-mono text-xs">0{i + 1}</span>
                                                    <span className="truncate">{q.text}</span>
                                                </div>
                                            ))}
                                            {form.questions?.length > 3 && (
                                                <div className="text-xs text-indigo-500 font-medium pl-6 pt-1">
                                                    +{form.questions.length - 3} more questions
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create/Edit Folder Modal */}
            {isFolderModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingFolderId ? 'Edit Folder' : 'Create New Folder'}
                            </h2>
                            <button onClick={handleCloseFolderModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Folder Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. React Course Forms"
                                    className="input-primary"
                                    value={folderName}
                                    onChange={e => setFolderName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Folder Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {FOLDER_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFolderColor(color)}
                                            className={clsx(
                                                "w-8 h-8 rounded-lg transition-all",
                                                folderColor === color ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={handleCloseFolderModal}
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveFolder}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Save size={18} />
                                {editingFolderId ? 'Update Folder' : 'Create Folder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col animate-fade-in-up">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{editingFormId ? 'Edit Form' : 'Create New Form'}</h2>
                                <p className="text-slate-500 text-sm">
                                    {selectedFolderId && selectedFolderId !== 'uncategorized'
                                        ? `Will be saved to: ${folders.find(f => f.id === selectedFolderId)?.name}`
                                        : 'Design your assessment questions'
                                    }
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Form Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Workshop Feedback Survey"
                                    className="input-primary text-lg font-semibold"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Questions</label>
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={16} /> Add Question
                                    </button>
                                </div>

                                {questions.map((q, index) => (
                                    <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-colors">
                                        <div className="flex gap-3 items-start">
                                            <div className="mt-3 text-slate-300 cursor-move">
                                                <GripVertical size={20} />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder={`Question ${index + 1}`}
                                                    className="w-full p-2 border-b-2 border-slate-100 focus:border-indigo-500 outline-none font-medium text-slate-800 bg-transparent transition-colors placeholder:font-normal"
                                                    value={q.text}
                                                    onChange={e => updateQuestion(index, 'text', e.target.value)}
                                                />
                                                <div className="flex items-center gap-4">
                                                    <select
                                                        className="text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 font-medium"
                                                        value={q.type}
                                                        onChange={e => updateQuestion(index, 'type', e.target.value)}
                                                    >
                                                        <option value="short">Short Answer</option>
                                                        <option value="yesno">Yes / No</option>
                                                        <option value="rating">Rating (1-5)</option>
                                                        <option value="checkbox">Checkbox (เลือกได้หลายข้อ)</option>
                                                        <option value="multiple_choice">Multiple Choice (ตัวเลือกเดียว + โปรดระบุ)</option>
                                                    </select>
                                                    <div className="h-4 w-px bg-slate-200"></div>
                                                    <span className="text-xs text-slate-400">Required</span>
                                                </div>

                                                {/* Options Editor for Checkbox & Multiple Choice */}
                                                {(q.type === 'checkbox' || q.type === 'multiple_choice') && (
                                                    <div className="mt-3 pl-4 border-l-2 border-indigo-100 space-y-2">
                                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ตัวเลือก</label>
                                                        {(q.options || []).map((opt, optIndex) => (
                                                            <div key={optIndex} className="flex items-center gap-2">
                                                                <div className={clsx(
                                                                    "w-4 h-4 border-2 flex-shrink-0",
                                                                    q.type === 'checkbox' ? "rounded border-slate-300" : "rounded-full border-slate-300"
                                                                )}></div>
                                                                <input
                                                                    type="text"
                                                                    placeholder={`ตัวเลือก ${optIndex + 1}`}
                                                                    className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                                    value={opt}
                                                                    onChange={e => updateOption(index, optIndex, e.target.value)}
                                                                />
                                                                <button
                                                                    onClick={() => removeOption(index, optIndex)}
                                                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {q.type === 'multiple_choice' && (
                                                            <div className="flex items-center gap-2 opacity-60">
                                                                <div className="w-4 h-4 border-2 rounded-full border-slate-300 flex-shrink-0"></div>
                                                                <span className="text-sm text-slate-500 italic">อื่นๆ (โปรดระบุ...)</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => addOption(index)}
                                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <Plus size={14} /> เพิ่มตัวเลือก
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(index)}
                                                className="p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {questions.length === 0 && (
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center" onClick={addQuestion}>
                                        <p className="text-slate-400 text-sm mb-2">No questions added yet.</p>
                                        <button className="text-indigo-600 font-semibold text-sm hover:underline">Click to add your first question</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - Sticky */}
                        <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-3 z-10">
                            <button
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveForm}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Save size={18} />
                                {editingFormId ? 'Update Form' : 'Save Form'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormBuilder;
