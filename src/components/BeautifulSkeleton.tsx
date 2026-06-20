import React from 'react';

export default function BeautifulSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B132B] p-6 animate-pulse" id="beautiful-skeleton-loader">
      {/* Top simulated Bar/Header skeleton */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="space-y-3">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-3.5 w-64 bg-slate-150 dark:bg-slate-800/50 rounded-full"></div>
          </div>
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>

        {/* Bento/Card Layout grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-[#111A2E]/50 border border-slate-100 dark:border-slate-800/40 p-6 rounded-[2rem] space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl shrink-0"></div>
                <div className="space-y-2 flex-grow">
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-3 w-1/3 bg-slate-150 dark:bg-slate-800/50 rounded-full"></div>
                </div>
              </div>
              <div className="pt-2 space-y-2">
                <div className="h-3 w-full bg-slate-150 dark:bg-slate-800/40 rounded-full"></div>
                <div className="h-3 w-4/5 bg-slate-150 dark:bg-slate-800/40 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Large container layout */}
        <div className="bg-white dark:bg-[#111A2E]/40 border border-slate-100 dark:border-slate-800/40 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 pt-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 bg-slate-150 dark:bg-slate-800/50 rounded-full col-span-1"></div>
              ))}
            </div>
            <hr className="border-slate-100 dark:border-slate-800/30" />
            <div className="grid grid-cols-4 gap-4 py-1">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-3.5 bg-slate-150/70 dark:bg-slate-800/30 rounded-full col-span-1"></div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4 py-1">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-3.5 bg-slate-150/70 dark:bg-slate-800/30 rounded-full col-span-1"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
