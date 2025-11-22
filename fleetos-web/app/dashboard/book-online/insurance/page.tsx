'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Shield, Plus, Edit, Trash2, X, Save, 
  DollarSign, CheckCircle2, XCircle
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

interface InsuranceType {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  deductible: number;
  coverage_amount?: number;
  price_per_day: number;
  covers_theft: boolean;
  covers_glass: boolean;
  covers_tires: boolean;
  covers_undercarriage: boolean;
  badge_text?: string;
  is_default: boolean;
  display_order: number;
  is_active: boolean;
  organization_id?: string;
}

export default function InsurancePage() {
  const router = useRouter();
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<InsuranceType | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    deductible: '0',
    coverage_amount: '',
    price_per_day: '0',
    covers_theft: false,
    covers_glass: false,
    covers_tires: false,
    covers_undercarriage: false,
    badge_text: '',
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    loadInsuranceTypes();
  }, []);

  async function loadInsuranceTypes() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      let insuranceQuery = supabase
        .from('insurance_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (organizationId) {
        insuranceQuery = insuranceQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await insuranceQuery;

      if (error) throw error;
      setInsuranceTypes(data || []);
    } catch (error) {
      console.error('Error loading insurance types:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingInsurance(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      deductible: '0',
      coverage_amount: '',
      price_per_day: '0',
      covers_theft: false,
      covers_glass: false,
      covers_tires: false,
      covers_undercarriage: false,
      badge_text: '',
      is_default: false,
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(insurance: InsuranceType) {
    setEditingInsurance(insurance);
    setFormData({
      name: insurance.name || '',
      name_el: insurance.name_el || '',
      description: insurance.description || '',
      description_el: insurance.description_el || '',
      deductible: insurance.deductible.toString() || '0',
      coverage_amount: insurance.coverage_amount?.toString() || '',
      price_per_day: insurance.price_per_day.toString() || '0',
      covers_theft: insurance.covers_theft || false,
      covers_glass: insurance.covers_glass || false,
      covers_tires: insurance.covers_tires || false,
      covers_undercarriage: insurance.covers_undercarriage || false,
      badge_text: insurance.badge_text || '',
      is_default: insurance.is_default || false,
      is_active: insurance.is_active ?? true,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      alert('Insurance name (Greek) is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      const insuranceData: any = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        deductible: parseFloat(formData.deductible) || 0,
        coverage_amount: formData.coverage_amount ? parseFloat(formData.coverage_amount) : null,
        price_per_day: parseFloat(formData.price_per_day) || 0,
        covers_theft: formData.covers_theft,
        covers_glass: formData.covers_glass,
        covers_tires: formData.covers_tires,
        covers_undercarriage: formData.covers_undercarriage,
        badge_text: formData.badge_text || null,
        is_default: formData.is_default,
        is_active: formData.is_active,
      };

      if (organizationId) {
        insuranceData.organization_id = organizationId;
      }

      if (editingInsurance) {
        const { error } = await supabase
          .from('insurance_types')
          .update(insuranceData)
          .eq('id', editingInsurance.id);

        if (error) throw error;
        alert('Insurance updated successfully');
      } else {
        const { data: maxOrder } = await supabase
          .from('insurance_types')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        insuranceData.display_order = (maxOrder?.display_order || 0) + 1;

        const { error } = await supabase
          .from('insurance_types')
          .insert(insuranceData);

        if (error) throw error;
        alert('Insurance created successfully');
      }

      setModalVisible(false);
      loadInsuranceTypes();
    } catch (error) {
      console.error('Error saving insurance:', error);
      alert('Failed to save insurance');
    }
  }

  async function handleDelete(insurance: InsuranceType) {
    if (!confirm(`Are you sure you want to delete "${insurance.name_el}"?`)) return;

    try {
      const { error } = await supabase
        .from('insurance_types')
        .delete()
        .eq('id', insurance.id);

      if (error) throw error;
      alert('Insurance deleted successfully');
      loadInsuranceTypes();
    } catch (error) {
      console.error('Error deleting insurance:', error);
      alert('Failed to delete insurance');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading insurance types...</p>
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
                <h1 className="text-xl font-bold text-gray-900">Insurance Types</h1>
                <p className="text-sm text-gray-600">Manage insurance options and coverage</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Insurance
            </button>
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
            <Link href="/dashboard/book-online" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
              Book Online
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {insuranceTypes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No insurance types found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Insurance
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insuranceTypes.map((insurance) => (
              <div
                key={insurance.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  insurance.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                } ${insurance.is_default ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{insurance.name_el}</h3>
                      {insurance.is_default && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          Default
                        </span>
                      )}
                      {insurance.badge_text && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                          {insurance.badge_text}
                        </span>
                      )}
                    </div>
                    {insurance.name && insurance.name !== insurance.name_el && (
                      <p className="text-sm text-gray-600">{insurance.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(insurance)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(insurance)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {insurance.description_el && (
                  <p className="text-sm text-gray-700 mb-4">{insurance.description_el}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Price per day:</span>
                    <span className="font-bold text-gray-900">€{insurance.price_per_day.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Deductible:</span>
                    <span className="font-semibold text-gray-900">€{insurance.deductible.toFixed(2)}</span>
                  </div>
                  {insurance.coverage_amount && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Coverage:</span>
                      <span className="font-semibold text-gray-900">€{insurance.coverage_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Coverage:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      {insurance.covers_theft ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={insurance.covers_theft ? 'text-gray-700' : 'text-gray-400'}>Theft</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {insurance.covers_glass ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={insurance.covers_glass ? 'text-gray-700' : 'text-gray-400'}>Glass</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {insurance.covers_tires ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={insurance.covers_tires ? 'text-gray-700' : 'text-gray-400'}>Tires</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {insurance.covers_undercarriage ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={insurance.covers_undercarriage ? 'text-gray-700' : 'text-gray-400'}>Undercarriage</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    insurance.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {insurance.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500">Order: {insurance.display_order}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingInsurance ? 'Edit Insurance' : 'Create Insurance'}
              </h2>
              <button
                onClick={() => setModalVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

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
                    placeholder="e.g., Βασική"
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
                    placeholder="e.g., Basic"
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
                  placeholder="e.g., Βασική κάλυψη..."
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
                  placeholder="e.g., Basic coverage..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Deductible (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.deductible}
                    onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coverage Amount (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.coverage_amount}
                    onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={formData.badge_text}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                  placeholder="e.g., Recommended"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Coverage Options:</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.covers_theft}
                      onChange={(e) => setFormData({ ...formData, covers_theft: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Covers Theft</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.covers_glass}
                      onChange={(e) => setFormData({ ...formData, covers_glass: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Covers Glass</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.covers_tires}
                      onChange={(e) => setFormData({ ...formData, covers_tires: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Covers Tires</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.covers_undercarriage}
                      onChange={(e) => setFormData({ ...formData, covers_undercarriage: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Covers Undercarriage</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
                  Set as default insurance
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

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalVisible(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingInsurance ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

