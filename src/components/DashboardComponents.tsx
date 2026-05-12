import React from 'react';
import { LucideIcon } from 'lucide-react';

export function MetricCard({ label, value, color = "text-[#0D5BFF]", icon: Icon }: { label: string, value: string, color?: string, icon?: LucideIcon }) {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#0D5BFF]/20 transition-all group overflow-hidden relative">
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-all duration-500 font-bold"></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${color} opacity-30`} />}
      </div>
      <div className={`text-4xl font-black font-heading ${color} uppercase italic relative z-10 tracking-tight`}>
        {value}
      </div>
    </div>
  );
}

export function FilterGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</h4>
      {children}
    </div>
  );
}

export function DashboardInput({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string }) {
  return (
    <div className="space-y-1.5 flex-grow">
      <label className="block text-[8px] font-black text-pink-200 uppercase tracking-[0.2em] ml-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-black uppercase text-white placeholder-pink-200 focus:outline-none focus:bg-white/20 transition-all"
      />
    </div>
  );
}
