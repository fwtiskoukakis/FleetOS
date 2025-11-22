'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import FleetOSLogo from '@/components/FleetOSLogo';
import { 
  ChevronLeft, 
  Sun, 
  Moon, 
  Calendar, 
  Bell, 
  User, 
  Settings, 
  BarChart3, 
  Receipt, 
  Users as UsersIcon, 
  LogOut,
  X 
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface AppHeaderProps {
  showBack?: boolean;
  title?: string;
  onBackPress?: () => void;
}

interface UserInfo {
  name: string;
  email: string;
  avatarLetter: string;
}

export function AppHeader({ showBack = false, title, onBackPress }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: 'User',
    email: 'user@example.com',
    avatarLetter: 'U',
  });

  useEffect(() => {
    setMounted(true);
    loadUserInfo();
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  async function loadUserInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUserInfo({
          name: profile.name || 'User',
          email: profile.email || user.email || 'user@example.com',
          avatarLetter: (profile.name || 'U').charAt(0).toUpperCase(),
        });
      } else {
        setUserInfo({
          name: user.email?.split('@')[0] || 'User',
          email: user.email || 'user@example.com',
          avatarLetter: (user.email?.charAt(0) || 'U').toUpperCase(),
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  async function handleSignOut() {
    if (confirm('Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;')) {
      await supabase.auth.signOut();
      setShowUserMenu(false);
      router.push('/login');
    }
  }

  const menuItems = [
    { icon: User, label: 'Προφίλ', route: '/dashboard/profile' },
    { icon: Settings, label: 'Ρυθμίσεις', route: '/dashboard/settings' },
    { icon: BarChart3, label: 'Αναλυτικά', route: '/dashboard/analytics' },
    { icon: Receipt, label: 'AADE', route: '/dashboard/aade-settings' },
    { icon: UsersIcon, label: 'Χρήστες', route: '/dashboard/user-management' },
  ];

  const isDark = theme === 'dark';

  return (
    <>
      {/* Header with gradient background */}
      <header className="relative overflow-hidden rounded-b-2xl mb-4 shadow-lg">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 opacity-0 transition-opacity duration-2000" />
        
        {/* Content */}
        <div className="relative bg-white/25 dark:bg-black/25 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between h-12">
              {/* Left */}
              {showBack ? (
                <button
                  onClick={onBackPress || (() => router.back())}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/25 hover:bg-white/35 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              ) : (
                <Link href="/dashboard" className="flex items-center">
                  <FleetOSLogo variant="icon" size={40} className="mr-2" />
                  {pathname === '/dashboard' && (
                    <span className="text-white font-bold text-lg">FleetOS</span>
                  )}
                </Link>
              )}

              {/* Center */}
              {title && (
                <h1 className="flex-1 text-center text-lg font-bold text-white truncate mx-4">
                  {title}
                </h1>
              )}

              {/* Right */}
              <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/22 hover:bg-white/35 transition-colors shadow-md"
                  title={isDark ? 'Light Mode' : 'Dark Mode'}
                >
                  {isDark ? (
                    <Sun className="w-5 h-5 text-white" />
                  ) : (
                    <Moon className="w-5 h-5 text-white" />
                  )}
                </button>

                {/* Calendar */}
                <Link
                  href="/dashboard/calendar"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/22 hover:bg-white/35 transition-colors shadow-md"
                  title="Calendar"
                >
                  <Calendar className="w-5 h-5 text-white" />
                </Link>

                {/* Notifications */}
                <Link
                  href="/dashboard/notifications"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/22 hover:bg-white/35 transition-colors shadow-md"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-white" />
                </Link>

                {/* User Avatar */}
                <button
                  onClick={() => setShowUserMenu(true)}
                  className="w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                  title="User Menu"
                >
                  <span className="text-blue-600 font-bold text-sm">
                    {userInfo.avatarLetter}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* User Menu Modal */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowUserMenu(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex items-center gap-3 p-5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="w-13 h-13 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {userInfo.avatarLetter}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {userInfo.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {userInfo.email}
                </p>
              </div>
              <button
                onClick={() => setShowUserMenu(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.route}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-1"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {item.label}
                      </span>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                  </Link>
                );
              })}
            </div>

            {/* Sign Out */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  Αποσύνδεση
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

