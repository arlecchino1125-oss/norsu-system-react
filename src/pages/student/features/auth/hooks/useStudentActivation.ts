import { useEffect, useState } from 'react';
import type React from 'react';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { getStudentActivationPolicy } from '../../../../../lib/studentActivationPolicy';
import { rememberPendingProfileCompletion } from '../../../../../lib/studentProfileCompletionPrompt';
import { getSafeStudentActivationErrorMessage } from '../../../../../lib/studentActivationErrors';
import { isValidEmailDomain } from '../../../../../utils/inputSecurity';

type StudentLoginMethod = 'studentId' | 'email';

type ActivatedStudentCredentials = {
    username: string;
    password: string;
};

type CourseOption = {
    name: string;
};

type StudentActivationPolicy = {
    requireEnrollmentKey: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
};

type StudentLoginResult = {
    success?: boolean;
    error?: string;
};

type UseStudentActivationOptions = {
    loginStudent: (
        identifier: string,
        password: string,
        method?: StudentLoginMethod
    ) => Promise<StudentLoginResult>;
    showToast: (message: string, type?: string) => void;
    onActivationCredentialsCreated: (username: string, password: string) => void;
    onUseActivatedCredentialsForLogin: (username: string, password: string) => void;
    onNavigateToStudent: () => void;
};

const initialActivationFormData = {
    studentId: '',
    course: '',
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    street: '',
    city: '',
    province: '',
    zipCode: '',
    mobile: '',
    email: '',
    dob: '',
    age: '',
    sex: '',
    password: '',
    confirmPassword: ''
};

export function useStudentActivation({
    loginStudent,
    showToast,
    onActivationCredentialsCreated,
    onUseActivatedCredentialsForLogin,
    onNavigateToStudent
}: UseStudentActivationOptions) {
    const [showActivateModal, setShowActivateModal] = useState<boolean>(false);
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [confirmModalStatus, setConfirmModalStatus] = useState<'confirm' | 'loading' | 'error'>('confirm');
    const [confirmModalError, setConfirmModalError] = useState<string>('');
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [isMainModalHidden, setIsMainModalHidden] = useState<boolean>(false);
    const [showActivationPassword, setShowActivationPassword] = useState<boolean>(false);
    const [activationLoading, setActivationLoading] = useState(false);
    const [activationErrorFields, setActivationErrorFields] = useState<string[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [activatedCredentials, setActivatedCredentials] = useState<ActivatedStudentCredentials | null>(null);
    const [studentActivationPolicy, setStudentActivationPolicy] = useState<StudentActivationPolicy>({
        requireEnrollmentKey: true,
        updatedAt: null,
        updatedBy: null
    });
    const [activationStep, setActivationStep] = useState<number>(1);
    const [formData, setFormData] = useState<any>(initialActivationFormData);

    useEffect(() => {
        if (!showActivateModal) return;

        let isActive = true;

        const loadActivationResources = async () => {
            try {
                if (courses.length === 0) {
                    const { data } = await supabase.from('courses').select('name').order('name');
                    if (isActive && data) {
                        setCourses(data);
                    }
                }

                const policy = await getStudentActivationPolicy();
                if (isActive) {
                    setStudentActivationPolicy(policy);
                }
            } catch (error) {
                console.error('Failed to load student activation policy.', error);
            }
        };

        void loadActivationResources();

        return () => {
            isActive = false;
        };
    }, [showActivateModal, courses.length]);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        const { name, value } = event.target;
        if (name === 'dob') {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            setFormData((prev: any) => ({ ...prev, [name]: value, age: age >= 0 ? age : '' }));
            return;
        }

        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const attemptAutoLoginAfterActivation = async (studentId: string, password: string) => {
        const result = await loginStudent(studentId, password);
        if (result?.success) {
            return { success: true };
        }

        return {
            success: false,
            error: result?.error || 'Automatic sign-in failed.'
        };
    };

    const handleActivatedCredentialsLogin = async () => {
        if (!activatedCredentials?.username || !activatedCredentials?.password) {
            return;
        }

        setActivationLoading(true);

        try {
            const autoLoginResult = await attemptAutoLoginAfterActivation(
                activatedCredentials.username,
                activatedCredentials.password
            );

            if (autoLoginResult.success) {
                setActivatedCredentials(null);
                setShowActivateModal(false);
                showToast('Login Successful', 'success');
                setTimeout(onNavigateToStudent, 700);
                return;
            }

            setShowActivateModal(false);
            onUseActivatedCredentialsForLogin(
                activatedCredentials.username,
                activatedCredentials.password
            );
            showToast(
                autoLoginResult.error
                    ? `Automatic sign-in failed. ${autoLoginResult.error}`
                    : 'Automatic sign-in failed. Use your Student ID and chosen password to sign in below.',
                'error'
            );
        } finally {
            setActivationLoading(false);
        }
    };

    const handleNextStep = () => {
        if (activationStep === 1) {
            if (!formData.studentId || !formData.course) {
                showToast('Fill in the required enrollment fields.', 'error');
                return;
            }
            if (!/^\d{9}$/.test(formData.studentId.trim())) {
                showToast('Enter a 9-digit Student ID.', 'error');
                return;
            }
        } else if (activationStep === 2) {
            if (!formData.firstName || !formData.lastName || !formData.sex || !formData.dob || !formData.mobile || !formData.email) {
                showToast('Provide your personal information.', 'error');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                showToast('Enter a valid email address.', 'error');
                return;
            }
            if (!isValidEmailDomain(formData.email)) {
                showToast('Please enter a valid email address (e.g., name@example.com).', 'error');
                return;
            }
        }

        setActivationStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getValidActivationPassword = () => {
        const password = String(formData.password || '');
        const confirmPassword = String(formData.confirmPassword || '');

        if (password.length < 8) {
            showToast('For your security, please create a password with at least 8 characters.', 'error');
            setActivationErrorFields(['password']);
            return null;
        }

        if (password !== confirmPassword) {
            showToast('The passwords you entered do not match. Please check and try again.', 'error');
            setActivationErrorFields(['password', 'confirmPassword']);
            return null;
        }

        return password;
    };

    const handleActivationTrigger = () => {
        const chosenPassword = getValidActivationPassword();
        if (!chosenPassword) {
            return;
        }

        setConfirmModalStatus('confirm');
        setConfirmModalError('');
        setShowConfirmModal(true);
    };

    const handleCloseConfirmError = () => {
        setShowConfirmModal(false);
        setIsMainModalHidden(false);

        if (activationErrorFields.includes('studentId') || activationErrorFields.includes('course')) {
            setActivationStep(1);
            setTimeout(() => {
                if (activationErrorFields.includes('course')) {
                    const button = document.getElementById('courseSelect');
                    if (button) {
                        button.focus();
                        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    const input = document.querySelector('input[name="studentId"]') as HTMLInputElement | null;
                    if (input) {
                        input.focus();
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 300);
        } else if (activationErrorFields.includes('email')) {
            setActivationStep(2);
            setTimeout(() => {
                const input = document.querySelector('input[name="email"]') as HTMLInputElement | null;
                if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        } else if (activationErrorFields.includes('password') || activationErrorFields.includes('confirmPassword')) {
            setActivationStep(3);
            setTimeout(() => {
                const input = document.querySelector('input[name="password"]') as HTMLInputElement | null;
                if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    };

    const handleActivation = async () => {
        const chosenPassword = formData.password;
        setConfirmModalStatus('loading');
        setIsMainModalHidden(true);
        setActivationLoading(true);

        try {
            const activationProfile = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                middleName: formData.middleName,
                suffix: formData.suffix,
                street: formData.street,
                city: formData.city,
                province: formData.province,
                zipCode: formData.zipCode,
                mobile: formData.mobile,
                email: formData.email,
                dob: formData.dob,
                age: formData.age,
                sex: formData.sex,
            };

            const runStudentActivation = (allowEnrollmentCreate = false) => invokeEdgeFunction('activate-student-account', {
                body: {
                    mode: 'student-profile-activation',
                    studentId: formData.studentId,
                    course: formData.course,
                    allowEnrollmentCreate,
                    password: chosenPassword,
                    profile: activationProfile
                },
                fallbackMessage: 'Account creation failed.'
            });

            const data = await runStudentActivation(!studentActivationPolicy.requireEnrollmentKey);
            const username = data.studentId || formData.studentId;

            rememberPendingProfileCompletion(username, activationProfile);
            onActivationCredentialsCreated(username, chosenPassword);
            setActivatedCredentials({ username, password: chosenPassword });
            setShowConfirmModal(false);
            setShowActivateModal(false);
            setShowSuccessModal(true);
        } catch (error: any) {
            const errMsg = getSafeStudentActivationErrorMessage(error);
            setConfirmModalError(errMsg);
            setConfirmModalStatus('error');

            const normalizedError = String(error || '').toLowerCase();
            if (normalizedError.includes('email') || normalizedError.includes('auth account') || normalizedError.includes('already exists') || normalizedError.includes('already been registered')) {
                setActivationErrorFields(['email']);
            } else if (normalizedError.includes('course') || normalizedError.includes('enrolled in')) {
                setActivationErrorFields(['course']);
            } else if (normalizedError.includes('student id') || normalizedError.includes('student_id') || normalizedError.includes('enrollment') || normalizedError.includes('enrolled')) {
                setActivationErrorFields(['studentId']);
            } else if (normalizedError.includes('password')) {
                setActivationErrorFields(['password', 'confirmPassword']);
            } else {
                setActivationErrorFields([]);
            }
        } finally {
            setActivationLoading(false);
        }
    };

    const openActivationModal = () => {
        setShowActivateModal(true);
        setActivatedCredentials(null);
        setActivationStep(1);
        setIsMainModalHidden(false);
    };

    const closeActivationModal = () => {
        setShowActivateModal(false);
    };

    const closeActivationModalAndClearErrors = () => {
        setShowActivateModal(false);
        setActivationErrorFields([]);
    };

    const returnActivatedCredentialsToLoginForm = () => {
        if (!activatedCredentials) return;

        setShowActivateModal(false);
        onUseActivatedCredentialsForLogin(
            activatedCredentials.username,
            activatedCredentials.password
        );
    };

    return {
        activationLoading,
        showActivateModal,
        showConfirmModal,
        setShowConfirmModal,
        confirmModalStatus,
        confirmModalError,
        showSuccessModal,
        setShowSuccessModal,
        isMainModalHidden,
        showActivationPassword,
        activationErrorFields,
        setActivationErrorFields,
        courses,
        activatedCredentials,
        activationStep,
        setActivationStep,
        formData,
        setFormData,
        handleChange,
        handleActivatedCredentialsLogin,
        handleNextStep,
        handleActivationTrigger,
        handleCloseConfirmError,
        handleActivation,
        openActivationModal,
        closeActivationModal,
        closeActivationModalAndClearErrors,
        returnActivatedCredentialsToLoginForm,
        toggleActivationPassword: () => setShowActivationPassword((current) => !current)
    };
}
