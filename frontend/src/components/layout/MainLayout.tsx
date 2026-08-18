import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  currentCaseNumber?: string;
  currentOwnerName?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentCaseNumber, currentOwnerName }) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col font-sans">
      {/* Fixed Top Header */}
      <div className="shrink-0 z-30">
        <Header currentCaseNumber={currentCaseNumber} currentOwnerName={currentOwnerName} />
      </div>

      {/* Main Workspace Area (Fixed Sidebar + Scrollable Content) */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Fixed Left Sidebar (Never scrolls away) */}
        <Sidebar />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
