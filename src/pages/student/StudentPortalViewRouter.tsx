import React, { lazy, Suspense } from 'react';
import { ServiceIntroModal } from './views/ServiceIntroModal';

export { ServiceIntroModal } from './views/ServiceIntroModal';

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

const renderLazyView = (isActive: boolean, Component: React.ComponentType<any>, props: any) => {
    if (!isActive) return null;
    return (
        <Suspense fallback={null}>
            <Component {...props} />
        </Suspense>
    );
};

export function renderRemainingViews(props: any) {
    const { activeView } = props;

    return (
        <>
            {activeView === 'assessment' && <ServiceIntroModal serviceKey="assessment" />}
            {activeView === 'counseling' && <ServiceIntroModal serviceKey="counseling" />}
            {activeView === 'support' && <ServiceIntroModal serviceKey="support" />}
            {activeView === 'scholarship' && <ServiceIntroModal serviceKey="scholarship" />}
            {activeView === 'feedback' && <ServiceIntroModal serviceKey="feedback" />}
            {activeView === 'profile' && <ServiceIntroModal serviceKey="profile" />}

            {renderLazyView(activeView === 'assessment', AssessmentView, props)}
            {renderLazyView(activeView === 'counseling', CounselingView, props)}
            {renderLazyView(activeView === 'support', SupportView, props)}
            {renderLazyView(activeView === 'scholarship', ScholarshipView, props)}
            {renderLazyView(activeView === 'feedback', FeedbackView, props)}
            {renderLazyView(activeView === 'profile', ProfileView, props)}
        </>
    );
}
