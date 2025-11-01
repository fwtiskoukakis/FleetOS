/**
 * Vehicle Service
 * Handles all vehicle-related database operations with Supabase
 */

import { supabase } from '../utils/supabase';
import {  Vehicle, VehicleDamageHistoryItem, VehicleSummary, ServiceHistoryItem, VehicleCategory } from '../models/vehicle.interface';
import { updateVehicleAvailability } from '../utils/vehicle-availability';
import { AuthService } from './auth.service';

/**
 * Converts a database row to a Vehicle object
 */
function convertRowToVehicle(row: any): Vehicle {
  return {
    id: row.id,
    userId: row.user_id,
    licensePlate: row.license_plate,
    make: row.make,
    model: row.model,
    year: row.year,
    color: row.color,
    category: row.category,
    currentMileage: row.current_mileage,
    status: row.status,
    hasGps: row.has_gps || false,
    kteoLastDate: row.kteo_last_date ? new Date(row.kteo_last_date) : null,
    kteoExpiryDate: row.kteo_expiry_date ? new Date(row.kteo_expiry_date) : null,
    insuranceType: row.insurance_type,
    insuranceExpiryDate: row.insurance_expiry_date ? new Date(row.insurance_expiry_date) : null,
    insuranceCompany: row.insurance_company,
    insurancePolicyNumber: row.insurance_policy_number,
    insuranceHasMixedCoverage: row.insurance_has_mixed_coverage,
    tiresFrontDate: row.tires_front_date ? new Date(row.tires_front_date) : null,
    tiresFrontBrand: row.tires_front_brand,
    tiresRearDate: row.tires_rear_date ? new Date(row.tires_rear_date) : null,
    tiresRearBrand: row.tires_rear_brand,
    tiresNextChangeDate: row.tires_next_change_date ? new Date(row.tires_next_change_date) : null,
    lastServiceDate: row.last_service_date ? new Date(row.last_service_date) : null,
    lastServiceMileage: row.last_service_mileage,
    nextServiceMileage: row.next_service_mileage,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Converts a Vehicle object to database insert format
 */
function convertVehicleToInsert(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): any {
  // Basic fields that should always exist
  const insertData: any = {
    user_id: vehicle.userId,
    license_plate: vehicle.licensePlate,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    status: vehicle.status,
  };

  // Enhanced fields that might not exist yet (added by migration)
  // Only include if they have values to avoid errors if columns don't exist
  if (vehicle.currentMileage !== undefined) {
    insertData.current_mileage = vehicle.currentMileage;
  }
  if (vehicle.hasGps !== undefined) {
    insertData.has_gps = vehicle.hasGps;
  }
  if (vehicle.category) {
    insertData.category = vehicle.category;
  }
  if (vehicle.kteoLastDate) {
    insertData.kteo_last_date = vehicle.kteoLastDate.toISOString().split('T')[0];
  }
  if (vehicle.kteoExpiryDate) {
    insertData.kteo_expiry_date = vehicle.kteoExpiryDate.toISOString().split('T')[0];
  }
  if (vehicle.insuranceType) {
    insertData.insurance_type = vehicle.insuranceType;
  }
  if (vehicle.insuranceExpiryDate) {
    insertData.insurance_expiry_date = vehicle.insuranceExpiryDate.toISOString().split('T')[0];
  }
  if (vehicle.insuranceCompany) {
    insertData.insurance_company = vehicle.insuranceCompany;
  }
  if (vehicle.insurancePolicyNumber) {
    insertData.insurance_policy_number = vehicle.insurancePolicyNumber;
  }
  if (vehicle.insuranceHasMixedCoverage !== undefined) {
    insertData.insurance_has_mixed_coverage = vehicle.insuranceHasMixedCoverage;
  }
  if (vehicle.tiresFrontDate) {
    insertData.tires_front_date = vehicle.tiresFrontDate.toISOString().split('T')[0];
  }
  if (vehicle.tiresFrontBrand) {
    insertData.tires_front_brand = vehicle.tiresFrontBrand;
  }
  if (vehicle.tiresRearDate) {
    insertData.tires_rear_date = vehicle.tiresRearDate.toISOString().split('T')[0];
  }
  if (vehicle.tiresRearBrand) {
    insertData.tires_rear_brand = vehicle.tiresRearBrand;
  }
  if (vehicle.tiresNextChangeDate) {
    insertData.tires_next_change_date = vehicle.tiresNextChangeDate.toISOString().split('T')[0];
  }
  if (vehicle.lastServiceDate) {
    insertData.last_service_date = vehicle.lastServiceDate.toISOString().split('T')[0];
  }
  if (vehicle.lastServiceMileage !== undefined) {
    insertData.last_service_mileage = vehicle.lastServiceMileage;
  }
  if (vehicle.nextServiceMileage !== undefined) {
    insertData.next_service_mileage = vehicle.nextServiceMileage;
  }
  if (vehicle.notes) {
    insertData.notes = vehicle.notes;
  }

  return insertData;
}

export class VehicleService {
  /**
   * Get all vehicles for the current user
   */
  static async getAllVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('license_plate', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Get a vehicle by ID
   */
  static async getVehicleById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching vehicle:', error);
      throw new Error(`Failed to fetch vehicle: ${error.message}`);
    }

    return data ? convertRowToVehicle(data) : null;
  }

  /**
   * Get a vehicle by license plate
   */
  static async getVehicleByPlate(licensePlate: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('license_plate', licensePlate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching vehicle:', error);
      throw new Error(`Failed to fetch vehicle: ${error.message}`);
    }

    return data ? convertRowToVehicle(data) : null;
  }

  /**
   * Create a new vehicle
   * Handles missing columns gracefully by only inserting basic fields first,
   * then attempting to include enhanced fields if they exist
   */
  static async createVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    // Absolute minimal required fields that should ALWAYS exist
    // Only insert these 3 fields - everything else will be added via updates after migration
    const minimalFields: any = {
      license_plate: vehicle.licensePlate,
      make: vehicle.make,
      model: vehicle.model,
    };
    
    // DO NOT include year, color, status, user_id, or any other fields here
    // They will be added via updates once the migration is run
    
    // Enhanced fields that might not exist yet (added by migration)
    // NOTE: We explicitly DO NOT include user_id or status here as they might not exist
    // Only include if provided to avoid errors if columns don't exist
    const enhancedFields: any = {};
    
    // Skip currentMileage if it's 0 or undefined (column might not exist)
    // if (vehicle.currentMileage !== undefined && vehicle.currentMileage !== null && vehicle.currentMileage > 0) {
    //   enhancedFields.current_mileage = vehicle.currentMileage;
    // }
    if (vehicle.hasGps !== undefined && vehicle.hasGps === true) {
      enhancedFields.has_gps = vehicle.hasGps;
    }
    if (vehicle.category) {
      enhancedFields.category = vehicle.category;
    }
    if (vehicle.kteoLastDate) {
      enhancedFields.kteo_last_date = vehicle.kteoLastDate.toISOString().split('T')[0];
    }
    if (vehicle.kteoExpiryDate) {
      enhancedFields.kteo_expiry_date = vehicle.kteoExpiryDate.toISOString().split('T')[0];
    }
    if (vehicle.insuranceType) {
      enhancedFields.insurance_type = vehicle.insuranceType;
    }
    if (vehicle.insuranceExpiryDate) {
      enhancedFields.insurance_expiry_date = vehicle.insuranceExpiryDate.toISOString().split('T')[0];
    }
    if (vehicle.insuranceCompany) {
      enhancedFields.insurance_company = vehicle.insuranceCompany;
    }
    if (vehicle.insurancePolicyNumber) {
      enhancedFields.insurance_policy_number = vehicle.insurancePolicyNumber;
    }
    if (vehicle.insuranceHasMixedCoverage !== undefined) {
      enhancedFields.insurance_has_mixed_coverage = vehicle.insuranceHasMixedCoverage;
    }
    if (vehicle.tiresFrontDate) {
      enhancedFields.tires_front_date = vehicle.tiresFrontDate.toISOString().split('T')[0];
    }
    if (vehicle.tiresFrontBrand) {
      enhancedFields.tires_front_brand = vehicle.tiresFrontBrand;
    }
    if (vehicle.tiresRearDate) {
      enhancedFields.tires_rear_date = vehicle.tiresRearDate.toISOString().split('T')[0];
    }
    if (vehicle.tiresRearBrand) {
      enhancedFields.tires_rear_brand = vehicle.tiresRearBrand;
    }
    if (vehicle.tiresNextChangeDate) {
      enhancedFields.tires_next_change_date = vehicle.tiresNextChangeDate.toISOString().split('T')[0];
    }
    if (vehicle.lastServiceDate) {
      enhancedFields.last_service_date = vehicle.lastServiceDate.toISOString().split('T')[0];
    }
    if (vehicle.lastServiceMileage !== undefined && vehicle.lastServiceMileage !== null) {
      enhancedFields.last_service_mileage = vehicle.lastServiceMileage;
    }
    if (vehicle.nextServiceMileage !== undefined && vehicle.nextServiceMileage !== null) {
      enhancedFields.next_service_mileage = vehicle.nextServiceMileage;
    }
    if (vehicle.notes) {
      enhancedFields.notes = vehicle.notes;
    }

    // Insert with ONLY the 3 minimal required fields
    // Try insert without select first to avoid schema cache issues
    const { error: insertError } = await supabase
      .from('cars')
      .insert(minimalFields);

    if (insertError) {
      // Check if it's a schema cache issue
      if (insertError.code === 'PGRST204' || insertError.message?.includes('Could not find')) {
        const missingColumn = insertError.message.match(/Could not find the '(\w+)' column/)?.[1];
        console.error(`Schema cache issue: Column '${missingColumn}' not found. Attempted insert:`, minimalFields);
        throw new Error(`Database schema mismatch: ${insertError.message}. The '${missingColumn}' column may not exist. Please run enhance-vehicles-complete.sql migration or refresh Supabase schema cache.`);
      }
      
      console.error('Error creating vehicle:', insertError);
      throw new Error(`Failed to create vehicle: ${insertError.message}`);
    }

    // Insert succeeded, now fetch the created vehicle
    const { data: fetchedData, error: fetchError } = await supabase
      .from('cars')
      .select('*')
      .eq('license_plate', vehicle.licensePlate)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !fetchedData) {
      // If fetch fails, the vehicle was still created - try to find it differently
      console.warn('Could not fetch vehicle after insert, trying alternative query:', fetchError?.message);
      const { data: altData, error: altError } = await supabase
        .from('cars')
        .select('*')
        .ilike('license_plate', vehicle.licensePlate)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (altError || !altData) {
        throw new Error(`Vehicle created but could not be fetched: ${fetchError?.message || altError?.message || 'Unknown error'}`);
      }
      
      return convertRowToVehicle(altData);
    }

    // Vehicle created successfully with minimal fields
    return convertRowToVehicle(fetchedData);
  }

  /**
   * Update a vehicle
   * Handles missing columns gracefully by only updating basic fields first,
   * then attempting to update enhanced fields if they exist
   */
  static async updateVehicle(id: string, updates: Partial<Omit<Vehicle, 'id' | 'userId' | 'createdAt'>>): Promise<Vehicle> {
    // Basic fields that should always exist
    const basicFields: any = {};
    if (updates.licensePlate) basicFields.license_plate = updates.licensePlate;
    if (updates.make) basicFields.make = updates.make;
    if (updates.model) basicFields.model = updates.model;
    if (updates.year) basicFields.year = updates.year;
    if (updates.color !== undefined) basicFields.color = updates.color;
    if (updates.status) basicFields.status = updates.status;

    // Enhanced fields that might not exist yet (added by migration)
    const enhancedFields: any = {};
    if (updates.currentMileage !== undefined) enhancedFields.current_mileage = updates.currentMileage;
    if (updates.hasGps !== undefined) enhancedFields.has_gps = updates.hasGps;
    if (updates.kteoLastDate !== undefined) enhancedFields.kteo_last_date = updates.kteoLastDate ? updates.kteoLastDate.toISOString().split('T')[0] : null;
    if (updates.kteoExpiryDate !== undefined) enhancedFields.kteo_expiry_date = updates.kteoExpiryDate ? updates.kteoExpiryDate.toISOString().split('T')[0] : null;
    if (updates.insuranceType !== undefined) enhancedFields.insurance_type = updates.insuranceType;
    if (updates.insuranceExpiryDate !== undefined) enhancedFields.insurance_expiry_date = updates.insuranceExpiryDate ? updates.insuranceExpiryDate.toISOString().split('T')[0] : null;
    if (updates.insuranceCompany !== undefined) enhancedFields.insurance_company = updates.insuranceCompany;
    if (updates.insurancePolicyNumber !== undefined) enhancedFields.insurance_policy_number = updates.insurancePolicyNumber;
    if (updates.insuranceHasMixedCoverage !== undefined) enhancedFields.insurance_has_mixed_coverage = updates.insuranceHasMixedCoverage;
    if (updates.tiresFrontDate !== undefined) enhancedFields.tires_front_date = updates.tiresFrontDate ? updates.tiresFrontDate.toISOString().split('T')[0] : null;
    if (updates.tiresFrontBrand !== undefined) enhancedFields.tires_front_brand = updates.tiresFrontBrand;
    if (updates.tiresRearDate !== undefined) enhancedFields.tires_rear_date = updates.tiresRearDate ? updates.tiresRearDate.toISOString().split('T')[0] : null;
    if (updates.tiresRearBrand !== undefined) enhancedFields.tires_rear_brand = updates.tiresRearBrand;
    if (updates.tiresNextChangeDate !== undefined) enhancedFields.tires_next_change_date = updates.tiresNextChangeDate ? updates.tiresNextChangeDate.toISOString().split('T')[0] : null;
    if (updates.lastServiceDate !== undefined) enhancedFields.last_service_date = updates.lastServiceDate ? updates.lastServiceDate.toISOString().split('T')[0] : null;
    if (updates.lastServiceMileage !== undefined) enhancedFields.last_service_mileage = updates.lastServiceMileage;
    if (updates.nextServiceMileage !== undefined) enhancedFields.next_service_mileage = updates.nextServiceMileage;
    if (updates.notes !== undefined) enhancedFields.notes = updates.notes;
    if (updates.category !== undefined) enhancedFields.category = updates.category;

    // First try to update with all fields
    const allFields = { ...basicFields, ...enhancedFields };
    
    const { data, error } = await supabase
      .from('cars')
      .update(allFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // If error is about missing columns, try with only basic fields
      if (error.code === 'PGRST204' || error.message?.includes('Could not find')) {
        console.warn('Some columns not found, updating only basic fields:', error.message);
        
        // Extract which column is missing from error message
        const missingColumnMatch = error.message.match(/Could not find the '(\w+)' column/);
        const missingColumn = missingColumnMatch ? missingColumnMatch[1] : null;
        
        if (missingColumn && enhancedFields[missingColumn] !== undefined) {
          // Remove the missing column and retry
          delete enhancedFields[missingColumn];
          const retryFields = { ...basicFields, ...enhancedFields };
          
          const { data: retryData, error: retryError } = await supabase
            .from('cars')
            .update(retryFields)
            .eq('id', id)
            .select()
            .single();
          
          if (retryError) {
            // If still failing, try with only basic fields
            const { data: basicData, error: basicError } = await supabase
              .from('cars')
              .update(basicFields)
              .eq('id', id)
              .select()
              .single();
            
            if (basicError) {
              console.error('Error updating vehicle even with basic fields:', basicError);
              throw new Error(`Failed to update vehicle: ${basicError.message}. Please run enhance-vehicles-complete.sql migration.`);
            }
            
            console.warn(`Update succeeded with basic fields only. Column '${missingColumn}' missing. Please run enhance-vehicles-complete.sql migration.`);
            return convertRowToVehicle(basicData);
          }
          
          console.warn(`Update succeeded after removing missing column '${missingColumn}'. Please run enhance-vehicles-complete.sql migration.`);
          return convertRowToVehicle(retryData);
        } else {
          // If we can't identify the column, try with only basic fields
          const { data: basicData, error: basicError } = await supabase
            .from('cars')
            .update(basicFields)
            .eq('id', id)
            .select()
            .single();
          
          if (basicError) {
            console.error('Error updating vehicle:', basicError);
            throw new Error(`Failed to update vehicle: ${basicError.message}`);
          }
          
          console.warn('Update succeeded with basic fields only. Some enhanced columns may be missing. Please run enhance-vehicles-complete.sql migration.');
          return convertRowToVehicle(basicData);
        }
      }
      
      console.error('Error updating vehicle:', error);
      throw new Error(`Failed to update vehicle: ${error.message}`);
    }

    return convertRowToVehicle(data);
  }

  /**
   * Delete a vehicle
   */
  static async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      throw new Error(`Failed to delete vehicle: ${error.message}`);
    }
  }

  /**
   * Get vehicle damage history
   */
  static async getVehicleDamageHistory(licensePlate: string, limit: number = 10): Promise<VehicleDamageHistoryItem[]> {
    const { data, error } = await supabase
      .rpc('get_vehicle_last_damages', {
        p_license_plate: licensePlate,
        p_limit: limit
      });

    if (error) {
      console.error('Error fetching vehicle damage history:', error);
      throw new Error(`Failed to fetch damage history: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map((item: any) => ({
      damageId: item.damage_id,
      contractId: item.contract_id,
      contractDate: new Date(item.contract_date),
      renterName: item.renter_name,
      xPosition: item.x_position,
      yPosition: item.y_position,
      viewSide: item.view_side,
      description: item.description,
      severity: item.severity,
      damageReportedAt: new Date(item.damage_reported_at),
    }));
  }

  /**
   * Get vehicle summary (includes vehicle info, contracts, and damages)
   */
  static async getVehicleSummary(licensePlate: string): Promise<VehicleSummary> {
    const { data, error } = await supabase
      .rpc('get_vehicle_summary', {
        p_license_plate: licensePlate
      });

    if (error) {
      console.error('Error fetching vehicle summary:', error);
      throw new Error(`Failed to fetch vehicle summary: ${error.message}`);
    }

    if (!data) {
      return {
        vehicle: null,
        lastContract: null,
        totalContracts: 0,
        totalDamages: 0,
        recentDamages: [],
      };
    }

    const summary = data as any;
    
    return {
      vehicle: summary.vehicle ? convertRowToVehicle(summary.vehicle) : null,
      lastContract: summary.last_contract,
      totalContracts: summary.total_contracts || 0,
      totalDamages: summary.total_damages || 0,
      recentDamages: summary.recent_damages || [],
    };
  }

  /**
   * Get vehicles with expiring documents
   */
  static async getVehiclesWithExpiringDocuments(daysAhead: number = 30): Promise<Vehicle[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .or(`kteo_expiry_date.lte.${futureDateStr},insurance_expiry_date.lte.${futureDateStr}`)
      .order('kteo_expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles with expiring documents:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Search vehicles by text
   */
  static async searchVehicles(query: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .or(`license_plate.ilike.%${query}%,make.ilike.%${query}%,model.ilike.%${query}%`)
      .order('license_plate', { ascending: true });

    if (error) {
      console.error('Error searching vehicles:', error);
      throw new Error(`Failed to search vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Update vehicle availability based on active contracts
   * Cars with active contracts are marked as 'rented', others as 'available'
   */
  static async updateVehicleAvailability(): Promise<void> {
    return updateVehicleAvailability();
  }

  /**
   * Get vehicles with updated availability status
   * This method automatically updates availability before returning vehicles
   */
  static async getAllVehiclesWithUpdatedAvailability(): Promise<Vehicle[]> {
    try {
      // First update availability based on active contracts
      await this.updateVehicleAvailability();
      
      // Then return all vehicles with updated status
      return await this.getAllVehicles();
    } catch (error) {
      console.error('Error getting vehicles with updated availability:', error);
      throw error;
    }
  }

  /**
   * Get vehicles sorted by KTEO expiry date (soonest first)
   */
  static async getVehiclesSortedByKTEO(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .not('kteo_expiry_date', 'is', null)
      .order('kteo_expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles sorted by KTEO:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Get vehicles sorted by insurance expiry date (soonest first)
   */
  static async getVehiclesSortedByInsurance(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .not('insurance_expiry_date', 'is', null)
      .order('insurance_expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles sorted by insurance:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Get vehicles sorted by tire change date (soonest first)
   */
  static async getVehiclesSortedByTires(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .not('tires_next_change_date', 'is', null)
      .order('tires_next_change_date', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles sorted by tires:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Get vehicles sorted by service needs (soonest mileage first)
   */
  static async getVehiclesSortedByService(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .not('next_service_mileage', 'is', null)
      .order('next_service_mileage', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles sorted by service:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Get vehicles sorted by tire change date (needs changing soonest first)
   */
  static async getVehiclesSortedByTireChange(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('tires_next_change_date', { ascending: true, nullsLast: true });

    if (error) {
      console.error('Error fetching vehicles sorted by tire change:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Get vehicles sorted by recent tire changes (most recent first)
   */
  static async getVehiclesSortedByRecentTireChange(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('tires_front_date', { ascending: false, nullsLast: true });

    if (error) {
      console.error('Error fetching vehicles sorted by recent tire change:', error);
      throw new Error(`Failed to fetch vehicles: ${error.message}`);
    }

    return data ? data.map(convertRowToVehicle) : [];
  }

  /**
   * Get vehicles with urgent maintenance (KTEO, insurance, tires, service)
   */
  static async getVehiclesWithUrgentMaintenance(): Promise<Vehicle[]> {
    const allVehicles = await this.getAllVehicles();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const urgentVehicles = allVehicles.filter(v => {
      // Check KTEO
      if (v.kteoExpiryDate) {
        const daysUntilKTEO = Math.floor(
          (v.kteoExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilKTEO <= 30) return true;
      }
      
      // Check Insurance
      if (v.insuranceExpiryDate) {
        const daysUntilInsurance = Math.floor(
          (v.insuranceExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilInsurance <= 30) return true;
      }
      
      // Check Tires
      if (v.tiresNextChangeDate) {
        const daysUntilTireChange = Math.floor(
          (v.tiresNextChangeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilTireChange <= 30) return true;
      }
      
      // Check Service
      if (v.nextServiceMileage && v.currentMileage) {
        const kmUntilService = v.nextServiceMileage - v.currentMileage;
        if (kmUntilService <= 1000) return true;
      }
      
      return false;
    });
    
    return urgentVehicles;
  }

  /**
   * Sync vehicle from contract (create if doesn't exist)
   */
  static async syncVehicleFromContract(
    licensePlate: string,
    make: string,
    model: string,
    year?: number,
    color?: string,
    category?: string
  ): Promise<Vehicle> {
    // Check if exists
    let vehicle = await this.getVehicleByPlate(licensePlate);
    
    if (!vehicle) {
      // Create new vehicle
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Don't pass currentMileage if the column might not exist - let createVehicle handle it
      vehicle = await this.createVehicle({
        userId: currentUser.id,
        licensePlate: licensePlate.toUpperCase().trim(),
        make,
        model,
        year: year || new Date().getFullYear(),
        color: color || null,
        category: (category as VehicleCategory) || 'car',
        // Skip currentMileage - let it be undefined so it's only added if column exists
        status: 'available',
        hasGps: false,
      });
    }
    
    return vehicle;
  }

  /**
   * Sync all vehicles from existing contracts
   * This ensures all vehicles referenced in contracts appear in the vehicles tab
   */
  static async syncAllVehiclesFromContracts(): Promise<{ synced: number; errors: number }> {
    try {
      const { SupabaseContractService } = await import('./supabase-contract.service');
      const contracts = await SupabaseContractService.getAllContracts();
      
      let synced = 0;
      let errors = 0;
      
      for (const contract of contracts) {
        if (contract.carInfo?.licensePlate) {
          try {
            // Parse make and model from makeModel string (format: "Make Model")
            const makeModelParts = contract.carInfo.makeModel?.split(' ') || [];
            const make = makeModelParts[0] || 'Unknown';
            const model = makeModelParts.slice(1).join(' ') || 'Unknown';
            
            await this.syncVehicleFromContract(
              contract.carInfo.licensePlate,
              make,
              model,
              contract.carInfo.year,
              contract.carInfo.color,
              contract.carInfo.category
            );
            synced++;
          } catch (error) {
            console.error(`Error syncing vehicle ${contract.carInfo.licensePlate} from contract:`, error);
            errors++;
          }
        }
      }
      
      console.log(`✅ Synced ${synced} vehicles from contracts. ${errors} errors.`);
      return { synced, errors };
    } catch (error) {
      console.error('Error syncing vehicles from contracts:', error);
      throw error;
    }
  }

  /**
   * Add service history entry
   */
  static async addServiceHistory(historyItem: {
    vehicleId: string;
    serviceType: 'regular' | 'tire_change' | 'kteo' | 'insurance' | 'other';
    serviceDate: Date;
    serviceMileage?: number;
    description?: string;
    cost?: number;
    performedBy?: string;
    notes?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('vehicle_service_history')
      .insert({
        vehicle_id: historyItem.vehicleId,
        service_type: historyItem.serviceType,
        service_date: historyItem.serviceDate.toISOString().split('T')[0],
        service_mileage: historyItem.serviceMileage || null,
        description: historyItem.description || null,
        cost: historyItem.cost || null,
        performed_by: historyItem.performedBy || null,
        notes: historyItem.notes || null,
      });

    if (error) {
      console.error('Error adding service history:', error);
      throw new Error(`Failed to add service history: ${error.message}`);
    }
  }

  /**
   * Get service history for a vehicle
   */
  static async getServiceHistory(vehicleId: string): Promise<ServiceHistoryItem[]> {
    const { data, error } = await supabase
      .from('vehicle_service_history')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('service_date', { ascending: false });

    if (error) {
      console.error('Error fetching service history:', error);
      throw new Error(`Failed to fetch service history: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      vehicleId: item.vehicle_id,
      serviceType: item.service_type,
      serviceDate: new Date(item.service_date),
      serviceMileage: item.service_mileage,
      description: item.description,
      cost: item.cost,
      performedBy: item.performed_by,
      notes: item.notes,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    }));
  }
}

