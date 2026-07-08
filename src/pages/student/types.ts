import type React from 'react';

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
type AnySetter = React.Dispatch<React.SetStateAction<any>>;

export type StudentRemainingViewProps = {
    activeView: string;
    shared: {
        Icons: any;
        personalInfo: any;
        formatFullDate: (date: any) => string;
        showCommandHub: boolean;
        setShowCommandHub: Setter<boolean>;
        setActiveView: (viewId: string) => void;
        showToast: (message: string, type?: string) => void;
    };
    assessment: {
        activeForm: any;
        loadingForm: boolean;
        formsList: any[];
        openAssessmentForm: (form: any) => unknown;
        showAssessmentModal: boolean;
        setShowAssessmentModal: Setter<boolean>;
        onAssessmentSubmitted: (formId: any, wasNewSubmission: boolean) => unknown;
        showSuccessModal: boolean;
        setShowSuccessModal: Setter<boolean>;
        completedForms: Set<any>;
    };
    counseling: {
        showCounselingForm: boolean;
        setShowCounselingForm: Setter<boolean>;
        openCounselingForm: () => void;
        onCounselingSubmitted: () => unknown;
        counselingRequests: any[];
        openRequestModal: (request: any) => void;
        selectedRequest: any;
        setSelectedRequest: AnySetter;
        sessionFeedback: any;
        setSessionFeedback: AnySetter;
        submitSessionFeedback: () => unknown;
        showCounselingRequestsModal: boolean;
        setShowCounselingRequestsModal: Setter<boolean>;
    };
    support: {
        supportRequests: any[];
        showSupportModal: boolean;
        setShowSupportModal: Setter<boolean>;
        openSupportForm: () => void;
        onSupportSubmitted: () => unknown;
        selectedSupportRequest: any;
        setSelectedSupportRequest: AnySetter;
        showSupportRequestsModal: boolean;
        setShowSupportRequestsModal: Setter<boolean>;
    };
    scholarship: {
        scholarshipsList: any[];
        myApplications: any[];
        showScholarshipModal: boolean;
        setShowScholarshipModal: Setter<boolean>;
        selectedScholarship: any;
        setSelectedScholarship: AnySetter;
        handleApplyScholarship: (scholarship: any) => unknown;
        isApplyingScholarshipId: string | null;
    };
    feedback: {
        feedbackType: string;
        setFeedbackType: Setter<string>;
        rating: number;
        setRating: Setter<number>;
        feedbackPrefill: any;
        setFeedbackPrefill: AnySetter;
    };
    profile: {
        profileTab: string;
        setProfileTab: Setter<string>;
        isEditing: boolean;
        setIsEditing: Setter<boolean>;
        setPersonalInfo: AnySetter;
        saveProfileChanges: (nextPersonalInfo?: any) => unknown;
        isSavingProfileChanges: boolean;
        requestStudentSecurityOtp: (purpose: 'password_change' | 'email_change', payload?: Record<string, unknown>) => unknown;
        confirmStudentSecurityEmailChange: (nextEmailValue: unknown, otp: unknown) => unknown;
        confirmStudentPasswordChange: (nextPasswordValue: unknown, otp: unknown) => unknown;
        authEmail: string;
        attendanceMap: Record<string, any>;
        showMoreProfile: boolean;
        setShowMoreProfile: Setter<boolean>;
        uploadProfilePicture: (file: File) => unknown;
    };
};

export type StudentRemainingFlatViewProps =
    & { activeView: string }
    & StudentRemainingViewProps['shared']
    & StudentRemainingViewProps['assessment']
    & StudentRemainingViewProps['counseling']
    & StudentRemainingViewProps['support']
    & StudentRemainingViewProps['scholarship']
    & StudentRemainingViewProps['feedback']
    & StudentRemainingViewProps['profile'];

export type StudentRemainingViewComponent = React.ComponentType<StudentRemainingFlatViewProps>;

export interface Student {
    firstName: string;
    lastName: string;
    middleName?: string;
    suffix?: string;
    studentId: string;
    department: string;
    course: string;
    year: string;
    section: string;
    status: string;
    address: string;
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    mobile: string;
    email: string;
    facebookUrl?: string;
    emergencyContact?: string;
    dob: string;
    age: string | number;
    placeOfBirth?: string;
    sex: string;
    genderIdentity?: string;
    civilStatus?: string;
    nationality?: string;
    priorityCourse?: string;
    altCourse1?: string;
    altCourse2?: string;
    schoolLastAttended?: string;
    isWorkingStudent?: boolean;
    workingStudentType?: string;
    employerName?: string;
    employerAddress?: string;
    supporter?: string;
    supporterContact?: string;
    isPwd?: boolean;
    pwdNumber?: string;
    pwdType?: string;
    disabilityCause?: string;
    pwdDocumentUrl?: string;
    isIndigenous?: boolean;
    indigenousGroup?: string;
    ipDocumentUrl?: string;
    isFourPsMember?: boolean;
    fourPsDocumentUrl?: string;
    isRebelReturnee?: boolean;
    soloParentDocumentUrl?: string;
    isOrphan?: boolean;
    orphanCause?: string;
    isHomelessCitizen?: boolean;
    isSeniorCitizen?: boolean;
    seniorCitizenDocumentUrl?: string;
    workExperiences?: string;
    motherLastName?: string;
    motherGivenName?: string;
    motherMiddleName?: string;
    fatherLastName?: string;
    fatherGivenName?: string;
    fatherMiddleName?: string;
    witnessedConflict?: string;
    isSoloParent?: boolean;
    isChildOfSoloParent?: boolean;
    [key: string]: any; // Allow loose typing for now to prevent breakage
}

export interface Event {
    id: string;
    title: string;
    description?: string;
    event_date: string;
    event_time: string;
    end_time?: string;
    location: string;
    type: string;
}

export interface Scholarship {
    id: string;
    title: string;
    description: string;
    requirements: string;
    deadline: string;
}

export interface Request {
    id: string;
    status: string;
    created_at: string;
    student_name?: string;
    course_year?: string;
    contact_number?: string;
    reason_for_referral?: string;
    description?: string;
    personal_actions_taken?: string;
    date_duration_of_concern?: string;
    referred_by?: string;
    scheduled_date?: string;
    resolution_notes?: string;
    rating?: number;
    feedback?: string;
    support_type?: string;
    [key: string]: any;
}
