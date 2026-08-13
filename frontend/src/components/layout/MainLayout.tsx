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
    <div className="min-h-screen bg-gov-bg flex flex-col font-sans">
      <Header currentCaseNumber={currentCaseNumber} currentOwnerName={currentOwnerName} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
