'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Palette, Save, X, Check
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

interface DesignSettings {
  id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_name: string;
  company_name_el: string;
  tagline?: string;
  tagline_el?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  facebook_url?: string;
  instagram_url?: string;
  allow_instant_booking: boolean;
  require_approval: boolean;
  show_prices_without_vat: boolean;
  min_booking_hours: number;
  organization_id?: string;
}

export default function DesignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<DesignSettings>({
    primary_color: '#2563eb',
    secondary_color: '#10b981',
    accent_color: '#f59e0b',
    company_name: '',
    company_name_el: '',
    tagline: '',
    tagline_el: '',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    allow_instant_booking: true,
    require_approval: false,
    show_prices_without_vat: false,
    min_booking_hours: 24,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      const queryBuilder = supabase
        .from('booking_design_settings')
        .select('*');

      const query = organizationId 
        ? queryBuilder.eq('organization_id', organizationId)
        : queryBuilder;

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          primary_color: data.primary_color || '#2563eb',
          secondary_color: data.secondary_color || '#10b981',
          accent_color: data.accent_color || '#f59e0b',
          company_name: data.company_name || '',
          company_name_el: data.company_name_el || '',
          tagline: data.tagline || '',
          tagline_el: data.tagline_el || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          whatsapp_number: data.whatsapp_number || '',
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          allow_instant_booking: data.allow_instant_booking ?? true,
          require_approval: data.require_approval ?? false,
          show_prices_without_vat: data.show_prices_without_vat ?? false,
          min_booking_hours: data.min_booking_hours || 24,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings.company_name_el.trim()) {
      alert('Company name (Greek) is required');
      return;
    }

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      const settingsData: any = {
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        company_name: settings.company_name || settings.company_name_el,
        company_name_el: settings.company_name_el,
        tagline: settings.tagline,
        tagline_el: settings.tagline_el,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        whatsapp_number: settings.whatsapp_number,
        facebook_url: settings.facebook_url,
        instagram_url: settings.instagram_url,
        allow_instant_booking: settings.allow_instant_booking,
        require_approval: settings.require_approval,
        show_prices_without_vat: settings.show_prices_without_vat,
        min_booking_hours: settings.min_booking_hours,
      };

      if (organizationId) {
        settingsData.organization_id = organizationId;
      }

      if (settings.id) {
        const { error } = await supabase
          .from('booking_design_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
        alert('Settings saved successfully');
      } else {
        const { error } = await supabase
          .from('booking_design_settings')
          .insert(settingsData);

        if (error) throw error;
        alert('Settings saved successfully');
        loadSettings(); // Reload to get the ID
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
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
              <Link href="/dashboard/book-online">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Design Settings</h1>
                <p className="text-sm text-gray-600">Colors, logo, brand settings</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Brand Colors */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Brand Colors</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: settings.primary_color }}
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    placeholder="#2563eb"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: settings.secondary_color }}
                  />
                  <input
                    type="text"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    placeholder="#10b981"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: settings.accent_color }}
                  />
                  <input
                    type="text"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    placeholder="#f59e0b"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Company Info */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Company Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name (Greek) *
                </label>
                <input
                  type="text"
                  value={settings.company_name_el}
                  onChange={(e) => setSettings({ ...settings, company_name_el: e.target.value })}
                  placeholder="e.g., Ενοικιάσεις Αυτοκινήτων Πειραιάς"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name (English)
                </label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  placeholder="e.g., Piraeus Car Rentals"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tagline (Greek)
                </label>
                <input
                  type="text"
                  value={settings.tagline_el}
                  onChange={(e) => setSettings({ ...settings, tagline_el: e.target.value })}
                  placeholder="e.g., Κλείστε το αυτοκίνητό σας online"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Contact Info */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Contact Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  placeholder="info@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                  placeholder="+30 210 123 4567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  placeholder="+30 690 123 4567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Social Media */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Social Media</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={settings.facebook_url}
                  onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={settings.instagram_url}
                  onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/yourprofile"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Booking Features */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Booking Features</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Allow Instant Booking
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Allow bookings without approval
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_instant_booking}
                    onChange={(e) => setSettings({ ...settings, allow_instant_booking: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Require Approval
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    All bookings require approval
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_approval}
                    onChange={(e) => setSettings({ ...settings, require_approval: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Show Prices Without VAT
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Display prices excluding VAT
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.show_prices_without_vat}
                    onChange={(e) => setSettings({ ...settings, show_prices_without_vat: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Hours Before Booking
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.min_booking_hours}
                  onChange={(e) => setSettings({ ...settings, min_booking_hours: parseInt(e.target.value) || 24 })}
                  placeholder="24"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many hours before a booking can be made
                </p>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

