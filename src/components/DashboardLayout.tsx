import React from 'react';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-grow p-8 lg:p-12 overflow-y-auto">
        {children}
      </main>
      <NotificationCenter />
    </div>
  );
}
