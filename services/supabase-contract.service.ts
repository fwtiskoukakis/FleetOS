import { supabase } from '../utils/supabase';
import { Contract } from '../models/contract.interface';
import { PhotoStorageService } from './photo-storage.service';
import { updateVehicleAvailability } from '../utils/vehicle-availability';
import { VehicleService } from './vehicle.service';

/**
 * Supabase Contract Service
 * Handles all contract-related database operations with correct schema mappings
 */
export class SupabaseContractService {
  /**
   * Get all contracts for the current user
   */
  static async getAllContracts(): Promise<Contract[]> {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }

      return contracts?.map((c) => this.mapSupabaseToContract(c)) || [];
    } catch (error) {
      console.error('Error in getAllContracts:', error);
      throw error;
    }
  }

  /**
   * Get a single contract by ID
   */
  static async getContractById(id: string): Promise<Contract | null> {
    try {
      const { data: contract, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching contract:', error);
        return null;
      }

      return await this.mapSupabaseToContractAsync(contract);
    } catch (error) {
      console.error('Error in getContractById:', error);
      return null;
    }
  }

  /**
   * Search contracts using full-text search
   */
  static async searchContracts(query: string): Promise<Contract[]> {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .textSearch('search_vector', query, {
          type: 'websearch',
          config: 'greek'
        })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching contracts:', error);
        throw error;
      }

      return contracts?.map((c) => this.mapSupabaseToContract(c)) || [];
    } catch (error) {
      console.error('Error in searchContracts:', error);
      throw error;
    }
  }

  /**
   * Get contracts by date range
   */
  static async getContractsByDateRange(startDate: Date, endDate: Date): Promise<Contract[]> {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .gte('pickup_date', startDate.toISOString())
        .lte('dropoff_date', endDate.toISOString())
        .order('pickup_date', { ascending: false });

      if (error) {
        console.error('Error fetching contracts by date range:', error);
        throw error;
      }

      return contracts?.map((c) => this.mapSupabaseToContract(c)) || [];
    } catch (error) {
      console.error('Error in getContractsByDateRange:', error);
      throw error;
    }
  }

  /**
   * Calculate contract status based on dates
   */
  private static calculateStatus(
    pickupDate: string, 
    dropoffDate: string,
    pickupTime?: string,
    dropoffTime?: string
  ): 'active' | 'completed' | 'upcoming' {
    const now = new Date();
    
    // Parse pickup datetime
    const pickup = new Date(pickupDate);
    if (pickupTime) {
      const [hours, minutes] = pickupTime.split(':').map(Number);
      pickup.setHours(hours, minutes, 0, 0);
    }
    
    // Parse dropoff datetime
    const dropoff = new Date(dropoffDate);
    if (dropoffTime) {
      const [hours, minutes] = dropoffTime.split(':').map(Number);
      dropoff.setHours(hours, minutes, 0, 0);
    }
    
    if (now < pickup) {
      return 'upcoming';
    } else if (now >= pickup && now <= dropoff) {
      return 'active';
    } else {
      return 'completed';
    }
  }

  /**
   * Map Supabase contract to our Contract interface
   * Uses CORRECT schema field names
   */
  private static async mapSupabaseToContractAsync(data: any): Promise<Contract> {
    // Calculate status from dates and times (no status field in database)
    const status = this.calculateStatus(
      data.pickup_date, 
      data.dropoff_date,
      data.pickup_time,
      data.dropoff_time
    );

    // Fetch photos for this contract
    let photoUrls: string[] = [];
    try {
      const photos = await PhotoStorageService.getContractPhotos(data.id);
      photoUrls = photos.map(p => p.photo_url);
    } catch (error) {
      console.error('Error fetching contract photos:', error);
      photoUrls = [];
    }

    return {
      id: data.id,
      userId: data.user_id,
      
      renterInfo: {
        fullName: data.renter_full_name,
        idNumber: data.renter_id_number,
        taxId: data.renter_tax_id,
        driverLicenseNumber: data.renter_driver_license_number,
        phoneNumber: data.renter_phone_number,
        phone: data.renter_phone_number, // Add phone property
        email: data.renter_email || '',
        address: data.renter_address,
      },
      
      rentalPeriod: {
        pickupDate: new Date(data.pickup_date),
        pickupTime: data.pickup_time,
        pickupLocation: data.pickup_location,
        dropoffDate: new Date(data.dropoff_date),
        dropoffTime: data.dropoff_time,
        dropoffLocation: data.dropoff_location,
        isDifferentDropoffLocation: data.is_different_dropoff_location || false,
        totalCost: parseFloat(data.total_cost) || 0,
        depositAmount: parseFloat(data.deposit_amount) || 0,
        insuranceCost: parseFloat(data.insurance_cost) || 0,
      },
      
      carInfo: {
        makeModel: data.car_make_model,
        make: data.car_make_model?.split(' ')[0] || '',
        model: data.car_make_model?.split(' ').slice(1).join(' ') || '',
        year: data.car_year,
        licensePlate: data.car_license_plate,
        mileage: data.car_mileage,
        category: data.car_category,
        color: data.car_color,
      },
      
      carCondition: {
        fuelLevel: data.fuel_level,
        mileage: data.car_mileage,
        insuranceType: data.insurance_type,
        exteriorCondition: data.exterior_condition || 'good',
        interiorCondition: data.interior_condition || 'good',
        mechanicalCondition: data.mechanical_condition || 'good',
        notes: data.condition_notes,
      },
      
      damagePoints: data.damage_points?.map((dp: any) => ({
        id: dp.id,
        x: dp.x_position,
        y: dp.y_position,
        view: dp.view_side,
        description: dp.description,
        severity: dp.severity,
        markerType: dp.marker_type || 'slight-scratch',
        timestamp: new Date(dp.created_at),
      })) || [],
      
      photoUris: photoUrls,
      clientSignature: data.client_signature_url || '',
      
      status,
      observations: data.observations || undefined,
      aadeStatus: data.aade_status || null,
      aadeDclId: data.aade_dcl_id || null,
      createdAt: new Date(data.created_at),
    };
  }
  
  /**
   * Synchronous version for backwards compatibility
   */
  private static mapSupabaseToContract(data: any): Contract {
    const status = this.calculateStatus(
      data.pickup_date, 
      data.dropoff_date,
      data.pickup_time,
      data.dropoff_time
    );

    return {
      id: data.id,
      userId: data.user_id,
      
      renterInfo: {
        fullName: data.renter_full_name,
        idNumber: data.renter_id_number,
        taxId: data.renter_tax_id,
        driverLicenseNumber: data.renter_driver_license_number,
        phoneNumber: data.renter_phone_number,
        phone: data.renter_phone_number,
        email: data.renter_email || '',
        address: data.renter_address,
      },
      
      rentalPeriod: {
        pickupDate: new Date(data.pickup_date),
        pickupTime: data.pickup_time,
        pickupLocation: data.pickup_location,
        dropoffDate: new Date(data.dropoff_date),
        dropoffTime: data.dropoff_time,
        dropoffLocation: data.dropoff_location,
        isDifferentDropoffLocation: data.is_different_dropoff_location || false,
        totalCost: parseFloat(data.total_cost) || 0,
        depositAmount: parseFloat(data.deposit_amount) || 0,
        insuranceCost: parseFloat(data.insurance_cost) || 0,
      },
      
      carInfo: {
        makeModel: data.car_make_model,
        make: data.car_make_model?.split(' ')[0] || '',
        model: data.car_make_model?.split(' ').slice(1).join(' ') || '',
        year: data.car_year,
        licensePlate: data.car_license_plate,
        mileage: data.car_mileage,
        category: data.car_category,
        color: data.car_color,
      },
      
      carCondition: {
        fuelLevel: data.fuel_level,
        mileage: data.car_mileage,
        insuranceType: data.insurance_type,
        exteriorCondition: data.exterior_condition || 'good',
        interiorCondition: data.interior_condition || 'good',
        mechanicalCondition: data.mechanical_condition || 'good',
        notes: data.condition_notes,
      },
      
      damagePoints: data.damage_points?.map((dp: any) => ({
        id: dp.id,
        x: dp.x_position,
        y: dp.y_position,
        view: dp.view_side,
        description: dp.description,
        severity: dp.severity,
        markerType: dp.marker_type || 'slight-scratch',
        timestamp: new Date(dp.created_at),
      })) || [],
      
      photoUris: [], // Will be fetched separately with async version
      clientSignature: data.client_signature_url || '',
      
      status,
      observations: data.observations || undefined,
      aadeStatus: data.aade_status || null,
      aadeDclId: data.aade_dcl_id || null,
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Get active contracts (currently ongoing)
   */
  static async getActiveContracts(): Promise<Contract[]> {
    try {
      const now = new Date().toISOString();
      
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .lte('pickup_date', now)
        .gte('dropoff_date', now)
        .order('pickup_date', { ascending: false });

      if (error) {
        console.error('Error fetching active contracts:', error);
        throw error;
      }

      return contracts?.map((c) => this.mapSupabaseToContract(c)) || [];
    } catch (error) {
      console.error('Error in getActiveContracts:', error);
      throw error;
    }
  }

  /**
   * Get completed contracts
   */
  static async getCompletedContracts(): Promise<Contract[]> {
    try {
      const now = new Date().toISOString();
      
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .lt('dropoff_date', now)
        .order('dropoff_date', { ascending: false });

      if (error) {
        console.error('Error fetching completed contracts:', error);
        throw error;
      }

      return contracts?.map((c) => this.mapSupabaseToContract(c)) || [];
    } catch (error) {
      console.error('Error in getCompletedContracts:', error);
      throw error;
    }
  }

  /**
   * Get upcoming contracts
   */
  static async getUpcomingContracts(): Promise<Contract[]> {
    try {
      const now = new Date().toISOString();
      
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .gt('pickup_date', now)
        .order('pickup_date', { ascending: true });

      if (error) {
        console.error('Error fetching upcoming contracts:', error);
        throw error;
      }

      return contracts?.map((c) => this.mapSupabaseToContract(c)) || [];
    } catch (error) {
      console.error('Error in getUpcomingContracts:', error);
      throw error;
    }
  }

  /**
   * Get contracts by car license plate
   */
  static async getContractsByCarLicensePlate(licensePlate: string): Promise<Contract[]> {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .eq('car_license_plate', licensePlate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts by car:', error);
        throw error;
      }

      return contracts?.map((c) => this.mapSupabaseToContract(c)) || [];
    } catch (error) {
      console.error('Error in getContractsByCarLicensePlate:', error);
      throw error;
    }
  }

  /**
   * Save a new contract
   */
  static async saveContract(contract: Contract): Promise<Contract> {
    try {
      // First, insert the contract
      const contractData = {
        id: contract.id,
        user_id: contract.userId,
        
        // Renter info
        renter_full_name: contract.renterInfo.fullName,
        renter_id_number: contract.renterInfo.idNumber,
        renter_tax_id: contract.renterInfo.taxId,
        renter_driver_license_number: contract.renterInfo.driverLicenseNumber,
        renter_phone_number: contract.renterInfo.phoneNumber,
        renter_email: contract.renterInfo.email,
        renter_address: contract.renterInfo.address,
        
        // Rental period
        pickup_date: contract.rentalPeriod.pickupDate.toISOString(),
        pickup_time: contract.rentalPeriod.pickupTime,
        pickup_location: contract.rentalPeriod.pickupLocation,
        dropoff_date: contract.rentalPeriod.dropoffDate.toISOString(),
        dropoff_time: contract.rentalPeriod.dropoffTime,
        dropoff_location: contract.rentalPeriod.dropoffLocation,
        is_different_dropoff_location: contract.rentalPeriod.isDifferentDropoffLocation,
        total_cost: contract.rentalPeriod.totalCost,
        deposit_amount: contract.rentalPeriod.depositAmount || 0,
        insurance_cost: contract.rentalPeriod.insuranceCost || 0,
        
        // Car info
        car_make_model: contract.carInfo.makeModel,
        car_year: contract.carInfo.year,
        car_license_plate: contract.carInfo.licensePlate,
        car_mileage: contract.carCondition?.mileage || contract.carInfo.mileage || 0,
        car_category: contract.carInfo.category,
        car_color: contract.carInfo.color,
        
        // Car condition
        fuel_level: contract.carCondition.fuelLevel,
        insurance_type: contract.carCondition.insuranceType,
        exterior_condition: contract.carCondition.exteriorCondition,
        interior_condition: contract.carCondition.interiorCondition,
        mechanical_condition: contract.carCondition.mechanicalCondition,
        condition_notes: contract.carCondition.notes,
        
        // Additional observations
        observations: contract.observations || null,
        
        // Signature
        client_signature_url: contract.clientSignature,
        
        // AADE
        aade_status: contract.aadeStatus || null,
        aade_dcl_id: contract.aadeDclId || null,
      };

      const { data: savedContract, error: contractError } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (contractError) {
        console.error('Error saving contract:', contractError);
        throw contractError;
      }

      // Ensure we have the saved contract with ID from database
      if (!savedContract || !savedContract.id) {
        throw new Error('Failed to save contract: No contract ID returned from database');
      }

      const contractId = savedContract.id; // Use the ID from the saved contract in database

      // Then, insert damage points if any - ONLY after contract is saved
      if (contract.damagePoints && contract.damagePoints.length > 0) {
        const damagePointsData = contract.damagePoints.map(dp => {
          // Create descriptive location from view_side
          const viewNames: Record<string, string> = {
            'front': 'Front',
            'rear': 'Rear',
            'left': 'Left',
            'right': 'Right'
          };
          const location = viewNames[dp.view] || dp.view || 'Unknown';
          
          return {
            contract_id: contractId, // Use saved contract ID from database
            location: location, // Required field: descriptive location
            x_position: dp.x,
            y_position: dp.y,
            view_side: dp.view,
            description: dp.description || '',
            severity: dp.severity,
            marker_type: dp.markerType,
          };
        });

        const { error: damageError } = await supabase
          .from('damage_points')
          .insert(damagePointsData);

        if (damageError) {
          console.error('Error saving damage points:', damageError);
          // Don't throw, contract is already saved
        } else {
          console.log(`✅ Saved ${damagePointsData.length} damage points for contract ${contractId}`);
        }
      }

      // Upload photos if any - ONLY after contract is saved
      if (contract.photoUris && contract.photoUris.length > 0) {
        try {
          await PhotoStorageService.saveContractPhotos(contractId, contract.photoUris); // Use saved contract ID
          console.log(`✅ Uploaded ${contract.photoUris.length} photos for contract ${contractId}`);
        } catch (error) {
          console.error('Error uploading contract photos:', error);
          // Don't throw, contract is already saved
        }
      }

      // Auto-sync vehicle from contract (create if doesn't exist)
      if (contract.carInfo.licensePlate) {
        try {
          // Parse make and model from makeModel string (format: "Make Model")
          const makeModelParts = contract.carInfo.makeModel.split(' ');
          const make = makeModelParts[0] || 'Unknown';
          const model = makeModelParts.slice(1).join(' ') || 'Unknown';
          
          await VehicleService.syncVehicleFromContract(
            contract.carInfo.licensePlate,
            make,
            model,
            contract.carInfo.year,
            contract.carInfo.color,
            contract.carInfo.category
          );
          console.log(`✅ Synced vehicle ${contract.carInfo.licensePlate} from contract`);
        } catch (error) {
          console.error('Error syncing vehicle from contract:', error);
          // Don't throw, contract is already saved
        }
      }

      // Update vehicle availability based on active contracts
      try {
        await updateVehicleAvailability();
        console.log('✅ Updated vehicle availability after contract creation');
      } catch (error) {
        console.error('Error updating vehicle availability:', error);
        // Don't throw, contract is already saved
      }

      return await this.mapSupabaseToContractAsync(savedContract);
    } catch (error) {
      console.error('Error in saveContract:', error);
      throw error;
    }
  }

  /**
   * Update an existing contract
   */
  static async updateContract(id: string, contract: Contract): Promise<Contract> {
    try {
      // Update the contract - only include fields that definitely exist
      const contractData: any = {
        user_id: contract.userId,
        
        // Renter info (these should exist)
        renter_full_name: contract.renterInfo.fullName,
        renter_id_number: contract.renterInfo.idNumber,
        renter_tax_id: contract.renterInfo.taxId,
        renter_driver_license_number: contract.renterInfo.driverLicenseNumber,
        renter_phone_number: contract.renterInfo.phoneNumber,
        renter_email: contract.renterInfo.email,
        renter_address: contract.renterInfo.address,
        
        // Rental period (these should exist)
        pickup_date: contract.rentalPeriod.pickupDate.toISOString(),
        pickup_time: contract.rentalPeriod.pickupTime,
        pickup_location: contract.rentalPeriod.pickupLocation,
        dropoff_date: contract.rentalPeriod.dropoffDate.toISOString(),
        dropoff_time: contract.rentalPeriod.dropoffTime,
        dropoff_location: contract.rentalPeriod.dropoffLocation,
        is_different_dropoff_location: contract.rentalPeriod.isDifferentDropoffLocation,
        total_cost: contract.rentalPeriod.totalCost,
        
        // Car info (these should exist)
        car_make_model: contract.carInfo.makeModel,
        car_year: contract.carInfo.year,
        car_license_plate: contract.carInfo.licensePlate,
        car_mileage: contract.carCondition?.mileage || contract.carInfo.mileage || 0,
        
        // Car condition (these should exist)
        fuel_level: contract.carCondition.fuelLevel,
        insurance_type: contract.carCondition.insuranceType,
        
        // Signature (should exist)
        client_signature_url: contract.clientSignature,
        
        // Additional observations
        observations: contract.observations || null,
        
        // AADE (these should exist)
        aade_status: contract.aadeStatus || null,
        aade_dcl_id: contract.aadeDclId || null,
      };

      // Add optional fields only if they have values (prevents 406 if column doesn't exist)
      if (contract.rentalPeriod.depositAmount) contractData.deposit_amount = contract.rentalPeriod.depositAmount;
      if (contract.rentalPeriod.insuranceCost) contractData.insurance_cost = contract.rentalPeriod.insuranceCost;
      if (contract.carInfo.category) contractData.car_category = contract.carInfo.category;
      if (contract.carInfo.color) contractData.car_color = contract.carInfo.color;
      if (contract.carCondition.exteriorCondition) contractData.exterior_condition = contract.carCondition.exteriorCondition;
      if (contract.carCondition.interiorCondition) contractData.interior_condition = contract.carCondition.interiorCondition;
      if (contract.carCondition.mechanicalCondition) contractData.mechanical_condition = contract.carCondition.mechanicalCondition;
      if (contract.carCondition.notes) contractData.condition_notes = contract.carCondition.notes;

      // First try to update without select to avoid 406 errors
      console.log('Updating contract with ID:', id);
      const { error: updateError } = await supabase
        .from('contracts')
        .update(contractData)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating contract:', updateError);
        throw updateError;
      }

      console.log('✅ Contract updated successfully in database!');

      // Then fetch the updated contract separately
      const { data: updatedContract, error: fetchError } = await supabase
        .from('contracts')
        .select(`
          *,
          damage_points(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError || !updatedContract) {
        console.error('Error fetching updated contract:', fetchError);
        console.log('⚠️ Fetch failed but update succeeded, returning input contract');
        // Even if fetch fails, update succeeded, so just return the input contract
        return contract;
      }

      console.log('✅ Fetched updated contract successfully!');

      // Delete old damage points and insert new ones
      await supabase
        .from('damage_points')
        .delete()
        .eq('contract_id', id);

      if (contract.damagePoints && contract.damagePoints.length > 0) {
        const damagePointsData = contract.damagePoints.map(dp => {
          // Create descriptive location from view_side
          const viewNames: Record<string, string> = {
            'front': 'Front',
            'rear': 'Rear',
            'left': 'Left',
            'right': 'Right'
          };
          const location = viewNames[dp.view] || dp.view || 'Unknown';
          
          return {
            contract_id: id,
            location: location, // Required field: descriptive location
            x_position: dp.x,
            y_position: dp.y,
            view_side: dp.view,
            description: dp.description || '',
            severity: dp.severity,
            marker_type: dp.markerType,
          };
        });

        const { error: damageError } = await supabase
          .from('damage_points')
          .insert(damagePointsData);

        if (damageError) {
          console.error('Error saving damage points:', damageError);
        }
      }

      // Handle photo updates if there are new photos
      if (contract.photoUris && contract.photoUris.length > 0) {
        // Check if photos are local URIs (need upload) or URLs (already uploaded)
        const localPhotos = contract.photoUris.filter(uri => 
          uri.startsWith('file://') || uri.startsWith('content://')
        );
        
        if (localPhotos.length > 0) {
          try {
            // Delete existing photos
            await PhotoStorageService.deleteContractPhotos(id);
            
            // Upload new photos
            await PhotoStorageService.saveContractPhotos(id, localPhotos);
            console.log(`✅ Updated ${localPhotos.length} photos for contract ${id}`);
          } catch (error) {
            console.error('Error updating contract photos:', error);
          }
        }
      }

      // Auto-sync vehicle from contract (create if doesn't exist)
      if (contract.carInfo?.licensePlate) {
        try {
          // Parse make and model from makeModel string (format: "Make Model")
          const makeModelParts = contract.carInfo.makeModel?.split(' ') || [];
          const make = makeModelParts[0] || 'Unknown';
          const model = makeModelParts.slice(1).join(' ') || 'Unknown';
          
          await VehicleService.syncVehicleFromContract(
            contract.carInfo.licensePlate,
            make,
            model,
            contract.carInfo.year,
            contract.carInfo.color,
            contract.carInfo.category
          );
          console.log(`✅ Synced vehicle ${contract.carInfo.licensePlate} from contract update`);
        } catch (error) {
          console.error('Error syncing vehicle from contract update:', error);
          // Don't throw, contract is already updated
        }
      }

      // Update vehicle availability based on active contracts
      try {
        await updateVehicleAvailability();
        console.log('✅ Updated vehicle availability after contract update');
      } catch (error) {
        console.error('Error updating vehicle availability:', error);
        // Don't throw, contract is already updated
      }

      return await this.mapSupabaseToContractAsync(updatedContract);
    } catch (error) {
      console.error('Error in updateContract:', error);
      throw error;
    }
  }

  /**
   * Delete a contract
   */
  static async deleteContract(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting contract:', error);
        throw error;
      }

      // Update vehicle availability based on active contracts
      try {
        await updateVehicleAvailability();
        console.log('✅ Updated vehicle availability after contract deletion');
      } catch (error) {
        console.error('Error updating vehicle availability:', error);
        // Don't throw, contract is already deleted
      }
    } catch (error) {
      console.error('Error in deleteContract:', error);
      throw error;
    }
  }

  /**
   * Bulk delete contracts
   */
  static async bulkDeleteContracts(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Error bulk deleting contracts:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in bulkDeleteContracts:', error);
      throw error;
    }
  }
}
