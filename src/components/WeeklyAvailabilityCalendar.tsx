import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  Trash2,
  AlertCircle,
  LayoutGrid,
  Columns,
  Check,
} from 'lucide-react';
import {
  DAYS_OF_WEEK,
  SHORT_DAYS,
  SHORT_DAYS_UPPER,
  BANGLA_DAYS,
  AVAILABILITY_HOURS,
  DayOfWeek,
  normalizeAvailabilitySlots,
  countTotalWeeklySlots,
  countActiveDays,
  formatHourLabel,
} from '../../shared/availabilityUtils';

export interface WeeklyAvailabilityCalendarProps {
  slots: Record<string, string[]> | null | undefined;
  onChange: (newSlots: Record<string, string[]>) => Promise<void> | void;
  readOnly?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  banglaSubtitle?: string;
}

export const WeeklyAvailabilityCalendar: React.FC<WeeklyAvailabilityCalendarProps> = ({
  slots,
  onChange,
  readOnly = false,
  compact = false,
  title = 'Weekly Availability Schedule',
  subtitle = 'Select your available teaching hours for each day of the week (Sunday – Saturday).',
  banglaSubtitle = 'সপ্তাহের কোন দিন ও সময়ে আপনি পড়াতে পারবেন তা নির্বাচন করুন (রবিবার – শনিবার)।',
}) => {
  const normalizedSlots = useMemo(() => normalizeAvailabilitySlots(slots), [slots]);
  const totalSlots = useMemo(() => countTotalWeeklySlots(normalizedSlots), [normalizedSlots]);
  const activeDaysCount = useMemo(() => countActiveDays(normalizedSlots), [normalizedSlots]);

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Sunday');
  const [mobileViewMode, setMobileViewMode] = useState<'day_editor' | 'full_matrix'>('day_editor');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commitSlots = async (updated: Record<string, string[]>) => {
    if (readOnly) return;
    const clean = normalizeAvailabilitySlots(updated);
    setSaveState('saving');
    setErrorMessage(null);
    try {
      await onChange(clean);
      setSaveState('saved');
      setTimeout(() => {
        setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2200);
    } catch (err: any) {
      setSaveState('error');
      setErrorMessage(err?.message || 'Could not save availability schedule. Please try again.');
    }
  };

  const toggleSlot = (day: DayOfWeek, hour: string) => {
    if (readOnly) return;
    const currentDaySlots = normalizedSlots[day] || [];
    const exists = currentDaySlots.includes(hour);
    const updatedDaySlots = exists
      ? currentDaySlots.filter((h) => h !== hour)
      : [...currentDaySlots, hour].sort((a, b) => a.localeCompare(b));

    const nextSlots: Record<string, string[]> = {
      ...normalizedSlots,
      [day]: updatedDaySlots,
    };
    if (updatedDaySlots.length === 0) {
      delete nextSlots[day];
    }
    void commitSlots(nextSlots);
  };

  const applyDayPreset = (day: DayOfWeek, presetHours: string[]) => {
    if (readOnly) return;
    const currentDaySlots = normalizedSlots[day] || [];
    const merged = Array.from(new Set([...currentDaySlots, ...presetHours])).sort((a, b) =>
      a.localeCompare(b)
    );
    const nextSlots: Record<string, string[]> = {
      ...normalizedSlots,
      [day]: merged,
    };
    void commitSlots(nextSlots);
  };

  const clearDay = (day: DayOfWeek) => {
    if (readOnly) return;
    const nextSlots: Record<string, string[]> = { ...normalizedSlots };
    delete nextSlots[day];
    void commitSlots(nextSlots);
  };

  const clearAllDays = () => {
    if (readOnly) return;
    void commitSlots({});
  };

  const applyEveningPeakAllDays = () => {
    if (readOnly) return;
    const eveningHours = ['17:00', '18:00', '19:00', '20:00'];
    const nextSlots: Record<string, string[]> = { ...normalizedSlots };
    for (const day of DAYS_OF_WEEK) {
      const existing = nextSlots[day] || [];
      nextSlots[day] = Array.from(new Set([...existing, ...eveningHours])).sort((a, b) =>
        a.localeCompare(b)
      );
    }
    void commitSlots(nextSlots);
  };

  const selectedDaySlots = normalizedSlots[selectedDay] || [];

  return (
    <div
      data-testid="weekly-availability-calendar"
      className="w-full min-w-0 bg-slate-900/50 border border-white/10 rounded-2xl p-3 sm:p-5 space-y-4 overflow-hidden"
    >
      {/* Top Header & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">{title}</h4>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-bold text-indigo-300">
              {activeDaysCount}/7 Days • {totalSlots} {totalSlots === 1 ? 'Slot' : 'Slots'}
            </span>
            {saveState === 'saving' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                <Clock className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveState === 'saved' && (
              <span
                data-testid="availability-save-confirmation"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
          {!compact && (
            <>
              <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
              {banglaSubtitle && (
                <p lang="bn" className="font-bn text-xs text-slate-400/90 mt-0.5">
                  {banglaSubtitle}
                </p>
              )}
            </>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={applyEveningPeakAllDays}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 transition-colors flex items-center gap-1.5"
              title="Add 5:00 PM – 8:00 PM across all 7 days"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Evening Peak (5–8 PM)</span>
            </button>
            {totalSlots > 0 && (
              <button
                type="button"
                onClick={clearAllDays}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] font-bold text-rose-300 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ALWAYS-VISIBLE 7-WEEKDAY OVERVIEW BAR (SUN | MON | TUE | WED | THU | FRI | SAT) */}
      {/* Fits 100% width with grid-cols-7 and zero horizontal scrolling on all viewports (320px - Desktop) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            7-Day Weekly Overview (Sun – Sat)
          </span>
          {/* Mobile mode switcher so compact screens can use either Day Editor or 7-Day Matrix */}
          <div className="flex md:hidden items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setMobileViewMode('day_editor')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                mobileViewMode === 'day_editor'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Day Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('full_matrix')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                mobileViewMode === 'full_matrix'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>7-Day Grid</span>
            </button>
          </div>
        </div>

        <div
          data-testid="seven-weekday-header-grid"
          className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full min-w-0"
        >
          {DAYS_OF_WEEK.map((day) => {
            const count = normalizedSlots[day]?.length || 0;
            const isSelected = selectedDay === day;
            const hasSlots = count > 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                data-testid={`weekday-pill-${SHORT_DAYS_UPPER[day]}`}
                className={`min-w-0 w-full py-2 px-0.5 sm:px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : hasSlots
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/15'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-extrabold tracking-tight leading-none truncate w-full">
                  {SHORT_DAYS_UPPER[day]}
                </span>
                <span
                  lang="bn"
                  className="font-bn text-[9px] sm:text-[10px] text-slate-400 leading-tight truncate w-full"
                >
                  {BANGLA_DAYS[day]}
                </span>
                <span
                  className={`mt-0.5 px-1 sm:px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold leading-tight ${
                    hasSlots
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {count > 0 ? `${count}h` : 'Off'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE / COMPACT DAY-SPECIFIC TIME-SLOT EDITOR (Default on < md screens) */}
      <div
        data-testid="mobile-day-slot-editor"
        className={`${
          mobileViewMode === 'day_editor' ? 'block md:hidden' : 'hidden'
        } bg-slate-950/60 border border-white/10 rounded-xl p-3 space-y-3`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-white">{selectedDay}</span>
            <span lang="bn" className="font-bn text-xs text-indigo-300">
              ({BANGLA_DAYS[selectedDay]})
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-semibold text-slate-300">
              {selectedDaySlots.length} {selectedDaySlots.length === 1 ? 'slot' : 'slots'}
            </span>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  applyDayPreset(selectedDay, ['16:00', '17:00', '18:00', '19:00', '20:00'])
                }
                className="px-2 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[10px] font-bold text-indigo-300"
              >
                + 4–8 PM
              </button>
              {selectedDaySlots.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearDay(selectedDay)}
                  className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[10px] font-bold text-rose-300"
                >
                  Clear {SHORT_DAYS[selectedDay]}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {AVAILABILITY_HOURS.map((hour) => {
            const isSelected = selectedDaySlots.includes(hour);
            return (
              <button
                key={`${selectedDay}-${hour}`}
                type="button"
                disabled={readOnly}
                onClick={() => toggleSlot(selectedDay, hour)}
                className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/25 hover:bg-slate-900'
                } ${readOnly ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
              >
                <span className="truncate">{formatHourLabel(hour, true)}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* FULL 7-COLUMN RESPONSIVE WEEKLY SCHEDULE GRID (Always visible on md+, or when toggled on mobile) */}
      {/* Uses CSS Grid with minmax(0, 1fr) for all 7 days — ZERO horizontal scroll! */}
      <div
        data-testid="seven-column-weekly-matrix"
        className={`${
          mobileViewMode === 'full_matrix' ? 'block' : 'hidden md:block'
        } w-full min-w-0 border border-white/10 rounded-xl overflow-hidden bg-slate-950/60`}
      >
        {/* 7-Column Matrix Header */}
        <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] sm:grid-cols-[62px_repeat(7,minmax(0,1fr))] border-b border-white/10 bg-slate-900/90">
          <div className="p-1.5 sm:p-2.5 flex items-center justify-center border-r border-white/10 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Time
          </div>
          {DAYS_OF_WEEK.map((day) => {
            const count = normalizedSlots[day]?.length || 0;
            const isSelected = selectedDay === day;
            return (
              <div
                key={`header-${day}`}
                onClick={() => setSelectedDay(day)}
                className={`min-w-0 p-1 sm:p-2 text-center border-r last:border-r-0 border-white/10 cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-500/15' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-extrabold text-white tracking-tight truncate">
                  {SHORT_DAYS_UPPER[day]}
                </div>
                <div className="hidden lg:block text-[10px] text-slate-400 truncate">{day}</div>
                <div
                  className={`mt-0.5 inline-block px-1 py-0.2 rounded text-[9px] font-bold ${
                    count > 0 ? 'text-emerald-400 bg-emerald-500/15' : 'text-slate-500'
                  }`}
                >
                  {count} {count === 1 ? 'hr' : 'hrs'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Slot Rows (08:00 – 22:00) */}
        <div className="divide-y divide-white/[0.06]">
          {AVAILABILITY_HOURS.map((hour) => (
            <div
              key={`row-${hour}`}
              className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] sm:grid-cols-[62px_repeat(7,minmax(0,1fr))] items-stretch"
            >
              {/* Time Label Column */}
              <div className="px-1 py-1.5 sm:px-2 sm:py-2 border-r border-white/10 bg-slate-900/50 flex items-center justify-center text-[9px] sm:text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                {formatHourLabel(hour, true)}
              </div>

              {/* 7 Weekday Cells */}
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = Boolean(normalizedSlots[day]?.includes(hour));
                return (
                  <button
                    key={`${day}-${hour}`}
                    type="button"
                    disabled={readOnly}
                    aria-label={`${day} ${formatHourLabel(hour)}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedDay(day);
                      toggleSlot(day, hour);
                    }}
                    className={`min-w-0 h-8 sm:h-9 border-r last:border-r-0 border-white/[0.06] p-0.5 sm:p-1 transition-all flex items-center justify-center ${
                      readOnly ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-indigo-600/20 hover:bg-indigo-600/30'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      className={`w-full h-full rounded-md transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 border border-indigo-400/60'
                          : 'bg-transparent'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate px-0.5">
                          <span className="hidden sm:inline">Available</span>
                          <Check className="w-3 h-3 sm:hidden" />
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

      {/* Legend & Quick Day Actions Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-600 border border-indigo-400 inline-block" />
            <span>Available Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-900 border border-white/15 inline-block" />
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
            <span>Active Day</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Timezone: <span className="text-slate-300 font-semibold">Bangladesh Standard Time (GMT+6)</span>
        </div>
      </div>
    </div>
  );
};

export interface WeeklyScheduleOverviewProps {
  slots: Record<string, string[]> | null | undefined;
  bookedSessions?: Array<{
    id: string;
    subject?: string;
    scheduledTime: string;
    status?: string;
  }>;
  onManageClick?: () => void;
}

/**
 * Responsive 7-Column Weekly Schedule Overview (Sun–Sat) without horizontal scrolling.
 * Used in TutorDashboard Visual Schedule and TeacherProfile availability summary.
 */
export const WeeklyScheduleOverview: React.FC<WeeklyScheduleOverviewProps> = ({
  slots,
  bookedSessions = [],
  onManageClick,
}) => {
  const normalizedSlots = useMemo(() => normalizeAvailabilitySlots(slots), [slots]);

  return (
    <div data-testid="weekly-schedule-overview" className="w-full min-w-0 space-y-3">
      <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full min-w-0">
        {DAYS_OF_WEEK.map((day) => {
          const daySlots = normalizedSlots[day] || [];
          const dayBookings = bookedSessions.filter((b) => {
            if (!b?.scheduledTime) return false;
            const d = new Date(b.scheduledTime);
            if (Number.isNaN(d.getTime())) return false;
            const weekday = new Intl.DateTimeFormat('en-US', {
              timeZone: 'Asia/Dhaka',
              weekday: 'long',
            }).format(d);
            return weekday.toLowerCase() === day.toLowerCase();
          });

          return (
            <div
              key={day}
              className="min-w-0 flex flex-col bg-slate-950/60 border border-white/10 rounded-xl p-1.5 sm:p-2.5"
            >
              <div className="text-center pb-1.5 mb-1.5 border-b border-white/10">
                <div className="text-[10px] sm:text-xs font-extrabold text-white tracking-tight truncate">
                  {SHORT_DAYS_UPPER[day]}
                </div>
                <div
                  lang="bn"
                  className="font-bn text-[9px] sm:text-[10px] text-slate-400 truncate"
                >
                  {BANGLA_DAYS[day]}
                </div>
                <div
                  className={`mt-1 inline-block px-1 sm:px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    daySlots.length > 0
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {daySlots.length} {daySlots.length === 1 ? 'slot' : 'slots'}
                </div>
              </div>

              <div className="flex-1 space-y-1 max-h-48 overflow-y-auto pr-0.5">
                {daySlots.length === 0 && dayBookings.length === 0 ? (
                  <div className="py-4 text-center text-[9px] sm:text-[10px] text-slate-600 font-medium">
                    Off
                  </div>
                ) : (
                  <>
                    {dayBookings.map((booking) => {
                      const timeLabel = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'Asia/Dhaka',
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(booking.scheduledTime));
                      return (
                        <div
                          key={booking.id}
                          className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] sm:text-[10px] leading-tight truncate"
                          title={`${booking.subject || 'Session'} at ${timeLabel}`}
                        >
                          <div className="font-bold truncate">{timeLabel}</div>
                          <div className="truncate opacity-80">{booking.subject || 'Booked'}</div>
                        </div>
                      );
                    })}
                    {daySlots.slice(0, 6).map((slot) => (
                      <div
                        key={`${day}-${slot}`}
                        className="px-1 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-[9px] sm:text-[10px] font-semibold text-center truncate"
                      >
                        {formatHourLabel(slot, true)}
                      </div>
                    ))}
                    {daySlots.length > 6 && (
                      <div className="text-center text-[9px] font-bold text-indigo-400 pt-0.5">
                        +{daySlots.length - 6} more
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {onManageClick && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onManageClick}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Edit Weekly Availability Slots →
          </button>
        </div>
      )}
    </div>
  );
};
