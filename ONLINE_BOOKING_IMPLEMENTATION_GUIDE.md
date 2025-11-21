# 🚗 Online Booking System - Implementation Guide

## ✅ Completed Components

### 1. Database Schema
- ✅ Complete SQL schema created in `supabase/online-booking-schema.sql`
- ✅ All tables, indexes, RLS policies, and functions defined
- ✅ Ready to deploy to Supabase

### 2. Admin Interface (FleetOS)
- ✅ Book Online tab added to bottom navigation
- ✅ Main menu screen with all management options
- ✅ Locations Management screen (full CRUD)
- ✅ Car Categories Management screen (full CRUD)

---

## 📋 Remaining Admin Screens to Build

### 3. Cars Management (`app/book-online/cars.tsx`)
**Purpose:** Manage individual cars for booking system

**Features:**
- List all booking cars with category badges
- Add/Edit car details (make, model, year, license plate)
- Upload multiple photos per car (drag & drop)
- Set main photo
- Reorder photos
- Toggle availability for online booking
- Mark cars as "featured"
- Link to existing fleet cars (optional)

**UI Components Needed:**
- Photo gallery component
- Image picker with multi-select
- Drag-to-reorder photos
- Car form with category dropdown

### 4. Pricing Calendar (`app/book-online/pricing.tsx`)
**Purpose:** Visual calendar for bulk price management

**Features:**
- Month/Week/Day view switcher
- **Drag-to-select date ranges**
- Set price for selected dates
- Category-wide pricing (applies to all cars in category)
- Individual car pricing overrides
- Color-coded pricing visualization
- Quick actions:
  - Copy from previous period
  - Seasonal templates (high/low season)
  - Bulk increase/decrease by percentage

**UI Components Needed:**
- Custom calendar component
- Drag selection handler
- Price input modal
- Category/car filter dropdown

**Implementation Tips:**
```typescript
// Example: Drag selection state
const [selectionStart, setSelectionStart] = useState<Date | null>(null);
const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
const [isDragging, setIsDragging] = useState(false);

// On drag start
onPressIn={(date) => {
  setSelectionStart(date);
  setIsDragging(true);
}}

// On drag move
onPressMove={(date) => {
  if (isDragging) {
    setSelectionEnd(date);
  }
}}

// On drag end
onPressOut={() => {
  setIsDragging(false);
  openPriceModal(selectionStart, selectionEnd);
}}
```

### 5. Extra Options Management (`app/book-online/extras.tsx`)
**Purpose:** Manage additional services/products

**Features:**
- List all extras (GPS, child seat, additional driver, etc.)
- Add/Edit extras
- Set price per day or one-time fee
- Icon selection
- Multi-language names and descriptions (EN/GR)
- Enable/disable extras
- Inventory tracking (optional - for limited quantity items)

**Example Extras:**
- GPS Navigation (+€5/day)
- Child Seat (+€3/day)
- Additional Driver (+€10 one-time)
- Full Insurance Upgrade (+€15/day)
- Wi-Fi Hotspot (+€4/day)
- Snow Chains (+€20 one-time)

### 6. Insurance Types Management (`app/book-online/insurance.tsx`)
**Purpose:** Configure insurance options

**Features:**
- List insurance types
- Add/Edit insurance details
- Set deductible (απαλλαγή)
- Coverage amount
- Coverage options (theft, glass, tires, undercarriage)
- Price per day
- Badge text (e.g., "RECOMMENDED", "BEST VALUE")
- Set default insurance

**Example Insurance Types:**
- Basic (included): €500 deductible
- Standard: €200 deductible (+€10/day)
- Premium: €0 deductible (+€20/day)

### 7. Payment Methods Configuration (`app/book-online/payment-methods.tsx`)
**Purpose:** Configure payment gateways

**Features:**
- List payment methods
- Enable/disable methods
- Configure provider settings:
  - Stripe (API keys)
  - Viva Wallet (merchant ID, API key)
  - PayPal (client ID, secret)
  - Bank Transfer (account details)
- Set deposit percentage (default 30%)
- Minimum deposit amount
- Display order

**Security Note:**
- API keys should be encrypted before storing in database
- Use Supabase Edge Functions to handle sensitive payment operations
- Never expose API keys to client-side code

### 8. Online Bookings List (`app/book-online/bookings.tsx`)
**Purpose:** View and manage customer bookings

**Features:**
- List all online bookings
- Filter by:
  - Status (pending, confirmed, completed, cancelled)
  - Payment status
  - Date range
  - Car
- Search by customer name/email/phone
- View booking details
- Actions:
  - **Convert to Contract** (creates full rental contract)
  - Confirm booking
  - Cancel booking
  - Send confirmation email
  - View payment transactions
  - Add admin notes

**Booking Detail View:**
- Customer information
- Car details
- Pickup/dropoff dates and locations
- Selected extras
- Insurance selection
- Payment breakdown
- Transaction history
- Status timeline

### 9. Design Settings (`app/book-online/design.tsx`)
**Purpose:** Customize booking website appearance

**Features:**
- **Brand Colors:**
  - Primary color (main brand color)
  - Secondary color (success, "go")
  - Accent color (call-to-action)
  - Background color
  - Text color
  
- **Logo & Branding:**
  - Logo upload (light version)
  - Logo dark upload (for dark backgrounds)
  - Favicon
  - Background hero image

- **Company Info:**
  - Company name (EN/GR)
  - Tagline
  - Description
  - Contact email, phone, WhatsApp
  - Address

- **Social Media:**
  - Facebook, Instagram, Twitter, LinkedIn URLs

- **Terms & Policies:**
  - Terms and conditions (EN/GR)
  - Privacy policy (EN/GR)
  - Cancellation policy (EN/GR)

- **Feature Toggles:**
  - Allow instant booking (vs. require approval)
  - Show prices without VAT
  - Enable reviews
  - Enable loyalty program
  - Minimum booking hours (e.g., 24h before pickup)
  - Maximum booking days in advance

- **SEO Settings:**
  - Meta title
  - Meta description
  - Meta keywords

### 10. Booking Analytics (`app/book-online/analytics.tsx`)
**Purpose:** Dashboard with booking statistics

**Charts & Metrics:**
- **Total Bookings:** Count by month/week
- **Revenue:** Total revenue from online bookings
- **Conversion Rate:** Visits → Bookings
- **Average Booking Value**
- **Most Popular Cars**
- **Most Popular Extras**
- **Peak Booking Times**
- **Location Distribution**
- **Booking Source** (if tracking UTM params)

**Implementation:**
- Use react-native-chart-kit or Victory Native for charts
- Calculate metrics from `online_bookings` table
- Add date range filter

---

## 🌐 Customer Booking Website (Next.js)

### Project Structure

```bash
# Create Next.js project
npx create-next-app@latest booking-website --typescript --tailwind --app
cd booking-website
npm install @supabase/supabase-js @stripe/stripe-js date-fns
npm install framer-motion react-hook-form zod lucide-react
```

### Pages to Build

#### 1. Homepage (`app/page.tsx`)
**Purpose:** Search form + hero section

**Components:**
- Hero section with background image/video
- Search form:
  - Pickup location dropdown
  - Pickup date & time
  - Checkbox: "Different dropoff location"
  - Dropoff location (conditional)
  - Dropoff date & time
  - Search button

**Flow:**
- User fills form → Click "Search"
- Redirect to `/cars?pickup=X&dates=Y...`

#### 2. Car Listing Page (`app/cars/page.tsx`)
**Purpose:** Display available cars

**Features:**
- Filter sidebar:
  - Car category
  - Transmission (manual/automatic)
  - Seats (minimum)
  - Price range
- Sort options (price, popularity, name)
- Car cards showing:
  - Main photo
  - Car name (make + model)
  - Category
  - Specs (seats, doors, transmission, luggage)
  - Price per day
  - "Featured" badge
  - "Select" button

**API Call:**
```typescript
// Fetch available cars
const cars = await supabase
  .from('booking_cars')
  .select(`
    *,
    category:car_categories(*),
    photos:car_photos(*)
  `)
  .eq('is_available_for_booking', true)
  .eq('is_active', true);

// Check availability
const available = await checkAvailability(carId, startDate, endDate);
```

#### 3. Car Details Page (`app/cars/[id]/page.tsx`)
**Purpose:** Show car details + start booking

**Features:**
- Image gallery (lightbox, swipeable)
- Car name and category
- Full specs list
- Features included
- Customer reviews (if enabled)
- Price calculator
- "Book Now" button

#### 4. Booking Form (`app/booking/page.tsx`)
**Purpose:** Collect customer info + select extras

**Steps:**
1. **Customer Information:**
   - Full name
   - Email
   - Phone
   - Age
   - Driver license number
   - Address (optional)

2. **Extra Options:**
   - Checkboxes for extras (GPS, child seat, etc.)
   - Show price per day or one-time

3. **Insurance Selection:**
   - Radio buttons for insurance types
   - Show deductible and coverage details

**Continue to Checkout →**

#### 5. Checkout Page (`app/checkout/page.tsx`)
**Purpose:** Payment + confirmation

**Features:**
- **Booking Summary:**
  - Car details
  - Dates and locations
  - Price breakdown:
    - Base price (days × daily rate)
    - Extras
    - Insurance
    - Location fees
    - **Total**

- **Payment Method Selection:**
  - Radio buttons for available methods
  - Full payment vs. Deposit (30%)

- **Payment Form:**
  - Stripe Elements (credit card)
  - Or redirect to Viva Wallet/PayPal

- **Terms Checkbox**
- **Submit Button:** "Complete Booking"

**Payment Flow:**
```typescript
// 1. Create booking in database
const { data: booking } = await supabase
  .from('online_bookings')
  .insert({
    customer_email,
    customer_full_name,
    // ... all booking details
    booking_status: 'pending',
    payment_status: 'pending',
  })
  .select()
  .single();

// 2. Create Stripe payment intent
const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify({
    bookingId: booking.id,
    amount: totalAmount,
  }),
});

// 3. Confirm payment
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/confirmation/${booking.id}`,
  },
});

// 4. On success, update booking status
await supabase
  .from('online_bookings')
  .update({
    booking_status: 'confirmed',
    payment_status: 'fully_paid', // or 'deposit_paid'
    amount_paid: paidAmount,
  })
  .eq('id', booking.id);
```

#### 6. Confirmation Page (`app/confirmation/[id]/page.tsx`)
**Purpose:** Show booking confirmation

**Features:**
- Success message with checkmark animation
- Booking number (e.g., BK-2025-001234)
- Summary of booking
- What to bring checklist
- Action buttons:
  - Add to Calendar (generate .ics file)
  - Download PDF
  - Send Email
- Contact information (phone, WhatsApp, email)

#### 7. My Booking Page (`app/my-booking/[id]/page.tsx`)
**Purpose:** View booking details (for customer)

**Features:**
- Booking lookup by booking number + email
- Show all booking details
- Cancel booking (if within cancellation window)
- Modify booking (if allowed)
- Payment status
- Remaining balance (if deposit paid)

---

## 🔧 Services & Utilities to Create

### 1. Supabase Service (`services/booking.service.ts`)

```typescript
import { supabase } from './supabase';

export const BookingService = {
  // Check car availability
  async checkAvailability(carId: string, startDate: Date, endDate: Date) {
    const { data } = await supabase.rpc('is_car_available', {
      p_car_id: carId,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    return data;
  },

  // Get available cars
  async getAvailableCars(filters: any) {
    let query = supabase
      .from('booking_cars')
      .select(`
        *,
        category:car_categories(*),
        photos:car_photos(*)
      `)
      .eq('is_available_for_booking', true)
      .eq('is_active', true);

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Calculate price for date range
  async calculatePrice(carId: string, categoryId: string, startDate: Date, endDate: Date) {
    // Get pricing for date range
    // Priority: car-specific pricing > category pricing
    const { data: pricing } = await supabase
      .from('car_pricing')
      .select('*')
      .or(`car_id.eq.${carId},category_id.eq.${categoryId}`)
      .gte('end_date', startDate.toISOString().split('T')[0])
      .lte('start_date', endDate.toISOString().split('T')[0])
      .order('priority', { ascending: false });

    // Calculate total based on daily rates
    // Return { basePrice, days, pricePerDay }
  },

  // Create booking
  async createBooking(bookingData: any) {
    const { data, error } = await supabase
      .from('online_bookings')
      .insert(bookingData)
      .select()
      .single();

    return { data, error };
  },

  // Get booking by ID
  async getBooking(bookingId: string) {
    const { data, error } = await supabase
      .from('online_bookings')
      .select(`
        *,
        car:booking_cars(*),
        category:car_categories(*),
        pickup_location:locations!pickup_location_id(*),
        dropoff_location:locations!dropoff_location_id(*),
        extras:booking_extras(*, extra:extra_options(*))
      `)
      .eq('id', bookingId)
      .single();

    return { data, error };
  },
};
```

### 2. Payment Service (`services/payment.service.ts`)

```typescript
// Stripe integration
export const PaymentService = {
  async createPaymentIntent(amount: number, bookingId: string) {
    // Call your backend API (Supabase Edge Function)
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, bookingId }),
    });

    return response.json();
  },

  async confirmPayment(paymentIntentId: string) {
    // Handle payment confirmation
  },
};
```

### 3. Email Service (`services/email.service.ts`)

Use Supabase Edge Functions + Resend/SendGrid for emails:

**Templates:**
1. Booking Confirmation
2. Payment Receipt
3. Reminder (24h before pickup)
4. Thank You (after return)

### 4. Calendar Service (`services/calendar.service.ts`)

Generate .ics file for calendar apps:

```typescript
export function generateICS(booking: any) {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(booking.pickup_date)}
DTEND:${formatDate(booking.dropoff_date)}
SUMMARY:Car Rental - ${booking.car.make} ${booking.car.model}
LOCATION:${booking.pickup_location.address}
DESCRIPTION:Booking #${booking.booking_number}
END:VEVENT
END:VCALENDAR`;

  return ics;
}
```

---

## 📱 Mobile App (Optional - Future)

You can reuse the Next.js website as a PWA or build a React Native app for customers:

**Features:**
- View bookings
- Push notifications for reminders
- Mobile-optimized booking flow
- Digital check-in

---

## 🚀 Deployment Checklist

### Supabase Setup
1. ✅ Create project on supabase.com
2. ✅ Run `online-booking-schema.sql` in SQL Editor
3. ✅ Create storage buckets:
   - `car-photos` (public)
   - `booking-documents` (private)
4. ✅ Set up storage policies
5. ✅ Configure email templates
6. ✅ Get API keys (anon key, service role key)

### Next.js Website
1. ✅ Deploy to Vercel
2. ✅ Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `STRIPE_PUBLIC_KEY`
   - `STRIPE_SECRET_KEY` (server-side only)
3. ✅ Configure custom domain
4. ✅ Set up SSL certificate
5. ✅ Configure Google Analytics (optional)

### Payment Integration
1. ✅ Create Stripe account
2. ✅ Get API keys (test + live)
3. ✅ Set up webhooks
4. ✅ Test payment flow
5. ✅ Enable 3D Secure

### Email Setup
1. ✅ Configure email provider (Resend/SendGrid)
2. ✅ Design email templates
3. ✅ Test all email triggers

### Testing
1. ✅ Test booking flow end-to-end
2. ✅ Test payment with test cards
3. ✅ Test on mobile devices
4. ✅ Test email notifications
5. ✅ Load testing

---

## 🎯 Next Steps

1. **Complete remaining admin screens** (cars, pricing calendar, extras, insurance, payment methods, bookings, design, analytics)

2. **Set up Next.js booking website** with all customer-facing pages

3. **Integrate payment system** (Stripe/Viva Wallet)

4. **Test booking flow** from start to finish

5. **Deploy to production**

6. **Monitor and iterate** based on customer feedback

---

## 💡 Tips for Success

1. **Start Simple:** Get basic booking flow working first, then add advanced features

2. **Mobile-First:** Most customers will book from mobile devices

3. **Fast Loading:** Optimize images, use CDN, minimize JavaScript

4. **Clear Pricing:** No hidden fees, transparent breakdown

5. **Trust Indicators:** SSL badges, payment logos, customer reviews

6. **Easy Cancellation:** Make it easy to cancel (builds trust)

7. **Multi-language:** Greek + English at minimum

8. **Support:** Live chat or WhatsApp for instant help

9. **Analytics:** Track everything (conversion rates, drop-off points, popular cars)

10. **A/B Testing:** Test different designs, CTAs, pricing displays

---

## 📞 Support

This is a comprehensive system. Take it step by step. You've already completed:
- ✅ Database schema
- ✅ Main booking menu
- ✅ Locations management
- ✅ Categories management

Next priorities:
1. Cars management with photos
2. Pricing calendar (the most complex part)
3. Bookings list with convert-to-contract
4. Customer website

**You're doing great! Keep going!** 🚀

