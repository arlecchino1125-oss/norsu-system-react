import React from 'react';

const SERVICE_GUIDES = {
    assessment: {
        icon: '📋', color: 'from-blue-500 to-sky-400',
        title: 'Needs Assessment Tool',
        subtitle: 'Help us understand your needs better',
        steps: [
            { icon: '1️⃣', text: 'Browse the available assessment forms created by the care staff.' },
            { icon: '2️⃣', text: 'Click on an active form to open it and read the instructions carefully.' },
            { icon: '3️⃣', text: 'Answer all questions honestly — your responses are confidential.' },
            { icon: '4️⃣', text: 'Submit the form. You can only complete each form once.' },
        ],
        tip: 'Your responses help the CARE Center provide you with personalized support and programmes.'
    },
    counseling: {
        icon: '💬', color: 'from-purple-500 to-indigo-500',
        title: 'Counseling Services',
        subtitle: 'Self-referral for counseling support',
        steps: [
            { icon: '1️⃣', text: 'Click "Request Counseling" to open the self-referral form.' },
            { icon: '2️⃣', text: 'Your name, course, and year are auto-filled from your profile.' },
            { icon: '3️⃣', text: 'Describe your reasons for requesting counseling and any actions you\'ve already taken.' },
            { icon: '4️⃣', text: 'Submit and wait for the care staff to review and schedule your session.' },
            { icon: '5️⃣', text: 'After your session is completed, submit the CSM feedback form.' },
        ],
        tip: 'All information is kept strictly confidential. Don\'t hesitate to reach out — we\'re here to help.'
    },
    support: {
        icon: '🤝', color: 'from-teal-500 to-emerald-500',
        title: 'Additional Support Services',
        subtitle: 'For students with disabilities or special needs',
        steps: [
            { icon: '1️⃣', text: 'Read the introduction carefully to understand the kinds of support available.' },
            { icon: '2️⃣', text: 'Click "Submit Application" to open the support application form.' },
            { icon: '3️⃣', text: 'Select the categories that apply to your situation.' },
            { icon: '4️⃣', text: 'Describe your disability or special learning needs in the questions provided.' },
            { icon: '5️⃣', text: 'Upload any supporting medical or psychological documents, then submit.' },
        ],
        tip: 'Your privacy is protected. Information is only shared with staff who can help support you.'
    },
    scholarship: {
        icon: '🎓', color: 'from-amber-500 to-orange-500',
        title: 'Scholarship Services',
        subtitle: 'View and apply for scholarships',
        steps: [
            { icon: '1️⃣', text: 'Browse the available scholarships and their details.' },
            { icon: '2️⃣', text: 'Click any scholarship card to view full eligibility requirements and benefits.' },
            { icon: '3️⃣', text: 'If eligible, click "Apply" to submit your interest.' },
            { icon: '4️⃣', text: 'Track your application status directly from this page.' },
        ],
        tip: 'Check back regularly — new scholarships may be posted throughout the academic year.'
    },
    feedback: {
        icon: '⭐', color: 'from-pink-500 to-rose-500',
        title: 'My Evaluations',
        subtitle: 'View your submitted event evaluations',
        steps: [
            { icon: '1️⃣', text: 'This page shows all event evaluation forms you\'ve submitted.' },
            { icon: '2️⃣', text: 'Click any evaluation card to see the full details and scores.' },
            { icon: '3️⃣', text: 'To submit a new evaluation, go to Events and click "Rate" on any attended event.' },
        ],
        tip: 'Your evaluations help the university improve future events and activities.'
    },
    events: {
        icon: '📅', color: 'from-indigo-500 to-purple-600',
        title: 'Events & Announcements',
        subtitle: 'Stay updated with campus activities',
        steps: [
            { icon: '1️⃣', text: 'Browse upcoming events and announcements from the university.' },
            { icon: '2️⃣', text: 'Click any event card to view full details.' },
            { icon: '3️⃣', text: 'When the event starts, click "Time In" (upload proof if required).' },
            { icon: '4️⃣', text: 'After the event ends, click "Time Out" to complete your attendance.' },
            { icon: '5️⃣', text: 'Once completed, you can rate the event using the evaluation form.' },
        ],
        tip: 'Always time in AND time out — incomplete attendances won\'t be recorded. Note: your location is also recorded during Time In for verification purposes.'
    },
    profile: {
        icon: '👤', color: 'from-gray-600 to-gray-800',
        title: 'My Profile',
        subtitle: 'Manage your student information',
        steps: [
            { icon: '1️⃣', text: 'View your personal, academic, and contact information.' },
            { icon: '2️⃣', text: 'Click "Edit" to update your information.' },
            { icon: '3️⃣', text: 'Make your changes and click "Save Changes" to update your profile.' },
        ],
        tip: 'Keep your profile up to date so staff can reach you and auto-fill forms accurately.'
    }
};

// Reusable Service Intro Guide Modal
export function ServiceIntroModal({ serviceKey }: any) {
    const storageKey = `norsu_intro_seen_${serviceKey}`;
    const [show, setShow] = React.useState(false);
    const guide = (SERVICE_GUIDES as any)[serviceKey];

    React.useEffect(() => {
        if (!localStorage.getItem(storageKey)) setShow(true);
    }, []);

    if (!show || !guide) return null;

    const dismiss = () => { localStorage.setItem(storageKey, '1'); setShow(false); };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-backdrop student-mobile-modal-overlay">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in student-mobile-modal-panel student-mobile-modal-scroll-panel">
                {/* Header */}
                <div className={`px-8 py-6 bg-gradient-to-r ${guide.color} text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                    <div className="relative z-10">
                        <span className="text-3xl mb-2 block">{guide.icon}</span>
                        <h3 className="text-xl font-extrabold">{guide.title}</h3>
                        <p className="text-sm text-white/80 mt-1">{guide.subtitle}</p>
                    </div>
                </div>
                {/* Steps */}
                <div className="p-8">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">How it works</h4>
                    <div className="space-y-3 mb-6">
                        {guide.steps.map((step: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                <span className="text-lg flex-shrink-0">{step.icon}</span>
                                <p className="text-sm text-gray-700">{step.text}</p>
                            </div>
                        ))}
                    </div>
                    {guide.tip && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                            <p className="text-xs text-blue-700"><span className="font-bold">💡 Tip:</span> {guide.tip}</p>
                        </div>
                    )}
                    <button onClick={dismiss} className={`w-full py-3.5 bg-gradient-to-r ${guide.color} text-white rounded-xl font-bold text-sm shadow-lg transition-all hover:opacity-90`}>
                        Got it, let's go!
                    </button>
                </div>
            </div>
        </div>
    );
}
