import React from 'react';
import { CalendarDays, Plus, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../../components/ui/Button';

const FIELD_LABEL_CLASS = 'mb-1.5 block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider';
const FIELD_INPUT_CLASS = 'w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-850 transition focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100 disabled:text-slate-450';
const SLOT_INPUT_CLASS = 'w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-850 transition focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100';

const NatScheduleModal = ({
    addTimeSlotRow,
    closeScheduleModal,
    editingSchedule,
    handleSaveSchedule,
    isEditingLegacySchedule,
    isSavingSchedule,
    isScheduleDateLocked,
    normalizeTimeSlots,
    removeTimeSlotRow,
    scheduleForm,
    setScheduleForm,
    showScheduleModal,
    updateTimeSlotRow
}: any) => (
    <AnimatePresence>
        {showScheduleModal && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
                    className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl my-auto"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-6 flex-shrink-0">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-650 shadow-md shadow-purple-500/5">
                                <CalendarDays size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingSchedule ? 'Edit NAT Schedule' : 'Add NAT Schedule'}</h3>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">Set the test date, venue, and time-slot capacity for this NAT session.</p>
                                {isEditingLegacySchedule && (
                                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-relaxed text-amber-700">
                                        This older schedule has no saved time blocks yet. Add one or more time slots below to convert it.
                                    </p>
                                )}
                                {isScheduleDateLocked && (
                                    <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold leading-relaxed text-blue-700">
                                        Date is locked because applicants are already assigned. You can still update venue and time slots.
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeScheduleModal}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-650 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-slate-350"
                        >
                            <XCircle size={18} />
                        </button>
                    </div>

                    {/* Form container */}
                    <form onSubmit={handleSaveSchedule} className="flex min-h-0 flex-1 flex-col">
                        <div className="flex-1 space-y-5 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className={FIELD_LABEL_CLASS}>Date</label>
                                    <input
                                        type="date"
                                        className={FIELD_INPUT_CLASS}
                                        value={scheduleForm.date}
                                        onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                                        disabled={isScheduleDateLocked}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={FIELD_LABEL_CLASS}>Venue</label>
                                    <input
                                        className={FIELD_INPUT_CLASS}
                                        placeholder="e.g. NORSU Gymnasium"
                                        value={scheduleForm.venue}
                                        onChange={e => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Time Slots Bento Card */}
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">Time Slots</p>
                                        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Hourly or custom blocks with per-slot capacity.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        onClick={addTimeSlotRow}
                                        leftIcon={<Plus size={12} />}
                                        className="!bg-purple-600 hover:!bg-purple-750 !shadow-sm"
                                    >
                                        Add Slot
                                    </Button>
                                </div>
                                <div className="hidden grid-cols-12 gap-2.5 px-0.5 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 sm:grid border-b border-slate-100 mb-3">
                                    <span className="col-span-4">Start Time</span>
                                    <span className="col-span-4">End Time</span>
                                    <span className="col-span-3">Capacity</span>
                                    <span className="col-span-1" />
                                </div>
                                <div className="space-y-3">
                                    {scheduleForm.timeSlots.map((slot: any, index: number) => (
                                        <div key={index} className="grid grid-cols-12 items-center gap-2.5">
                                            <div className="col-span-4">
                                                <input
                                                    type="time"
                                                    className={SLOT_INPUT_CLASS}
                                                    value={slot.start}
                                                    onChange={e => updateTimeSlotRow(index, 'start', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="time"
                                                    className={SLOT_INPUT_CLASS}
                                                    value={slot.end}
                                                    onChange={e => updateTimeSlotRow(index, 'end', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className={`${SLOT_INPUT_CLASS} tabular-nums text-center font-bold`}
                                                    placeholder="Slots"
                                                    value={slot.slots}
                                                    onChange={e => updateTimeSlotRow(index, 'slots', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeTimeSlotRow(index)}
                                                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-rose-200"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">Overall day slots</span>
                                    <span className="text-sm font-black tabular-nums text-purple-950">
                                        {normalizeTimeSlots(scheduleForm.timeSlots).reduce((sum: number, slot: any) => sum + slot.slots, 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex-shrink-0">
                            <button
                                type="button"
                                onClick={closeScheduleModal}
                                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] outline-none"
                            >
                                Cancel
                            </button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                className="flex-1 !py-3 !rounded-2xl !bg-gradient-to-r !from-purple-600 !to-indigo-650 hover:!from-purple-750 hover:!to-indigo-750 !shadow-lg !shadow-purple-500/15"
                                isLoading={isSavingSchedule}
                                disabled={isSavingSchedule}
                            >
                                {editingSchedule ? 'Save Changes' : 'Save Schedule'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default NatScheduleModal;
