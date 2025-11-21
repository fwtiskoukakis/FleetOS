/**
 * Contract Utilities
 * Same logic as mobile app for calculating contract status
 */

export type ContractStatus = 'active' | 'completed' | 'upcoming';

export interface Contract {
  id: string;
  renter_full_name?: string;
  renter_email?: string;
  renter_phone_number?: string;
  car_license_plate?: string;
  car_make_model?: string;
  pickup_date: string;
  pickup_time?: string;
  dropoff_date: string;
  dropoff_time?: string;
  pickup_location?: string;
  dropoff_location?: string;
  total_cost?: number;
  total_price?: number;
  status?: string;
  damage_points?: any[];
  aade_status?: string;
  aade_dcl_id?: number;
}

/**
 * Calculate actual contract status based on dates (same as mobile app)
 */
export function getActualContractStatus(contract: Contract): ContractStatus {
  try {
    const now = new Date();
    
    // Validate and parse pickup datetime
    const pickupDate = new Date(contract.pickup_date);
    if (isNaN(pickupDate.getTime())) {
      console.warn('Invalid pickup date for contract:', contract.id);
      return (contract.status as ContractStatus) || 'upcoming';
    }
    
    const pickupTimeParts = contract.pickup_time?.split(':') || ['00', '00'];
    const pickupHours = parseInt(pickupTimeParts[0]) || 0;
    const pickupMinutes = parseInt(pickupTimeParts[1]) || 0;
    pickupDate.setHours(pickupHours, pickupMinutes, 0, 0);
    
    // Validate and parse dropoff datetime
    const dropoffDate = new Date(contract.dropoff_date);
    if (isNaN(dropoffDate.getTime())) {
      console.warn('Invalid dropoff date for contract:', contract.id);
      return (contract.status as ContractStatus) || 'upcoming';
    }
    
    const dropoffTimeParts = contract.dropoff_time?.split(':') || ['23', '59'];
    const dropoffHours = parseInt(dropoffTimeParts[0]) || 23;
    const dropoffMinutes = parseInt(dropoffTimeParts[1]) || 59;
    dropoffDate.setHours(dropoffHours, dropoffMinutes, 0, 0);
    
    // Check if dates are valid after setting time
    if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
      console.warn('Invalid dates after time parsing for contract:', contract.id);
      return (contract.status as ContractStatus) || 'upcoming';
    }
    
    // Determine actual status based on current time
    if (now < pickupDate) {
      return 'upcoming';
    } else if (now >= pickupDate && now <= dropoffDate) {
      return 'active';
    } else {
      return 'completed';
    }
  } catch (error) {
    console.error('Error calculating contract status:', error);
    return (contract.status as ContractStatus) || 'upcoming';
  }
}

/**
 * Get status color (same as mobile app)
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#34C759';
    case 'completed': return '#8E8E93';
    case 'upcoming': return '#007AFF';
    default: return '#8E8E93';
  }
}

/**
 * Get status label in Greek (same as mobile app)
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Ενεργό';
    case 'completed': return 'Ολοκληρωμένο';
    case 'upcoming': return 'Επερχόμενο';
    default: return status;
  }
}

