import React, { Suspense } from 'react';
import { ServiceIntroModal } from './features/shared/components/ServiceIntroModal';
import { STUDENT_PORTAL_ROUTE_MAP } from './StudentPortalRoutes';
import type {
    StudentRemainingFlatViewProps,
    StudentRemainingViewComponent,
    StudentRemainingViewProps
} from './types';

export { ServiceIntroModal } from './features/shared/components/ServiceIntroModal';

const renderLazyView = (
    isActive: boolean,
    Component: React.LazyExoticComponent<StudentRemainingViewComponent>,
    props: StudentRemainingFlatViewProps
) => {
    if (!isActive) return null;
    return (
        <Suspense fallback={null}>
            <Component {...props} />
        </Suspense>
    );
};

const flattenStudentRemainingViewProps = (props: StudentRemainingViewProps): StudentRemainingFlatViewProps => ({
    activeView: props.activeView,
    ...props.shared,
    ...props.assessment,
    ...props.counseling,
    ...props.support,
    ...props.scholarship,
    ...props.feedback,
    ...props.profile
});

export function renderRemainingViews(viewProps: StudentRemainingViewProps) {
    const props = flattenStudentRemainingViewProps(viewProps);
    const { activeView } = props;
    const route = STUDENT_PORTAL_ROUTE_MAP[activeView];

    if (!route) {
        return null;
    }

    return (
        <>
            <ServiceIntroModal serviceKey={route.serviceKey} />
            {renderLazyView(true, route.component, props)}
        </>
    );
}
