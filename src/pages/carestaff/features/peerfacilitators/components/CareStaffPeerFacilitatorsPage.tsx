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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Peer Facilitators</h1>
                <p className="mt-1 text-sm text-gray-500">Review applications, manage the active roster, and track volunteer hours.</p>
            </div>

            <div className="mb-6 flex gap-2 border-b border-gray-200 overflow-x-auto">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        type="button"
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Icon size={16} /> {label}
                        </div>
                    </button>
                ))}
            </div>

            {activeTab === 'applications' ? (
                <CareStaffVolunteerFormsTable functions={functions} refreshSignal={refreshSignal} />
            ) : activeTab === 'active' ? (
                <CareStaffActiveFacilitatorsTable functions={functions} refreshSignal={refreshSignal} />
            ) : (
                <CareStaffFacilitatorHours refreshSignal={refreshSignal} />
            )}
        </div>
    );
};

export default CareStaffPeerFacilitatorsPage;
