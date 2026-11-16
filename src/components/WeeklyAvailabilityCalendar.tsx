import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { AvailabilitySlot } from '../store';

export const WEEKDAYS = [
  { key: 'Sun', short: 'SUN', full: 'Sunday', bn: 'রবি' },
  { key: 'Mon', short: 'MON', full: 'Monday', bn: 'সোম' },
  { key: 'Tue', short: 'TUE', full: 'Tuesday', bn: 'মঙ্গল' },
  { key: 'Wed', short: 'WED', full: 'Wednesday', bn: 'বুধ' },
  { key: 'Thu', short: 'THU', full: 'Thursday', bn: 'বৃহঃ' },
  { key: 'Fri', short: 'FRI', full: 'Friday', bn: 'শুক্র' },
  { key: 'Sat', short: 'SAT', full: 'Saturday', bn: 'শনি' },
] as const;

export const TEACHING_HOURS = [
  { hour: '08:00', label: '8 AM', period: 'morning' },
  { hour: '09:00', label: '9 AM', period: 'morning' },
  { hour: '10:00', label: '10 AM', period: 'morning' },
  { hour: '11:00', label: '11 AM', period: 'morning' },
  { hour: '12:00', label: '12 PM', period: 'afternoon' },
  { hour: '13:00', label: '1 PM', period: 'afternoon' },
  { hour: '14:00', label: '2 PM', period: 'afternoon' },
  { hour: '15:00', label: '3 PM', period: 'afternoon' },
  { hour: '16:00', label: '4 PM', period: 'afternoon' },
  { hour: '17:00', label: '5 PM', period: 'evening' },
  { hour: '18:00', label: '6 PM', period: 'evening' },
  { hour: '19:00', label: '7 PM', period: 'evening' },
  { hour: '20:00', label: '8 PM', period: 'evening' },
  { hour: '21:00', label: '9 PM', period: 'evening' },
  { hour: '22:00', label: '10 PM', period: 'evening' },
] as const;

export function normalizeSlotKey(dayKey: string, hour: string): string {
  return `${dayKey}-${hour}`;
}

export function formatHourRange(hour24: string): string {
  const [hStr] = String(hour24 || '08:00').split(':');
  const h = parseInt(hStr, 10) || 8;
  const formatH = (val: number) => {
    const period = val >= 12 ? 'PM' : 'AM';
    const h12 = val % 12 === 0 ? 12 : val % 12;
    return `${h12}:00 ${period}`;
  };
  return `${formatH(h)} – ${formatH(h + 1)}`;
}

function normalizeHourString(rawHour: string): string {
  const trimmed = String(rawHour || '').trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

interface WeeklyAvailabilityCalendarProps {
  availability?: AvailabilitySlot[];
  onToggleSlot?: (slot: string) => void;
  onBatchUpdate?: (slotsToAdd: string[], slotsToRemove: string[]) => void;
  slots?: { [key: string]: string[] };
  onChange?: (slots: { [key: string]: string[] }) => Promise<void> | void;
  readOnly?: boolean;
  compact?: boolean;
}

export const WeeklyAvailabilityCalendar: React.FC<WeeklyAvailabilityCalendarProps> = ({
  availability = [],
  onToggleSlot,
  onBatchUpdate,
  slots,
  onChange,
  readOnly = false,
  compact = false,
}) => {
  const [selectedMobileDay, setSelectedMobileDay] = useState<string>('Sun');
  const [lastSavedFeedback, setLastSavedFeedback] = useState<string | null>(null);

  const canEdit = !readOnly && Boolean(onToggleSlot || onChange);

  const safeAvailability = useMemo(
    () => (Array.isArray(availability) ? availability.filter(Boolean) : []),
    [availability]
  );

  // Normalize existing availability slots from either `slots` map or `availability` array
  const activeSlotSet = useMemo(() => {
    const set = new Set<string>();

    if (slots && typeof slots === 'object') {
      Object.entries(slots).forEach(([rawDay, dayHours]) => {
        if (!Array.isArray(dayHours)) return;
        const matchedDay = WEEKDAYS.find(
          (d) =>
            d.full.toLowerCase() === rawDay.trim().toLowerCase() ||
            d.key.toLowerCase() === rawDay.trim().toLowerCase() ||
            d.short.toLowerCase() === rawDay.trim().toLowerCase()
        );
        if (!matchedDay) return;
        dayHours.forEach((hr) => {
          if (typeof hr !== 'string') return;
          const normHr = normalizeHourString(hr);
          set.add(`${matchedDay.key}-${normHr}`);
        });
      });
    }

    safeAvailability.forEach((slotObj) => {
      if (!slotObj) return;
      const legacySlot = (slotObj as AvailabilitySlot & { slot?: string }).slot;
      if (typeof legacySlot === 'string' && legacySlot.trim()) {
        const raw = legacySlot.trim();
        set.add(raw);
        WEEKDAYS.forEach((d) => {
          if (raw.toLowerCase().startsWith(d.full.toLowerCase() + '-')) {
            const timePart = normalizeHourString(raw.slice(d.full.length + 1));
            set.add(`${d.key}-${timePart}`);
          } else if (raw.toLowerCase().startsWith(d.key.toLowerCase() + '-')) {
            const timePart = normalizeHourString(raw.slice(d.key.length + 1));
            set.add(`${d.key}-${timePart}`);
          }
        });
        return;
      }
      if (typeof slotObj.day === 'string' && typeof slotObj.startTime === 'string') {
        const matchedDay = WEEKDAYS.find(
          (d) =>
            d.full.toLowerCase() === slotObj.day.trim().toLowerCase() ||
            d.key.toLowerCase() === slotObj.day.trim().toLowerCase() ||
            d.short.toLowerCase() === slotObj.day.trim().toLowerCase()
        );
        if (matchedDay) {
          set.add(`${matchedDay.key}-${normalizeHourString(slotObj.startTime)}`);
        }
      }
    });
    return set;
  }, [safeAvailability, slots]);

  const buildSlotsRecordFromSet = (slotSet: Set<string>): { [key: string]: string[] } => {
    const nextRecord: { [key: string]: string[] } = {};
    WEEKDAYS.forEach((d) => {
      const hoursForDay = TEACHING_HOURS.map((t) => t.hour).filter((hr) =>
        slotSet.has(`${d.key}-${hr}`)
      );
      if (hoursForDay.length > 0) {
        nextRecord[d.full] = hoursForDay;
      }
    });
    return nextRecord;
  };

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    WEEKDAYS.forEach((d) => {
      counts[d.key] = TEACHING_HOURS.filter((t) => activeSlotSet.has(`${d.key}-${t.hour}`)).length;
    });
    return counts;
  }, [activeSlotSet]);

  const totalSelectedSlots = useMemo(
    () => Object.values(dayCounts).reduce((sum, c) => sum + c, 0),
    [dayCounts]
  );

  const activeDaysCount = useMemo(
    () => Object.values(dayCounts).filter((c) => c > 0).length,
    [dayCounts]
  );

  const triggerSaveFeedback = (msg: string) => {
    setLastSavedFeedback(msg);
    window.setTimeout(() => {
      setLastSavedFeedback((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleSlotClick = (dayKey: string, hour: string) => {
    if (!canEdit) return;
    const slotId = `${dayKey}-${hour}`;
    const wasSelected = activeSlotSet.has(slotId);

    if (onChange) {
      const nextSet = new Set(activeSlotSet);
      if (wasSelected) {
        nextSet.delete(slotId);
      } else {
        nextSet.add(slotId);
      }
      onChange(buildSlotsRecordFromSet(nextSet));
    }

    if (onToggleSlot) {
      onToggleSlot(slotId);
    }

    triggerSaveFeedback(wasSelected ? `Removed ${dayKey} ${hour}` : `Saved ${dayKey} ${hour}`);
  };

  const handlePresetApply = (presetHours: string[], label: string) => {
    if (!canEdit) return;
    const toToggle: string[] = [];
    const nextSet = new Set(activeSlotSet);

    WEEKDAYS.forEach((d) => {
      presetHours.forEach((h) => {
        const id = `${d.key}-${h}`;
        nextSet.add(id);
        if (!activeSlotSet.has(id)) {
          toToggle.push(id);
        }
      });
    });

    if (onChange) {
      onChange(buildSlotsRecordFromSet(nextSet));
    }
    if (onBatchUpdate) {
      onBatchUpdate(toToggle, []);
    } else if (onToggleSlot) {
      toToggle.forEach((id) => onToggleSlot(id));
    }
    triggerSaveFeedback(`Applied ${label}`);
  };

  const handleClearAll = () => {
    if (!canEdit) return;
    const toRemove: string[] = [];
    WEEKDAYS.forEach((d) => {
      TEACHING_HOURS.forEach((t) => {
        const id = `${d.key}-${t.hour}`;
        if (activeSlotSet.has(id)) {
          toRemove.push(id);
        }
      });
    });

    if (onChange) {
      onChange({});
    }
    if (onBatchUpdate) {
      onBatchUpdate([], toRemove);
    } else if (onToggleSlot) {
      toRemove.forEach((id) => onToggleSlot(id));
    }
    triggerSaveFeedback('Cleared weekly schedule');
  };

  return (
    <div
      className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xs transition-colors"
      data-testid="weekly-availability-calendar"
    >
      {/* Top Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarIcon className="w-4 h-4 text-[#0D5BFF] dark:text-indigo-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white tracking-tight">
              Weekly Availability Schedule
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
              {activeDaysCount}/7 Days • {totalSelectedSlots} {totalSelectedSlots === 1 ? 'Slot' : 'Slots'}
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
            {readOnly
              ? 'All 7 days of the week (Sunday – Saturday) are shown below in Bangladesh Standard Time.'
              : 'Select your available teaching hours for each day of the week (Sunday – Saturday).'}
          </p>
          <p
            className="font-bn text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-200 mt-0.5 leading-[1.7]"
            lang="bn"
          >
            {readOnly
              ? 'সপ্তাহের ৭ দিনের (রবিবার – শনিবার) টিউশন সময়সূচি নিচে দেওয়া হলো।'
              : 'সপ্তাহের কোন দিন ও সময়ে আপনি পড়াতে পারবেন তা নির্বাচন করুন (রবিবার – শনিবার)।'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lastSavedFeedback && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold"
              data-testid="availability-save-confirmation"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lastSavedFeedback}</span>
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handlePresetApply(['17:00', '18:00', '19:00', '20:00'], 'Evening Peak (5–8 PM)')
                }
                className="min-h-[40px] px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Select 5 PM - 8 PM across all 7 days"
              >
                <span>Evening Peak (5–8 PM)</span>
              </button>
              {totalSelectedSlots > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Clear all selected slots"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Always-Visible 7-Day Header Bar (No Horizontal Scroll Ever Required) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            7-Day Weekly Overview (Sun – Sat)
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium sm:hidden">
            Tap any day to filter or use the 7-day grid below
          </span>
        </div>

        <div
          className="grid grid-cols-7 gap-1 sm:gap-2 w-full"
          data-testid="seven-day-header-grid"
        >
          {WEEKDAYS.map((day) => {
            const count = dayCounts[day.key] || 0;
            const isSelectedDay = selectedMobileDay === day.key;
            const hasSlots = count > 0;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedMobileDay(day.key)}
                data-testid={`weekday-pill-${day.key}`}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all min-w-0 cursor-pointer ${
                  isSelectedDay
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                    : hasSlots
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-extrabold tracking-tight leading-tight truncate w-full">
                  {day.short}
                </span>
                <span
                  className={`font-bn text-[10px] sm:text-[11px] font-medium leading-tight mt-0.5 truncate w-full ${
                    isSelectedDay
                      ? 'text-indigo-100'
                      : hasSlots
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                  lang="bn"
                >
                  {day.bn}
                </span>
                <span
                  className={`mt-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold leading-none ${
                    isSelectedDay
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count > 0 ? `${count}h` : 'Off'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Focused Day Editor (Shown on small screens for effortless thumb tapping) */}
      {canEdit && (
        <div
          className="sm:hidden mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800"
          data-testid="mobile-day-slot-editor"
        >
          {(() => {
            const currentDayObj = WEEKDAYS.find((d) => d.key === selectedMobileDay) || WEEKDAYS[0];
            const currentCount = dayCounts[currentDayObj.key] || 0;
            return (
              <>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                      {currentDayObj.full} ({currentDayObj.short})
                    </span>
                    <span
                      className="font-bn text-xs font-medium text-slate-700 dark:text-slate-300"
                      lang="bn"
                    >
                      • {currentDayObj.bn}বার
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    {currentCount} {currentCount === 1 ? 'hour' : 'hours'} selected
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {TEACHING_HOURS.map((t) => {
                    const slotId = `${currentDayObj.key}-${t.hour}`;
                    const isSelected = activeSlotSet.has(slotId);
                    return (
                      <button
                        key={slotId}
                        type="button"
                        onClick={() => handleSlotClick(currentDayObj.key, t.hour)}
                        className={`min-h-[42px] py-2.5 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:border-indigo-400'
                        }`}
                      >
                        <span>{t.label}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Full 7-Column Weekly Matrix — Fits 100% Width Without Horizontal Scroll */}
      <div
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 overflow-hidden"
        data-testid="seven-column-weekly-matrix"
      >
        {/* Matrix Header Row: Time + 7 Days */}
        <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] sm:grid-cols-[64px_repeat(7,minmax(0,1fr))] bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="py-2.5 px-1 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Time
          </div>
          {WEEKDAYS.map((day) => {
            const count = dayCounts[day.key] || 0;
            const isHighlighted = selectedMobileDay === day.key;
            return (
              <div
                key={day.key}
                data-testid={`matrix-col-header-${day.key}`}
                className={`py-2 px-0.5 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 min-w-0 transition-colors ${
                  isHighlighted ? 'bg-indigo-50/90 dark:bg-indigo-500/15' : ''
                }`}
              >
                <div className="text-[10px] sm:text-xs font-extrabold text-[#0F172A] dark:text-white tracking-tight truncate">
                  {day.short}
                </div>
                <div className="hidden md:block text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate">
                  {day.full}
                </div>
                <div
                  className={`text-[9px] font-bold mt-0.5 ${
                    count > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count} {count === 1 ? 'hr' : 'hrs'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Matrix Body Rows */}
        <div
          className={`divide-y divide-slate-200 dark:divide-slate-800/80 ${
            compact ? 'max-h-[380px] overflow-y-auto' : ''
          }`}
        >
          {TEACHING_HOURS.map((timeObj) => (
            <div
              key={timeObj.hour}
              className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] sm:grid-cols-[64px_repeat(7,minmax(0,1fr))] items-stretch"
            >
              {/* Time Label Cell */}
              <div className="py-1.5 sm:py-2 px-1 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-[9px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {timeObj.label}
              </div>

              {/* 7 Day Cells for this Hour */}
              {WEEKDAYS.map((day) => {
                const slotId = `${day.key}-${timeObj.hour}`;
                const isSelected = activeSlotSet.has(slotId);

                return (
                  <button
                    key={slotId}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleSlotClick(day.key, timeObj.hour)}
                    data-testid={`slot-cell-${slotId}`}
                    aria-label={`${day.full} ${timeObj.label} ${
                      isSelected ? 'Available' : 'Unavailable'
                    }`}
                    className={`min-h-[28px] sm:min-h-[34px] p-0.5 sm:p-1 border-r last:border-r-0 border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center transition-all min-w-0 ${
                      !canEdit ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30'
                        : 'bg-white dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900/80'
                    }`}
                  >
                    <div
                      className={`w-full h-full min-h-[20px] sm:min-h-[24px] rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs border border-indigo-600 dark:border-indigo-400/50'
                          : 'border border-transparent group-hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-[9px] sm:text-[10px] font-extrabold tracking-tight flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                          <span className="hidden lg:inline">Open</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 dark:text-slate-600 select-none">
                          ·
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block shadow-xs" />
            <span>Available for Tuition</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 inline-block" />
            <span>Unavailable / Off</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-[#0D5BFF] dark:text-indigo-400" />
          <span>Timezone: Asia/Dhaka (BST, UTC+6)</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact 7-day read-only overview card for Student / Public Tutor Profile & Booking Modals.
 * Always displays all 7 days (SUN - SAT) without horizontal scrolling.
 */
export const WeeklyScheduleOverview: React.FC<{
  availability?: AvailabilitySlot[];
  slots?: { [key: string]: string[] };
  bookedSessions?: any[];
  onManageClick?: () => void;
  selectedSlots?: string[];
  onSelectSlot?: (slotId: string) => void;
  interactive?: boolean;
}> = ({
  availability = [],
  slots,
  bookedSessions,
  onManageClick,
  selectedSlots = [],
  onSelectSlot,
  interactive = false,
}) => {
  const [focusedDay, setFocusedDay] = useState<string>('Sun');

  const safeAvailability = useMemo(
    () => (Array.isArray(availability) ? availability.filter(Boolean) : []),
    [availability]
  );

  const slotsByDay = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    WEEKDAYS.forEach((d) => {
      grouped[d.key] = [];
    });

    if (slots && typeof slots === 'object') {
      Object.entries(slots).forEach(([rawDay, dayHours]) => {
        if (!Array.isArray(dayHours)) return;
        const matchedDay = WEEKDAYS.find(
          (d) =>
            d.full.toLowerCase() === rawDay.trim().toLowerCase() ||
            d.key.toLowerCase() === rawDay.trim().toLowerCase() ||
            d.short.toLowerCase() === rawDay.trim().toLowerCase()
        );
        if (!matchedDay) return;
        dayHours.forEach((hr) => {
          if (typeof hr !== 'string') return;
          const normalized = `${matchedDay.key}-${normalizeHourString(hr)}`;
          if (!grouped[matchedDay.key].includes(normalized)) {
            grouped[matchedDay.key].push(normalized);
          }
        });
      });
    }

    safeAvailability.forEach((slotObj) => {
      if (!slotObj) return;
      const legacySlot = (slotObj as AvailabilitySlot & { slot?: string }).slot;
      if (typeof legacySlot === 'string' && legacySlot.trim()) {
        const raw = legacySlot.trim();
        WEEKDAYS.forEach((d) => {
          if (raw.toLowerCase().startsWith(d.full.toLowerCase() + '-')) {
            const timePart = normalizeHourString(raw.slice(d.full.length + 1));
            const normalized = `${d.key}-${timePart}`;
            if (!grouped[d.key].includes(normalized)) grouped[d.key].push(normalized);
          } else if (raw.toLowerCase().startsWith(d.key.toLowerCase() + '-')) {
            const timePart = normalizeHourString(raw.slice(d.key.length + 1));
            const normalized = `${d.key}-${timePart}`;
            if (!grouped[d.key].includes(normalized)) grouped[d.key].push(normalized);
          }
        });
        return;
      }
      if (typeof slotObj.day === 'string' && typeof slotObj.startTime === 'string') {
        const matchedDay = WEEKDAYS.find(
          (d) =>
            d.full.toLowerCase() === slotObj.day.trim().toLowerCase() ||
            d.key.toLowerCase() === slotObj.day.trim().toLowerCase() ||
            d.short.toLowerCase() === slotObj.day.trim().toLowerCase()
        );
        if (matchedDay) {
          const normalized = `${matchedDay.key}-${normalizeHourString(slotObj.startTime)}`;
          if (!grouped[matchedDay.key].includes(normalized)) {
            grouped[matchedDay.key].push(normalized);
          }
        }
      }
    });

    WEEKDAYS.forEach((d) => {
      grouped[d.key].sort();
    });

    return grouped;
  }, [safeAvailability, slots]);

  return (
    <div className="space-y-4" data-testid="weekly-schedule-overview">
      {/* All 7 Days Header Bar — Always visible without horizontal scroll */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full">
        {WEEKDAYS.map((day) => {
          const daySlots = slotsByDay[day.key] || [];
          const hasOpenings = daySlots.length > 0;
          const isFocused = focusedDay === day.key;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setFocusedDay(day.key)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all min-w-0 cursor-pointer ${
                isFocused
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : hasOpenings
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] sm:text-xs font-extrabold tracking-tight truncate w-full text-center">
                {day.short}
              </span>
              <span
                className={`font-bn text-[10px] font-medium truncate w-full text-center ${
                  isFocused
                    ? 'text-indigo-100'
                    : hasOpenings
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                lang="bn"
              >
                {day.bn}
              </span>
              <span
                className={`mt-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isFocused
                    ? 'bg-white/20 text-white'
                    : hasOpenings
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {hasOpenings ? `${daySlots.length} open` : 'Closed'}
              </span>
            </button>
          );
        })}
      </div>

      {/* 7-Day Column Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {WEEKDAYS.map((day) => {
          const daySlots = slotsByDay[day.key] || [];
          const isFocused = focusedDay === day.key;

          return (
            <div
              key={day.key}
              className={`rounded-xl border p-2.5 transition-all ${
                isFocused
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-500/40'
                  : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex sm:flex-col items-center justify-between sm:justify-center border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2 text-center">
                <span className="text-xs font-extrabold text-[#0F172A] dark:text-white">
                  {day.short}
                </span>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  {day.full}
                </span>
              </div>

              {daySlots.length > 0 ? (
                <div className="flex flex-wrap sm:flex-col gap-1">
                  {daySlots.map((slotId) => {
                    const timePart = slotId.split('-')[1] || '';
                    const hourObj = TEACHING_HOURS.find((h) => h.hour === timePart);
                    const displayLabel = hourObj ? hourObj.label : timePart;
                    const isPicked = selectedSlots.includes(slotId);

                    return interactive && onSelectSlot ? (
                      <button
                        key={slotId}
                        type="button"
                        onClick={() => onSelectSlot(slotId)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border text-center transition-all cursor-pointer ${
                          isPicked
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-slate-200 hover:border-indigo-500'
                        }`}
                      >
                        {displayLabel}
                      </button>
                    ) : (
                      <span
                        key={slotId}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center"
                      >
                        {displayLabel}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="py-3 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  No slots
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
