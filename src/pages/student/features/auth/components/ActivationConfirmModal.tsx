import { AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type ActivationConfirmStatus = 'confirm' | 'loading' | 'error';

type ActivationConfirmModalProps = {
    status: ActivationConfirmStatus;
    error: string;
    onCancel: () => void;
    onConfirm: () => void;
    onCloseError: () => void;
};

export function ActivationConfirmModal({
    status,
    error,
    onCancel,
    onConfirm,
    onCloseError
}: ActivationConfirmModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8 flex flex-col relative"
            >
                {status === 'confirm' && (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <AlertCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Please Read</h3>
                        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 text-left shadow-inner">
                            <p className="text-sm font-semibold leading-relaxed text-emerald-900">
                                After account creation, sign in with your student portal account to complete the remaining profile information.
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm flex-1 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white font-bold text-sm flex-1 shadow-lg shadow-indigo-500/20 transition-all"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}

                {status === 'loading' && (
                    <div className="space-y-6 text-center py-6">
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
                        <div className="space-y-2">
                            <h3 className="text-lg font-black text-slate-800">Creating Account</h3>
                            <p className="text-sm text-slate-500 font-medium">Please wait while we set up your student portal account...</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <AlertCircle className="w-8 h-8 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Please Read</h3>
                        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/80 p-5 text-left shadow-inner max-h-48 overflow-y-auto flex gap-3 items-start">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 flex-shrink-0" />
                            <p className="text-[15px] font-bold leading-relaxed text-rose-900 tracking-tight">
                                {error}
                            </p>
                        </div>
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={onCloseError}
                                className="w-full px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm transition-all"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
