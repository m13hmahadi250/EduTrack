import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

export const MetricCard = memo(({
  label,
  value,
  color = 'text-[#0D5BFF]',
  icon: Icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: LucideIcon;
}) => {
  return (
    <div className="bg-white dark:bg-[#111A2E] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center">
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        )}
      </div>
      <div className={`text-2xl sm:text-3xl font-bold font-heading ${color} tracking-tight tabular-nums`}>
        {value}
      </div>
    </div>
  );
});

export const FilterGroup = memo(({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        {label}
      </h4>
      {children}
    </div>
  );
});

export const DashboardInput = memo(({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) => {
  return (
    <div className="space-y-1.5 flex-grow">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full min-h-[44px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0D5BFF] focus:ring-2 focus:ring-[#0D5BFF]/15 transition-all"
      />
    </div>
  );
});
