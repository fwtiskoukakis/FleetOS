'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate inputs
      if (!email || !password || !name) {
        throw new Error('Please fill in all fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const normalizedEmail = email.trim().toLowerCase();
      console.log('Attempting signup with email:', normalizedEmail);

      // Sign up user with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (authError) {
        let errorMessage = authError.message;
        if (authError.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (authError.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        }
        console.error('Signup error:', authError);
        throw new Error(errorMessage);
      }

      if (data.user) {
        console.log('Signup successful, user:', data.user.email);
        
        // Create user record in public.users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: normalizedEmail,
            name: name.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (userError) {
          console.error('Error creating user record:', userError);
          // Don't throw - user is created in auth, record will be created later
        }

        setSuccess(true);
        
        // Wait a moment then redirect to login
        setTimeout(() => {
          router.push('/login?registered=true');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Caught signup exception:', err);
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center mb-4">
            <FleetOSLogo variant="horizontal-light" size={180} showText={true} />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        {/* Signup Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Account created successfully!</p>
                <p className="text-sm text-green-700 mt-1">
                  Please check your email to verify your account. Redirecting to login...
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || success}
              className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : success ? 'Account created!' : 'Create account'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>
              By signing up, you agree to our{' '}
              <a href="/terms" className="font-medium text-blue-600 hover:text-blue-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

