import React from 'react';
import { ApplicantScheduleModal } from '../features/admissions/components/ApplicantScheduleModal';
import { DeptProfileModal } from '../features/dashboard/components/DeptProfileModal';
import { DeptReferralModal } from '../features/counseling/components/DeptReferralModal';
import { DeptHistoryModal } from '../features/counseling/components/DeptHistoryModal';
import { DeptViewFormModal } from '../features/counseling/components/DeptViewFormModal';
import { DeptEventAttendeesModal } from '../features/events/components/DeptEventAttendeesModal';

export function renderDeptModals(props: any) {
    return (
        <>
            <ApplicantScheduleModal {...props} />
            <DeptProfileModal {...props} />
            <DeptReferralModal {...props} />
            <DeptHistoryModal {...props} />
            <DeptViewFormModal {...props} />
            <DeptEventAttendeesModal {...props} />
        </>
    );
}
