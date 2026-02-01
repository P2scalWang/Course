import React from 'react';
import { X, CheckCircle, AlertCircle, HelpCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const SystemModal = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info', // info, success, error, confirm
    onConfirm,
    confirmText = 'ตกลง',
    cancelText = 'ยกเลิก',
    showCancel = false,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce-short"><CheckCircle size={32} /></div>;
            case 'error': return <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-shake"><AlertCircle size={32} /></div>;
            case 'confirm': return <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 mx-auto"><HelpCircle size={32} /></div>;
            default: return <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4 mx-auto"><Info size={32} /></div>;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all scale-100">
                <div className="p-6 text-center">
                    {getIcon()}
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        {(showCancel || type === 'confirm') && (
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all hover:bg-slate-50"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm || onClose}
                            disabled={isLoading}
                            className={clsx(
                                "flex-1 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all text-white flex items-center justify-center gap-2",
                                type === 'error' ? "bg-rose-600 shadow-rose-200 hover:bg-rose-700" :
                                    type === 'success' ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700" :
                                        "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>กำลังประมวลผล...</span>
                                </>
                            ) : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemModal;
