export interface RenterInfo {
  fullName: string;
  idNumber: string;
  taxId: string; // ΑΦΜ - Tax Identification Number
  driverLicenseNumber: string;
  phoneNumber: string;
  phone: string; // Alternative phone property
  email: string;
  address: string;
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
  depositAmount?: number; // Deposit amount
  insuranceCost?: number; // Insurance cost
}

export interface CarCondition {
  fuelLevel: number; // 1-8 scale (1/8 to 8/8)
  mileage: number; // kilometers
  insuranceType: 'basic' | 'full';
  exteriorCondition: string; // Exterior condition description
  interiorCondition: string; // Interior condition description
  mechanicalCondition: string; // Mechanical condition description
  notes?: string; // Additional notes about vehicle condition
}

export interface CarInfo {
  makeModel: string; // Combined make and model
  make: string; // Vehicle make
  model: string; // Vehicle model
  year: number;
  licensePlate: string;
  mileage: number;
  category?: string; // Vehicle category: car, atv, scooter, motorcycle
  color?: string; // Vehicle color
}

export type DamageMarkerType = 'slight-scratch' | 'heavy-scratch' | 'bent' | 'broken';

export interface DamagePoint {
  id: string;
  x: number; // percentage position
  y: number; // percentage position
  view: 'front' | 'rear' | 'left' | 'right'; // which side of the car
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  markerType: DamageMarkerType; // Type of damage marker
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  signature: string; // Base64 encoded signature image
  signatureUrl?: string; // URL to signature in Supabase storage
  // AADE Integration Fields
  aadeUserId?: string; // AADE User ID for myDATA
  aadeSubscriptionKey?: string; // AADE Subscription Key
  companyVatNumber?: string; // Company VAT Number (ΑΦΜ)
  companyName?: string; // Company legal name
  companyAddress?: string; // Company registered address
  companyActivity?: string; // Company business activity
  aadeEnabled?: boolean; // Whether AADE integration is enabled
  createdAt: Date;
  updatedAt?: Date;
}

export interface Contract {
  id: string;
  contractNumber?: string;
  organizationId?: string;
  renterInfo: RenterInfo;
  rentalPeriod: RentalPeriod;
  carInfo: CarInfo;
  carCondition: CarCondition;
  damagePoints: DamagePoint[];
  photoUris: string[];
  clientSignature: string; // Base64 encoded signature image
  userId: string; // ID of the user who created the contract
  status: 'active' | 'completed' | 'upcoming'; // Calculated from rental dates
  aadeStatus?: 'pending' | 'submitted' | 'completed' | 'cancelled' | 'error' | null; // AADE submission status
  aadeDclId?: number | null; // AADE Digital Client ID
  observations?: string; // Additional notes and observations about the rental
  createdAt: Date;
  tags?: string[];
  categoryId?: string;
  photos?: string[];
  clientSignaturePaths?: string[];
  error?: string;
}

