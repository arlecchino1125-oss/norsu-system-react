import React from 'react';
import { Trash2 } from 'lucide-react';
import AccountSecuritySettings from '../../components/AccountSecuritySettings';

const DeptSettingsPage = ({
    data,
    setData,
    newReason,
    setNewReason,
    addReason,
    deleteReason,
    authEmail,
    requestStaffSecurityOtp,
    confirmStaffSecurityEmailChange,
    confirmStaffPasswordChange,
    updateStaffProfileName,
    showToast
}: any) => {
    const [profileName, setProfileName] = React.useState(data?.profile?.name || '');
    const [isSavingProfileName, setIsSavingProfileName] = React.useState(false);

    React.useEffect(() => {
        setProfileName(data?.profile?.name || '');
    }, [data?.profile?.name]);

    const handleSaveProfileName = async () => {
        if (!updateStaffProfileName) return;

        setIsSavingProfileName(true);
        try {
            await updateStaffProfileName(profileName);
            showToast?.('Profile name updated successfully.');
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to update your profile name.', 'error');
        } finally {
            setIsSavingProfileName(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-6 rounded-3xl text-white shadow-lg shadow-emerald-900/20">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100/70">Profile & Settings</p>
                <div className="mt-4 flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-black shadow-lg">DN</div>
                    <div className="min-w-0">
                        <h2 className="text-2xl font-bold tracking-tight">{data?.profile?.name || 'Department Head'}</h2>
                        <p className="mt-1 text-sm text-emerald-100/80">{data?.profile?.department || 'Department Portal'}</p>
                        <p className="mt-3 text-xs text-emerald-50/80 break-all">
                            Email: <span className="font-semibold text-white">{authEmail || data?.profile?.email || 'Not set'}</span>
                        </p>
                    </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm text-emerald-50/80">
                    Manage your department profile, account security, portal preferences, and referral configuration from one place.
                </p>
                <div className="mt-5 max-w-xl rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">Profile Name</label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            type="text"
                            value={profileName}
                            onChange={(event) => setProfileName(event.target.value)}
                            className="flex-1 rounded-xl border border-white/15 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-0 transition-all focus:border-emerald-300"
                            placeholder="Enter your display name"
                        />
                        <button
                            type="button"
                            onClick={handleSaveProfileName}
                            disabled={isSavingProfileName}
                            className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSavingProfileName ? 'Saving...' : 'Save Name'}
                        </button>
                    </div>
                </div>
            </div>
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
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm w-full card-hover">
                <h3 className="font-bold text-gray-900 dark:text-white">Account Security</h3>
                <p className="mt-1 text-sm text-gray-500">Email and password changes are handled here and require an OTP sent by email.</p>
                <AccountSecuritySettings
                    currentEmail={authEmail || data?.profile?.email || ''}
                    loginLabel="your department email"
                    emailHelperText="Update your department email here. The OTP will be sent to the new email address before the change is applied."
                    passwordHelperText="Choose a new password for your department account. An OTP will be sent to your current email before the change is accepted."
                    requestOtp={requestStaffSecurityOtp}
                    confirmEmailChange={confirmStaffSecurityEmailChange}
                    confirmPasswordChange={confirmStaffPasswordChange}
                    showToast={showToast}
                />
            </div>
        </div>
    );
};

export default DeptSettingsPage;
