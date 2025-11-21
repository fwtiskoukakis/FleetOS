'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Users, Briefcase, Settings2, Star } from 'lucide-react';
import { supabase, type BookingCar } from '@/lib/supabase';
import { formatDate, calculateDays, formatCurrency, getTransmissionLabel } from '@/lib/utils';

function CarsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cars, setCars] = useState<BookingCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    transmission: 'all',
    minSeats: 0,
    maxPrice: 0,
  });

  const pickupDate = searchParams.get('pickup_date') || '';
  const dropoffDate = searchParams.get('dropoff_date') || '';
  const days = pickupDate && dropoffDate ? calculateDays(pickupDate, dropoffDate) : 1;

  useEffect(() => {
    loadCars();
  }, []);

  async function loadCars() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_cars')
        .select(`
          *,
          category:car_categories(*),
          photos:car_photos(*)
        `)
        .eq('is_available_for_booking', true)
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      if (error) throw error;
      setCars(data || []);
    } catch (error) {
      console.error('Error loading cars:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCars = cars.filter((car) => {
    if (filters.transmission !== 'all' && car.category.transmission !== filters.transmission) {
      return false;
    }
    if (filters.minSeats > 0 && car.category.seats < filters.minSeats) {
      return false;
    }
    return true;
  });

  function handleSelectCar(car: BookingCar) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('car_id', car.id);
    params.set('category_id', car.category.id);
    router.push(`/booking?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-2">Διαθέσιμα Αυτοκίνητα</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{formatDate(pickupDate)} - {formatDate(dropoffDate)}</span>
            </div>
            <span>•</span>
            <span>{days} {days === 1 ? 'ημέρα' : 'ημέρες'}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="card sticky top-4">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Settings2 size={20} />
                Φίλτρα
              </h3>

              <div className="space-y-4">
                {/* Transmission */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Κιβώτιο</label>
                  <select
                    className="input"
                    value={filters.transmission}
                    onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
                  >
                    <option value="all">Όλα</option>
                    <option value="automatic">Αυτόματο</option>
                    <option value="manual">Χειροκίνητο</option>
                  </select>
                </div>

                {/* Min Seats */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Θέσεις (τουλάχιστον)</label>
                  <select
                    className="input"
                    value={filters.minSeats}
                    onChange={(e) => setFilters({ ...filters, minSeats: Number(e.target.value) })}
                  >
                    <option value="0">Όλα</option>
                    <option value="5">5+</option>
                    <option value="7">7+</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{filteredCars.length}</strong> αυτοκίνητα βρέθηκαν
                </p>
              </div>
            </div>
          </aside>

          {/* Cars Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Φόρτωση αυτοκινήτων...</p>
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600">Δεν βρέθηκαν διαθέσιμα αυτοκίνητα</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCars.map((car) => (
                  <div key={car.id} className="card group hover:shadow-xl transition-all cursor-pointer" onClick={() => handleSelectCar(car)}>
                    {/* Image */}
                    <div className="relative h-48 mb-4 -mx-6 -mt-6 rounded-t-xl overflow-hidden bg-gray-100">
                      {car.main_photo_url ? (
                        <img
                          src={car.main_photo_url}
                          alt={`${car.make} ${car.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                      )}
                      {car.is_featured && (
                        <div className="absolute top-3 right-3 bg-accent text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <Star size={14} fill="white" />
                          FEATURED
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="text-xl font-bold mb-1">{car.make} {car.model}</h3>
                      <p className="text-sm text-gray-500 mb-4">{car.category.name_el}</p>

                      {/* Specs */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <Users size={18} className="mx-auto mb-1 text-gray-400" />
                          <p className="text-sm font-semibold">{car.category.seats}</p>
                          <p className="text-xs text-gray-500">θέσεις</p>
                        </div>
                        <div className="text-center">
                          <Settings2 size={18} className="mx-auto mb-1 text-gray-400" />
                          <p className="text-sm font-semibold">{getTransmissionLabel(car.category.transmission)}</p>
                          <p className="text-xs text-gray-500">κιβώτιο</p>
                        </div>
                        <div className="text-center">
                          <Briefcase size={18} className="mx-auto mb-1 text-gray-400" />
                          <p className="text-sm font-semibold">{car.category.luggage_capacity}</p>
                          <p className="text-xs text-gray-500">βαλίτσες</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="border-t pt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">από</p>
                          <p className="text-2xl font-bold text-primary">€45<span className="text-sm text-gray-500">/ημέρα</span></p>
                        </div>
                        <button className="btn btn-primary py-2 px-4">
                          Επιλογή
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CarsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CarsPageContent />
    </Suspense>
  );
}

