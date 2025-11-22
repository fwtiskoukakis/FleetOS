'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Tag, Plus, Edit, Trash2, X, Save, 
  Users, DoorOpen, Settings, Luggage, Car
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

interface CarCategory {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  seats: number;
  doors: number;
  transmission: 'manual' | 'automatic' | 'both';
  luggage_capacity: number;
  features?: string[];
  icon_name?: string;
  display_order: number;
  is_active: boolean;
  organization_id?: string;
}

const FEATURE_OPTIONS = [
  { id: 'air_conditioning', label: 'A/C', icon: 'Snow' },
  { id: 'bluetooth', label: 'Bluetooth', icon: 'Bluetooth' },
  { id: 'gps', label: 'GPS', icon: 'Navigation' },
  { id: 'usb', label: 'USB', icon: 'USB' },
  { id: 'aux', label: 'AUX', icon: 'Headphones' },
  { id: 'cruise_control', label: 'Cruise Control', icon: 'Gauge' },
];

const ICON_OPTIONS = [
  { name: 'car-outline', label: 'Car' },
  { name: 'car-sport-outline', label: 'Sport' },
  { name: 'airplane-outline', label: 'Luxury' },
  { name: 'bus-outline', label: 'Van/SUV' },
];

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CarCategory | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    seats: '5',
    doors: '4',
    transmission: 'manual' as 'manual' | 'automatic' | 'both',
    luggage_capacity: '2',
    features: [] as string[],
    icon_name: 'car-outline',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      let categoriesQuery = supabase
        .from('car_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (organizationId) {
        categoriesQuery = categoriesQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await categoriesQuery;

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCategory(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      seats: '5',
      doors: '4',
      transmission: 'manual',
      luggage_capacity: '2',
      features: [],
      icon_name: 'car-outline',
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(category: CarCategory) {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      name_el: category.name_el || '',
      description: category.description || '',
      description_el: category.description_el || '',
      seats: category.seats.toString(),
      doors: category.doors.toString(),
      transmission: category.transmission || 'manual',
      luggage_capacity: category.luggage_capacity.toString(),
      features: category.features || [],
      icon_name: category.icon_name || 'car-outline',
      is_active: category.is_active ?? true,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      alert('Category name (Greek) is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      const categoryData: any = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        seats: parseInt(formData.seats) || 5,
        doors: parseInt(formData.doors) || 4,
        transmission: formData.transmission,
        luggage_capacity: parseInt(formData.luggage_capacity) || 2,
        features: formData.features,
        icon_name: formData.icon_name,
        is_active: formData.is_active,
      };

      if (organizationId) {
        categoryData.organization_id = organizationId;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('car_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        alert('Category updated successfully');
      } else {
        const { data: maxOrder } = await supabase
          .from('car_categories')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        categoryData.display_order = (maxOrder?.display_order || 0) + 1;

        const { error } = await supabase
          .from('car_categories')
          .insert(categoryData);

        if (error) throw error;
        alert('Category created successfully');
      }

      setModalVisible(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  }

  async function handleDelete(category: CarCategory) {
    if (!confirm(`Are you sure you want to delete "${category.name_el}"?`)) return;

    try {
      const { error } = await supabase
        .from('car_categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      alert('Category deleted successfully');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  }

  function toggleFeature(featureId: string) {
    setFormData(prev => {
      const features = prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId];
      return { ...prev, features };
    });
  }

  function getTransmissionLabel(transmission: string): string {
    switch (transmission) {
      case 'manual': return 'Manual';
      case 'automatic': return 'Automatic';
      case 'both': return 'Both';
      default: return transmission;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {categories.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No categories found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  category.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{category.name_el}</h3>
                    {category.name && category.name !== category.name_el && (
                      <p className="text-sm text-gray-600">{category.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {category.description_el && (
                  <p className="text-sm text-gray-700 mb-4">{category.description_el}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{category.seats} seats</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DoorOpen className="w-4 h-4" />
                    <span>{category.doors} doors</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Settings className="w-4 h-4" />
                    <span>{getTransmissionLabel(category.transmission)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Luggage className="w-4 h-4" />
                    <span>{category.luggage_capacity} luggage</span>
                  </div>
                </div>

                {category.features && category.features.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Features:</p>
                    <div className="flex flex-wrap gap-2">
                      {category.features.map((featureId) => {
                        const feature = FEATURE_OPTIONS.find(f => f.id === featureId);
                        return feature ? (
                          <span
                            key={featureId}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                          >
                            {feature.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    category.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500">Order: {category.display_order}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 pb-24">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
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
                    placeholder="e.g., Οικονομική"
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
                    placeholder="e.g., Economy"
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
                  placeholder="e.g., Οικονομική κατηγορία..."
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
                  placeholder="e.g., Economy category..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seats
                  </label>
                  <input
                    type="number"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doors
                  </label>
                  <input
                    type="number"
                    value={formData.doors}
                    onChange={(e) => setFormData({ ...formData, doors: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transmission
                  </label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Luggage
                  </label>
                  <input
                    type="number"
                    value={formData.luggage_capacity}
                    onChange={(e) => setFormData({ ...formData, luggage_capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {FEATURE_OPTIONS.map((feature) => (
                    <label
                      key={feature.id}
                      className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature.id)}
                        onChange={() => toggleFeature(feature.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{feature.label}</span>
                    </label>
                  ))}
                </div>
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
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

