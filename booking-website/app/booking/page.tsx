'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Calendar, MapPin, Shield, Plus, CreditCard, User, Mail, Phone, FileText } from 'lucide-react';
import { supabase, type BookingCar, type ExtraOption, type InsuranceType, type Location, type OnlineBooking } from '@/lib/supabase';
import { calculateDays, formatCurrency, formatDate } from '@/lib/utils';

function BookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [car, setCar] = useState<BookingCar | null>(null);
  const [extras, setExtras] = useState<ExtraOption[]>([]);
  const [insurances, setInsurances] = useState<InsuranceType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState<string>('');
  const [customerData, setCustomerData] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    driverLicense: '',
    notes: '',
  });
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full');

  // Search params
  const carId = searchParams.get('car_id') || '';
  const pickupDate = searchParams.get('pickup_date') || '';
  const dropoffDate = searchParams.get('dropoff_date') || '';
  const pickupTime = searchParams.get('pickup_time') || '10:00';
  const dropoffTime = searchParams.get('dropoff_time') || '10:00';
  const pickupLocationId = searchParams.get('pickup_location') || '';
  const dropoffLocationId = searchParams.get('dropoff_location') || '';

  const days = calculateDays(pickupDate, dropoffDate);

  useEffect(() => {
    loadData();
  }, [carId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load car
      const { data: carData } = await supabase
        .from('booking_cars')
        .select(`
          *,
          category:car_categories(*),
          photos:car_photos(*)
        `)
        .eq('id', carId)
        .single();
      
      if (carData) setCar(carData);

      // Load extras
      const { data: extrasData } = await supabase
        .from('extra_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (extrasData) setExtras(extrasData);

      // Load insurances
      const { data: insurancesData } = await supabase
        .from('insurance_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (insurancesData) {
        setInsurances(insurancesData);
        const defaultIns = insurancesData.find(ins => ins.is_default);
        if (defaultIns) setSelectedInsurance(defaultIns.id);
      }

      // Load locations
      const { data: locationsData } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);
      
      if (locationsData) setLocations(locationsData);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate pricing
  const basePrice = 45; // TODO: Get from pricing table
  const extrasPrice = extras
    .filter(ex => selectedExtras.includes(ex.id))
    .reduce((sum, ex) => sum + (ex.is_one_time_fee ? ex.price_per_day : ex.price_per_day * days), 0);
  
  const insurancePrice = insurances.find(ins => ins.id === selectedInsurance)?.price_per_day || 0;
  
  const pickupLocation = locations.find(loc => loc.id === pickupLocationId);
  const dropoffLocation = locations.find(loc => loc.id === dropoffLocationId);
  const locationFees = (pickupLocation?.extra_pickup_fee || 0) + (dropoffLocation?.extra_delivery_fee || 0);

  const totalPrice = (basePrice * days) + extrasPrice + (insurancePrice * days) + locationFees;
  const depositAmount = totalPrice * 0.3;

  function toggleExtra(extraId: string) {
    setSelectedExtras(prev =>
      prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]
    );
  }

  async function handleSubmit() {
    // Validation
    if (!customerData.fullName || !customerData.email || !customerData.phone) {
      alert('Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία');
      return;
    }

    if (car && Number(customerData.age) < car.min_age_requirement) {
      alert(`Απαιτείται ελάχιστη ηλικία ${car.min_age_requirement} ετών για αυτό το αυτοκίνητο`);
      return;
    }

    try {
      // Create booking
      const booking: OnlineBooking = {
        customer_email: customerData.email,
        customer_full_name: customerData.fullName,
        customer_phone: customerData.phone,
        customer_age: Number(customerData.age),
        customer_driver_license: customerData.driverLicense,
        car_id: carId,
        category_id: car?.category.id || '',
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        pickup_location_id: pickupLocationId,
        dropoff_date: dropoffDate,
        dropoff_time: dropoffTime,
        dropoff_location_id: dropoffLocationId,
        base_price: basePrice * days,
        extras_price: extrasPrice,
        insurance_price: insurancePrice * days,
        location_fees: locationFees,
        total_price: totalPrice,
        selected_insurance_id: selectedInsurance,
        customer_notes: customerData.notes,
      };

      const { data, error } = await supabase
        .from('online_bookings')
        .insert(booking)
        .select()
        .single();

      if (error) throw error;

      // Insert selected extras
      if (selectedExtras.length > 0) {
        const bookingExtras = selectedExtras.map(extraId => ({
          booking_id: data.id,
          extra_id: extraId,
        }));
        await supabase.from('booking_extras').insert(bookingExtras);
      }

      // Redirect to payment
      router.push(`/payment?booking_id=${data.id}&amount=${paymentType === 'full' ? totalPrice : depositAmount}&type=${paymentType}`);

    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Υπήρξε πρόβλημα με την κράτηση. Παρακαλώ δοκιμάστε ξανά.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Το αυτοκίνητο δεν βρέθηκε</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Ολοκλήρωση Κράτησης</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User size={24} className="text-primary" />
                Στοιχεία Οδηγού
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Ονοματεπώνυμο *</label>
                  <input
                    type="text"
                    className="input"
                    value={customerData.fullName}
                    onChange={(e) => setCustomerData({ ...customerData, fullName: e.target.value })}
                    placeholder="π.χ. Γιάννης Παπαδόπουλος"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Email *</label>
                  <input
                    type="email"
                    className="input"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Τηλέφωνο *</label>
                  <input
                    type="tel"
                    className="input"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    placeholder="+30 6912345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Ηλικία *</label>
                  <input
                    type="number"
                    className="input"
                    value={customerData.age}
                    onChange={(e) => setCustomerData({ ...customerData, age: e.target.value })}
                    placeholder="π.χ. 30"
                  />
                  {car && <p className="text-xs text-gray-500 mt-1">Ελάχιστη ηλικία: {car.min_age_requirement} έτη</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Αριθμός Διπλώματος</label>
                  <input
                    type="text"
                    className="input"
                    value={customerData.driverLicense}
                    onChange={(e) => setCustomerData({ ...customerData, driverLicense: e.target.value })}
                    placeholder="π.χ. AK123456"
                  />
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield size={24} className="text-primary" />
                Ασφάλεια
              </h2>
              
              <div className="space-y-3">
                {insurances.map((ins) => (
                  <div
                    key={ins.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedInsurance === ins.id ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedInsurance(ins.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{ins.name_el}</h3>
                          {ins.badge_text && (
                            <span className="px-2 py-0.5 bg-accent text-white text-xs rounded-full">{ins.badge_text}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{ins.description_el}</p>
                        <p className="text-sm text-gray-500">Απαλλαγή: {formatCurrency(ins.deductible)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">+{formatCurrency(ins.price_per_day)}</p>
                        <p className="text-xs text-gray-500">/ημέρα</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extras */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Plus size={24} className="text-primary" />
                Πρόσθετες Επιλογές
              </h2>
              
              <div className="grid md:grid-cols-2 gap-3">
                {extras.map((extra) => (
                  <div
                    key={extra.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedExtras.includes(extra.id) ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleExtra(extra.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold mb-1">{extra.name_el}</h3>
                        <p className="text-sm text-gray-600">{extra.description_el}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {selectedExtras.includes(extra.id) && (
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary mt-2">
                      +{formatCurrency(extra.price_per_day)} {extra.is_one_time_fee ? '(εφάπαξ)' : '/ημέρα'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText size={24} className="text-primary" />
                Σχόλια (προαιρετικά)
              </h2>
              <textarea
                className="input h-24 resize-none"
                value={customerData.notes}
                onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                placeholder="Οποιαδήποτε ειδική αίτηση ή σχόλιο..."
              />
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h2 className="text-xl font-bold mb-4">Σύνοψη Κράτησης</h2>

              {/* Car */}
              <div className="mb-4 pb-4 border-b">
                {car.main_photo_url && (
                  <img src={car.main_photo_url} alt={`${car.make} ${car.model}`} className="w-full h-32 object-cover rounded-lg mb-3" />
                )}
                <h3 className="font-bold">{car.make} {car.model}</h3>
                <p className="text-sm text-gray-500">{car.category.name_el}</p>
              </div>

              {/* Dates */}
              <div className="space-y-2 mb-4 pb-4 border-b text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{formatDate(pickupDate)} - {formatDate(dropoffDate)}</span>
                </div>
                <p className="text-gray-600">{days} {days === 1 ? 'ημέρα' : 'ημέρες'}</p>
              </div>

              {/* Pricing */}
              <div className="space-y-2 mb-4 pb-4 border-b text-sm">
                <div className="flex justify-between">
                  <span>Ενοικίαση ({days} {days === 1 ? 'ημέρα' : 'ημέρες'})</span>
                  <span>{formatCurrency(basePrice * days)}</span>
                </div>
                {insurancePrice > 0 && (
                  <div className="flex justify-between">
                    <span>Ασφάλεια ({days} {days === 1 ? 'ημέρα' : 'ημέρες'})</span>
                    <span>{formatCurrency(insurancePrice * days)}</span>
                  </div>
                )}
                {extrasPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Πρόσθετα</span>
                    <span>{formatCurrency(extrasPrice)}</span>
                  </div>
                )}
                {locationFees > 0 && (
                  <div className="flex justify-between">
                    <span>Τέλη τοποθεσίας</span>
                    <span>{formatCurrency(locationFees)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="mb-6">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Σύνολο</span>
                  <span className="text-primary">{formatCurrency(totalPrice)}</span>
                </div>
              </div>

              {/* Payment Type */}
              <div className="mb-6">
                <h3 className="font-bold mb-3">Τρόπος Πληρωμής</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary">
                    <input
                      type="radio"
                      name="payment_type"
                      checked={paymentType === 'full'}
                      onChange={() => setPaymentType('full')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-semibold">Πλήρης Πληρωμή</p>
                      <p className="text-sm text-gray-600">{formatCurrency(totalPrice)}</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary">
                    <input
                      type="radio"
                      name="payment_type"
                      checked={paymentType === 'deposit'}
                      onChange={() => setPaymentType('deposit')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-semibold">Προκαταβολή 30%</p>
                      <p className="text-sm text-gray-600">{formatCurrency(depositAmount)}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} className="btn btn-primary w-full py-4 flex items-center justify-center gap-2">
                <CreditCard size={20} />
                Συνέχεια στην Πληρωμή
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Ασφαλής πληρωμή με κρυπτογράφηση SSL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingPageContent />
    </Suspense>
  );
}

