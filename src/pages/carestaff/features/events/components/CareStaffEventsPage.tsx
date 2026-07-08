import React, { useState, useEffect } from 'react';
import {
    Plus, Calendar, Clock, MapPin, Users, Star, XCircle, Download, CheckCircle, Archive, RefreshCw
} from 'lucide-react';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { supabase } from '../../../../../lib/supabase';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../../components/ui/Card';
import { useEventsData } from '../../../../../hooks/useEventsData';
import { SystemEvent } from '../../../../../types/models';
import { getCoursesWithDepartments, getDepartments } from '../../../../../services/careStaffService';
import {
    EVENT_ACTIVITY_TYPES,
    SECTION_OPTIONS,
    YEAR_LEVEL_OPTIONS,
    applyEventAudienceQuery,
    cleanAudienceValues,
    getAudienceValues,
    getAudienceLabel,
    getEventAudienceType,
    isAttendanceActivityType
} from '../../../../../utils/eventAudience';
import type { CareStaffDashboardFunctions } from '../../../types';
import { useCareStaffEvents, createEmptyEvent, getEventTypeBadgeClass, getArchivedEventTypeBadgeClass, isVisibleForStaffFilter, getAudienceModeLabel, getAudienceBulletItems, isRegistrationEvent, formatRegistrationDeadline, getRegistrationStatusClass } from '../hooks/useCareStaffEvents';
import type { CareStaffEventsPageProps } from '../hooks/useCareStaffEvents';

const CareStaffEventsPage = ({ functions }: CareStaffEventsPageProps) => {
    const {
        showToast,
        canPerformAction,
        canArchiveRecords,
        eventFilter,
        setEventFilter,
        isRefreshingData,
        setIsRefreshingData,
        events,
        archivedEvents,
        fetchEvents,
        showEventModal,
        setShowEventModal,
        showDeleteEventModal,
        setShowDeleteEventModal,
        showAttendeesModal,
        setShowAttendeesModal,
        showRegistrantsModal,
        setShowRegistrantsModal,
        showFeedbackModal,
        setShowFeedbackModal,
        detailEvent,
        setDetailEvent,
        editingEventId,
        setEditingEventId,
        eventToDelete,
        setEventToDelete,
        newEvent,
        setNewEvent,
        departmentOptions,
        setDepartmentOptions,
        courseOptions,
        setCourseOptions,
        attendees,
        setAttendees,
        expectedStudents,
        setExpectedStudents,
        registrations,
        setRegistrations,
        feedbackList,
        setFeedbackList,
        selectedEventTitle,
        setSelectedEventTitle,
        selectedAttendanceEvent,
        setSelectedAttendanceEvent,
        selectedRegistrationEvent,
        setSelectedRegistrationEvent,
        attendeeFilter,
        setAttendeeFilter,
        yearLevelFilter,
        setYearLevelFilter,
        attendeeCourseFilter,
        setAttendeeCourseFilter,
        attendeeSectionFilter,
        setAttendeeSectionFilter,
        registrantStatusFilter,
        setRegistrantStatusFilter,
        createEvent,
        handleEditEvent,
        handleDeleteEvent,
        confirmDeleteEvent,
        handleViewAttendees,
        handleViewRegistrants,
        handleViewFeedback,
        handleRefreshData,
        getCurrentLocation,
        renderAudienceCheckboxGroup
    } = useCareStaffEvents({ functions });

    return (
        <>
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Events & Announcements</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage campus activities and broadcast official notices.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            isLoading={isRefreshingData}
                            leftIcon={!isRefreshingData ? <RefreshCw size={16} /> : undefined}
                        >
                            {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setEditingEventId(null);
                                setNewEvent(createEmptyEvent());
                                setShowEventModal(true);
                            }}
                            leftIcon={<Plus size={14} />}
                        >
                            Create New
                        </Button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        {['All Items', 'Activities', 'Announcements', 'Archived'].map(tab => (
                            <button key={tab} onClick={() => setEventFilter(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${eventFilter === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-700'}`}>
                                {tab === 'Archived' && <Archive size={14} />}
                                {tab}
                                {tab === 'Archived' && archivedEvents.length > 0 && (
                                    <span className="ml-1 bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{archivedEvents.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-md border border-gray-200">
                        {eventFilter === 'Archived' ? `Archived: ${archivedEvents.length}` : `Active: ${events.length}`}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Active Events */}
                    {eventFilter !== 'Archived' && events
                        .filter(i => eventFilter === 'All Items' || isVisibleForStaffFilter(i, eventFilter))
                        .map(item => (
                            <div key={item.id} onClick={() => setDetailEvent(item)} className="card-hover bg-white/80 backdrop-blur-sm border border-gray-100/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-4 relative overflow-hidden group cursor-pointer">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getEventTypeBadgeClass(item.type)}`}>{item.type}</span>
                                        {isAttendanceActivityType(item.type) && item.attendance_required && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Required</span>}
                                        {isRegistrationEvent(item) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Registration</span>}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                                    <p className="mt-2 max-w-5xl whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 line-clamp-2">
                                        {item.description || 'No description provided.'}
                                    </p>
                                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                        {item.location && <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>}
                                        {item.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{item.event_date}</span>}
                                        {item.event_time && <span className="flex items-center gap-1"><Clock size={12} />{item.event_time}</span>}
                                        {item.end_time && <span className="text-gray-400 text-[10px] ml-1">- {item.end_time}</span>}
                                        {isAttendanceActivityType(item.type) && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.attendees || 0} Attendees</span>}
                                        {isRegistrationEvent(item) && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.registeredCount || 0}{item.capacity ? `/${item.capacity}` : ''} Registered</span>}
                                        {isAttendanceActivityType(item.type) && item.avgRating && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Star size={12} />{item.avgRating} <span className="font-normal opacity-75">({item.feedbackCount})</span></span>}
                                    </div>
                                    {isAttendanceActivityType(item.type) && (
                                        <div className="mt-3 max-w-5xl rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700">
                                            <div className="flex items-start gap-2">
                                                <Users size={13} className="mt-0.5 shrink-0 text-slate-500" />
                                                <span className="min-w-0 break-words">{getAudienceModeLabel(item)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                                    {isAttendanceActivityType(item.type) && (
                                        <>
                                            <Button variant="secondary" size="sm" onClick={() => item.id && handleViewFeedback(item)} leftIcon={<Star size={14} className="text-yellow-500" />}>Reviews ({item.feedbackCount || 0})</Button>
                                            {isRegistrationEvent(item) && <Button variant="secondary" size="sm" onClick={() => item.id && handleViewRegistrants(item)} leftIcon={<Users size={14} className="text-emerald-500" />}>Registrants ({item.registeredCount || 0})</Button>}
                                            <Button variant="secondary" size="sm" onClick={() => item.id && handleViewAttendees(item)} leftIcon={<Users size={14} className="text-blue-500" />}>Attendees ({item.attendees || 0})</Button>
                                        </>
                                    )}
                                    <Button variant="secondary" size="sm" onClick={() => handleEditEvent(item)} leftIcon={<CheckCircle size={14} />} />
                                    {canArchiveRecords && (
                                        <Button variant="danger" size="sm" onClick={() => item.id && handleDeleteEvent(item.id)} leftIcon={<Archive size={14} />} />
                                    )}
                                </div>
                            </div>
                        ))}

                    {/* Archived Events */}
                    {eventFilter === 'Archived' && archivedEvents.map(item => (
                        <div key={item.id} onClick={() => setDetailEvent(item)} className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-4 relative overflow-hidden opacity-75 hover:opacity-100 transition-opacity cursor-pointer">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-gray-400" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getArchivedEventTypeBadgeClass(item.type)}`}>{item.type}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 flex items-center gap-1"><Archive size={10} /> Archived</span>
                                    {isRegistrationEvent(item) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Registration</span>}
                                </div>
                                <h3 className="font-bold text-gray-600 text-lg">{item.title}</h3>
                                <p className="mt-2 max-w-5xl whitespace-pre-wrap break-words text-sm leading-6 text-gray-500 line-clamp-2">
                                    {item.description || 'No description provided.'}
                                </p>
                                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                                    {item.location && <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>}
                                    {item.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{item.event_date}</span>}
                                    {item.event_time && <span className="flex items-center gap-1"><Clock size={12} />{item.event_time}</span>}
                                    {item.end_time && <span className="text-gray-300 text-[10px] ml-1">- {item.end_time}</span>}
                                    {isAttendanceActivityType(item.type) && <span className="bg-blue-50 text-blue-500 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.attendees || 0} Attendees</span>}
                                    {isRegistrationEvent(item) && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.registeredCount || 0}{item.capacity ? `/${item.capacity}` : ''} Registered</span>}
                                    {isAttendanceActivityType(item.type) && item.avgRating && <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Star size={12} />{item.avgRating} <span className="font-normal opacity-75">({item.feedbackCount})</span></span>}
                                </div>
                                {isAttendanceActivityType(item.type) && (
                                    <div className="mt-3 max-w-5xl rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                                        <div className="flex items-start gap-2">
                                            <Users size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                            <span className="min-w-0 break-words">{getAudienceModeLabel(item)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                                {isAttendanceActivityType(item.type) && (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => item.id && handleViewFeedback(item)} leftIcon={<Star size={14} className="text-yellow-400" />}>Reviews ({item.feedbackCount || 0})</Button>
                                        {isRegistrationEvent(item) && <Button variant="ghost" size="sm" onClick={() => item.id && handleViewRegistrants(item)} leftIcon={<Users size={14} className="text-emerald-400" />}>Registrants ({item.registeredCount || 0})</Button>}
                                        <Button variant="ghost" size="sm" onClick={() => item.id && handleViewAttendees(item)} leftIcon={<Users size={14} className="text-blue-400" />}>Attendees ({item.attendees || 0})</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {eventFilter !== 'Archived' && events.filter(i => eventFilter === 'All Items' || isVisibleForStaffFilter(i, eventFilter)).length === 0 && <div className="text-center py-8 text-gray-400">No active events or announcements found.</div>}
                    {eventFilter === 'Archived' && archivedEvents.length === 0 && <div className="text-center py-8 text-gray-400">No archived events yet.</div>}
                </div>
            </div>

            {/* Event Modal - Enhanced for Create/Edit */}
            {showEventModal && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4 sm:p-6">
                    <Card className="w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in shadow-2xl">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50/30">
                            <h3 className="font-bold text-lg gradient-text">{editingEventId ? 'Edit Item' : 'Create New Item'}</h3>
                            <Button variant="ghost" size="sm" onClick={() => { setShowEventModal(false); setEditingEventId(null); }}><XCircle className="text-gray-400 hover:text-gray-600" /></Button>
                        </CardHeader>
                        <CardContent className="overflow-y-auto sm:p-8">
                            <form onSubmit={createEvent} className="space-y-5">
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newEvent.type}
                                        onChange={e => {
                                            const nextType = e.target.value as SystemEvent['type'];
                                            const nextIsActivity = isAttendanceActivityType(nextType);
                                            setNewEvent({
                                                ...newEvent,
                                                type: nextType,
                                                participation_mode: nextIsActivity ? (newEvent.participation_mode || 'general_attendance') : 'general_attendance',
                                                audience_type: nextIsActivity ? (newEvent.audience_type || 'all_students') : 'all_students',
                                                attendance_required: nextIsActivity ? Boolean(newEvent.attendance_required) : false,
                                                capacity: nextIsActivity ? (newEvent.capacity || null) : null,
                                                registration_deadline: nextIsActivity ? (newEvent.registration_deadline || '') : ''
                                            });
                                        }}
                                    >
                                        {EVENT_ACTIVITY_TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    </div>
                                    <div className="lg:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Title</label><input required className="w-full border rounded-lg p-2 text-sm" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="e.g., Campus Fair 2026" /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea required className="w-full resize-y rounded-xl border border-gray-200 bg-slate-50/60 p-4 text-sm leading-6 text-gray-700 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100" rows={5} value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Details..." /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Date</label><input type="date" required className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_date} onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })} /></div>
                                    {isAttendanceActivityType(newEvent.type) && (
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_time} onChange={e => setNewEvent({ ...newEvent, event_time: e.target.value })} /></div>
                                    )}
                                </div>

                                {isAttendanceActivityType(newEvent.type) && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">End Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Location</label><input className="w-full border rounded-lg p-2 text-sm" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="e.g., Main Gym" /></div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Mode</label>
                                                    <select
                                                        className="w-full border rounded-lg p-2 text-sm bg-white"
                                                        value={newEvent.participation_mode || 'general_attendance'}
                                                        onChange={e => {
                                                            const nextMode = e.target.value as SystemEvent['participation_mode'];
                                                            setNewEvent({
                                                                ...newEvent,
                                                                participation_mode: nextMode,
                                                                attendance_required: nextMode === 'registration_required' ? true : Boolean(newEvent.attendance_required),
                                                                allow_walk_ins: nextMode === 'registration_required' ? Boolean(newEvent.allow_walk_ins) : true
                                                            });
                                                        }}
                                                    >
                                                        <option value="general_attendance">General attendance</option>
                                                        <option value="registration_required">Student registration</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Audience</label>
                                                    <select
                                                        className="w-full border rounded-lg p-2 text-sm bg-white"
                                                        value={newEvent.audience_type || 'all_students'}
                                                        onChange={e => setNewEvent({
                                                            ...newEvent,
                                                            audience_type: e.target.value as SystemEvent['audience_type']
                                                        })}
                                                    >
                                                        <option value="all_students">All students</option>
                                                        <option value="filtered_students">Selected students</option>
                                                        <option value="graduating_students">Graduating students</option>
                                                    </select>
                                                </div>
                                                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-bold text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(newEvent.attendance_required)}
                                                        onChange={e => setNewEvent({ ...newEvent, attendance_required: e.target.checked })}
                                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    Required attendance
                                                </label>
                                            </div>

                                            {isRegistrationEvent(newEvent) && (
                                                <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 lg:grid-cols-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Capacity</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-full border rounded-lg p-2 text-sm bg-white"
                                                            value={newEvent.capacity ?? ''}
                                                            onChange={e => {
                                                                const nextValue = e.target.value;
                                                                setNewEvent({ ...newEvent, capacity: nextValue ? Number(nextValue) : null });
                                                            }}
                                                            placeholder="Unlimited"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Registration Deadline</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="w-full border rounded-lg p-2 text-sm bg-white"
                                                            value={newEvent.registration_deadline || ''}
                                                            onChange={e => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                                                        />
                                                    </div>
                                                    <label className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white p-3 text-xs font-bold text-gray-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(newEvent.allow_walk_ins)}
                                                            onChange={e => setNewEvent({ ...newEvent, allow_walk_ins: e.target.checked })}
                                                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                        Allow walk-ins during event
                                                    </label>
                                                </div>
                                            )}

                                            {newEvent.audience_type !== 'all_students' && (
                                                <div className="space-y-3">
                                                    {renderAudienceCheckboxGroup('Departments', 'audience_departments', departmentOptions)}
                                                    {renderAudienceCheckboxGroup('Courses', 'audience_courses', courseOptions)}
                                                    {renderAudienceCheckboxGroup('Year Levels', 'audience_year_levels', YEAR_LEVEL_OPTIONS)}
                                                    {renderAudienceCheckboxGroup('Sections', 'audience_sections', SECTION_OPTIONS, value => `Section ${value}`)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-blue-700">Geolocation</label>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={getCurrentLocation} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} /> Get My Location</button>
                                                    <button type="button" onClick={() => setNewEvent({ ...newEvent, latitude: '9.306', longitude: '123.306' })} className="text-xs text-gray-500 hover:underline flex items-center gap-1"><MapPin size={12} /> Reset to Campus</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="number" step="any" placeholder="Lat" className="w-full border rounded-lg p-2 text-xs" value={newEvent.latitude} onChange={e => setNewEvent({ ...newEvent, latitude: e.target.value })} />
                                                <input type="number" step="any" placeholder="Long" className="w-full border rounded-lg p-2 text-xs" value={newEvent.longitude} onChange={e => setNewEvent({ ...newEvent, longitude: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowEventModal(false); setEditingEventId(null); }}>Cancel</Button>
                                    <Button type="submit" variant="primary" className="flex-1">{editingEventId ? 'Update' : 'Create'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Attendees Modal */}
            {showAttendeesModal && (() => {
                const depts = [...new Set(attendees.map((a: any) => a.department).filter(Boolean))].sort() as string[];
                const yearLevels = [...new Set(attendees.map((a: any) => a.year_level).filter(Boolean))].sort() as string[];
                const courses = [...new Set(attendees.map((a: any) => a.course).filter(Boolean))].sort() as string[];
                const sections = [...new Set(attendees.map((a: any) => a.section).filter(Boolean))].sort() as string[];
                let filtered = attendeeFilter === 'All' ? attendees : attendees.filter(a => a.department === attendeeFilter);
                if (attendeeCourseFilter !== 'All') filtered = filtered.filter(a => a.course === attendeeCourseFilter);
                if (yearLevelFilter !== 'All') filtered = filtered.filter(a => a.year_level === yearLevelFilter);
                if (attendeeSectionFilter !== 'All') filtered = filtered.filter(a => a.section === attendeeSectionFilter);
                const completedCount = attendees.filter(a => a.time_out).length;
                const attendeeByStudentId = new Map(attendees.map((att: any) => [String(att.student_id || ''), att]));
                const absentStudents = expectedStudents.filter((student: any) => !attendeeByStudentId.has(String(student.student_id || '')));
                const attendanceRate = expectedStudents.length > 0
                    ? Math.round((attendees.length / expectedStudents.length) * 100)
                    : null;
                const studentName = (student: any) => [student.first_name, student.middle_name, student.last_name, student.suffix]
                    .map((part) => String(part || '').trim())
                    .filter(Boolean)
                    .join(' ');
                return (
                    <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b bg-gray-50 rounded-t-2xl">
                                <div className="flex justify-between items-center mb-3">
                                    <div><h3 className="font-bold text-lg">Attendees List</h3><p className="text-xs text-gray-500">{selectedEventTitle}</p></div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => {
                                            if (filtered.length === 0 && expectedStudents.length === 0) return;
                                            const headers = ['Student Name', 'Department', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
                                            const rows = expectedStudents.length > 0
                                                ? expectedStudents.map((student: any) => {
                                                    const attendance = attendeeByStudentId.get(String(student.student_id || ''));
                                                    return [
                                                        attendance?.student_name || studentName(student),
                                                        student.department || attendance?.department || '',
                                                        student.course || attendance?.course || '',
                                                        student.year_level || attendance?.year_level || '',
                                                        student.section || attendance?.section || '',
                                                        attendance?.time_in ? new Date(attendance.time_in).toLocaleString() : '-',
                                                        attendance?.time_out ? new Date(attendance.time_out).toLocaleString() : '-',
                                                        attendance ? (attendance.time_out ? 'Completed' : 'Still In') : (selectedAttendanceEvent?.attendance_required ? 'Absent' : 'Not attended')
                                                    ];
                                                })
                                                : filtered.map(a => [a.student_name, a.department || '', a.course || '', a.year_level || '', a.section || '', new Date(a.time_in).toLocaleString(), a.time_out ? new Date(a.time_out).toLocaleString() : '-', a.time_out ? 'Completed' : 'Still In']);
                                            exportToExcel(headers, rows, `${selectedEventTitle || 'event'}_attendees`);
                                        }} disabled={filtered.length === 0 && expectedStudents.length === 0} leftIcon={<Download size={14} />}>
                                            Export Excel
                                        </Button>
                                        <button onClick={() => { setShowAttendeesModal(false); setAttendeeFilter('All'); setYearLevelFilter('All'); setAttendeeCourseFilter('All'); setAttendeeSectionFilter('All'); setExpectedStudents([]); setSelectedAttendanceEvent(null); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{attendees.length} Total</span>
                                    <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">{completedCount} Completed</span>
                                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-bold">{attendees.length - completedCount} Still In</span>
                                    {expectedStudents.length > 0 && <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">{expectedStudents.length} Expected</span>}
                                    {expectedStudents.length > 0 && <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold">{absentStudents.length} {selectedAttendanceEvent?.attendance_required ? 'Absent' : 'Not attended'}</span>}
                                    {attendanceRate !== null && <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">{attendanceRate}% Attendance</span>}
                                </div>
                                {selectedAttendanceEvent && expectedStudents.length > 0 && (
                                    <p className="mb-3 text-xs font-semibold text-gray-500">Audience: {getAudienceLabel(selectedAttendanceEvent)}</p>
                                )}
                                {depts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Dept:</span>
                                        <button onClick={() => setAttendeeFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeFilter === 'All' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All ({attendees.length})</button>
                                        {depts.map(dept => {
                                            const count = attendees.filter(a => a.department === dept).length;
                                            return <button key={dept} onClick={() => setAttendeeFilter(dept)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeFilter === dept ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{dept} ({count})</button>;
                                        })}
                                    </div>
                                )}
                                {yearLevels.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Year:</span>
                                        <button onClick={() => setYearLevelFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                        {yearLevels.map(yl => {
                                            const count = attendees.filter(a => a.year_level === yl).length;
                                            return <button key={yl} onClick={() => setYearLevelFilter(yl)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === yl ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{yl} ({count})</button>;
                                        })}
                                    </div>
                                )}
                                {courses.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Course:</span>
                                        <button onClick={() => setAttendeeCourseFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeCourseFilter === 'All' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                        {courses.map(c => {
                                            const count = attendees.filter(a => a.course === c).length;
                                            return <button key={c} onClick={() => setAttendeeCourseFilter(c)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeCourseFilter === c ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{c} ({count})</button>;
                                        })}
                                    </div>
                                )}
                                {sections.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Section:</span>
                                        <button onClick={() => setAttendeeSectionFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeSectionFilter === 'All' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                        {sections.map(s => {
                                            const count = attendees.filter(a => a.section === s).length;
                                            return <button key={s} onClick={() => setAttendeeSectionFilter(s)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeSectionFilter === s ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>Sec {s} ({count})</button>;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="p-0 overflow-y-auto flex-1">
                                {filtered.length === 0 ? <p className="text-center py-8 text-gray-500">No attendees yet.</p> : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0"><tr><th className="px-6 py-3">Student</th><th className="px-6 py-3">Course</th><th className="px-6 py-3">Year / Sec</th><th className="px-6 py-3">Time In</th><th className="px-6 py-3">Time Out</th><th className="px-6 py-3">Location</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filtered.map((att, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-6 py-3"><p className="font-bold text-gray-900">{att.student_name}</p><p className="text-xs text-gray-500">{att.department}</p></td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium">{att.course || '-'}</td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium">{att.year_level || '-'}{att.section ? ` — ${att.section}` : ''}</td>
                                                    <td className="px-6 py-3 text-gray-600">{new Date(att.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-6 py-3">{att.time_out ? <span className="text-green-600 font-medium">{new Date(att.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-yellow-600 text-xs font-bold">Still In</span>}</td>
                                                    <td className="px-6 py-3 text-xs">
                                                        {att.latitude ? <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} />Map</a> : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {expectedStudents.length > 0 && absentStudents.length > 0 && (
                                    <div className="border-t border-gray-100 bg-red-50/40 p-5">
                                        <h4 className="mb-3 text-xs font-bold uppercase text-red-700">
                                            {selectedAttendanceEvent?.attendance_required ? 'Absent Students' : 'Expected Students Not Yet Attended'}
                                        </h4>
                                        <div className="max-h-56 overflow-y-auto rounded-xl border border-red-100 bg-white">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-red-50 text-red-700"><tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Course</th><th className="px-4 py-2">Year / Sec</th></tr></thead>
                                                <tbody className="divide-y divide-red-50">
                                                    {absentStudents.map((student: any) => (
                                                        <tr key={student.student_id}>
                                                            <td className="px-4 py-2"><p className="font-bold text-gray-800">{studentName(student)}</p><p className="text-[10px] text-gray-500">{student.student_id} | {student.department || '-'}</p></td>
                                                            <td className="px-4 py-2 text-gray-600">{student.course || '-'}</td>
                                                            <td className="px-4 py-2 text-gray-600">{student.year_level || '-'}{student.section ? ` - ${student.section}` : ''}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Registrants Modal */}
            {showRegistrantsModal && (() => {
                const statusCounts = registrations.reduce((counts: Record<string, number>, registration: any) => {
                    const status = registration.attendance_status || 'Registered';
                    counts[status] = (counts[status] || 0) + 1;
                    return counts;
                }, {});
                const filteredRegistrations = registrantStatusFilter === 'All'
                    ? registrations
                    : registrations.filter((registration: any) => registration.attendance_status === registrantStatusFilter);
                const activeRegisteredCount = registrations.filter((registration: any) => registration.attendance_status !== 'Cancelled').length;
                const attendedCount = statusCounts.Attended || 0;
                const absentCount = statusCounts.Absent || 0;
                const attendanceRate = activeRegisteredCount > 0
                    ? Math.round((attendedCount / activeRegisteredCount) * 100)
                    : 0;
                const capacity = Number(selectedRegistrationEvent?.capacity || 0);
                const remainingSlots = capacity > 0 ? Math.max(capacity - activeRegisteredCount, 0) : null;
                const statusOptions = ['All', 'Registered', 'Attended', 'Absent', 'Cancelled'];

                return (
                    <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[84vh]">
                            <div className="p-6 border-b bg-gray-50 rounded-t-2xl">
                                <div className="flex justify-between items-center gap-4 mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">Registered Students</h3>
                                        <p className="text-xs text-gray-500">{selectedEventTitle}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                const headers = ['Student Name', 'Student ID', 'Department', 'Course', 'Year Level', 'Section', 'Registration Status', 'Registered At', 'Time In', 'Time Out'];
                                                const rows = filteredRegistrations.map((registration: any) => [
                                                    registration.student_name || '',
                                                    registration.student_id || '',
                                                    registration.department || '',
                                                    registration.course || '',
                                                    registration.year_level || '',
                                                    registration.section || '',
                                                    registration.attendance_status || registration.status || '',
                                                    registration.registered_at ? new Date(registration.registered_at).toLocaleString() : '',
                                                    registration.attendance?.time_in ? new Date(registration.attendance.time_in).toLocaleString() : '-',
                                                    registration.attendance?.time_out ? new Date(registration.attendance.time_out).toLocaleString() : '-'
                                                ]);
                                                exportToExcel(headers, rows, `${selectedEventTitle || 'event'}_registrants`);
                                            }}
                                            disabled={filteredRegistrations.length === 0}
                                            leftIcon={<Download size={14} />}
                                        >
                                            Export Excel
                                        </Button>
                                        <button onClick={() => { setShowRegistrantsModal(false); setRegistrations([]); setSelectedRegistrationEvent(null); setRegistrantStatusFilter('All'); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
                                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{activeRegisteredCount} Registered</span>
                                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold">{attendedCount} Attended</span>
                                    <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold">{absentCount} Absent</span>
                                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">{statusCounts.Cancelled || 0} Cancelled</span>
                                    <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">{attendanceRate}% Attendance</span>
                                    {remainingSlots !== null && <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-bold">{remainingSlots} Slots Left</span>}
                                </div>
                                {selectedRegistrationEvent && (
                                    <p className="mb-3 text-xs font-semibold text-gray-500">
                                        Deadline: {formatRegistrationDeadline(selectedRegistrationEvent.registration_deadline)} | Walk-ins: {selectedRegistrationEvent.allow_walk_ins ? 'Allowed' : 'Not allowed'}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {statusOptions.map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setRegistrantStatusFilter(status)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${registrantStatusFilter === status ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {status}{status !== 'All' ? ` (${statusCounts[status] || 0})` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-0 overflow-y-auto flex-1">
                                {filteredRegistrations.length === 0 ? <p className="text-center py-8 text-gray-500">No registered students yet.</p> : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Student</th>
                                                <th className="px-6 py-3">Course</th>
                                                <th className="px-6 py-3">Year / Sec</th>
                                                <th className="px-6 py-3">Registered</th>
                                                <th className="px-6 py-3">Attendance Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredRegistrations.map((registration: any) => (
                                                <tr key={registration.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-3">
                                                        <p className="font-bold text-gray-900">{registration.student_name || '-'}</p>
                                                        <p className="text-xs text-gray-500">{registration.student_id} | {registration.department || '-'}</p>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium">{registration.course || '-'}</td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium">{registration.year_level || '-'}{registration.section ? ` - ${registration.section}` : ''}</td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs">{registration.registered_at ? new Date(registration.registered_at).toLocaleString() : '-'}</td>
                                                    <td className="px-6 py-3">
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getRegistrationStatusClass(registration.attendance_status)}`}>
                                                            {registration.attendance_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div><h3 className="font-bold text-lg">Event Feedback</h3><p className="text-xs text-gray-500">{selectedEventTitle}</p></div>
                            <button onClick={() => setShowFeedbackModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {feedbackList.length === 0 ? <p className="text-center text-gray-500">No feedback submitted yet.</p> : feedbackList.map((fb, i) => {
                                const criteriaScores = [fb.q1_score, fb.q2_score, fb.q3_score, fb.q4_score, fb.q5_score, fb.q6_score, fb.q7_score]
                                    .map((value) => Number(value))
                                    .filter((score) => Number.isFinite(score) && score >= 1 && score <= 5);
                                const numericRating = Number(fb.rating);
                                const displayRating = Number.isFinite(numericRating) && numericRating > 0
                                    ? numericRating
                                    : (criteriaScores.length > 0 ? Number((criteriaScores.reduce((sum, score) => sum + score, 0) / criteriaScores.length).toFixed(1)) : 0);
                                const roundedRating = Math.round(displayRating);
                                const mainComment = fb.open_comments || fb.feedback || fb.comments || '';
                                return (
                                    <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-1 text-yellow-500 mb-2">
                                            {[1, 2, 3, 4, 5].map((idx) => (
                                                <Star key={idx} size={14} fill={idx <= roundedRating ? 'currentColor' : 'none'} className={idx <= roundedRating ? 'text-yellow-500' : 'text-gray-300'} />
                                            ))}
                                            <span className="text-xs font-bold text-gray-600 ml-2">{displayRating ? `${displayRating}/5` : 'No rating'}</span>
                                        </div>
                                        {mainComment ? <p className="text-sm text-gray-700 italic mb-2">"{mainComment}"</p> : <p className="text-xs text-gray-400 mb-2">No comment provided.</p>}
                                        {fb.open_best && <p className="text-xs text-gray-600"><span className="font-bold text-gray-700">Liked best:</span> {fb.open_best}</p>}
                                        {fb.open_suggestions && <p className="text-xs text-gray-600 mt-1"><span className="font-bold text-gray-700">Suggestion:</span> {fb.open_suggestions}</p>}
                                        <p className="text-xs text-gray-400 mt-2 text-right">{new Date(fb.submitted_at || fb.created_at || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {detailEvent && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setDetailEvent(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden animate-scale-in flex flex-col" onClick={(event) => event.stopPropagation()}>
                        <div className="px-6 py-5 sm:px-8 border-b bg-gray-50 rounded-t-2xl flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getEventTypeBadgeClass(detailEvent.type)}`}>
                                    {detailEvent.type}
                                </span>
                                {isAttendanceActivityType(detailEvent.type) && detailEvent.attendance_required && (
                                    <span className="ml-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">Required</span>
                                )}
                                {isRegistrationEvent(detailEvent) && (
                                    <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Student registration</span>
                                )}
                                <h3 className="mt-3 break-words text-2xl font-bold text-gray-900">{detailEvent.title}</h3>
                            </div>
                            <button onClick={() => setDetailEvent(null)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto">
                            <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Description</h4>
                                <div className="max-h-72 overflow-y-auto pr-1">
                                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{detailEvent.description || 'No description provided.'}</p>
                                </div>
                            </section>
                            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                {detailEvent.location && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Location</p><p className="text-gray-700">{detailEvent.location}</p></div>}
                                {detailEvent.event_date && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Date</p><p className="text-gray-700">{detailEvent.event_date}</p></div>}
                                {detailEvent.event_time && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Time</p><p className="text-gray-700">{detailEvent.event_time}{detailEvent.end_time ? ` - ${detailEvent.end_time}` : ''}</p></div>}
                                {isAttendanceActivityType(detailEvent.type) && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Attendance</p><p className="text-gray-700">{detailEvent.attendees || 0} attendees</p></div>}
                                {isRegistrationEvent(detailEvent) && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">Registrants</p><p className="text-gray-700">{detailEvent.registeredCount || 0}{detailEvent.capacity ? ` / ${detailEvent.capacity}` : ''}</p></div>}
                                {isRegistrationEvent(detailEvent) && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">Deadline</p><p className="text-gray-700">{formatRegistrationDeadline(detailEvent.registration_deadline)}</p></div>}
                                {isRegistrationEvent(detailEvent) && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">Walk-ins</p><p className="text-gray-700">{detailEvent.allow_walk_ins ? 'Allowed' : 'Not allowed'}</p></div>}
                                {isAttendanceActivityType(detailEvent.type) && (
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2 lg:col-span-4">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Audience</p>
                                        <ul className="space-y-2 text-sm leading-6 text-gray-700">
                                            {getAudienceBulletItems(detailEvent).map((item) => (
                                                <li key={item} className="flex items-start gap-2">
                                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                                                    <span className="min-w-0 break-words">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-white text-right shrink-0">
                            <Button variant="secondary" onClick={() => setDetailEvent(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteEventModal && canArchiveRecords && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center animate-scale-in">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><Archive size={32} /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Archive Item</h3>
                        <p className="text-gray-500 mb-6">Are you sure you want to archive this event or announcement? Attendance and feedback history stay intact.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteEventModal(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1" onClick={confirmDeleteEvent}>Yes, Archive</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CareStaffEventsPage;

