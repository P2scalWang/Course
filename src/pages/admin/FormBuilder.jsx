import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, FileText, GripVertical, Save, X, LayoutTemplate, Pencil } from 'lucide-react';
import clsx from 'clsx';

const FormBuilder = () => {
    const [forms, setForms] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formName, setFormName] = useState('');
    const [questions, setQuestions] = useState([]);
    const [editingFormId, setEditingFormId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'formTemplates'));
            const formsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setForms(formsData);
        } catch (error) {
            console.error('Error fetching forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { text: '', type: 'short', options: [] }]);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        // Reset options when changing type
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
            if (editingFormId) {
                await updateDoc(doc(db, 'formTemplates', editingFormId), {
                    name: formName,
                    questions: questions
                });
            } else {
                await addDoc(collection(db, 'formTemplates'), {
                    name: formName,
                    questions: questions,
                    createdAt: new Date()
                });
            }
            handleCloseModal();
            fetchForms();
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
            fetchForms();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Form Builder</h1>
                    <p className="text-slate-500 text-sm">Create assessment templates for your courses.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                >
                    <Plus size={20} />
                    Create New Form
                </button>
            </div>

            {/* Forms List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading templates...</div>
            ) : forms.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <LayoutTemplate size={32} className="text-slate-300" />
                    </div>
                    <p className="font-semibold text-lg text-slate-600">No forms yet</p>
                    <p className="text-sm mb-6">Create your first assessment template to get started.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-secondary"
                    >
                        Create Form
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {forms.map(form => (
                        <div key={form.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl"></div>
                            <div className="flex justify-between items-start mb-4 pl-2">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{form.name}</h3>
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md font-medium">
                                        {form.questions?.length || 0} Questions
                                    </span>
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

            {/* Create Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col animate-fade-in-up">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{editingFormId ? 'Edit Form' : 'Create New Form'}</h2>
                                <p className="text-slate-500 text-sm">Design your assessment questions</p>
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
