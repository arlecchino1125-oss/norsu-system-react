import { useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseScholarship } from '../../../../../utils/scholarshipHelpers';
import type { StudentDatasetRefreshKey } from '../../../hooks/useStudentPortalRefresh';

type RunDatasetRefresh = (
    key: StudentDatasetRefreshKey,
    refreshFn: () => Promise<unknown>,
    options?: { force?: boolean }
) => Promise<boolean>;

interface UseStudentScholarshipsArgs {
    personalInfo: any;
    runDatasetRefresh: RunDatasetRefresh;
    showToast: (message: string, type?: string) => void;
    supabaseClient: any;
}

export function useStudentScholarships({
    personalInfo,
    runDatasetRefresh,
    showToast,
    supabaseClient
}: UseStudentScholarshipsArgs) {
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState<any>(null);
    const [scholarshipsList, setScholarshipsList] = useState<any[]>([]);
    const [myApplications, setMyApplications] = useState<any[]>([]);
    const [isApplyingScholarshipId, setIsApplyingScholarshipId] = useState<string | null>(null);

    // ponytail: React Query caching is injected to avoid page refresh amnesia.
    const { data: scholarships, refetch: refetchScholarships } = useQuery({
        queryKey: ['student_scholarships'],
        queryFn: async () => {
            const { data, error } = await supabaseClient
                .from('scholarships')
                .select('id, title, description, requirements, deadline')
                .eq('is_active', true)
                .order('deadline', { ascending: true });
            if (error) throw error;
            return (data || []).map(parseScholarship);
        },
        staleTime: 2 * 60 * 1000
    });

    const { data: applications, refetch: refetchApplications } = useQuery({
        queryKey: ['student_scholarship_applications', personalInfo.studentId],
        queryFn: async () => {
            if (!personalInfo.studentId) return [];
            const { data, error } = await supabaseClient
                .from('scholarship_applications')
                .select('scholarship_id, status')
                .eq('student_id', personalInfo.studentId);
            if (error) throw error;
            return data || [];
        },
        enabled: Boolean(personalInfo.studentId),
        staleTime: 2 * 60 * 1000
    });

    useEffect(() => {
        if (scholarships) {
            setScholarshipsList(scholarships);
        }
    }, [scholarships]);

    useEffect(() => {
        if (!personalInfo.studentId) {
            setMyApplications([]);
        } else if (applications) {
            setMyApplications(applications);
        }
    }, [applications, personalInfo.studentId]);

    const refreshScholarshipsCached = useCallback(
        async (options?: { force?: boolean }) => {
            await refetchScholarships();
            return true;
        },
        [refetchScholarships]
    );

    const refreshScholarshipApplicationsCached = useCallback(
        async (options?: { force?: boolean }) => {
            await refetchApplications();
            return true;
        },
        [refetchApplications]
    );

    const handleApplyScholarship = useCallback(async (scholarship: any) => {
        if (!scholarship) return;
        const scholarshipId = String(scholarship.id || '').trim();
        if (scholarshipId && isApplyingScholarshipId === scholarshipId) return;

        if (!personalInfo.mobile || !personalInfo.email) {
            showToast("Update your mobile and email in your profile first.", "error");
            return;
        }

        if (scholarshipId) {
            setIsApplyingScholarshipId(scholarshipId);
        }

        try {
            const payload = {
                scholarship_id: scholarship.id,
                student_id: personalInfo.studentId,
                status: 'Pending'
            } as any;

            const { error } = await supabaseClient.from('scholarship_applications').insert([payload]);
            if (error) throw error;
            showToast("Your application has been submitted.");
            await refetchApplications();
            setShowScholarshipModal(false);
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            if (scholarshipId) {
                setIsApplyingScholarshipId((current) => (current === scholarshipId ? null : current));
            }
        }
    }, [
        isApplyingScholarshipId,
        personalInfo.email,
        personalInfo.mobile,
        personalInfo.studentId,
        showToast,
        supabaseClient,
        refetchApplications
    ]);

    return {
        showScholarshipModal,
        setShowScholarshipModal,
        selectedScholarship,
        setSelectedScholarship,
        scholarshipsList,
        myApplications,
        isApplyingScholarshipId,
        refreshScholarshipsCached,
        refreshScholarshipApplicationsCached,
        handleApplyScholarship
    };
}
