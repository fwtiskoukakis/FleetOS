'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, FileText, Car, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabAction {
  icon: any;
  label: string;
  onClick: () => void;
  color: string;
}

export function ContextAwareFab() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [actions, setActions] = useState<FabAction[]>([]);

  useEffect(() => {
    // Determine actions based on current route
    const newActions: FabAction[] = [];

    if (pathname.startsWith('/dashboard/rentals') || pathname === '/dashboard') {
      newActions.push({
        icon: FileText,
        label: 'Νέο Συμβόλαιο',
        onClick: () => router.push('/dashboard/rentals/new'),
        color: 'bg-blue-600 hover:bg-blue-700',
      });
    }

    if (pathname.startsWith('/dashboard/fleet') || pathname === '/dashboard') {
      newActions.push({
        icon: Car,
        label: 'Νέο Όχημα',
        onClick: () => router.push('/dashboard/fleet/new'),
        color: 'bg-green-600 hover:bg-green-700',
      });
    }

    if (pathname.startsWith('/dashboard/maintenance') || pathname === '/dashboard') {
      newActions.push({
        icon: Wrench,
        label: 'Συντήρηση',
        onClick: () => router.push('/dashboard/maintenance'),
        color: 'bg-orange-600 hover:bg-orange-700',
      });
    }

    setActions(newActions);
    setIsOpen(false);
  }, [pathname, router]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3">
      {/* Action Buttons */}
      {isOpen && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4">
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-white transition-all',
                  action.color,
                  'animate-in fade-in-0 slide-in-from-right-4',
                  'hover:scale-105 active:scale-95'
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all',
          'hover:scale-110 active:scale-95',
          isOpen && 'rotate-45'
        )}
        aria-label="Quick Actions"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}

