'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Settings2, Star } from 'lucide-react';
import { createClientComponentClient } from '@/lib/supabase';
import { formatDate, calculateDays, formatCurrency } from '@/lib/utils';
import type { Organization, BookingCar } from '@/lib/supabase';

interface CarsListingPageProps {
  organization: Organization;
  cars: BookingCar[];
  locations: any[];
  searchParams: {
    pickupLocation: string;
    pickupDate: string;
    pickupTime: string;
    dropoffLocation: string;
    dropoffDate: string;
    dropoffTime: string;
  };
}

export default function CarsListingPage({
  organization,
  cars,
  locations,
  searchParams,
}: CarsListingPageProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    transmission: 'all',
    minSeats: 0,
  });

  const days = calculateDays(searchParams.pickupDate, searchParams.dropoffDate);
  const pickupLocation = locations.find(l => l.id === searchParams.pickupLocation);
  const dropoffLocation = locations.find(l => l.id === searchParams.dropoffLocation);

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
    const params = new URLSearchParams({
      org_slug: organization.slug,
      car_id: car.id,
      category_id: car.category.id,
      pickup_location: searchParams.pickupLocation,
      pickup_date: searchParams.pickupDate,
      pickup_time: searchParams.pickupTime,
      dropoff_location: searchParams.dropoffLocation,
      dropoff_date: searchParams.dropoffDate,
      dropoff_time: searchParams.dropoffTime,
    });

    router.push(`/booking/${organization.slug}/booking?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href={`/booking/${organization.slug}`} className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Πίσω στην Αναζήτηση
          </Link>
          <h1 className="text-3xl font-bold mb-2">Διαθέσιμα Αυτοκίνητα</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{formatDate(searchParams.pickupDate)} - {formatDate(searchParams.dropoffDate)}</span>
            </div>
            <span>•</span>
            <span>{days} {days === 1 ? 'ημέρα' : 'ημέρες'}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Settings2 size={20} />
                Φίλτρα
              </h3>

              <div className="space-y-4">
                {/* Transmission */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Κιβώτιο</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.transmission}
                    onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
                  >
                    <option value="all">Όλα</option>
                    <option value="automatic">Αυτόματο</option>
                    <option value="manual">Χειροκίνητο</option>
                  </select>
                </div>

                {/* Seats */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Ελάχιστες Θέσεις</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.minSeats}
                    onChange={(e) => setFilters({ ...filters, minSeats: Number(e.target.value) })}
                  >
                    <option value="0">Όλες</option>
                    <option value="2">2+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                    <option value="7">7+</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Cars Grid */}
          <div className="flex-1">
            {filteredCars.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600">Δεν βρέθηκαν διαθέσιμα αυτοκίνητα</p>
                <Link 
                  href={`/booking/${organization.slug}`}
                  className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
                >
                  Επιστροφή στην αναζήτηση
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCars.map((car) => (
                  <div
                    key={car.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" group hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => handleSelectCar(car)}
                  >
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
                          <Calendar className="w-24 h-24 text-gray-300" />
                        </div>
                      )}
                      {car.is_featured && (
                        <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <Star size={14} fill="white" />
                          FEATURED
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="text-xl font-bold mb-1">{car.make} {car.model}</h3>
                      <p className="text-gray-600 text-sm mb-3">{car.category.name_el}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <span>{car.category.seats} θέσεις</span>
                        <span>•</span>
                        <span>{car.category.transmission === 'automatic' ? 'Αυτόματο' : 'Χειροκίνητο'}</span>
                      </div>

                      {/* Price */}
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-2xl font-bold text-blue-600 mb-1">
                          {/* TODO: Calculate actual price with pricing rules */}
                          €{Math.floor(Math.random() * 50 + 30)}/ημέρα
                        </p>
                        <p className="text-sm text-gray-500">
                          Σύνολο: {/* TODO: Calculate total */}
                        </p>
                      </div>

                      {/* Select Button */}
                      <button
                        className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 w-full mt-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCar(car);
                        }}
                      >
                        Επιλογή
                      </button>
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

