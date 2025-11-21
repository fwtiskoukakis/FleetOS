-- ==============================================
-- ONLINE BOOKING SYSTEM - SAMPLE DATA
-- ==============================================
-- Run this after deploying the main schema
-- This adds initial data to get started quickly
-- ==============================================

-- 1. LOCATIONS (3 pickup/dropoff locations)
-- ==============================================
INSERT INTO public.locations (
  name, name_el, 
  address, address_el, 
  extra_pickup_fee, extra_delivery_fee,
  is_active, display_order
) VALUES
  (
    'Athens Airport', 
    'Αεροδρόμιο Αθηνών',
    'Athens International Airport, Spata', 
    'Διεθνής Αερολιμένας Αθηνών, Σπάτα',
    20.00, 20.00,
    true, 1
  ),
  (
    'Main Office', 
    'Κεντρικό Γραφείο',
    'Piraeus, Athens', 
    'Πειραιάς, Αθήνα',
    0, 0,
    true, 2
  ),
  (
    'Piraeus Port', 
    'Λιμάνι Πειραιά',
    'Piraeus Port, Gate E1', 
    'Λιμάνι Πειραιά, Πύλη Ε1',
    15.00, 15.00,
    true, 3
  )
ON CONFLICT DO NOTHING;

-- 2. CAR CATEGORIES (3 categories)
-- ==============================================
INSERT INTO public.car_categories (
  name, name_el, 
  description, description_el,
  icon_name, seats, doors, transmission, luggage_capacity,
  features,
  display_order, is_active
) VALUES
  (
    'Economy', 
    'Οικονομικό',
    'Perfect for city driving and budget travelers', 
    'Ιδανικό για την πόλη και οικονομικούς ταξιδιώτες',
    'car', 5, 4, 'manual', 2,
    '["air_conditioning", "bluetooth", "usb"]'::jsonb,
    1, true
  ),
  (
    'SUV', 
    'SUV',
    'Spacious and comfortable for families', 
    'Ευρύχωρο και άνετο για οικογένειες',
    'truck', 7, 5, 'automatic', 4,
    '["air_conditioning", "bluetooth", "gps", "usb", "cruise_control"]'::jsonb,
    2, true
  ),
  (
    'Luxury', 
    'Πολυτελές',
    'Premium experience with high-end features', 
    'Premium εμπειρία με προηγμένα χαρακτηριστικά',
    'star', 5, 4, 'automatic', 3,
    '["air_conditioning", "bluetooth", "gps", "usb", "leather_seats", "sunroof", "premium_audio"]'::jsonb,
    3, true
  )
ON CONFLICT DO NOTHING;

-- 3. INSURANCE TYPES (2 packages)
-- ==============================================
INSERT INTO public.insurance_types (
  name, name_el,
  description, description_el,
  deductible, coverage_amount, price_per_day,
  covers_theft, covers_glass, covers_tires, covers_undercarriage,
  badge_text, is_default, is_active
) VALUES
  (
    'Basic Insurance', 
    'Βασική Ασφάλεια',
    'Standard coverage with €1000 deductible', 
    'Τυπική κάλυψη με €1000 ίδια συμμετοχή',
    1000.00, 5000.00, 10.00,
    false, false, false, false,
    NULL, true, true
  ),
  (
    'Premium Insurance', 
    'Premium Ασφάλεια',
    'Full coverage with zero deductible - highly recommended', 
    'Πλήρης κάλυψη χωρίς ίδια συμμετοχή - προτεινόμενη',
    0, 15000.00, 20.00,
    true, true, true, true,
    'RECOMMENDED', false, true
  )
ON CONFLICT DO NOTHING;

-- 4. EXTRA OPTIONS (6 popular extras)
-- ==============================================
INSERT INTO public.extra_options (
  name, name_el,
  description, description_el,
  price_per_day, is_one_time_fee, icon_name, is_active
) VALUES
  (
    'GPS Navigation', 
    'GPS Πλοήγηση',
    'Satellite navigation system', 
    'Σύστημα δορυφορικής πλοήγησης',
    5.00, false, 'navigation', true
  ),
  (
    'Child Safety Seat', 
    'Παιδικό Κάθισμα',
    'Safety seat for children (0-4 years)', 
    'Κάθισμα ασφαλείας για παιδιά (0-4 ετών)',
    8.00, false, 'baby', true
  ),
  (
    'Extra Driver', 
    'Επιπλέον Οδηγός',
    'Add additional authorized driver', 
    'Προσθήκη επιπλέον εξουσιοδοτημένου οδηγού',
    10.00, true, 'user-plus', true
  ),
  (
    'WiFi Hotspot', 
    'WiFi Hotspot',
    'Portable mobile internet hotspot', 
    'Φορητό σημείο WiFi για internet',
    6.00, false, 'wifi', true
  ),
  (
    'Full Fuel Tank', 
    'Γεμάτο Ντεπόζιτο',
    'Return with any fuel level, we handle the rest', 
    'Επιστροφή με οποιοδήποτε επίπεδο καυσίμου',
    35.00, true, 'fuel', true
  ),
  (
    'Snow Chains', 
    'Αλυσίδες Χιονιού',
    'Winter snow chains for mountain driving', 
    'Αλυσίδες για οδήγηση στο χιόνι',
    15.00, true, 'snowflake', true
  )
ON CONFLICT DO NOTHING;

-- 5. PAYMENT METHODS (4 methods)
-- ==============================================
INSERT INTO public.payment_methods (
  name, name_el, provider, 
  is_active, requires_full_payment, deposit_percentage, min_deposit_amount
) VALUES
  (
    'Credit/Debit Card', 
    'Πιστωτική/Χρεωστική Κάρτα', 
    'stripe',
    true, false, 30, 50.00
  ),
  (
    'Bank Transfer', 
    'Τραπεζική Μεταφορά', 
    'bank_transfer',
    true, true, 100, 0
  ),
  (
    'Pay at Location', 
    'Πληρωμή στο Κατάστημα', 
    'cash',
    true, false, 30, 30.00
  ),
  (
    'Viva Wallet', 
    'Viva Wallet', 
    'viva_wallet',
    false, false, 30, 50.00
  )
ON CONFLICT DO NOTHING;

-- 6. DESIGN SETTINGS (Company branding & configuration)
-- ==============================================
INSERT INTO public.booking_design_settings (
  company_name, company_name_el,
  tagline, tagline_el,
  contact_email, contact_phone, whatsapp_number,
  facebook_url, instagram_url,
  primary_color, secondary_color, accent_color,
  allow_instant_booking, require_approval,
  show_prices_without_vat, min_booking_hours
) VALUES (
  'FleetOS Car Rentals', 
  'FleetOS Ενοικιάσεις Αυτοκινήτων',
  'Book your perfect car in minutes', 
  'Κλείστε το ιδανικό αυτοκίνητο σε λεπτά',
  'info@fleetos-rentals.gr', 
  '+30 210 123 4567', 
  '+30 690 123 4567',
  'https://facebook.com/yourcompany',
  'https://instagram.com/yourcompany',
  '#2563eb', 
  '#10b981', 
  '#f59e0b',
  true, 
  false,
  false, 
  24
) ON CONFLICT DO NOTHING;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
DECLARE
  loc_count INTEGER;
  cat_count INTEGER;
  ins_count INTEGER;
  ext_count INTEGER;
  pay_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO loc_count FROM public.locations;
  SELECT COUNT(*) INTO cat_count FROM public.car_categories;
  SELECT COUNT(*) INTO ins_count FROM public.insurance_types;
  SELECT COUNT(*) INTO ext_count FROM public.extra_options;
  SELECT COUNT(*) INTO pay_count FROM public.payment_methods;
  
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Sample Data Added Successfully! ✓';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Data Summary:';
  RAISE NOTICE '  • Locations: % entries', loc_count;
  RAISE NOTICE '  • Car Categories: % entries', cat_count;
  RAISE NOTICE '  • Insurance Types: % entries', ins_count;
  RAISE NOTICE '  • Extra Options: % entries', ext_count;
  RAISE NOTICE '  • Payment Methods: % entries', pay_count;
  RAISE NOTICE '  • Design Settings: 1 entry';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. ✓ Add cars via FleetOS → Book Online → Cars';
  RAISE NOTICE '  2. ✓ Upload car photos';
  RAISE NOTICE '  3. ✓ Test the booking website at localhost:3000';
  RAISE NOTICE '  4. ✓ Configure Supabase credentials in .env.local';
  RAISE NOTICE '  5. ✓ Set up Stripe keys for payments';
  RAISE NOTICE '';
  RAISE NOTICE 'Your online booking system is ready! 🚀';
  RAISE NOTICE '==================================================';
END $$;

