-- ==============================================
-- ADD SAMPLE CARS FOR TESTING
-- ==============================================
-- Run this AFTER running sample-data.sql
-- This will add 3 test cars (one per category)
-- ==============================================

-- Add 3 sample cars
INSERT INTO public.booking_cars (
  category_id,
  make,
  model,
  license_plate,
  year,
  color,
  is_available_for_booking,
  is_featured
)
SELECT 
  cat.id,
  CASE 
    WHEN cat.name = 'Economy' THEN 'Toyota'
    WHEN cat.name = 'SUV' THEN 'Nissan'
    ELSE 'BMW'
  END as make,
  CASE 
    WHEN cat.name = 'Economy' THEN 'Yaris'
    WHEN cat.name = 'SUV' THEN 'X-Trail'
    ELSE '5 Series'
  END as model,
  CASE 
    WHEN cat.name = 'Economy' THEN 'ABC-1234'
    WHEN cat.name = 'SUV' THEN 'XYZ-5678'
    ELSE 'LUX-9999'
  END as license_plate,
  2023 as year,
  'White' as color,
  true as is_available_for_booking,
  CASE WHEN cat.name = 'SUV' THEN true ELSE false END as is_featured
FROM public.car_categories cat
WHERE cat.name IN ('Economy', 'SUV', 'Luxury')
ON CONFLICT DO NOTHING;

-- Add sample photos for the cars
INSERT INTO public.car_photos (
  car_id,
  photo_url,
  storage_path,
  display_order,
  is_main_photo
)
SELECT 
  c.id,
  CASE 
    WHEN c.make = 'Toyota' THEN 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800'
    WHEN c.make = 'Nissan' THEN 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800'
    ELSE 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'
  END as photo_url,
  CASE 
    WHEN c.make = 'Toyota' THEN 'sample/toyota-yaris.jpg'
    WHEN c.make = 'Nissan' THEN 'sample/nissan-xtrail.jpg'
    ELSE 'sample/bmw-5series.jpg'
  END as storage_path,
  1 as display_order,
  true as is_main_photo
FROM public.booking_cars c
WHERE c.make IN ('Toyota', 'Nissan', 'BMW')
ON CONFLICT DO NOTHING;

-- Update cars with their main photo URL
UPDATE public.booking_cars c
SET main_photo_url = p.photo_url
FROM public.car_photos p
WHERE c.id = p.car_id 
  AND p.is_main_photo = true
  AND c.make IN ('Toyota', 'Nissan', 'BMW');

-- Add pricing for each car category
INSERT INTO public.car_pricing (
  category_id,
  start_date,
  end_date,
  price_per_day
)
SELECT 
  id,
  CURRENT_DATE as start_date,
  CURRENT_DATE + INTERVAL '365 days' as end_date,
  CASE 
    WHEN name = 'Economy' THEN 35.00
    WHEN name = 'SUV' THEN 65.00
    ELSE 95.00
  END as price_per_day
FROM public.car_categories
WHERE name IN ('Economy', 'SUV', 'Luxury')
ON CONFLICT DO NOTHING;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
DECLARE
  car_count INTEGER;
  photo_count INTEGER;
  pricing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO car_count FROM public.booking_cars WHERE is_available_for_booking = true;
  SELECT COUNT(*) INTO photo_count FROM public.car_photos;
  SELECT COUNT(*) INTO pricing_count FROM public.car_pricing;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Sample Cars Added Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Data Summary:';
  RAISE NOTICE '  • Cars Available Online: % entries', car_count;
  RAISE NOTICE '  • Car Photos: % entries', photo_count;
  RAISE NOTICE '  • Pricing Rules: % entries', pricing_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Cars Added:';
  RAISE NOTICE '  1. Toyota Yaris (Economy) - €35/day';
  RAISE NOTICE '  2. Nissan X-Trail (SUV) - €65/day';
  RAISE NOTICE '  3. BMW 5 Series (Luxury) - €95/day';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  ✓ Refresh your booking website';
  RAISE NOTICE '  ✓ Search for dates';
  RAISE NOTICE '  ✓ You should see 3 cars available!';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Ready to test the full booking flow!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

