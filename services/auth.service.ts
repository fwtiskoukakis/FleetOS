import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Authentication service for managing user authentication
 */
export class AuthService {
  /**
   * Sign up a new user with email and password
   */
  static async signUp(params: {
    email: string;
    password: string;
    name: string;
    signatureUrl?: string;
  }): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            name: params.name,
          },
        },
      });

      if (error) {
        return { user: null, error };
      }

      // User profile is automatically created by database trigger
      // Only update signature if provided
      if (data.user && params.signatureUrl) {
        const { error: profileError } = await supabase
          .from('users')
          .update({
            signature_url: params.signatureUrl,
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        }
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign in with email and password
   */
  static async signIn(params: {
    email: string;
    password: string;
  }): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (error) {
        // Provide better error messages for common issues
        let errorMessage = error.message;
        
        if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Παρακαλώ επιβεβαιώστε το email σας πριν συνδεθείτε. Ελέγξτε τα εισερχόμενα σας.';
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Λάθος email ή κωδικός. Παρακαλώ προσπαθήστε ξανά.';
        }
        
        return { user: null, error: new Error(errorMessage) };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get the current authenticated user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get the current session
   */
  static async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Reset password for a user
   */
  static async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(params: {
    name?: string;
    signatureUrl?: string;
  }): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { error: new Error('No authenticated user') };
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: params.name,
          signature_url: params.signatureUrl,
        })
        .eq('id', user.id);

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string) {
    try {
      // Explicitly list only columns that exist in the database
      const { data, error } = await supabase
        .from('users')
        .select('id,name,email,signature_url,phone,address,created_at,updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error getting user profile:', error);
        console.error('Error details:', JSON.stringify(error));
        return null;
      }

      if (!data) {
        console.warn('No user profile found for ID:', userId);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error getting user profile:', error);
      return null;
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

