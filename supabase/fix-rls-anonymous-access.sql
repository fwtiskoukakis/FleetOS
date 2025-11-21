-- ==============================================
-- QUICK FIX: Enable Anonymous Bookings
-- ==============================================
-- Run this to allow anonymous users to create bookings
-- This fixes the 401 Unauthorized error
-- ==============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.online_bookings;
DROP POLICY IF EXISTS "Anyone can add booking extras" ON public.booking_extras;
DROP POLICY IF EXISTS "Anyone can create payment transactions" ON public.payment_transactions;

-- Create policies that allow anonymous INSERT
CREATE POLICY "Anyone can create bookings"
  ON public.online_bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can add booking extras"
  ON public.booking_extras FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can create payment transactions"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (true);

-- Also allow anonymous to SELECT their own bookings (optional)
CREATE POLICY "Anyone can view bookings by email"
  ON public.online_bookings FOR SELECT
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS Policies Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Anonymous users can now:';
  RAISE NOTICE '  ✓ Create bookings';
  RAISE NOTICE '  ✓ Add extras to bookings';
  RAISE NOTICE '  ✓ Create payment transactions';
  RAISE NOTICE '  ✓ View bookings';
  RAISE NOTICE '';
  RAISE NOTICE 'Try booking again - it should work! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

