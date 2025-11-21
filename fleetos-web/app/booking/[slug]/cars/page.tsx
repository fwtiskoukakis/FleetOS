import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CarsListingPage from '@/components/booking/CarsListingPage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function CarsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Get organization by slug
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!org) {
    notFound();
  }

  // Get search parameters
  const pickupLocation = searchParams.pickup_location as string;
  const pickupDate = searchParams.pickup_date as string;
  const pickupTime = searchParams.pickup_time as string;
  const dropoffLocation = searchParams.dropoff_location as string;
  const dropoffDate = searchParams.dropoff_date as string;
  const dropoffTime = searchParams.dropoff_time as string;

  // Get locations for this organization
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', org.id)
    .eq('is_active', true);

  // Get available cars for this organization
  const { data: cars } = await supabase
    .from('booking_cars')
    .select(`
      *,
      category:car_categories(*),
      photos:car_photos(*)
    `)
    .eq('organization_id', org.id) // ← Company-specific filtering!
    .eq('is_available_for_booking', true)
    .eq('is_active', true)
    .order('is_featured', { ascending: false });

  // Get pricing for dates
  // TODO: Implement date-based pricing filtering

  return (
    <CarsListingPage
      organization={org}
      cars={cars || []}
      locations={locations || []}
      searchParams={{
        pickupLocation,
        pickupDate,
        pickupTime,
        dropoffLocation,
        dropoffDate,
        dropoffTime,
      }}
    />
  );
}

