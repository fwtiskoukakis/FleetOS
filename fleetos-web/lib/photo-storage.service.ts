/**
 * Photo Storage Service for Web
 * Handles uploading and managing photos in Supabase Storage
 */

import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export class PhotoStorageService {
  // Storage bucket names (matching mobile app)
  private static readonly BUCKET_CONTRACT_PHOTOS = 'contract-photos';
  private static readonly BUCKET_CAR_PHOTOS = 'car-photos';
  private static readonly BUCKET_SIGNATURES = 'signatures';

  /**
   * Upload a contract photo (from base64 data URL)
   * @param contractId Contract ID
   * @param photoDataUrl Base64 data URL of the photo
   * @param index Photo index/order
   * @returns Upload result with public URL
   */
  static async uploadContractPhotoFromBase64(
    contractId: string,
    photoDataUrl: string,
    index: number
  ): Promise<UploadResult> {
    try {
      // Generate unique filename (matching mobile app format)
      const timestamp = Date.now();
      const fileName = `${contractId}/photo_${index}_${timestamp}.jpg`;

      // Convert data URL to blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_CONTRACT_PHOTOS)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading contract photo:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_CONTRACT_PHOTOS)
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        path: fileName,
        size: blob.size,
      };
    } catch (error) {
      console.error('Error in uploadContractPhotoFromBase64:', error);
      throw error;
    }
  }

  /**
   * Upload multiple contract photos
   */
  static async uploadContractPhotos(
    contractId: string,
    photoDataUrls: string[]
  ): Promise<UploadResult[]> {
    const uploadPromises = photoDataUrls.map((photoDataUrl, index) =>
      this.uploadContractPhotoFromBase64(contractId, photoDataUrl, index)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Upload signature from base64 data URL
   * @param contractId Contract ID
   * @param signatureDataUrl Base64 data URL of the signature
   * @param type Signature type ('client' or 'owner')
   * @returns Upload result with public URL
   */
  static async uploadSignatureFromBase64(
    contractId: string,
    signatureDataUrl: string,
    type: 'client' | 'owner' = 'client'
  ): Promise<UploadResult> {
    try {
      // Generate filename (matching mobile app format)
      const timestamp = Date.now();
      const fileName = `${contractId}/${type}_signature_${timestamp}.svg`;

      // For SVG data URLs, extract the SVG content
      let blob: Blob;
      if (signatureDataUrl.startsWith('data:image/svg+xml')) {
        const base64Data = signatureDataUrl.split(',')[1];
        const svgContent = decodeURIComponent(escape(atob(base64Data)));
        blob = new Blob([svgContent], { type: 'image/svg+xml' });
      } else {
        // For other image formats
        const response = await fetch(signatureDataUrl);
        blob = await response.blob();
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_SIGNATURES)
        .upload(fileName, blob, {
          contentType: signatureDataUrl.startsWith('data:image/svg+xml') ? 'image/svg+xml' : 'image/png',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading signature:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_SIGNATURES)
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        path: fileName,
        size: blob.size,
      };
    } catch (error) {
      console.error('Error in uploadSignatureFromBase64:', error);
      throw error;
    }
  }

  /**
   * Get contract photos from database
   */
  static async getContractPhotos(contractId: string): Promise<{ id: string; photo_url: string }[]> {
    try {
      const { data, error } = await supabase
        .from('contract_photos')
        .select('id, photo_url')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true }); // Use created_at for ordering since display_order doesn't exist in schema

      if (error) {
        console.error('Error loading contract photos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getContractPhotos:', error);
      return [];
    }
  }
}

