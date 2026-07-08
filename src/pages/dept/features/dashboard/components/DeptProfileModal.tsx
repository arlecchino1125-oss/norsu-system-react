import React from 'react';
import { XCircle } from 'lucide-react';

export function DeptProfileModal({ showProfileModal, setShowProfileModal, profileForm, setProfileForm, handleProfileSubmit, isUpdatingProfile }: any) {
    return (<>{/* Profile Modal */}
            {
                showProfileModal && (
                    <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                <h3 className="font-bold text-lg dark:text-white">Edit Profile</h3>
                                <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                            </div>
                            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Name</label><input value={profileForm.name || ''} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Department</label><input value={profileForm.department || ''} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400" /></div>
                                <button type="submit" disabled={Boolean(isUpdatingProfile)} className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">{isUpdatingProfile ? 'Saving...' : 'Save Changes'}</button>
                            </form>
                        </div>
                    </div>
                )
            }</>);}

