/**
 * Vehicle interface for fleet management
 */

export type VehicleCategory = 'car' | 'atv' | 'scooter' | 'motorcycle' | 'van' | 'truck';
export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'retired';
export type InsuranceType = 'basic' | 'full';

export interface TireInfo {
  frontDate?: Date | null;
  frontBrand?: string | null;
  rearDate?: Date | null;
  rearBrand?: string | null;
}

export interface KTEOInfo {
  lastDate?: Date | null;
  expiryDate?: Date | null;
}

export interface InsuranceInfo {
  type?: InsuranceType | null;
  expiryDate?: Date | null;
  company?: string | null;
  policyNumber?: string | null;
}

export interface Vehicle {
  id: string;
  userId: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  category?: VehicleCategory | null;
  currentMileage: number;
  status: VehicleStatus;
  
  // GPS Tracking
  hasGps?: boolean;
  
  // KTEO Information
  kteoLastDate?: Date | null;
  kteoExpiryDate?: Date | null;
  
  // Insurance Information
  insuranceType?: InsuranceType | null;
  insuranceExpiryDate?: Date | null;
  insuranceCompany?: string | null;
  insurancePolicyNumber?: string | null;
  
  // Tire Information
  tiresFrontDate?: Date | null;
  tiresFrontBrand?: string | null;
  tiresRearDate?: Date | null;
  tiresRearBrand?: string | null;
  tiresNextChangeDate?: Date | null;
  
  // Insurance Extended Information
  insuranceHasMixedCoverage?: boolean | null;
  
  // Service Tracking
  lastServiceDate?: Date | null;
  lastServiceMileage?: number | null;
  nextServiceMileage?: number | null;
  
  // Notes
  notes?: string | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDamageHistoryItem {
  damageId: string;
  contractId: string;
  contractDate: Date;
  renterName: string;
  xPosition: number;
  yPosition: number;
  viewSide: 'front' | 'rear' | 'left' | 'right';
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  damageReportedAt: Date;
}

export interface VehicleSummary {
  vehicle: Vehicle | null;
  lastContract: any | null;
  totalContracts: number;
  totalDamages: number;
  recentDamages: VehicleDamageHistoryItem[];
}

/**
 * Service History Item
 */
export interface ServiceHistoryItem {
  id: string;
  vehicleId: string;
  serviceType: 'regular' | 'tire_change' | 'kteo' | 'insurance' | 'other';
  serviceDate: Date;
  serviceMileage?: number | null;
  description?: string | null;
  cost?: number | null;
  performedBy?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

