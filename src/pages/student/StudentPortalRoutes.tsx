import React, { lazy } from 'react';

const AssessmentView = lazy(() => import('./views/AssessmentView'));
const CounselingView = lazy(() => import('./views/CounselingView'));
const SupportView = lazy(() => import('./views/SupportView'));
const ScholarshipView = lazy(() => import('./views/ScholarshipView'));
const FeedbackView = lazy(() =>
  import('./views/FeedbackView').then((module) => ({ default: module.FeedbackView }))
);
const ProfileView = lazy(() =>
  import('./views/ProfileView').then((module) => ({ default: module.ProfileView }))
);

export const STUDENT_VIEW_FEATURE_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  profile: 'profile',
  assessment: 'assessment',
  counseling: 'counseling',
  support: 'support',
  scholarship: 'scholarship',
  events: 'events',
  feedback: 'feedback'
};

export const STUDENT_VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  assessment: 'Needs Assessment',
  counseling: 'Counseling',
  support: 'Additional Support',
  scholarship: 'Scholarship',
  events: 'Events',
  feedback: 'Feedback'
};

export interface StudentPortalRouteDefinition {
  viewId: string;
  serviceKey: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

export const STUDENT_PORTAL_ROUTES: StudentPortalRouteDefinition[] = [
  { viewId: 'assessment', serviceKey: 'assessment', component: AssessmentView },
  { viewId: 'counseling', serviceKey: 'counseling', component: CounselingView },
  { viewId: 'support', serviceKey: 'support', component: SupportView },
  { viewId: 'scholarship', serviceKey: 'scholarship', component: ScholarshipView },
  { viewId: 'feedback', serviceKey: 'feedback', component: FeedbackView },
  { viewId: 'profile', serviceKey: 'profile', component: ProfileView }
];

export const STUDENT_PORTAL_ROUTE_MAP = Object.fromEntries(
  STUDENT_PORTAL_ROUTES.map((route) => [route.viewId, route])
) as Record<string, StudentPortalRouteDefinition>;
