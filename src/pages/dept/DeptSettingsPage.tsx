import { Trash2 } from 'lucide-react';

const DeptSettingsPage = ({
    data,
    setData,
    newReason,
    setNewReason,
    addReason,
    deleteReason
}: any) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm w-full card-hover flex justify-between items-center">
                <div><h3 className="font-bold text-gray-900 dark:text-white">Dark Mode</h3><p className="text-sm text-gray-500">Toggle theme</p></div>
                <button onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, darkMode: !prev.settings.darkMode } }))} className={`w-12 h-6 rounded-full relative transition-colors ${data.settings.darkMode ? 'bg-green-600' : 'bg-gray-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform ${data.settings.darkMode ? 'translate-x-6' : ''}`}></div>
                </button>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm w-full card-hover">
                <h3 className="font-bold text-gray-900 mb-4 dark:text-white">Referral Reasons</h3>
                <div className="flex gap-3 mb-6">
                    <input value={newReason} onChange={(e) => setNewReason(e.target.value)} className="flex-1 border rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="New reason..." />
                    <button onClick={addReason} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Add</button>
                </div>
                <div className="space-y-2">
                    {data.settings.referralReasons.map((r, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border dark:bg-gray-700 dark:border-gray-600">
                            <span className="text-sm dark:text-gray-200">{r}</span>
                            <button onClick={() => deleteReason(i)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DeptSettingsPage;
