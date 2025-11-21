'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  User, Settings, Bell, Key, LogOut, Camera, 
  Shield, Building, FileText, Car, Calendar, 
  BarChart3, Edit, X, Check, Eye, EyeOff,
  Flask, Send
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  aadeEnabled: boolean;
  aadeUserId: string;
  aadeSubscriptionKey: string;
  companyVatNumber: string;
  companyName: string;
  companyAddress: string;
  companyActivity: string;
}

interface EditField {
  key: string;
  value: string;
  label: string;
  icon: string;
  placeholder: string;
  isSecure?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPassword, setShowPassword] = useState({ userId: false, subscriptionKey: false });
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (profileData) {
        setProfile({
          id: profileData.id,
          name: profileData.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          aadeEnabled: profileData.aade_enabled || false,
          aadeUserId: profileData.aade_user_id || '',
          aadeSubscriptionKey: profileData.aade_subscription_key || '',
          companyVatNumber: profileData.company_vat_number || '',
          companyName: profileData.company_name || '',
          companyAddress: profileData.company_address || '',
          companyActivity: profileData.company_activity || '',
        });
      } else {
        // Create user profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: user.email?.split('@')[0] || 'User',
            email: user.email,
          })
          .select()
          .single();

        if (createError) throw createError;

        if (newProfile) {
          setProfile({
            id: newProfile.id,
            name: newProfile.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            phone: newProfile.phone || '',
            address: newProfile.address || '',
            aadeEnabled: newProfile.aade_enabled || false,
            aadeUserId: newProfile.aade_user_id || '',
            aadeSubscriptionKey: newProfile.aade_subscription_key || '',
            companyVatNumber: newProfile.company_vat_number || '',
            companyName: newProfile.company_name || '',
            companyAddress: newProfile.company_address || '',
            companyActivity: newProfile.company_activity || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveField() {
    if (!profile || !editingField) return;

    try {
      setSaving(true);

      const updateData: any = {};
      const key = editingField.key;

      // Map frontend keys to database columns
      if (key === 'name') updateData.name = editValue;
      else if (key === 'phone') updateData.phone = editValue;
      else if (key === 'address') updateData.address = editValue;
      else if (key === 'companyName') updateData.company_name = editValue;
      else if (key === 'companyVatNumber') updateData.company_vat_number = editValue;
      else if (key === 'companyAddress') updateData.company_address = editValue;
      else if (key === 'companyActivity') updateData.company_activity = editValue;
      else if (key === 'aadeUserId') updateData.aade_user_id = editValue;
      else if (key === 'aadeSubscriptionKey') updateData.aade_subscription_key = editValue;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        [key]: editValue,
      });

      setEditingField(null);
      setEditValue('');
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAADE(value: boolean) {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ aade_enabled: value })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, aadeEnabled: value });
      alert(value ? 'AADE enabled' : 'AADE disabled');
    } catch (error) {
      console.error('Error toggling AADE:', error);
      alert('Failed to update');
    }
  }

  function startEdit(field: EditField) {
    setEditingField(field);
    setEditValue(field.value);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue('');
  }

  async function handleSignOut() {
    if (!confirm('Are you sure you want to sign out?')) return;

    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out');
    }
  }

  function renderProfileCard(
    title: string,
    icon: any,
    iconColor: string,
    fields: EditField[]
  ) {
    const Icon = icon;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${iconColor}15` }}>
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {fields.map((field, index) => (
            <div key={field.key}>
              <button
                onClick={() => startEdit(field)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {field.icon && (
                    <div className="text-gray-400 flex-shrink-0">
                      {/* Icon placeholder - you can add specific icons */}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-700">{field.label}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {field.value || 'Not set'}
                    </p>
                  </div>
                </div>
                <Edit className="w-5 h-5 text-blue-600 flex-shrink-0" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderQuickActions() {
    const actions = [
      { icon: FileText, label: 'Contracts', color: '#3b82f6', route: '/dashboard/rentals' },
      { icon: Car, label: 'Fleet', color: '#06b6d4', route: '/dashboard/fleet' },
      { icon: Calendar, label: 'Calendar', color: '#10b981', route: '/dashboard/calendar' },
      { icon: BarChart3, label: 'Analytics', color: '#f59e0b', route: '/dashboard/analytics' },
    ];

    return (
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.route}
                className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2`} style={{ backgroundColor: `${action.color}15` }}>
                  <Icon className="w-6 h-6" style={{ color: action.color }} />
                </div>
                <p className="text-sm font-medium text-gray-700">{action.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">Failed to load profile</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Profile & Settings</h1>
                <p className="text-sm text-gray-600">Manage your account and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Dashboard
            </Link>
            <Link href="/dashboard/fleet" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Fleet
            </Link>
            <Link href="/dashboard/rentals" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Rentals
            </Link>
            <Link href="/dashboard/customers" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Customers
            </Link>
            <Link href="/dashboard/book-online" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Book Online
            </Link>
            <Link href="/dashboard/profile" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
              Profile
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h2>
              <p className="text-gray-600 mb-2">{profile.email}</p>
              {profile.companyName && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Building className="w-4 h-4" />
                  <span className="text-sm font-medium">{profile.companyName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Personal Information */}
        {renderProfileCard(
          'Personal Information',
          User,
          '#3b82f6',
          [
            {
              key: 'name',
              value: profile.name,
              label: 'Full Name',
              icon: 'person',
              placeholder: 'Enter your name',
            },
            {
              key: 'phone',
              value: profile.phone,
              label: 'Phone',
              icon: 'call',
              placeholder: 'Enter your phone',
            },
            {
              key: 'address',
              value: profile.address,
              label: 'Address',
              icon: 'location',
              placeholder: 'Enter your address',
            },
          ]
        )}

        {/* AADE Digital Client Registry */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Digital Client Registry (AADE)</h3>
          </div>

          {/* AADE Toggle */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Enable AADE</p>
                <p className="text-sm text-gray-500">Automatic submission to Digital Client Registry</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.aadeEnabled}
                  onChange={(e) => toggleAADE(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* AADE Settings (shown when enabled) */}
          {profile.aadeEnabled && (
            <>
              {renderProfileCard(
                'AADE Credentials',
                Key,
                '#06b6d4',
                [
                  {
                    key: 'aadeUserId',
                    value: profile.aadeUserId,
                    label: 'AADE User ID',
                    icon: 'person-circle',
                    placeholder: 'Enter AADE User ID',
                    isSecure: true,
                  },
                  {
                    key: 'aadeSubscriptionKey',
                    value: profile.aadeSubscriptionKey,
                    label: 'Subscription Key',
                    icon: 'key',
                    placeholder: 'Enter Subscription Key',
                    isSecure: true,
                  },
                ]
              )}

              {renderProfileCard(
                'Company Information',
                Building,
                '#06b6d4',
                [
                  {
                    key: 'companyVatNumber',
                    value: profile.companyVatNumber,
                    label: 'VAT Number (9 digits)',
                    icon: 'card',
                    placeholder: '123456789',
                  },
                  {
                    key: 'companyName',
                    value: profile.companyName,
                    label: 'Company Name',
                    icon: 'business',
                    placeholder: 'e.g., AGGELOS RENTALS ΙΚΕ',
                  },
                  {
                    key: 'companyAddress',
                    value: profile.companyAddress,
                    label: 'Company Address',
                    icon: 'location',
                    placeholder: 'Leof. Syggrou 123, Athens',
                  },
                  {
                    key: 'companyActivity',
                    value: profile.companyActivity,
                    label: 'Activity',
                    icon: 'briefcase',
                    placeholder: 'Car Rental',
                  },
                ]
              )}

              {/* AADE Help */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-blue-900 mb-2">ℹ️ Where to find these details?</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Register at AADE Developer Portal</li>
                  <li>Login to Digital Client Registry API Portal</li>
                  <li>You will find User ID and Subscription Key</li>
                  <li>Production: https://mydatapi.aade.gr/DCL/</li>
                  <li>Development: https://mydataapidev.aade.gr/DCL/</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* App Settings */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">App Settings</h3>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications for new rentals</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">Biometric Login</p>
                <p className="text-sm text-gray-500">Use fingerprint/Face ID</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={biometricsEnabled}
                  onChange={(e) => setBiometricsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Flask className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Test Notification</p>
                  <p className="text-sm text-gray-500">Send test push notification</p>
                </div>
              </div>
              <Send className="w-5 h-5 text-blue-600" />
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Tools & Tests</h3>
          
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <Link href="/dashboard/rentals" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-gray-900">🎨 PDF Template Test</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            
            <Link href="/dashboard/rentals" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-cyan-600" />
                </div>
                <span className="font-medium text-gray-900">📸 Photo Upload Test</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            
            <Link href="/dashboard/settings" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">Notification Settings</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            
            <Link href="/dashboard/settings" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Key className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-900">Change Password</span>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-red-600"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <span className="font-medium">Sign Out</span>
              </div>
              <span className="text-red-400">→</span>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-600">FleetOS v1.0.0</p>
          <p className="text-xs text-gray-500 mt-1">© 2024 All rights reserved</p>
        </div>
      </main>

      {/* Edit Field Modal */}
      {editingField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit</h3>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              {editingField.label}
            </label>
            <div className="relative">
              <input
                type={editingField.isSecure && !showPassword[editingField.key as keyof typeof showPassword] ? 'password' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={editingField.placeholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                autoFocus
                disabled={saving}
              />
              {editingField.isSecure && (
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, [editingField!.key]: !prev[editingField!.key as keyof typeof prev] }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword[editingField.key as keyof typeof showPassword] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveField}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

