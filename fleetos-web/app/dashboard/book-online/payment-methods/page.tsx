'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  CreditCard, Plus, Edit, Trash2, X, Save, 
  Wallet, Building, DollarSign
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

interface PaymentMethod {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  provider: 'stripe' | 'paypal' | 'bank_transfer' | 'cash' | 'viva_wallet' | 'revolut';
  is_active: boolean;
  requires_full_payment: boolean;
  deposit_percentage: number;
  min_deposit_amount: number;
  display_order: number;
  organization_id?: string;
}

const PROVIDER_OPTIONS = [
  { value: 'stripe', label: 'Stripe', icon: CreditCard },
  { value: 'viva_wallet', label: 'Viva Wallet', icon: Wallet },
  { value: 'paypal', label: 'PayPal', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
  { value: 'cash', label: 'Cash', icon: DollarSign },
  { value: 'revolut', label: 'Revolut', icon: CreditCard },
];

export default function PaymentMethodsPage() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    provider: 'stripe' as PaymentMethod['provider'],
    is_active: true,
    requires_full_payment: false,
    deposit_percentage: '30',
    min_deposit_amount: '50',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  async function loadPaymentMethods() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      let methodsQuery = supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true });

      if (organizationId) {
        methodsQuery = methodsQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await methodsQuery;

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingMethod(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      provider: 'stripe',
      is_active: true,
      requires_full_payment: false,
      deposit_percentage: '30',
      min_deposit_amount: '50',
    });
    setModalVisible(true);
  }

  function openEditModal(method: PaymentMethod) {
    setEditingMethod(method);
    setFormData({
      name: method.name || '',
      name_el: method.name_el || '',
      description: method.description || '',
      description_el: method.description_el || '',
      provider: method.provider || 'stripe',
      is_active: method.is_active ?? true,
      requires_full_payment: method.requires_full_payment || false,
      deposit_percentage: method.deposit_percentage.toString() || '30',
      min_deposit_amount: method.min_deposit_amount.toString() || '50',
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      alert('Payment method name (Greek) is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      const methodData: any = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        provider: formData.provider,
        is_active: formData.is_active,
        requires_full_payment: formData.requires_full_payment,
        deposit_percentage: parseFloat(formData.deposit_percentage) || 30,
        min_deposit_amount: parseFloat(formData.min_deposit_amount) || 50,
      };

      if (organizationId) {
        methodData.organization_id = organizationId;
      }

      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update(methodData)
          .eq('id', editingMethod.id);

        if (error) throw error;
        alert('Payment method updated successfully');
      } else {
        const { data: maxOrder } = await supabase
          .from('payment_methods')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        methodData.display_order = (maxOrder?.display_order || 0) + 1;

        const { error } = await supabase
          .from('payment_methods')
          .insert(methodData);

        if (error) throw error;
        alert('Payment method created successfully');
      }

      setModalVisible(false);
      loadPaymentMethods();
    } catch (error) {
      console.error('Error saving payment method:', error);
      alert('Failed to save payment method');
    }
  }

  async function handleDelete(method: PaymentMethod) {
    if (!confirm(`Are you sure you want to delete "${method.name_el}"?`)) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', method.id);

      if (error) throw error;
      alert('Payment method deleted successfully');
      loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      alert('Failed to delete payment method');
    }
  }

  function getProviderLabel(provider: string): string {
    const option = PROVIDER_OPTIONS.find(opt => opt.value === provider);
    return option?.label || provider;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {paymentMethods.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No payment methods found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Payment Method
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((method) => {
              const providerOption = PROVIDER_OPTIONS.find(opt => opt.value === method.provider);
              const ProviderIcon = providerOption?.icon || CreditCard;
              
              return (
                <div
                  key={method.id}
                  className={`bg-white rounded-lg border-2 p-6 ${
                    method.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <ProviderIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{method.name_el}</h3>
                        {method.name && method.name !== method.name_el && (
                          <p className="text-sm text-gray-600">{method.name}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{getProviderLabel(method.provider)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(method)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(method)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {method.description_el && (
                    <p className="text-sm text-gray-700 mb-4">{method.description_el}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    {method.requires_full_payment ? (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="font-medium">Payment:</span>
                        <span>Full payment required</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Deposit:</span>
                          <span className="font-semibold text-gray-900">{method.deposit_percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Min Deposit:</span>
                          <span className="font-semibold text-gray-900">€{method.min_deposit_amount}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      method.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {method.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">Order: {method.display_order}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMethod ? 'Edit Payment Method' : 'Create Payment Method'}
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
                    placeholder="e.g., Πιστωτική Κάρτα"
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
                    placeholder="e.g., Credit Card"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider *
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Greek)
                </label>
                <textarea
                  value={formData.description_el}
                  onChange={(e) => setFormData({ ...formData, description_el: e.target.value })}
                  placeholder="e.g., Πληρωμή με πιστωτική κάρτα..."
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
                  placeholder="e.g., Payment by credit card..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_full_payment"
                  checked={formData.requires_full_payment}
                  onChange={(e) => setFormData({ ...formData, requires_full_payment: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="requires_full_payment" className="text-sm font-medium text-gray-700">
                  Require full payment (no deposit)
                </label>
              </div>

              {!formData.requires_full_payment && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deposit Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.deposit_percentage}
                        onChange={(e) => setFormData({ ...formData, deposit_percentage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Deposit (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.min_deposit_amount}
                        onChange={(e) => setFormData({ ...formData, min_deposit_amount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

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
                {editingMethod ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

