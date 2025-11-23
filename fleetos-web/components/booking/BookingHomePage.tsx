'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Clock, ChevronRight, Car } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { createClientComponentClient } from '@/lib/supabase';
import type { Organization, Location, BookingDesignSettings } from '@/lib/supabase';

interface BookingHomePageProps {
  organization: Organization;
  designSettings: BookingDesignSettings | null;
  locations: Location[];
}

export default function BookingHomePage({ 
  organization, 
  designSettings, 
  locations 
}: BookingHomePageProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [searchData, setSearchData] = useState({
    pickupLocation: locations[0]?.id || '',
    pickupDate: '',
    pickupTime: '10:00',
    dropoffLocation: locations[0]?.id || '',
    dropoffDate: '',
    dropoffTime: '10:00',
    differentDropoff: false,
  });

  useEffect(() => {
    if (locations.length > 0) {
      setSearchData(prev => ({
        ...prev,
        pickupLocation: locations[0].id,
        dropoffLocation: locations[0].id,
      }));
    }
  }, [locations]);

  function handleSearch() {
    if (!searchData.pickupLocation || !searchData.pickupDate || !searchData.dropoffDate) {
      alert('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }

    const params = new URLSearchParams({
      pickup_date: searchData.pickupDate,
      pickup_time: searchData.pickupTime,
      pickup_location_id: searchData.pickupLocation,
      dropoff_date: searchData.dropoffDate,
      dropoff_time: searchData.dropoffTime,
      dropoff_location_id: searchData.differentDropoff ? searchData.dropoffLocation : searchData.pickupLocation,
    });

    router.push(`/booking/${organization.slug}/search?${params.toString()}`);
  }

  const primaryColor = designSettings?.primary_color || organization.brand_color_primary || '#2563eb';
  const companyName = designSettings?.company_name_el || organization.trading_name || organization.company_name;

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Company Branding */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {organization.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt={companyName}
                className="h-12 object-contain"
              />
            ) : (
              <FleetOSLogo variant="horizontal-light" size={140} showText={true} />
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="py-20 px-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Κλείστε το Αυτοκίνητό σας
            </h1>
            <p className="text-xl text-gray-600">
              Επιλέξτε ημερομηνία και τοποθεσία παραλαβής
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="space-y-6">
              {/* Pickup Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Τοποθεσία Παραλαβής
                </label>
                <select
                  value={searchData.pickupLocation}
                  onChange={(e) => setSearchData({ ...searchData, pickupLocation: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name_el}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pickup Date & Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Ημερομηνία Παραλαβής
                  </label>
                  <input
                    type="date"
                    value={searchData.pickupDate}
                    onChange={(e) => setSearchData({ ...searchData, pickupDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Ώρα Παραλαβής
                  </label>
                  <input
                    type="time"
                    value={searchData.pickupTime}
                    onChange={(e) => setSearchData({ ...searchData, pickupTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Different Dropoff Location Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="differentDropoff"
                  checked={searchData.differentDropoff}
                  onChange={(e) => setSearchData({ ...searchData, differentDropoff: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="differentDropoff" className="text-sm font-medium text-gray-700">
                  Διαφορετική τοποθεσία παράδοσης
                </label>
              </div>

              {/* Dropoff Location (if different) */}
              {searchData.differentDropoff && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Τοποθεσία Παράδοσης
                  </label>
                  <select
                    value={searchData.dropoffLocation}
                    onChange={(e) => setSearchData({ ...searchData, dropoffLocation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name_el}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dropoff Date & Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Ημερομηνία Παράδοσης
                  </label>
                  <input
                    type="date"
                    value={searchData.dropoffDate}
                    onChange={(e) => setSearchData({ ...searchData, dropoffDate: e.target.value })}
                    min={searchData.pickupDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Ώρα Παράδοσης
                  </label>
                  <input
                    type="time"
                    value={searchData.dropoffTime}
                    onChange={(e) => setSearchData({ ...searchData, dropoffTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 w-full py-4 text-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                Αναζήτηση Οχημάτων
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Γιατί να Κλείσετε Μαζί μας;</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Γρήγορη Κράτηση</h3>
              <p className="text-gray-600">
                Ολοκληρώστε την κράτησή σας σε λιγότερο από 2 λεπτά
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ευρεία Ποικιλία</h3>
              <p className="text-gray-600">
                Από οικονομικά μέχρι πολυτελή οχήματα
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ευέλικτες Τοποθεσίες</h3>
              <p className="text-gray-600">
                Παραλάβετε και παραδώστε όπου σας βολεύει
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Company Info */}
            <div>
              <h4 className="font-semibold text-white mb-3">About {companyName}</h4>
              <p className="text-sm">
                Professional vehicle rental services. Book online with confidence.
              </p>
            </div>
            
            {/* Contact Information */}
            <div>
              <h4 className="font-semibold text-white mb-3">Customer Service</h4>
              <ul className="space-y-2 text-sm">
                {organization.phone_primary && (
                  <li>
                    <strong>Phone:</strong> <a href={`tel:${organization.phone_primary}`} className="hover:text-white">{organization.phone_primary}</a>
                  </li>
                )}
                {organization.email && (
                  <li>
                    <strong>Email:</strong> <a href={`mailto:${organization.email}`} className="hover:text-white">{organization.email}</a>
                  </li>
                )}
                {!organization.email && (
                  <li>
                    <strong>Email:</strong> <a href="mailto:support@fleetos.eu" className="hover:text-white">support@fleetos.eu</a>
                  </li>
                )}
                <li>
                  <strong>Hours:</strong> Mon-Fri 9:00-18:00, Sat 10:00-15:00 (Greek Time)
                </li>
              </ul>
            </div>
            
            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/terms" className="hover:text-white">Terms & Conditions</Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 text-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

