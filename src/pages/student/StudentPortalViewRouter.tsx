import React, { Suspense } from 'react';
import { ServiceIntroModal } from './views/ServiceIntroModal';
import { STUDENT_PORTAL_ROUTE_MAP } from './StudentPortalRoutes';

export { ServiceIntroModal } from './views/ServiceIntroModal';

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
