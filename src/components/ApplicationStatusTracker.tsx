import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { LifecycleTrackerState } from '../../shared/tuitionLifecycle';

interface ApplicationStatusTrackerProps {
  state: LifecycleTrackerState;
  scheduleLabel?: string;
  compact?: boolean;
  className?: string;
}

const TONE_BADGE_MAP: Record<LifecycleTrackerState['badgeTone'], string> = {
  blue: 'bg-blue-50 dark:bg-blue-950/40 text-[#0D5BFF] dark:text-blue-300 border-blue-200 dark:border-blue-800/70',
  amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70',
  rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

const TONE_BAR_MAP: Record<LifecycleTrackerState['badgeTone'], string> = {
  blue: 'bg-[#0D5BFF]',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

export const ApplicationStatusTracker: React.FC<ApplicationStatusTrackerProps> = ({
  state,
  scheduleLabel,
  compact = false,
  className = '',
}) => {
  const toneBadge = TONE_BADGE_MAP[state.badgeTone] || TONE_BADGE_MAP.slate;
  const barColor = TONE_BAR_MAP[state.badgeTone] || TONE_BAR_MAP.blue;

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold tracking-wide ${toneBadge}`}
          >
            {state.badgeTone === 'emerald' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : state.badgeTone === 'rose' ? (
              <XCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{state.stageLabel}</span>
          </span>
        </div>

        {scheduleLabel && (
          <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
            {scheduleLabel}
          </span>
        )}
      </div>

      {state.steps.length > 0 && (
        <div className="space-y-1.5">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${state.steps.length}, minmax(0, 1fr))` }}>
            {state.steps.map((step) => (
              <div key={step.key} className="space-y-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    step.done
                      ? barColor
                      : step.current
                      ? `${barColor} opacity-75`
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
                {!compact && (
                  <p
                    className={`text-[10px] leading-tight truncate ${
                      step.current
                        ? 'font-bold text-slate-900 dark:text-white'
                        : step.done
                        ? 'font-semibold text-slate-600 dark:text-slate-300'
                        : 'font-medium text-slate-400 dark:text-slate-500'
                    }`}
                    title={step.label}
                  >
                    {step.label}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug">
          {state.nextActionHint}
        </p>
        {state.nextActionBn && !compact && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {state.nextActionBn}
          </p>
        )}
      </div>
    </div>
  );
};

export default ApplicationStatusTracker;
