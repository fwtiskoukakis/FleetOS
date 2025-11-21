'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { supabase, type Location } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchData, setSearchData] = useState({
    pickupLocation: '',
    pickupDate: '',
    pickupTime: '10:00',
    dropoffLocation: '',
    dropoffDate: '',
    dropoffTime: '10:00',
    differentDropoff: false,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (data && data.length > 0) {
      setLocations(data);
      setSearchData(prev => ({
        ...prev,
        pickupLocation: data[0].id,
        dropoffLocation: data[0].id,
      }));
    }
  }

  function handleSearch() {
    if (!searchData.pickupLocation || !searchData.pickupDate || !searchData.dropoffDate) {
      alert('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }

    const params = new URLSearchParams({
      pickup_location: searchData.pickupLocation,
      pickup_date: searchData.pickupDate,
      pickup_time: searchData.pickupTime,
      dropoff_location: searchData.differentDropoff ? searchData.dropoffLocation : searchData.pickupLocation,
      dropoff_date: searchData.dropoffDate,
      dropoff_time: searchData.dropoffTime,
    });

    router.push(`/cars?${params.toString()}`);
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image/Video */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTItMTItNS4zNzMtMTItMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-slide-up">
              Κλείστε το Αυτοκίνητό σας
            </h1>
            <p className="text-xl md:text-2xl text-white/90 animate-slide-up animation-delay-200">
              Online σε 2 λεπτά • Καλύτερες τιμές • Άμεση επιβεβαίωση
            </p>
          </div>

          {/* Search Form */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-slide-up animation-delay-400">
              {/* Pickup Location */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin size={18} className="text-primary" />
                    Τοποθεσία Παραλαβής
                  </label>
                  <select
                    className="input"
                    value={searchData.pickupLocation}
                    onChange={(e) => setSearchData({ ...searchData, pickupLocation: e.target.value })}
                  >
                    <option value="">Επιλέξτε τοποθεσία</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name_el}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={18} className="text-primary" />
                    Ημερομηνία Παραλαβής
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="input flex-1"
                      value={searchData.pickupDate}
                      onChange={(e) => setSearchData({ ...searchData, pickupDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="input w-32"
                      value={searchData.pickupTime}
                      onChange={(e) => setSearchData({ ...searchData, pickupTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Different Dropoff Location */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                    checked={searchData.differentDropoff}
                    onChange={(e) => setSearchData({ ...searchData, differentDropoff: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Διαφορετική τοποθεσία παράδοσης
                  </span>
                </label>
              </div>

              {/* Dropoff */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {searchData.differentDropoff && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin size={18} className="text-secondary" />
                      Τοποθεσία Παράδοσης
                    </label>
                    <select
                      className="input"
                      value={searchData.dropoffLocation}
                      onChange={(e) => setSearchData({ ...searchData, dropoffLocation: e.target.value })}
                    >
                      <option value="">Επιλέξτε τοποθεσία</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name_el}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={searchData.differentDropoff ? '' : 'md:col-span-2'}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={18} className="text-secondary" />
                    Ημερομηνία Παράδοσης
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="input flex-1"
                      value={searchData.dropoffDate}
                      onChange={(e) => setSearchData({ ...searchData, dropoffDate: e.target.value })}
                      min={searchData.pickupDate || new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="input w-32"
                      value={searchData.dropoffTime}
                      onChange={(e) => setSearchData({ ...searchData, dropoffTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                className="btn btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 group"
              >
                🔍 Αναζήτηση Αυτοκινήτων
                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Γιατί να Κλείσετε Μαζί μας;</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">Γρήγορη Κράτηση</h3>
              <p className="text-gray-600">
                Ολοκληρώστε την κράτησή σας σε λιγότερο από 2 λεπτά
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">Καλύτερες Τιμές</h3>
              <p className="text-gray-600">
                Ανταγωνιστικές τιμές και διαφάνεια χωρίς κρυφές χρεώσεις
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">Άμεση Επιβεβαίωση</h3>
              <p className="text-gray-600">
                Λάβετε email επιβεβαίωσης αμέσως με όλα τα στοιχεία
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

