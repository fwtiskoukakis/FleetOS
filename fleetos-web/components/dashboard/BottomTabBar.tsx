'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, FileText, Car, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabItem {
  key: string;
  label: string;
  icon: any;
  route: string;
}

const tabs: TabItem[] = [
  {
    key: 'home',
    label: 'Αρχική',
    icon: Home,
    route: '/dashboard',
  },
  {
    key: 'contracts',
    label: 'Συμβόλαια',
    icon: FileText,
    route: '/dashboard/rentals',
  },
  {
    key: 'cars',
    label: 'Στόλος',
    icon: Car,
    route: '/dashboard/fleet',
  },
  {
    key: 'booking',
    label: 'Book Online',
    icon: Globe,
    route: '/dashboard/book-online',
  },
];

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(route: string): boolean {
    if (route === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(route);
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4">
      <div className="max-w-md mx-auto pointer-events-none">
        {/* Glass morphism container */}
        <div className="relative backdrop-blur-xl bg-white/18 dark:bg-gray-900/85 rounded-[36px] border border-white/35 dark:border-gray-700/50 shadow-lg shadow-blue-500/10 overflow-hidden">
          {/* Glass edge */}
          <div className="absolute top-0 left-5 right-5 h-px bg-white/55 dark:bg-gray-400/20" />
          
          {/* Tabs */}
          <div className="flex items-center justify-around min-h-[74px] py-2.5 px-1.5">
            {tabs.map((tab) => {
              const active = isActive(tab.route);
              const Icon = tab.icon;
              
              return (
                <Link
                  key={tab.key}
                  href={tab.route}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center py-2 px-0.5 rounded-[22px] relative transition-all pointer-events-auto cursor-pointer',
                    'hover:bg-blue-500/10 dark:hover:bg-blue-400/15',
                    active && 'bg-blue-500/18 dark:bg-blue-400/25'
                  )}
                >
                  {active && (
                    <div className="absolute inset-[6px] rounded-[22px] bg-blue-500/18 dark:bg-blue-400/25" />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <Icon
                      className={cn(
                        'transition-all mb-0.5',
                        active
                          ? 'w-[26px] h-[26px] text-blue-600 dark:text-blue-400'
                          : 'w-6 h-6 text-gray-600 dark:text-gray-400'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10.5px] text-center font-medium tracking-tight transition-all',
                        active
                          ? 'text-blue-600 dark:text-blue-400 font-semibold text-[11px]'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {tab.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

