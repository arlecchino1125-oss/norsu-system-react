import { useState } from 'react';
import { ClipboardList, HeartHandshake, Clock } from 'lucide-react';
import type { CareStaffDashboardFunctions } from '../../../types';
import CareStaffVolunteerFormsTable from './CareStaffVolunteerFormsTable';
import CareStaffActiveFacilitatorsTable from './CareStaffActiveFacilitatorsTable';
import CareStaffFacilitatorHours from './CareStaffFacilitatorHours';

interface CareStaffPeerFacilitatorsPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
    refreshSignal?: number;
}

type PeerTab = 'applications' | 'active' | 'hours';

const TABS: { key: PeerTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'applications', label: 'Applications', icon: ClipboardList },
    { key: 'active', label: 'Active Facilitators', icon: HeartHandshake },
    { key: 'hours', label: 'Facilitator Hours', icon: Clock }
];

const CareStaffPeerFacilitatorsPage = ({ functions, refreshSignal = 0 }: CareStaffPeerFacilitatorsPageProps) => {
    const [activeTab, setActiveTab] = useState<PeerTab>('applications');
    const [applicationToolbarHost, setApplicationToolbarHost] = useState<HTMLDivElement | null>(null);

    return (
        <div className="flex h-full min-h-0 flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Peer Facilitators</h1>
                <p className="mt-1 text-sm text-gray-500">Review applications, manage the active roster, and track volunteer hours.</p>
            </div>

            <div className="flex flex-col gap-2 border-b border-gray-200 2xl:flex-row 2xl:items-end 2xl:justify-between">
                <div role="tablist" aria-label="Peer facilitator sections" className="flex min-w-0 gap-1 overflow-x-auto">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === key}
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-bold transition-colors ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                <Icon size={16} /> {label}
                            </span>
                        </button>
                    ))}
                </div>
                {activeTab === 'applications' && (
                    <div
                        ref={setApplicationToolbarHost}
                        aria-label="Application controls"
                        className="min-w-0 pb-2 2xl:ml-auto"
                    />
                )}
            </div>

            {activeTab === 'applications' ? (
                <CareStaffVolunteerFormsTable
                    functions={functions}
                    refreshSignal={refreshSignal}
                    toolbarHost={applicationToolbarHost}
                />
            ) : activeTab === 'active' ? (
                <CareStaffActiveFacilitatorsTable functions={functions} refreshSignal={refreshSignal} />
            ) : (
                <CareStaffFacilitatorHours refreshSignal={refreshSignal} />
            )}
        </div>
    );
};

export default CareStaffPeerFacilitatorsPage;
