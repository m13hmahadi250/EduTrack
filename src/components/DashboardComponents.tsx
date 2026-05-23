import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

export const MetricCard = memo(({ 
  label, 
  value, 
  color = "text-[#0D5BFF]", 
  icon: Icon,
  avatars
}: { 
  label: string, 
  value: string, 
  color?: string, 
  icon?: LucideIcon,
  avatars?: { name: string; image?: string }[]
}) => {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#0D5BFF]/20 transition-all group overflow-hidden relative">
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-all duration-500 font-bold"></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${color} opacity-30`} />}
      </div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
        <div className={`text-4xl font-black font-heading ${color} uppercase italic tracking-tight`}>
          {value}
        </div>
        
        {avatars && avatars.length > 0 && (
          <div className="flex items-center -space-x-2 overflow-hidden py-1">
            {avatars.slice(0, 4).map((avatar, idx) => (
              <div 
                key={idx} 
                className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-[#0D5BFF] overflow-hidden shadow-sm uppercase shrink-0 transition-transform hover:scale-110 relative"
                title={avatar.name}
              >
                {avatar.image ? (
                  <img 
                    src={avatar.image} 
                    alt={avatar.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  avatar.name.charAt(0)
                )}
              </div>
            ))}
            {avatars.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[8px] font-black text-slate-500 shadow-sm shrink-0">
                +{avatars.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export const FilterGroup = memo(({ label, children }: { label: string, children: React.ReactNode }) => {
  return (
    <div className="space-y-4">
      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</h4>
      {children}
    </div>
  );
});

export const DashboardInput = memo(({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string }) => {
  return (
    <div className="space-y-1.5 flex-grow">
      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-[#0B132B] placeholder-slate-300 focus:outline-none focus:border-[#0D5BFF] transition-all"
      />
    </div>
  );
});
