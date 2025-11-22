'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  MapPin, Plus, Edit, Trash2, X, Save, 
  Clock, DollarSign, Link as LinkIcon, Globe
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

interface Location {
  id: string;
  name: string;
  name_el: string;
  address: string;
  address_el?: string;
  google_maps_url?: string;
  extra_delivery_fee: number;
  extra_pickup_fee: number;
  opening_time?: string;
  closing_time?: string;
  display_order: number;
  is_active: boolean;
  organization_id?: string;
}

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    address: '',
    address_el: '',
    google_maps_url: '',
    extra_delivery_fee: '0',
    extra_pickup_fee: '0',
    opening_time: '08:00',
    closing_time: '20:00',
    is_active: true,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      let locationsQuery = supabase
        .from('locations')
        .select('*')
        .order('display_order', { ascending: true });

      if (organizationId) {
        locationsQuery = locationsQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await locationsQuery;

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingLocation(null);
    setFormData({
      name: '',
      name_el: '',
      address: '',
      address_el: '',
      google_maps_url: '',
      extra_delivery_fee: '0',
      extra_pickup_fee: '0',
      opening_time: '08:00',
      closing_time: '20:00',
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(location: Location) {
    setEditingLocation(location);
    setFormData({
      name: location.name || '',
      name_el: location.name_el || '',
      address: location.address || '',
      address_el: location.address_el || '',
      google_maps_url: location.google_maps_url || '',
      extra_delivery_fee: location.extra_delivery_fee.toString() || '0',
      extra_pickup_fee: location.extra_pickup_fee.toString() || '0',
      opening_time: location.opening_time || '08:00',
      closing_time: location.closing_time || '20:00',
      is_active: location.is_active ?? true,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      alert('Location name (Greek) is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      const locationData: any = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        address: formData.address,
        address_el: formData.address_el,
        google_maps_url: formData.google_maps_url,
        extra_delivery_fee: parseFloat(formData.extra_delivery_fee) || 0,
        extra_pickup_fee: parseFloat(formData.extra_pickup_fee) || 0,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        is_active: formData.is_active,
      };

      if (organizationId) {
        locationData.organization_id = organizationId;
      }

      if (editingLocation) {
        // Update existing
        const { error } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (error) throw error;
        alert('Location updated successfully');
      } else {
        // Create new
        const { data: maxOrder } = await supabase
          .from('locations')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        locationData.display_order = (maxOrder?.display_order || 0) + 1;

        const { error } = await supabase
          .from('locations')
          .insert(locationData);

        if (error) throw error;
        alert('Location created successfully');
      }

      setModalVisible(false);
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location');
    }
  }

  async function handleDelete(location: Location) {
    if (!confirm(`Are you sure you want to delete "${location.name_el}"?`)) return;

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', location.id);

      if (error) throw error;
      alert('Location deleted successfully');
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading locations...</p>
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
                <h1 className="text-xl font-bold text-gray-900">Locations</h1>
                <p className="text-sm text-gray-600">Manage pickup and dropoff locations</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Location
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {locations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No locations found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Location
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  location.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{location.name_el}</h3>
                    {location.name && location.name !== location.name_el && (
                      <p className="text-sm text-gray-600">{location.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(location)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(location)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {location.address_el && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{location.address_el}</p>
                    </div>
                  )}
                  {location.address && location.address !== location.address_el && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{location.address}</p>
                    </div>
                  )}
                  {(location.opening_time || location.closing_time) && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {location.opening_time || 'N/A'} - {location.closing_time || 'N/A'}
                      </p>
                    </div>
                  )}
                  {(location.extra_pickup_fee > 0 || location.extra_delivery_fee > 0) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Pickup: €{location.extra_pickup_fee} | Delivery: €{location.extra_delivery_fee}
                      </p>
                    </div>
                  )}
                  {location.google_maps_url && (
                    <a
                      href={location.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <LinkIcon className="w-4 h-4" />
                      View on Google Maps
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    location.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500">Order: {location.display_order}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLocation ? 'Edit Location' : 'Create Location'}
              </h2>
              <button
                onClick={() => setModalVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (Greek) *
                </label>
                <input
                  type="text"
                  value={formData.name_el}
                  onChange={(e) => setFormData({ ...formData, name_el: e.target.value })}
                  placeholder="e.g., Αεροδρόμιο"
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
                  placeholder="e.g., Airport"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (Greek)
                </label>
                <input
                  type="text"
                  value={formData.address_el}
                  onChange={(e) => setFormData({ ...formData, address_el: e.target.value })}
                  placeholder="e.g., Αεροδρόμιο Αθηνών"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (English)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., Athens Airport"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  value={formData.google_maps_url}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Extra Pickup Fee (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.extra_pickup_fee}
                    onChange={(e) => setFormData({ ...formData, extra_pickup_fee: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Extra Delivery Fee (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.extra_delivery_fee}
                    onChange={(e) => setFormData({ ...formData, extra_delivery_fee: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                {editingLocation ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

