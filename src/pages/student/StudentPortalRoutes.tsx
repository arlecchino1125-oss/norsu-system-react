import React, { lazy } from 'react';
import type { StudentRemainingViewComponent } from './types';

const lazyStudentView = (loader: () => Promise<{ default: StudentRemainingViewComponent }>) => lazy(loader);

const AssessmentView = lazyStudentView(() => import('./features/assessment/components/AssessmentView'));
const CounselingView = lazyStudentView(() => import('./features/counseling/components/CounselingView'));
const SupportView = lazyStudentView(() => import('./features/support/components/SupportView'));
const ScholarshipView = lazyStudentView(() => import('./features/scholarship/components/ScholarshipView'));
const FeedbackView = lazyStudentView(() =>
  import('./features/feedback/components/FeedbackView').then((module) => ({ default: module.FeedbackView }))
);
const ProfileView = lazyStudentView(() =>
  import('./features/profile/components/ProfileView').then((module) => ({ default: module.ProfileView }))
);
const VolunteerView = lazyStudentView(() => import('./features/volunteer/components/VolunteerView'));

export const STUDENT_VIEW_FEATURE_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  profile: 'profile',
  assessment: 'assessment',
  counseling: 'counseling',
  support: 'support',
  scholarship: 'scholarship',
  events: 'events',
  feedback: 'feedback',
  volunteer: 'volunteer'
};

export const STUDENT_VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  assessment: 'Needs Assessment',
  counseling: 'Counseling',
  support: 'Additional Support',
  scholarship: 'Scholarship',
  events: 'Events',
  feedback: 'Feedback',
  volunteer: 'Volunteer Form'
};

export interface StudentPortalRouteDefinition {
  viewId: string;
  serviceKey: string;
  component: React.LazyExoticComponent<StudentRemainingViewComponent>;
}

export const STUDENT_PORTAL_ROUTES: StudentPortalRouteDefinition[] = [
  { viewId: 'assessment', serviceKey: 'assessment', component: AssessmentView },
  { viewId: 'counseling', serviceKey: 'counseling', component: CounselingView },
  { viewId: 'support', serviceKey: 'support', component: SupportView },
  { viewId: 'scholarship', serviceKey: 'scholarship', component: ScholarshipView },
  { viewId: 'feedback', serviceKey: 'feedback', component: FeedbackView },
  { viewId: 'profile', serviceKey: 'profile', component: ProfileView },
  { viewId: 'volunteer', serviceKey: 'volunteer', component: VolunteerView }
];

export const STUDENT_PORTAL_ROUTE_MAP = Object.fromEntries(
  STUDENT_PORTAL_ROUTES.map((route) => [route.viewId, route])
) as Record<string, StudentPortalRouteDefinition>;
