'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Car, Calendar, MapPin, Clock, Euro, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface CarResult {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color?: string;
  category: {
    id: string;
    name: string;
    name_el: string;
    seats: number;
    doors: number;
    transmission: string;
  };
  main_photo_url?: string;
  photos: Array<{ id: string; photo_url: string }>;
  pricing: {
    base_price: number;
    price_per_day: number;
    rental_days: number;
    location_fees: number;
    total_price: number;
  };
  availability: {
    is_available: boolean;
    blocked_dates: any[];
  };
}

export default function SearchResultsPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<CarResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pickupDate = searchParams.get('pickup_date');
  const pickupTime = searchParams.get('pickup_time');
  const pickupLocationId = searchParams.get('pickup_location_id');
  const dropoffDate = searchParams.get('dropoff_date');
  const dropoffTime = searchParams.get('dropoff_time');
  const dropoffLocationId = searchParams.get('dropoff_location_id');

  useEffect(() => {
    if (!pickupDate || !dropoffDate || !pickupLocationId || !dropoffLocationId) {
      setError('Missing required search parameters');
      setLoading(false);
      return;
    }

    loadAvailableCars();
  }, [pickupDate, dropoffDate, pickupLocationId, dropoffLocationId]);

  async function loadAvailableCars() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/organizations/${params.slug}/cars/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_date: pickupDate,
          pickup_time: pickupTime || '10:00',
          pickup_location_id: pickupLocationId,
          dropoff_date: dropoffDate,
          dropoff_time: dropoffTime || '10:00',
          dropoff_location_id: dropoffLocationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search cars');
      }

      const data = await response.json();
      setCars(data.cars || []);
    } catch (err) {
      console.error('Error loading cars:', err);
      setError(err instanceof Error ? err.message : 'Failed to load available cars');
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(amount: number): string {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Searching for available cars...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={`/booking/${params.slug}`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href={`/booking/${params.slug}`} className="text-blue-600 hover:text-blue-700">
            ← Back to Search
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Available Cars</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-600">Pickup:</span>{' '}
                <span className="font-semibold">{pickupDate ? formatDate(pickupDate) : ''} {pickupTime || '10:00'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-600">Dropoff:</span>{' '}
                <span className="font-semibold">{dropoffDate ? formatDate(dropoffDate) : ''} {dropoffTime || '10:00'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Found <span className="font-semibold text-gray-900">{cars.length}</span> available {cars.length === 1 ? 'car' : 'cars'}
          </p>
        </div>

        {/* Cars List */}
        {cars.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No cars available</h3>
            <p className="text-gray-600 mb-6">
              Sorry, there are no cars available for the selected dates and locations.
            </p>
            <Link
              href={`/booking/${params.slug}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Modify Search
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <div
                key={car.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Car Image */}
                <div className="relative h-48 bg-gray-200">
                  {car.main_photo_url ? (
                    <img
                      src={car.main_photo_url}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {car.availability.is_available && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Available
                    </div>
                  )}
                </div>

                {/* Car Details */}
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {car.make} {car.model} {car.year}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{car.category.name_el || car.category.name}</p>

                  {/* Features */}
                  <div className="flex gap-4 text-sm text-gray-600 mb-4">
                    <span>{car.category.seats} Seats</span>
                    <span>{car.category.doors} Doors</span>
                    <span className="capitalize">{car.category.transmission}</span>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Price</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(car.pricing.total_price)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatPrice(car.pricing.price_per_day)} per day × {car.pricing.rental_days} days
                      {car.pricing.location_fees > 0 && (
                        <> + {formatPrice(car.pricing.location_fees)} location fees</>
                      )}
                    </p>
                  </div>

                  {/* Book Button */}
                  <Link
                    href={`/booking/${params.slug}/book/${car.id}?pickup_date=${pickupDate}&pickup_time=${pickupTime || '10:00'}&pickup_location_id=${pickupLocationId}&dropoff_date=${dropoffDate}&dropoff_time=${dropoffTime || '10:00'}&dropoff_location_id=${dropoffLocationId}`}
                    className="mt-4 w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold block"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

