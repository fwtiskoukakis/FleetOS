/**
 * Organization Helper
 * Gets the current user's organization_id and handles organization-based data filtering
 */

import { supabase } from './supabase';

/**
 * Get the current user's organization_id
 * Returns null if user doesn't belong to an organization
 * @param userId Optional: The ID of the user. If not provided, it fetches the current authenticated user.
 */
export async function getOrganizationId(userId?: string): Promise<string | null> {
  try {
    let currentUserId = userId;

    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return null;
      }
      currentUserId = user.id;
    }

    if (!currentUserId) {
      return null;
    }

    // Get user's organization_id from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', currentUserId)
      .maybeSingle();

    if (userError) {
      console.error('Error getting user organization_id:', userError);
      return null;
    }

    // If user has organization_id, return it
    if (userData?.organization_id) {
      return userData.organization_id;
    }

    // If user doesn't have organization_id, try to find it from their contracts
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .select('organization_id')
      .eq('user_id', currentUserId)
      .not('organization_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (contractError) {
      console.error('Error finding organization_id from contracts:', contractError);
      return null;
    }

    if (contractData?.organization_id) {
      // Update user's organization_id for future queries
      await supabase
        .from('users')
        .update({ organization_id: contractData.organization_id })
        .eq('id', currentUserId);
      
      return contractData.organization_id;
    }

    // Try to find from cars (filtered by user_id)
    const { data: carData, error: carError } = await supabase
      .from('cars')
      .select('organization_id')
      .eq('user_id', currentUserId)
      .not('organization_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!carError && carData?.organization_id) {
      // Update user's organization_id
      await supabase
        .from('users')
        .update({ organization_id: carData.organization_id })
        .eq('id', currentUserId);
      
      return carData.organization_id;
    }

    return null;
  } catch (error) {
    console.error('Exception getting user organization_id:', error);
    return null;
  }
}

/**
 * Alias for getOrganizationId for backward compatibility
 * @deprecated Use getOrganizationId instead
 */
export async function getUserOrganizationId(): Promise<string | null> {
  return getOrganizationId();
}

/**
 * Build a query that filters by organization_id if available
 * Falls back to user_id if no organization_id
 */
export async function buildOrganizationQuery<T>(
  tableName: string,
  select: string = '*'
): Promise<{ query: any; organizationId: string | null; userId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;
  
  const organizationId = await getOrganizationId();
  
  let query = supabase.from(tableName).select(select);

  // Filter by organization_id if available
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  } else if (userId) {
    // Fallback to user_id if no organization_id
    query = query.eq('user_id', userId);
  } else {
    // No user - return empty query
    query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Will return nothing
  }

  return { query, organizationId, userId };
}

