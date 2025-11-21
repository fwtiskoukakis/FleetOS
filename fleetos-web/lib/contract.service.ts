/**
 * Contract Service for Web
 * Handles contract creation, customer auto-creation, etc.
 */

import { supabase } from './supabase';

export interface RenterInfo {
  fullName: string;
  idNumber?: string;
  taxId?: string;
  driverLicenseNumber?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
}

export interface RentalPeriod {
  pickupDate: Date;
  pickupTime: string;
  pickupLocation: string;
  dropoffDate: Date;
  dropoffTime: string;
  dropoffLocation: string;
  isDifferentDropoffLocation: boolean;
  totalCost: number;
  depositAmount?: number;
  insuranceCost?: number;
}

export interface CarInfo {
  makeModel: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate: string;
  mileage?: number;
  category?: string;
  color?: string;
}

export interface CarCondition {
  fuelLevel: number;
  insuranceType: 'basic' | 'full';
  exteriorCondition: 'excellent' | 'good' | 'fair' | 'poor';
  interiorCondition: 'excellent' | 'good' | 'fair' | 'poor';
  mechanicalCondition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  mileage?: number;
}

export interface DamagePoint {
  id?: string;
  x: number;
  y: number;
  view: 'front' | 'rear' | 'left' | 'right';
  description?: string;
  severity: 'minor' | 'moderate' | 'major';
  markerType?: string;
}

export interface Contract {
  id?: string;
  userId: string;
  renterInfo: RenterInfo;
  rentalPeriod: RentalPeriod;
  carInfo: CarInfo;
  carCondition: CarCondition;
  damagePoints?: DamagePoint[];
  photoUris?: string[];
  clientSignature?: string;
  observations?: string;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt?: Date;
}

/**
 * Auto-create customer profile from contract renter info
 */
export async function autoCreateCustomer(contract: Contract, organizationId?: string): Promise<string | null> {
  try {
    // First, try to find existing customer by email or phone
    if (contract.renterInfo.email) {
      const { data: existingCustomer } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('email', contract.renterInfo.email.toLowerCase())
        .maybeSingle();

      if (existingCustomer?.id) {
        console.log('Found existing customer by email:', existingCustomer.id);
        return existingCustomer.id;
      }
    }

    // Try by phone
    if (contract.renterInfo.phoneNumber) {
      const { data: existingCustomer } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('phone_primary', contract.renterInfo.phoneNumber)
        .maybeSingle();

      if (existingCustomer?.id) {
        console.log('Found existing customer by phone:', existingCustomer.id);
        return existingCustomer.id;
      }
    }

    // If no organization_id, try to find it from user's data
    let orgId = organizationId;
    if (!orgId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle();
        
        orgId = userData?.organization_id || undefined;
      }

      // If still no org, try to find from contracts/cars
      if (!orgId) {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('organization_id')
          .eq('user_id', contract.userId)
          .limit(1)
          .maybeSingle();
        
        if (contractData?.organization_id) {
          orgId = contractData.organization_id;
        }
      }
    }

    if (!orgId) {
      console.log('No organization_id found - cannot create customer profile');
      return null;
    }

    // Create new customer profile
    const { data: newCustomer, error } = await supabase
      .from('customer_profiles')
      .insert({
        organization_id: orgId,
        full_name: contract.renterInfo.fullName,
        id_number: contract.renterInfo.idNumber || null,
        driver_license_number: contract.renterInfo.driverLicenseNumber || null,
        phone_primary: contract.renterInfo.phoneNumber || null,
        email: contract.renterInfo.email?.toLowerCase() || null,
        address: contract.renterInfo.address || null,
        total_rentals: 1,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating customer profile:', error);
      return null;
    }

    console.log('Created new customer profile:', newCustomer.id);
    return newCustomer.id;
  } catch (error) {
    console.error('Exception in autoCreateCustomer:', error);
    return null;
  }
}

/**
 * Save a new contract (web version)
 */
export async function saveContract(contract: Contract): Promise<Contract> {
  try {
    // Get organization_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Try to get organization_id from user
    let organizationId: string | undefined;
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    organizationId = userData?.organization_id || undefined;

    // If no org, try to find from existing contracts
    if (!organizationId) {
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (existingContract?.organization_id) {
        organizationId = existingContract.organization_id;
      }
    }

    // Auto-create customer profile
    const customerId = await autoCreateCustomer(contract, organizationId);

    // Generate contract ID if not provided
    const contractId = contract.id || crypto.randomUUID();

    // Prepare contract data
    const contractData: any = {
      id: contractId,
      user_id: contract.userId,
      organization_id: organizationId,
      customer_id: customerId,
      
      // Renter info
      renter_full_name: contract.renterInfo.fullName,
      renter_id_number: contract.renterInfo.idNumber || null,
      renter_tax_id: contract.renterInfo.taxId || null,
      renter_driver_license_number: contract.renterInfo.driverLicenseNumber || null,
      renter_phone_number: contract.renterInfo.phoneNumber || null,
      renter_email: contract.renterInfo.email?.toLowerCase() || null,
      renter_address: contract.renterInfo.address || null,
      
      // Rental period
      pickup_date: contract.rentalPeriod.pickupDate.toISOString().split('T')[0],
      pickup_time: contract.rentalPeriod.pickupTime,
      pickup_location: contract.rentalPeriod.pickupLocation,
      dropoff_date: contract.rentalPeriod.dropoffDate.toISOString().split('T')[0],
      dropoff_time: contract.rentalPeriod.dropoffTime,
      dropoff_location: contract.rentalPeriod.dropoffLocation,
      is_different_dropoff_location: contract.rentalPeriod.isDifferentDropoffLocation || false,
      total_cost: contract.rentalPeriod.totalCost || 0,
      deposit_amount: contract.rentalPeriod.depositAmount || 0,
      insurance_cost: contract.rentalPeriod.insuranceCost || 0,
      
      // Car info
      car_make_model: contract.carInfo.makeModel,
      car_year: contract.carInfo.year || new Date().getFullYear(),
      car_license_plate: contract.carInfo.licensePlate,
      car_mileage: contract.carCondition?.mileage || contract.carInfo.mileage || 0,
      car_category: contract.carInfo.category || null,
      car_color: contract.carInfo.color || null,
      
      // Car condition
      fuel_level: contract.carCondition?.fuelLevel || 8, // 0-8 scale, not 0-100%
      insurance_type: contract.carCondition?.insuranceType || 'basic',
      exterior_condition: contract.carCondition?.exteriorCondition || 'good',
      interior_condition: contract.carCondition?.interiorCondition || 'good',
      mechanical_condition: contract.carCondition?.mechanicalCondition || 'good',
      condition_notes: contract.carCondition?.notes || null,
      
      // Additional
      observations: contract.observations || null,
      client_signature_url: contract.clientSignature || null,
      status: contract.status || 'pending',
    };

    // Save contract
    const { data: savedContract, error: contractError } = await supabase
      .from('contracts')
      .insert(contractData)
      .select()
      .single();

    if (contractError) {
      console.error('Error saving contract:', contractError);
      throw contractError;
    }

    // Save damage points if any
    if (contract.damagePoints && contract.damagePoints.length > 0) {
      const damagePointsData = contract.damagePoints.map(dp => ({
        contract_id: contractId,
        location: `${dp.view} side`,
        x_position: dp.x,
        y_position: dp.y,
        view_side: dp.view,
        description: dp.description || '',
        severity: dp.severity,
        marker_type: dp.markerType || 'slight-scratch',
      }));

      const { error: damageError } = await supabase
        .from('damage_points')
        .insert(damagePointsData);

      if (damageError) {
        console.error('Error saving damage points:', damageError);
        // Don't throw - contract is saved
      }
    }

    // Update customer's total_rentals if customer was created/found
    if (customerId) {
      try {
        const { error: incrementError } = await supabase.rpc('increment_customer_rentals', { customer_id: customerId });
        if (incrementError) {
          console.error('Error incrementing customer rentals:', incrementError);
        }
      } catch (err) {
        console.error('Exception incrementing customer rentals:', err);
        // Don't throw - contract is saved
      }
    }

    return { ...contract, id: contractId };
  } catch (error) {
    console.error('Error in saveContract:', error);
    throw error;
  }
}

/**
 * Get all customers for the current user's organization
 */
export async function getCustomers(searchQuery?: string): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get user's organization_id
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    const orgId = userData?.organization_id;

    let query = supabase
      .from('customer_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    if (searchQuery) {
      query = query.ilike('full_name', `%${searchQuery}%`)
        .or(`email.ilike.%${searchQuery}%,phone_primary.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error loading customers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception loading customers:', error);
    return [];
  }
}

