'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Car, Calendar, MapPin, Clock, Euro, CheckCircle, AlertCircle, 
  User, Mail, Phone, CreditCard, Shield, Plus, Minus, FileText,
  ArrowLeft, ArrowRight
} from 'lucide-react';

interface CarDetails {
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
  min_age_requirement?: number;
  min_license_years?: number;
}

interface Extra {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  price_per_day: number;
  is_one_time_fee: boolean;
  icon_name?: string;
}

interface Insurance {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  price_per_day: number;
  is_default: boolean;
}

export default function BookingFormPage({ 
  params 
}: { 
  params: Promise<{ slug: string; carId: string }> 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [car, setCar] = useState<CarDetails | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [insuranceTypes, setInsuranceTypes] = useState<Insurance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [routeParams, setRouteParams] = useState<{ slug: string; carId: string } | null>(null);

  // Search params
  const pickupDate = searchParams.get('pickup_date') || '';
  const pickupTime = searchParams.get('pickup_time') || '10:00';
  const pickupLocationId = searchParams.get('pickup_location_id') || '';
  const dropoffDate = searchParams.get('dropoff_date') || '';
  const dropoffTime = searchParams.get('dropoff_time') || '10:00';
  const dropoffLocationId = searchParams.get('dropoff_location_id') || '';

  // Form state
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [selectedInsurance, setSelectedInsurance] = useState<string>('');
  const [pricingBreakdown, setPricingBreakdown] = useState<any>(null);

  // Customer Information (Complete Contract Data)
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [customerDriverLicense, setCustomerDriverLicense] = useState('');
  const [customerDateOfBirth, setCustomerDateOfBirth] = useState('');
  const [customerDriverLicenseIssueDate, setCustomerDriverLicenseIssueDate] = useState('');
  const [customerDriverLicenseExpiryDate, setCustomerDriverLicenseExpiryDate] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerCountry, setCustomerCountry] = useState('Greece');

  // Optional fields
  const [flightNumber, setFlightNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Payment
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string; name_el: string; provider: string; is_active: boolean }>>([]);

  // Terms
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [confirmAge, setConfirmAge] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then(resolved => {
      setRouteParams(resolved);
    });
  }, [params]);

  useEffect(() => {
    if (!routeParams) return;
    if (!pickupDate || !dropoffDate || !pickupLocationId || !dropoffLocationId) {
      setError('Missing required search parameters');
      setLoading(false);
      return;
    }
    loadCarDetails();
    loadPaymentMethods();
  }, [routeParams?.carId, routeParams?.slug, pickupDate, dropoffDate, pickupLocationId, dropoffLocationId]);

  async function loadPaymentMethods() {
    if (!routeParams) return;
    try {
      const response = await fetch(`/api/v1/organizations/${routeParams.slug}/payment-methods`);
      
      if (response.ok) {
        const data = await response.json();
        const activeMethods = (data.payment_methods || []).filter((pm: any) => pm.is_active && pm.provider !== 'cash');
        setPaymentMethods(activeMethods);
        // Auto-select first payment method if available
        if (activeMethods.length > 0 && !paymentMethodId) {
          setPaymentMethodId(activeMethods[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    }
  }

  useEffect(() => {
    if (car && pricingBreakdown) {
      calculatePricing();
    }
  }, [selectedExtras, selectedInsurance, car, extras, insuranceTypes, pricingBreakdown]);

  async function loadCarDetails() {
    if (!routeParams) return;
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`/api/v1/organizations/${routeParams.slug}/cars/${routeParams.carId}`, window.location.origin);
      url.searchParams.set('pickup_date', pickupDate);
      url.searchParams.set('dropoff_date', dropoffDate);
      if (pickupLocationId) url.searchParams.set('pickup_location_id', pickupLocationId);
      if (dropoffLocationId) url.searchParams.set('dropoff_location_id', dropoffLocationId);
      
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load car details');
      }

      const data = await response.json();
      setCar(data.car);
      setExtras(data.extras || []);
      setInsuranceTypes(data.insurance_types || []);
      
      // Set pricing breakdown with initial values
      if (data.pricing_breakdown) {
        setPricingBreakdown({
          ...data.pricing_breakdown,
          extras_price: 0,
          insurance_price: 0,
          subtotal: data.pricing_breakdown.base_price + data.pricing_breakdown.location_fees,
          vat: (data.pricing_breakdown.base_price + data.pricing_breakdown.location_fees) * 0.24,
          total: (data.pricing_breakdown.base_price + data.pricing_breakdown.location_fees) * 1.24,
        });
      }

      // Set default insurance
      const defaultInsurance = data.insurance_types?.find((ins: Insurance) => ins.is_default);
      if (defaultInsurance) {
        setSelectedInsurance(defaultInsurance.id);
      }
    } catch (err) {
      console.error('Error loading car details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load car details');
    } finally {
      setLoading(false);
    }
  }

  function calculatePricing() {
    if (!car || !pricingBreakdown) return;

    const rentalDays = pricingBreakdown.rental_days || 1;
    const basePrice = pricingBreakdown.base_price || 0;
    const locationFees = pricingBreakdown.location_fees || 0;
    let extrasPrice = 0;
    let insurancePrice = 0;

    // Calculate extras
    Object.entries(selectedExtras).forEach(([extraId, quantity]) => {
      if (quantity > 0) {
        const extra = extras.find(e => e.id === extraId);
        if (extra) {
          const extraPrice = parseFloat(extra.price_per_day?.toString() || '0');
          if (extra.is_one_time_fee) {
            extrasPrice += extraPrice * quantity;
          } else {
            extrasPrice += extraPrice * rentalDays * quantity;
          }
        }
      }
    });

    // Calculate insurance
    if (selectedInsurance) {
      const insurance = insuranceTypes.find(i => i.id === selectedInsurance);
      if (insurance) {
        const insurancePricePerDay = parseFloat(insurance.price_per_day?.toString() || '0');
        insurancePrice = insurancePricePerDay * rentalDays;
      }
    }

    const subtotal = basePrice + extrasPrice + insurancePrice + locationFees;
    const vat = subtotal * 0.24; // 24% VAT for Greece
    const total = subtotal + vat;

    setPricingBreakdown({
      ...pricingBreakdown,
      extras_price: extrasPrice,
      insurance_price: insurancePrice,
      subtotal,
      vat,
      total,
    });
  }

  function handleExtraToggle(extraId: string) {
    setSelectedExtras(prev => {
      const current = prev[extraId] || 0;
      return { ...prev, [extraId]: current > 0 ? 0 : 1 };
    });
  }

  function handleExtraQuantityChange(extraId: string, delta: number) {
    setSelectedExtras(prev => {
      const current = prev[extraId] || 0;
      const newQuantity = Math.max(0, current + delta);
      return { ...prev, [extraId]: newQuantity };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!customerFullName || !customerEmail || !customerPhone) {
      setError('Please fill in all required customer information');
      return;
    }

    if (!agreeTerms || !agreePrivacy || !confirmAge) {
      setError('Please accept all terms and confirmations');
      return;
    }

    // Calculate age from date of birth
    let customerAge: number | undefined;
    if (customerDateOfBirth) {
      const birthDate = new Date(customerDateOfBirth);
      const today = new Date();
      customerAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        customerAge--;
      }
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare selected extras array
      const selectedExtrasArray = Object.entries(selectedExtras)
        .filter(([_, quantity]) => quantity > 0)
        .map(([extra_id, quantity]) => ({ extra_id, quantity }));

      if (!routeParams) return;
      const response = await fetch(`/api/v1/organizations/${routeParams.slug}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          car_id: routeParams.carId,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
          pickup_location_id: pickupLocationId,
          dropoff_date: dropoffDate,
          dropoff_time: dropoffTime,
          dropoff_location_id: dropoffLocationId,
          // Customer Information
          customer_full_name: customerFullName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_id_number: customerIdNumber || null,
          customer_driver_license: customerDriverLicense || null,
          customer_age: customerAge,
          customer_address: customerAddress || null,
          customer_city: customerCity || null,
          customer_country: customerCountry,
          customer_date_of_birth: customerDateOfBirth || null,
          customer_driver_license_issue_date: customerDriverLicenseIssueDate || null,
          customer_driver_license_expiry_date: customerDriverLicenseExpiryDate || null,
          customer_tax_id: customerTaxId || null,
          // Extras & Insurance
          selected_extras: selectedExtrasArray,
          selected_insurance_id: selectedInsurance || null,
          // Payment
          payment_method_id: paymentMethodId || null,
          // Special Requirements
          flight_number: flightNumber || null,
          special_requests: specialRequests || null,
          customer_notes: customerNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const data = await response.json();

      // Redirect to payment or confirmation
      if (data.payment_url) {
        router.push(data.payment_url);
      } else {
        router.push(`/booking/${routeParams.slug}/confirmation/${data.booking.id}`);
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSaving(false);
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
          <p className="mt-4 text-gray-600">Loading booking form...</p>
        </div>
      </div>
    );
  }

  if (error && !car) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={routeParams ? `/booking/${routeParams.slug}` : '#'}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  if (!car) return null;

  const rentalDays = pricingBreakdown?.rental_days || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href={routeParams ? `/booking/${routeParams.slug}/search?pickup_date=${pickupDate}&pickup_time=${pickupTime}&pickup_location_id=${pickupLocationId}&dropoff_date=${dropoffDate}&dropoff_time=${dropoffTime}&dropoff_location_id=${dropoffLocationId}` : '#'}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rental Details Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Rental Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Car className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Vehicle</p>
                  <p className="font-semibold text-gray-900">{car.make} {car.model} {car.year}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Rental Period</p>
                  <p className="font-semibold text-gray-900">{rentalDays} days</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Pickup</p>
                  <p className="font-semibold text-gray-900">
                    {pickupDate ? formatDate(pickupDate) : ''} {pickupTime}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Dropoff</p>
                  <p className="font-semibold text-gray-900">
                    {dropoffDate ? formatDate(dropoffDate) : ''} {dropoffTime}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Extras Selection */}
          {extras.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Options</h2>
              <div className="space-y-3">
                {extras.map((extra) => {
                  const quantity = selectedExtras[extra.id] || 0;
                  const extraPrice = extra.is_one_time_fee
                    ? parseFloat(extra.price_per_day.toString())
                    : parseFloat(extra.price_per_day.toString()) * rentalDays;
                  const totalExtraPrice = extraPrice * quantity;

                  return (
                    <div
                      key={extra.id}
                      className={`border rounded-lg p-4 ${
                        quantity > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {extra.name_el || extra.name}
                          </h3>
                          {extra.description && (
                            <p className="text-sm text-gray-600 mt-1">{extra.description}</p>
                          )}
                          <p className="text-sm font-semibold text-gray-900 mt-2">
                            {formatPrice(extraPrice)} {extra.is_one_time_fee ? '(one-time)' : 'per day'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {quantity > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleExtraQuantityChange(extra.id, -1)}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-semibold">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleExtraQuantityChange(extra.id, 1)}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleExtraToggle(extra.id)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                              quantity > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {quantity > 0 ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      </div>
                      {quantity > 0 && (
                        <p className="text-sm text-gray-600 mt-2">
                          Total: {formatPrice(totalExtraPrice)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Insurance Selection */}
          {insuranceTypes.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Insurance Coverage
              </h2>
              <div className="space-y-3">
                {insuranceTypes.map((insurance) => {
                  const insurancePrice = parseFloat(insurance.price_per_day.toString()) * rentalDays;
                  const isSelected = selectedInsurance === insurance.id;

                  return (
                    <label
                      key={insurance.id}
                      className={`block border rounded-lg p-4 cursor-pointer ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="insurance"
                          value={insurance.id}
                          checked={isSelected}
                          onChange={(e) => setSelectedInsurance(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {insurance.name_el || insurance.name}
                          </h3>
                          {insurance.description && (
                            <p className="text-sm text-gray-600 mt-1">{insurance.description}</p>
                          )}
                          <p className="text-sm font-semibold text-gray-900 mt-2">
                            {formatPrice(insurancePrice)} total
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Information (Complete Contract Data) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerFullName}
                  onChange={(e) => setCustomerFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={customerDateOfBirth}
                  onChange={(e) => setCustomerDateOfBirth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID (ΑΦΜ)
                </label>
                <input
                  type="text"
                  value={customerTaxId}
                  onChange={(e) => setCustomerTaxId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number / Passport
                </label>
                <input
                  type="text"
                  value={customerIdNumber}
                  onChange={(e) => setCustomerIdNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver's License Number
                </label>
                <input
                  type="text"
                  value={customerDriverLicense}
                  onChange={(e) => setCustomerDriverLicense(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Issue Date
                </label>
                <input
                  type="date"
                  value={customerDriverLicenseIssueDate}
                  onChange={(e) => setCustomerDriverLicenseIssueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Expiry Date
                </label>
                <input
                  type="date"
                  value={customerDriverLicenseExpiryDate}
                  onChange={(e) => setCustomerDriverLicenseExpiryDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={customerCountry}
                  onChange={(e) => setCustomerCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flight Number (Optional)
                </label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Select your preferred payment method. Payment will be processed on the next step.
            </p>
            {paymentMethods.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No payment methods available. Please contact support.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentMethodId === method.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={method.id}
                      checked={paymentMethodId === method.id}
                      onChange={() => setPaymentMethodId(method.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{method.name_el || method.name}</span>
                      <p className="text-xs text-gray-500 mt-1">
                        {method.provider === 'stripe' && 'Pay securely with credit/debit card'}
                        {method.provider === 'viva_wallet' && 'Pay with Viva Wallet'}
                        {method.provider === 'bank_transfer' && 'Transfer funds directly to our bank account'}
                        {method.provider === 'paypal' && 'Pay with PayPal'}
                        {method.provider === 'revolut' && 'Pay with Revolut'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Terms & Conditions</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a> <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a> <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmAge}
                  onChange={(e) => setConfirmAge(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">
                  I confirm I am 18 years or older <span className="text-red-500">*</span>
                </span>
              </label>
            </div>
          </div>

          {/* Total Price Breakdown */}
          {pricingBreakdown && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Price Breakdown</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Base Price</span>
                  <span>{formatPrice(pricingBreakdown.base_price)}</span>
                </div>
                {pricingBreakdown.extras_price > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Extras</span>
                    <span>{formatPrice(pricingBreakdown.extras_price)}</span>
                  </div>
                )}
                {pricingBreakdown.insurance_price > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Insurance</span>
                    <span>{formatPrice(pricingBreakdown.insurance_price)}</span>
                  </div>
                )}
                {pricingBreakdown.location_fees > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Location Fees</span>
                    <span>{formatPrice(pricingBreakdown.location_fees)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-200">
                  <span>Subtotal</span>
                  <span>{formatPrice(pricingBreakdown.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT (24%)</span>
                  <span>{formatPrice(pricingBreakdown.vat || 0)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                  <span>Total</span>
                  <span>{formatPrice(pricingBreakdown.total || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href={routeParams ? `/booking/${routeParams.slug}/search?pickup_date=${pickupDate}&pickup_time=${pickupTime}&pickup_location_id=${pickupLocationId}&dropoff_date=${dropoffDate}&dropoff_time=${dropoffTime}&dropoff_location_id=${dropoffLocationId}` : '#'}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

