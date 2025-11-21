import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import BookingHomePage from '@/components/booking/BookingHomePage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function generateStaticParams() {
  // Optionally pre-generate pages for known organizations
  // For now, we'll generate dynamically
  return [];
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: org } = await supabase
    .from('organizations')
    .select('company_name, trading_name, logo_url')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!org) {
    return {
      title: 'Booking Not Found',
    };
  }

  return {
    title: `${org.trading_name || org.company_name} - Online Booking`,
    description: `Book your rental car with ${org.trading_name || org.company_name}`,
  };
}

export default async function BookingPage({ params }: { params: { slug: string } }) {
  // Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (orgError || !org) {
    notFound();
  }

  // Get booking design settings for this organization
  const { data: designSettings } = await supabase
    .from('booking_design_settings')
    .select('*')
    .eq('organization_id', org.id)
    .single();

  // Get locations for this organization
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .order('display_order');

  return (
    <BookingHomePage
      organization={org}
      designSettings={designSettings || null}
      locations={locations || []}
    />
  );
}

