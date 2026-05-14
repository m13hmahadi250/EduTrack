import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div 
      className={`animate-pulse bg-slate-200 rounded ${className}`}
    />
  );
};

export const TutorSkeleton = () => (
  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
    <div className="flex items-center space-x-6">
      <Skeleton className="w-20 h-20 rounded-[2rem]" />
      <div className="space-y-3 flex-grow">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20 rounded-full" />
      <Skeleton className="h-8 w-20 rounded-full" />
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
    <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
      <Skeleton className="h-5 w-24 rounded-lg" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  </div>
);
