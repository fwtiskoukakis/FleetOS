'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Calendar, Plus, Edit, Trash2, X, Save, 
  Tag, Car, DollarSign, TrendingDown, Clock
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

interface PricingRule {
  id: string;
  category_id?: string;
  car_id?: string;
  start_date: string;
  end_date: string;
  price_per_day: number;
  min_rental_days: number;
  weekly_discount_percent: number;
  monthly_discount_percent: number;
  priority: number;
  organization_id?: string;
  category?: {
    name_el: string;
  };
  car?: {
    make: string;
    model: string;
    license_plate: string;
  };
}

interface CarCategory {
  id: string;
  name_el: string;
}

interface BookingCar {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

export default function PricingPage() {
  const router = useRouter();
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [cars, setCars] = useState<BookingCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [selectedType, setSelectedType] = useState<'category' | 'car'>('category');
  
  const [formData, setFormData] = useState({
    category_id: '',
    car_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    price_per_day: '0',
    min_rental_days: '1',
    weekly_discount_percent: '0',
    monthly_discount_percent: '0',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      // Load categories
      let categoriesQuery = supabase
        .from('car_categories')
        .select('id, name_el')
        .eq('is_active', true)
        .order('display_order');

      if (organizationId) {
        categoriesQuery = categoriesQuery.eq('organization_id', organizationId);
      }

      const { data: categoriesData, error: categoriesError } = await categoriesQuery;

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load cars
      let carsQuery = supabase
        .from('booking_cars')
        .select('id, make, model, license_plate')
        .eq('is_active', true)
        .order('make, model');

      if (organizationId) {
        carsQuery = carsQuery.eq('organization_id', organizationId);
      }

      const { data: carsData, error: carsError } = await carsQuery;

      if (carsError) throw carsError;
      setCars(carsData || []);

      // Load pricing rules - filter by organization through cars/categories
      // First get all pricing rules, then filter client-side by organization
      let pricingQuery = supabase
        .from('car_pricing')
        .select(`
          *,
          category:car_categories(name_el, organization_id),
          car:booking_cars(make, model, license_plate, organization_id)
        `)
        .order('start_date', { ascending: false });

      const { data: pricingData, error: pricingError } = await pricingQuery;
      
      // Filter by organization client-side if needed
      if (organizationId && pricingData) {
        const filtered = pricingData.filter((rule: any) => {
          if (rule.car_id && rule.car) {
            return rule.car.organization_id === organizationId;
          }
          if (rule.category_id && rule.category) {
            return rule.category.organization_id === organizationId;
          }
          return false;
        });
        
        if (pricingError) throw pricingError;
        setPricingRules(filtered || []);
        return;
      }

      if (pricingError) throw pricingError;
      setPricingRules(pricingData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingRule(null);
    setSelectedType('category');
    setFormData({
      category_id: categories.length > 0 ? categories[0].id : '',
      car_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Default to 1 year from now
      price_per_day: '50',
      min_rental_days: '1',
      weekly_discount_percent: '0',
      monthly_discount_percent: '0',
    });
    setModalVisible(true);
  }

  function openEditModal(rule: PricingRule) {
    setEditingRule(rule);
    setSelectedType(rule.car_id ? 'car' : 'category');
    setFormData({
      category_id: rule.category_id || '',
      car_id: rule.car_id || '',
      start_date: rule.start_date,
      end_date: rule.end_date,
      price_per_day: rule.price_per_day.toString(),
      min_rental_days: rule.min_rental_days.toString(),
      weekly_discount_percent: rule.weekly_discount_percent?.toString() || '0',
      monthly_discount_percent: rule.monthly_discount_percent?.toString() || '0',
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.price_per_day || parseFloat(formData.price_per_day) <= 0) {
      alert('Price per day is required');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      alert('Start and end dates are required');
      return;
    }

    if (selectedType === 'category' && !formData.category_id) {
      alert('Please select a category');
      return;
    }

    if (selectedType === 'car' && !formData.car_id) {
      alert('Please select a car');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      // Verify car/category belongs to organization
      if (selectedType === 'car') {
        const { data: carData } = await supabase
          .from('booking_cars')
          .select('organization_id')
          .eq('id', formData.car_id)
          .single();
        
        if (carData && organizationId && carData.organization_id !== organizationId) {
          alert('This car does not belong to your organization');
          return;
        }
      } else {
        const { data: categoryData } = await supabase
          .from('car_categories')
          .select('organization_id')
          .eq('id', formData.category_id)
          .single();
        
        if (categoryData && organizationId && categoryData.organization_id !== organizationId) {
          alert('This category does not belong to your organization');
          return;
        }
      }

      const pricingData: any = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        price_per_day: parseFloat(formData.price_per_day),
        min_rental_days: parseInt(formData.min_rental_days) || 1,
        weekly_discount_percent: parseFloat(formData.weekly_discount_percent) || 0,
        monthly_discount_percent: parseFloat(formData.monthly_discount_percent) || 0,
        priority: selectedType === 'car' ? 10 : 0, // Car pricing has higher priority than category pricing
      };

      if (selectedType === 'category') {
        pricingData.category_id = formData.category_id;
        pricingData.car_id = null;
      } else {
        pricingData.car_id = formData.car_id;
        pricingData.category_id = null;
      }

      if (editingRule) {
        const { error } = await supabase
          .from('car_pricing')
          .update(pricingData)
          .eq('id', editingRule.id);

        if (error) throw error;
        alert('Pricing rule updated successfully');
      } else {
        const { error } = await supabase
          .from('car_pricing')
          .insert(pricingData);

        if (error) throw error;
        alert('Pricing rule created successfully');
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('Failed to save pricing rule');
    }
  }

  async function handleDelete(rule: PricingRule) {
    if (!confirm(`Are you sure you want to delete this pricing rule?`)) return;

    try {
      const { error } = await supabase
        .from('car_pricing')
        .delete()
        .eq('id', rule.id);

      if (error) throw error;
      alert('Pricing rule deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting pricing:', error);
      alert('Failed to delete pricing rule');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading pricing rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pricingRules.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No pricing rules found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Pricing Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pricingRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {rule.category ? rule.category.name_el : `${rule.car?.make} ${rule.car?.model} (${rule.car?.license_plate})`}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(rule.start_date), 'dd MMM yyyy', { locale: el })} - {format(parseISO(rule.end_date), 'dd MMM yyyy', { locale: el })}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-orange-600 mt-1">
                        €{rule.price_per_day.toFixed(2)}/day
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(rule)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Min {rule.min_rental_days} days</span>
                  </div>
                  {rule.weekly_discount_percent > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <TrendingDown className="w-4 h-4 text-green-600" />
                      <span>Weekly discount: {rule.weekly_discount_percent}%</span>
                    </div>
                  )}
                  {rule.monthly_discount_percent > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <TrendingDown className="w-4 h-4 text-green-600" />
                      <span>Monthly discount: {rule.monthly_discount_percent}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                {editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
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
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pricing Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedType('category')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      selectedType === 'category'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Tag className="w-5 h-5" />
                      <span className="font-medium">Category</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedType('car')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      selectedType === 'car'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Car className="w-5 h-5" />
                      <span className="font-medium">Car</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category or Car Selection */}
              {selectedType === 'category' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name_el}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Car *
                  </label>
                  <select
                    value={formData.car_id}
                    onChange={(e) => setFormData({ ...formData, car_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a car</option>
                    {cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.make} {car.model} ({car.license_plate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Price Per Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Per Day (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Min Rental Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Rental Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.min_rental_days}
                  onChange={(e) => setFormData({ ...formData, min_rental_days: e.target.value })}
                  placeholder="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Discounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Discount (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.weekly_discount_percent}
                    onChange={(e) => setFormData({ ...formData, weekly_discount_percent: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Discount (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.monthly_discount_percent}
                    onChange={(e) => setFormData({ ...formData, monthly_discount_percent: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                {editingRule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

