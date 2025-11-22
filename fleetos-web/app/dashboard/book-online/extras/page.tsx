'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Plus, Edit, Trash2, X, Save, 
  Navigation, Baby, UserPlus, Shield, Wifi, Snowflake, DollarSign
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

interface ExtraOption {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  price_per_day: number;
  is_one_time_fee: boolean;
  icon_name?: string;
  display_order: number;
  is_active: boolean;
  organization_id?: string;
}

const ICON_OPTIONS = [
  { name: 'navigate', label: 'GPS', icon: Navigation },
  { name: 'car-seat', label: 'Child Seat', icon: Baby },
  { name: 'person-add', label: 'Additional Driver', icon: UserPlus },
  { name: 'shield-checkmark', label: 'Insurance', icon: Shield },
  { name: 'wifi', label: 'WiFi', icon: Wifi },
  { name: 'snow', label: 'Snow Chains', icon: Snowflake },
];

export default function ExtrasPage() {
  const router = useRouter();
  const [extras, setExtras] = useState<ExtraOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ExtraOption | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    price_per_day: '0',
    is_one_time_fee: false,
    icon_name: 'navigate',
    is_active: true,
  });

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      let extrasQuery = supabase
        .from('extra_options')
        .select('*')
        .order('display_order', { ascending: true });

      if (organizationId) {
        extrasQuery = extrasQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await extrasQuery;

      if (error) throw error;
      setExtras(data || []);
    } catch (error) {
      console.error('Error loading extras:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingExtra(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      price_per_day: '0',
      is_one_time_fee: false,
      icon_name: 'navigate',
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(extra: ExtraOption) {
    setEditingExtra(extra);
    setFormData({
      name: extra.name || '',
      name_el: extra.name_el || '',
      description: extra.description || '',
      description_el: extra.description_el || '',
      price_per_day: extra.price_per_day.toString() || '0',
      is_one_time_fee: extra.is_one_time_fee || false,
      icon_name: extra.icon_name || 'navigate',
      is_active: extra.is_active ?? true,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      alert('Extra name (Greek) is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      const extraData: any = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        price_per_day: parseFloat(formData.price_per_day) || 0,
        is_one_time_fee: formData.is_one_time_fee,
        icon_name: formData.icon_name,
        is_active: formData.is_active,
      };

      if (organizationId) {
        extraData.organization_id = organizationId;
      }

      if (editingExtra) {
        const { error } = await supabase
          .from('extra_options')
          .update(extraData)
          .eq('id', editingExtra.id);

        if (error) throw error;
        alert('Extra updated successfully');
      } else {
        const { data: maxOrder } = await supabase
          .from('extra_options')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        extraData.display_order = (maxOrder?.display_order || 0) + 1;

        const { error } = await supabase
          .from('extra_options')
          .insert(extraData);

        if (error) throw error;
        alert('Extra created successfully');
      }

      setModalVisible(false);
      loadExtras();
    } catch (error) {
      console.error('Error saving extra:', error);
      alert('Failed to save extra');
    }
  }

  async function handleDelete(extra: ExtraOption) {
    if (!confirm(`Are you sure you want to delete "${extra.name_el}"?`)) return;

    try {
      const { error } = await supabase
        .from('extra_options')
        .delete()
        .eq('id', extra.id);

      if (error) throw error;
      alert('Extra deleted successfully');
      loadExtras();
    } catch (error) {
      console.error('Error deleting extra:', error);
      alert('Failed to delete extra');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading extras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {extras.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Plus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No extras found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Extra
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extras.map((extra) => {
              const iconOption = ICON_OPTIONS.find(opt => opt.name === extra.icon_name);
              const Icon = iconOption?.icon || Navigation;
              
              return (
                <div
                  key={extra.id}
                  className={`bg-white rounded-lg border-2 p-6 ${
                    extra.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{extra.name_el}</h3>
                        {extra.name && extra.name !== extra.name_el && (
                          <p className="text-sm text-gray-600">{extra.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(extra)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(extra)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {extra.description_el && (
                    <p className="text-sm text-gray-700 mb-4">{extra.description_el}</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold text-cyan-600">
                        €{extra.price_per_day.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {extra.is_one_time_fee ? 'One-time fee' : 'Per day'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={extra.is_active}
                        onChange={async () => {
                          await supabase
                            .from('extra_options')
                            .update({ is_active: !extra.is_active })
                            .eq('id', extra.id);
                          loadExtras();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      extra.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {extra.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">Order: {extra.display_order}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 pb-24">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {editingExtra ? 'Edit Extra' : 'Create Extra'}
              </h2>
              <button
                onClick={() => setModalVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Greek) *
                  </label>
                  <input
                    type="text"
                    value={formData.name_el}
                    onChange={(e) => setFormData({ ...formData, name_el: e.target.value })}
                    placeholder="e.g., GPS"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., GPS"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Greek)
                </label>
                <textarea
                  value={formData.description_el}
                  onChange={(e) => setFormData({ ...formData, description_el: e.target.value })}
                  placeholder="e.g., Σύστημα GPS..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (English)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., GPS system..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Per Day (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_per_day}
                    onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={formData.icon_name}
                    onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon.name} value={icon.name}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_one_time_fee"
                  checked={formData.is_one_time_fee}
                  onChange={(e) => setFormData({ ...formData, is_one_time_fee: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_one_time_fee" className="text-sm font-medium text-gray-700">
                  One-time fee (instead of per day)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
              </div>
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom with extra padding for tab bar */}
            <div className="border-t border-gray-200 p-6 flex gap-3 flex-shrink-0 bg-white rounded-b-lg pb-8">
              <button
                onClick={() => setModalVisible(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Save className="w-5 h-5" />
                {editingExtra ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

