'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Calendar, MapPin, Car, Mail, Phone, Download, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, formatCurrency } from '@/lib/utils';

function ConfirmationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [car, setCar] = useState<any>(null);
  const [locations, setLocations] = useState<any>({ pickup: null, dropoff: null });

  const bookingId = searchParams.get('booking_id') || '';
  const paymentMethod = searchParams.get('payment_method') || 'card';

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  async function loadBookingDetails() {
    if (!bookingId) return;

    try {
      // Load booking
      const { data: bookingData } = await supabase
        .from('online_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingData) {
        setBooking(bookingData);

        // Load car
        const { data: carData } = await supabase
          .from('booking_cars')
          .select('*, category:car_categories(*)')
          .eq('id', bookingData.car_id)
          .single();

        if (carData) setCar(carData);

        // Load locations
        const { data: pickupLoc } = await supabase
          .from('locations')
          .select('*')
          .eq('id', bookingData.pickup_location_id)
          .single();

        const { data: dropoffLoc } = await supabase
          .from('locations')
          .select('*')
          .eq('id', bookingData.dropoff_location_id)
          .single();

        setLocations({ pickup: pickupLoc, dropoff: dropoffLoc });
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    }
  }

  if (!booking || !car) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Success Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle size={60} className="text-green-600" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Η κράτησή σας ολοκληρώθηκε!</h1>
          <p className="text-xl text-gray-600">Κωδικός κράτησης: <span className="font-bold text-primary">#{booking.booking_number}</span></p>
        </div>

        {/* Confirmation Card */}
        <div className="card mb-6 animate-slide-up">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold mb-2">Στοιχεία Κράτησης</h2>
            <p className="text-gray-600">
              Έχετε λάβει email επιβεβαίωσης στο <strong>{booking.customer_email}</strong>
            </p>
          </div>

          {/* Car Info */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center gap-4 mb-4">
              <Car size={24} className="text-primary" />
              <div>
                <h3 className="font-bold text-lg">{car.make} {car.model}</h3>
                <p className="text-gray-600">{car.category.name_el}</p>
              </div>
            </div>
            {car.main_photo_url && (
              <img src={car.main_photo_url} alt={`${car.make} ${car.model}`} className="w-full h-48 object-cover rounded-lg" />
            )}
          </div>

          {/* Dates & Locations */}
          <div className="grid md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={20} className="text-green-600" />
                <h4 className="font-bold">Παραλαβή</h4>
              </div>
              <p className="text-gray-700 mb-1">
                {formatDate(booking.pickup_date)} στις {booking.pickup_time}
              </p>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 mt-1" />
                <div>
                  <p className="font-semibold">{locations.pickup?.name_el}</p>
                  <p className="text-sm text-gray-600">{locations.pickup?.address}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={20} className="text-red-600" />
                <h4 className="font-bold">Παράδοση</h4>
              </div>
              <p className="text-gray-700 mb-1">
                {formatDate(booking.dropoff_date)} στις {booking.dropoff_time}
              </p>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 mt-1" />
                <div>
                  <p className="font-semibold">{locations.dropoff?.name_el}</p>
                  <p className="text-sm text-gray-600">{locations.dropoff?.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-bold mb-3">Στοιχεία Οδηγού</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">Όνομα:</span>
                <span>{booking.customer_full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                <span className="font-semibold w-24">Email:</span>
                <span>{booking.customer_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <span className="font-semibold w-24">Τηλέφωνο:</span>
                <span>{booking.customer_phone}</span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-6">
            <h3 className="font-bold mb-3">Κόστος</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ενοικίαση</span>
                <span>{formatCurrency(booking.base_price)}</span>
              </div>
              {booking.insurance_price > 0 && (
                <div className="flex justify-between">
                  <span>Ασφάλεια</span>
                  <span>{formatCurrency(booking.insurance_price)}</span>
                </div>
              )}
              {booking.extras_price > 0 && (
                <div className="flex justify-between">
                  <span>Πρόσθετα</span>
                  <span>{formatCurrency(booking.extras_price)}</span>
                </div>
              )}
              {booking.location_fees > 0 && (
                <div className="flex justify-between">
                  <span>Τέλη τοποθεσίας</span>
                  <span>{formatCurrency(booking.location_fees)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-primary pt-3 border-t">
                <span>Σύνολο</span>
                <span>{formatCurrency(booking.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className={`p-4 rounded-lg ${booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <p className="font-semibold">
              {booking.payment_status === 'paid' ? '✓ Η πληρωμή ολοκληρώθηκε' : '⏳ Εκκρεμής πληρωμή'}
            </p>
            {paymentMethod === 'bank' && (
              <p className="text-sm mt-2">
                Παρακαλούμε πραγματοποιήστε την κατάθεση και στείλτε το αποδεικτικό στο email που λάβατε.
              </p>
            )}
            {paymentMethod === 'cash' && (
              <p className="text-sm mt-2">
                Η πληρωμή θα πραγματοποιηθεί κατά την παραλαβή του οχήματος.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="btn btn-outline flex-1 py-3 flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Εκτύπωση / Αποθήκευση PDF
          </button>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Επιστροφή στην Αρχική
          </button>
        </div>

        {/* Next Steps */}
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm">
          <h3 className="font-bold text-lg mb-4">Επόμενα Βήματα</h3>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <p>Θα λάβετε email επιβεβαίωσης με όλες τις λεπτομέρειες της κράτησης</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <p>Φέρτε μαζί σας το δίπλωμα οδήγησής σας και ταυτότητα/διαβατήριο</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <p>Παρουσιαστείτε στο σημείο παραλαβής την ημερομηνία και ώρα που επιλέξατε</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <p>Για οποιαδήποτε ερώτηση, επικοινωνήστε μαζί μας μέσω email ή τηλεφώνου</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationPageContent />
    </Suspense>
  );
}

