import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (for client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SSR client (for server components and routes)
export function createClientComponentClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Types
export interface Organization {
  id: string;
  company_name: string;
  trading_name?: string;
  slug: string;
  vat_number: string;
  logo_url?: string;
  icon_url?: string;
  brand_color_primary: string;
  brand_color_secondary: string;
  email_primary: string;
  phone_primary: string;
  website?: string;
  is_active: boolean;
}

export interface BookingCar {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  main_photo_url?: string;
  is_featured: boolean;
  is_available_for_booking: boolean;
  min_age_requirement: number;
  min_license_years: number;
  organization_id?: string;
  category: CarCategory;
  photos?: CarPhoto[];
}

export interface CarCategory {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  seats: number;
  doors: number;
  transmission: 'manual' | 'automatic' | 'both';
  luggage_capacity: number;
  features?: string[];
  icon_name?: string;
  organization_id?: string;
}

export interface CarPhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

export interface Location {
  id: string;
  name: string;
  name_el: string;
  address: string;
  extra_delivery_fee: number;
  extra_pickup_fee: number;
  organization_id?: string;
}

export interface ExtraOption {
  id: string;
  name: string;
  name_el: string;
  description_el?: string;
  price_per_day: number;
  is_one_time_fee: boolean;
  icon_name?: string;
  organization_id?: string;
}

export interface InsuranceType {
  id: string;
  name: string;
  name_el: string;
  description_el?: string;
  deductible: number;
  price_per_day: number;
  badge_text?: string;
  is_default: boolean;
  organization_id?: string;
}

export interface OnlineBooking {
  id?: string;
  booking_number?: string;
  customer_email: string;
  customer_full_name: string;
  customer_phone: string;
  customer_age?: number;
  customer_driver_license?: string;
  car_id: string;
  category_id: string;
  organization_id?: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location_id: string;
  dropoff_date: string;
  dropoff_time: string;
  dropoff_location_id: string;
  base_price: number;
  extras_price: number;
  insurance_price: number;
  location_fees: number;
  total_price: number;
  booking_status?: string;
  payment_status?: string;
  selected_insurance_id?: string;
  customer_notes?: string;
}

export interface BookingDesignSettings {
  id: string;
  organization_id: string;
  company_name: string;
  company_name_el: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
}

