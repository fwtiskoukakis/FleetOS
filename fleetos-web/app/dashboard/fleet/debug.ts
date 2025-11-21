/**
 * Diagnostic script to check car data in Supabase
 * This can be run in browser console to debug fleet visibility issues
 */

import { supabase } from '@/lib/supabase';

export async function debugFleetData() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return;
  }

  console.log('=== FLEET DEBUG INFO ===');
  console.log('User ID:', user.id);
  console.log('User Email:', user.email);

  // Check user record
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, organization_id')
    .eq('id', user.id)
    .maybeSingle();
  
  console.log('User record:', userData);

  // Get all cars without filters first
  const { data: allCars, error: allCarsError } = await supabase
    .from('cars')
    .select('id, make, model, license_plate, user_id, organization_id')
    .limit(100);
  
  console.log('\n=== ALL CARS IN DATABASE (first 100) ===');
  console.log('Total cars:', allCars?.length || 0);
  if (allCarsError) {
    console.error('Error fetching all cars:', allCarsError);
  } else {
    console.table(allCars);
  }

  // Get cars by user_id
  const { data: carsByUserId, error: carsByUserIdError } = await supabase
    .from('cars')
    .select('id, make, model, license_plate, user_id, organization_id')
    .eq('user_id', user.id);
  
  console.log('\n=== CARS BY USER_ID ===');
  console.log('Count:', carsByUserId?.length || 0);
  if (carsByUserIdError) {
    console.error('Error:', carsByUserIdError);
  } else {
    console.table(carsByUserId);
  }

  // Get cars by organization_id
  if (userData?.organization_id) {
    const { data: carsByOrgId, error: carsByOrgIdError } = await supabase
      .from('cars')
      .select('id, make, model, license_plate, user_id, organization_id')
      .eq('organization_id', userData.organization_id);
    
    console.log('\n=== CARS BY ORGANIZATION_ID ===');
    console.log('Organization ID:', userData.organization_id);
    console.log('Count:', carsByOrgId?.length || 0);
    if (carsByOrgIdError) {
      console.error('Error:', carsByOrgIdError);
    } else {
      console.table(carsByOrgId);
    }
  } else {
    console.log('\n=== NO ORGANIZATION_ID FOR USER ===');
  }

  // Check what user_ids exist in cars table
  const { data: distinctUserIds } = await supabase
    .from('cars')
    .select('user_id')
    .not('user_id', 'is', null);
  
  const uniqueUserIds = [...new Set(distinctUserIds?.map(c => c.user_id) || [])];
  console.log('\n=== UNIQUE USER_IDS IN CARS TABLE ===');
  console.log('User IDs:', uniqueUserIds);
  console.log('Current user ID in list?', uniqueUserIds.includes(user.id));

  return {
    user,
    userData,
    allCars: allCars || [],
    carsByUserId: carsByUserId || [],
    uniqueUserIds,
  };
}

