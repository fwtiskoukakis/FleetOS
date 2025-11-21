/**
 * Supabase Service
 * Re-exports the supabase client for use in service files
 */
import { supabase as supabaseClient } from '../utils/supabase';

export const supabase = supabaseClient;

