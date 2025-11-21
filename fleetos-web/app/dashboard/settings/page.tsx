'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Settings page - redirects to unified Profile page
 * All settings are now merged into /profile
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified profile page
    router.replace('/dashboard/profile');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Redirecting to profile...</p>
      </div>
    </div>
  );
}

