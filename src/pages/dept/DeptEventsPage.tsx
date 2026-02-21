const DeptEventsPage = ({
    data,
    eventsList,
    handleViewDeptAttendees
}: any) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Department Events</h1>
                <p className="text-gray-500 text-sm mt-1">Monitor student attendance for {data.profile.department}</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventsList.map(event => (
                    <div key={event.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md transition card-hover">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${event.type === 'Event' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{event.type}</span>
                            <span className="text-xs text-gray-500">{event.event_date}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2 dark:text-white">{event.title}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 dark:text-gray-400">{event.description}</p>
                        {event.type === 'Event' && (
                            <button onClick={() => handleViewDeptAttendees(event)} className="w-full py-2 bg-green-50 text-green-700 font-bold text-xs rounded-lg hover:bg-green-100 transition">
                                View {data.profile.department.split(' ')[0]} Attendees
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeptEventsPage;
