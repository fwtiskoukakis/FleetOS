'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Car, Plus, Edit, Trash2, X, Save, 
  Camera, Star, CheckCircle2, XCircle, Tag, DollarSign
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format } from 'date-fns';

interface BookingCar {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color?: string;
  category_id: string;
  main_photo_url?: string;
  is_featured: boolean;
  is_available_for_booking: boolean;
  is_active: boolean;
  min_age_requirement: number;
  min_license_years: number;
  organization_id?: string;
  category?: {
    name_el: string;
  };
}

interface CarCategory {
  id: string;
  name_el: string;
}

export default function BookingCarsPage() {
  const router = useRouter();
  const [cars, setCars] = useState<BookingCar[]>([]);
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCar, setEditingCar] = useState<BookingCar | null>(null);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedCarForPrice, setSelectedCarForPrice] = useState<BookingCar | null>(null);
  const [quickPrice, setQuickPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    license_plate: '',
    color: '',
    category_id: '',
    min_age_requirement: '21',
    min_license_years: '1',
    is_featured: false,
    is_available_for_booking: true,
    is_active: true,
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
        .select(`
          *,
          category:car_categories(name_el)
        `)
        .order('created_at', { ascending: false });

      if (organizationId) {
        carsQuery = carsQuery.eq('organization_id', organizationId);
      }

      const { data: carsData, error: carsError } = await carsQuery;

      if (carsError) throw carsError;
      setCars(carsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCar(null);
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear().toString(),
      license_plate: '',
      color: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      min_age_requirement: '21',
      min_license_years: '1',
      is_featured: false,
      is_available_for_booking: true,
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(car: BookingCar) {
    setEditingCar(car);
    setFormData({
      make: car.make || '',
      model: car.model || '',
      year: car.year?.toString() || new Date().getFullYear().toString(),
      license_plate: car.license_plate || '',
      color: car.color || '',
      category_id: car.category_id || '',
      min_age_requirement: car.min_age_requirement?.toString() || '21',
      min_license_years: car.min_license_years?.toString() || '1',
      is_featured: car.is_featured || false,
      is_available_for_booking: car.is_available_for_booking ?? true,
      is_active: car.is_active ?? true,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.make.trim() || !formData.model.trim() || !formData.license_plate.trim()) {
      alert('Please fill in all required fields (Make, Model, License Plate)');
      return;
    }

    if (!formData.category_id) {
      alert('Please select a category');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      const carData: any = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year) || new Date().getFullYear(),
        license_plate: formData.license_plate.toUpperCase(),
        color: formData.color,
        category_id: formData.category_id,
        min_age_requirement: parseInt(formData.min_age_requirement) || 21,
        min_license_years: parseInt(formData.min_license_years) || 1,
        is_featured: formData.is_featured,
        is_available_for_booking: formData.is_available_for_booking,
        is_active: formData.is_active,
      };

      if (organizationId) {
        carData.organization_id = organizationId;
      }

      if (editingCar) {
        const { error } = await supabase
          .from('booking_cars')
          .update(carData)
          .eq('id', editingCar.id);

        if (error) throw error;
        alert('Car updated successfully');
      } else {
        const { error } = await supabase
          .from('booking_cars')
          .insert(carData);

        if (error) throw error;
        alert('Car created successfully');
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving car:', error);
      alert('Failed to save car');
    }
  }

  async function handleDelete(car: BookingCar) {
    if (!confirm(`Are you sure you want to delete "${car.make} ${car.model}"?`)) return;

    try {
      const { error } = await supabase
        .from('booking_cars')
        .delete()
        .eq('id', car.id);

      if (error) throw error;
      alert('Car deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting car:', error);
      alert('Failed to delete car');
    }
  }

  function openQuickPriceModal(car: BookingCar) {
    setSelectedCarForPrice(car);
    
    // Load current price for this car if exists
    loadCarPrice(car.id).then((price) => {
      setQuickPrice(price ? price.toString() : '');
    });
    
    setPriceModalVisible(true);
  }

  async function loadCarPrice(carId: string): Promise<number | null> {
    try {
      // Get the most recent pricing rule for this car
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('car_pricing')
        .select('price_per_day')
        .eq('car_id', carId)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.price_per_day || null;
    } catch (error) {
      console.error('Error loading car price:', error);
      return null;
    }
  }

  async function handleSaveQuickPrice() {
    if (!selectedCarForPrice) return;
    
    const price = parseFloat(quickPrice);
    if (!price || price <= 0) {
      alert('Please enter a valid price (greater than 0)');
      return;
    }

    try {
      setSavingPrice(true);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const oneYearLater = format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // Check if pricing rule exists for this car
      const { data: existingRule } = await supabase
        .from('car_pricing')
        .select('id')
        .eq('car_id', selectedCarForPrice.id)
        .lte('start_date', today)
        .gte('end_date', oneYearLater)
        .limit(1)
        .maybeSingle();

      const pricingData = {
        car_id: selectedCarForPrice.id,
        category_id: null,
        start_date: today,
        end_date: oneYearLater,
        price_per_day: price,
        min_rental_days: 1,
        weekly_discount_percent: 0,
        monthly_discount_percent: 0,
        priority: 10, // Car-specific pricing has higher priority
      };

      if (existingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('car_pricing')
          .update(pricingData)
          .eq('id', existingRule.id);

        if (error) throw error;
        alert('Price updated successfully!');
      } else {
        // Create new rule
        const { error } = await supabase
          .from('car_pricing')
          .insert(pricingData);

        if (error) throw error;
        alert('Price set successfully!');
      }

      setPriceModalVisible(false);
      setSelectedCarForPrice(null);
      setQuickPrice('');
    } catch (error) {
      console.error('Error saving price:', error);
      alert('Failed to save price. Please try again.');
    } finally {
      setSavingPrice(false);
    }
  }

  async function toggleAvailability(car: BookingCar) {
    try {
      const { error } = await supabase
        .from('booking_cars')
        .update({ is_available_for_booking: !car.is_available_for_booking })
        .eq('id', car.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Failed to update availability');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading cars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cars.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No cars found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Car
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cars.map((car) => (
              <div
                key={car.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  car.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                } ${car.is_featured ? 'ring-2 ring-yellow-500' : ''}`}
              >
                {car.main_photo_url ? (
                  <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-200">
                    <img
                      src={car.main_photo_url}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 mb-4 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Car className="w-16 h-16 text-gray-400" />
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {car.make} {car.model}
                      </h3>
                      {car.is_featured && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{car.year}</p>
                    <p className="text-sm font-semibold text-gray-900">{car.license_plate}</p>
                    {car.category && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">{car.category.name_el}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openQuickPriceModal(car)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Set Price"
                    >
                      <DollarSign className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(car)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(car)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Available for booking:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={car.is_available_for_booking}
                        onChange={() => toggleAvailability(car)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Min age:</span>
                    <span className="font-semibold text-gray-900">{car.min_age_requirement} years</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Min license:</span>
                    <span className="font-semibold text-gray-900">{car.min_license_years} years</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    car.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {car.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    car.is_available_for_booking
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {car.is_available_for_booking ? 'Available' : 'Unavailable'}
                  </span>
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
                {editingCar ? 'Edit Car' : 'Create Car'}
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
                    Make *
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g., Toyota"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Corolla"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Plate *
                  </label>
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                    placeholder="e.g., ABC1234"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g., White"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Age Requirement (years)
                  </label>
                  <input
                    type="number"
                    min="18"
                    value={formData.min_age_requirement}
                    onChange={(e) => setFormData({ ...formData, min_age_requirement: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min License Years
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_license_years}
                    onChange={(e) => setFormData({ ...formData, min_license_years: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">
                    Featured (Recommended)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_available_for_booking"
                    checked={formData.is_available_for_booking}
                    onChange={(e) => setFormData({ ...formData, is_available_for_booking: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_available_for_booking" className="text-sm font-medium text-gray-700">
                    Available for booking
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
                {editingCar ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Price Modal */}
      {priceModalVisible && selectedCarForPrice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 pb-24">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[85vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                Set Price for {selectedCarForPrice.make} {selectedCarForPrice.model}
              </h2>
              <button
                onClick={() => {
                  setPriceModalVisible(false);
                  setSelectedCarForPrice(null);
                  setQuickPrice('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Per Day (€) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value)}
                    placeholder="50.00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This price will apply from today until 1 year from now. You can create date-specific pricing rules in the Pricing page.
                </p>
              </div>
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom with extra padding for tab bar */}
            <div className="border-t border-gray-200 p-6 flex gap-3 flex-shrink-0 bg-white rounded-b-lg pb-8">
              <button
                onClick={() => {
                  setPriceModalVisible(false);
                  setSelectedCarForPrice(null);
                  setQuickPrice('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                disabled={savingPrice}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickPrice}
                disabled={savingPrice || !quickPrice || parseFloat(quickPrice) <= 0}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {savingPrice ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Price
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

