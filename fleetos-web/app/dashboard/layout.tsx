import { ReactNode } from 'react';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { BottomTabBar } from '@/components/dashboard/BottomTabBar';
import { ContextAwareFab } from '@/components/dashboard/ContextAwareFab';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <AppHeader />
      
      {/* Page Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {children}
      </main>
      
      {/* Floating Action Button */}
      <ContextAwareFab />
      
      {/* Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}

