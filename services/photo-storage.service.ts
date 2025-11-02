/**
 * Photo Storage Service
 * Handles uploading and managing photos in Supabase Storage
 */

import { supabase } from '../utils/supabase';
import * as FileSystem from 'expo-file-system/legacy';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export class PhotoStorageService {
  // Storage bucket names
  private static readonly BUCKET_CONTRACT_PHOTOS = 'contract-photos';
  private static readonly BUCKET_CAR_PHOTOS = 'car-photos';
  private static readonly BUCKET_SIGNATURES = 'signatures';

  /**
   * Upload a contract photo
   * @param contractId Contract ID
   * @param photoUri Local URI of the photo
   * @param index Photo index/order
   * @returns Upload result with public URL
   */
  static async uploadContractPhoto(
    contractId: string,
    photoUri: string,
    index: number
  ): Promise<UploadResult> {
    try {
      console.log('Starting upload for contract:', contractId, 'photo:', photoUri, 'index:', index);

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${contractId}/photo_${index}_${timestamp}.jpg`;

      console.log('Generated filename:', fileName);

      // Read file as base64 and convert to ArrayBuffer for Supabase
      console.log('Reading file from:', photoUri);
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('File read as base64, length:', base64.length);

      // Convert base64 to ArrayBuffer (React Native compatible)
      const arrayBuffer = this.base64ToArrayBuffer(base64);

      console.log('Converted to ArrayBuffer, size:', arrayBuffer.byteLength, 'bytes');

      // Get Supabase URL and key for direct fetch
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      // Get user session token for authenticated requests (required for RLS)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        throw new Error('User not authenticated. Please sign in to upload photos.');
      }

      // Encode individual path segments but preserve slashes
      // Supabase Storage expects: /storage/v1/object/{bucket}/{path}
      // Path can contain slashes, so we encode each segment
      const pathSegments = fileName.split('/').map(segment => encodeURIComponent(segment));
      const encodedPath = pathSegments.join('/');
      
      // Get the storage endpoint URL (Supabase Storage API format)
      const storageUrl = `${supabaseUrl}/storage/v1/object/${this.BUCKET_CONTRACT_PHOTOS}/${encodedPath}`;
      
      console.log('Uploading to:', storageUrl);

      // Convert ArrayBuffer to Uint8Array for fetch (React Native compatible)
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload using fetch API directly (more reliable on React Native)
      // Use user's access token for RLS policies to work
      const response = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`, // User's session token for RLS
          'Content-Type': 'image/jpeg',
          'apikey': supabaseKey,
          'x-upsert': 'false',
          'cache-control': '3600',
        },
        body: uint8Array,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        // Response might not be JSON, that's okay
        data = { path: fileName };
      }
      
      console.log('Storage upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_CONTRACT_PHOTOS)
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      const size = fileInfo.exists ? (fileInfo.size || 0) : 0;

      console.log('File info:', fileInfo);

      return {
        url: publicUrl,
        path: fileName,
        size,
      };
    } catch (error) {
      console.error('Error in uploadContractPhoto:', error);
      throw error;
    }
  }

  /**
   * Upload a car/vehicle photo
   * @param vehicleId Vehicle ID or license plate
   * @param photoUri Local URI of the photo
   * @param photoType Type of photo (exterior, interior, damage, etc)
   * @returns Upload result with public URL
   */
  static async uploadCarPhoto(
    vehicleId: string,
    photoUri: string,
    photoType: string = 'general'
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const fileName = `${vehicleId}/${photoType}_${timestamp}.jpg`;
      
      // Read file as base64 and convert to ArrayBuffer for Supabase
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer (React Native compatible)
      const arrayBuffer = this.base64ToArrayBuffer(base64);
      
      const { data, error } = await supabase.storage
        .from(this.BUCKET_CAR_PHOTOS)
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading car photo:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_CAR_PHOTOS)
        .getPublicUrl(fileName);

      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      const size = fileInfo.exists ? (fileInfo.size || 0) : 0;

      return {
        url: publicUrl,
        path: fileName,
        size,
      };
    } catch (error) {
      console.error('Error in uploadCarPhoto:', error);
      throw error;
    }
  }

  /**
   * Upload a damage photo (stores in car-photos bucket with damage prefix)
   * @param vehicleId Vehicle ID or license plate
   * @param damageId Damage point ID
   * @param photoUri Local URI of the photo
   * @returns Upload result with public URL
   */
  static async uploadDamagePhoto(
    vehicleId: string,
    damageId: string,
    photoUri: string
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const fileName = `${vehicleId}/damage_${damageId}_${timestamp}.jpg`;
      
      // Read file as base64 and convert to ArrayBuffer for Supabase
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer (React Native compatible)
      const arrayBuffer = this.base64ToArrayBuffer(base64);
      
      const { data, error } = await supabase.storage
        .from(this.BUCKET_CAR_PHOTOS)
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading damage photo:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_CAR_PHOTOS)
        .getPublicUrl(fileName);

      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      const size = fileInfo.exists ? (fileInfo.size || 0) : 0;

      return {
        url: publicUrl,
        path: fileName,
        size,
      };
    } catch (error) {
      console.error('Error in uploadDamagePhoto:', error);
      throw error;
    }
  }

  /**
   * Upload a signature
   * @param userId User ID
   * @param signatureUri Local URI of the signature image
   * @param signatureType Type of signature (user, client, etc)
   * @returns Upload result with public URL
   */
  static async uploadSignature(
    userId: string,
    signatureUri: string,
    signatureType: 'user' | 'client' = 'client'
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const fileName = `${userId}/${signatureType}_signature_${timestamp}.png`;
      
      // Read file as base64 and convert to ArrayBuffer for Supabase
      const base64 = await FileSystem.readAsStringAsync(signatureUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer (React Native compatible)
      const arrayBuffer = this.base64ToArrayBuffer(base64);
      
      const { data, error } = await supabase.storage
        .from(this.BUCKET_SIGNATURES)
        .upload(fileName, arrayBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading signature:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_SIGNATURES)
        .getPublicUrl(fileName);

      const fileInfo = await FileSystem.getInfoAsync(signatureUri);
      const size = fileInfo.exists ? (fileInfo.size || 0) : 0;

      return {
        url: publicUrl,
        path: fileName,
        size,
      };
    } catch (error) {
      console.error('Error in uploadSignature:', error);
      throw error;
    }
  }

  /**
   * Upload signature from base64 data URI (for migrating from database)
   * @param userId User ID or contract ID
   * @param base64DataUri Base64 data URI (data:image/svg+xml;base64,... or data:image/png;base64,...)
   * @param signatureType Type of signature (user, client, etc)
   * @returns Upload result with public URL
   */
  static async uploadSignatureFromBase64(
    userId: string,
    base64DataUri: string,
    signatureType: 'user' | 'client' = 'client'
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const fileName = `contracts/${userId}/${signatureType}_signature_${timestamp}.png`;
      
      // Extract base64 string from data URI
      const base64Match = base64DataUri.match(/data:image\/(\w+);base64,(.+)/);
      if (!base64Match) {
        throw new Error('Invalid base64 data URI format');
      }
      
      const imageFormat = base64Match[1]; // svg or png
      const base64String = base64Match[2];
      
      // Convert base64 to ArrayBuffer (React Native compatible)
      const arrayBuffer = this.base64ToArrayBuffer(base64String);
      
      // Determine content type based on image format
      const contentType = imageFormat === 'svg' ? 'image/svg+xml' : 'image/png';
      
      console.log('Uploading signature from base64, size:', arrayBuffer.byteLength, 'bytes');
      
      // Get user session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        throw new Error('User not authenticated');
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      // Encode path for URL
      const pathSegments = fileName.split('/').map(segment => encodeURIComponent(segment));
      const encodedPath = pathSegments.join('/');
      
      const storageUrl = `${supabaseUrl}/storage/v1/object/${this.BUCKET_SIGNATURES}/${encodedPath}`;
      
      // Upload using fetch API
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const response = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': contentType,
          'apikey': supabaseKey,
          'x-upsert': 'false',
          'cache-control': '3600',
        },
        body: uint8Array,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${this.BUCKET_SIGNATURES}/${encodedPath}`;
      
      return {
        url: publicUrl,
        path: fileName,
        size: arrayBuffer.byteLength,
      };
    } catch (error) {
      console.error('Error in uploadSignatureFromBase64:', error);
      throw error;
    }
  }

  /**
   * Delete a photo from storage
   * @param bucket Bucket name
   * @param path File path in bucket
   */
  static async deletePhoto(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Error deleting photo:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deletePhoto:', error);
      throw error;
    }
  }

  /**
   * Delete multiple photos from storage
   * @param bucket Bucket name
   * @param paths Array of file paths
   */
  static async deletePhotos(bucket: string, paths: string[]): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        console.error('Error deleting photos:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deletePhotos:', error);
      throw error;
    }
  }

  /**
   * List all photos in a folder
   * @param bucket Bucket name
   * @param folder Folder path
   * @returns Array of file objects
   */
  static async listPhotos(bucket: string, folder: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder);

      if (error) {
        console.error('Error listing photos:', error);
        throw new Error(`List failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in listPhotos:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a stored photo
   * @param bucket Bucket name
   * @param path File path
   * @returns Public URL
   */
  static getPublicUrl(bucket: string, path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return publicUrl;
  }

  /**
   * Save photo metadata to database
   * @param contractId Contract ID
   * @param photoUrl Public URL of the photo
   * @param storagePath Storage path
   * @param fileSize File size in bytes
   * @param orderIndex Order index
   */
  static async savePhotoMetadata(
    contractId: string,
    photoUrl: string,
    storagePath: string,
    fileSize: number,
    orderIndex: number
  ): Promise<void> {
    try {
      console.log('Saving photo metadata to database:', {
        contract_id: contractId,
        photo_url: photoUrl,
        photo_type: 'general',
        description: `Photo ${orderIndex + 1}`
      });

      const { error } = await supabase
        .from('contract_photos')
        .insert({
          contract_id: contractId,
          photo_url: photoUrl,
          photo_type: 'general',
          description: `Photo ${orderIndex + 1}`,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving photo metadata:', error);
        throw new Error(`Failed to save metadata: ${error.message}`);
      }

      console.log('Photo metadata saved successfully');
    } catch (error) {
      console.error('Error in savePhotoMetadata:', error);
      throw error;
    }
  }

  /**
   * Get all photos for a contract
   * @param contractId Contract ID
   * @returns Array of photo records
   */
  static async getContractPhotos(contractId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('contract_photos')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching contract photos:', error);
        throw new Error(`Failed to fetch photos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getContractPhotos:', error);
      throw error;
    }
  }

  /**
   * Delete contract photos (both from storage and database)
   * @param contractId Contract ID
   */
  static async deleteContractPhotos(contractId: string): Promise<void> {
    try {
      // Get all photos for this contract
      const photos = await this.getContractPhotos(contractId);

      if (photos.length > 0) {
        // Extract storage paths from photo URLs
        const storagePaths = photos.map(p => {
          const url = p.photo_url;
          if (url) {
            // Extract the path after the bucket name in the URL
            const pathMatch = url.match(/\/contract-photos\/(.+)/);
            return pathMatch ? pathMatch[1] : '';
          }
          return '';
        }).filter(path => path !== '');

        if (storagePaths.length > 0) {
          await this.deletePhotos(this.BUCKET_CONTRACT_PHOTOS, storagePaths);
        }

        // Delete from database
        const { error } = await supabase
          .from('contract_photos')
          .delete()
          .eq('contract_id', contractId);

        if (error) {
          console.error('Error deleting photo metadata:', error);
          throw new Error(`Failed to delete metadata: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error in deleteContractPhotos:', error);
      throw error;
    }
  }

  /**
   * Upload multiple photos for a contract
   * @param contractId Contract ID
   * @param photoUris Array of local photo URIs
   * @returns Array of upload results
   */
  static async uploadContractPhotos(
    contractId: string,
    photoUris: string[]
  ): Promise<UploadResult[]> {
    console.log('Starting batch upload for contract:', contractId, 'Photos:', photoUris.length);

    const results: UploadResult[] = [];
    
    for (let i = 0; i < photoUris.length; i++) {
      try {
        console.log('Uploading photo', i + 1, 'of', photoUris.length);
        const result = await this.uploadContractPhoto(contractId, photoUris[i], i);
        results.push(result);
        
        console.log('Photo', i + 1, 'uploaded successfully:', result.url);

        // Save metadata to database
        await this.savePhotoMetadata(
          contractId,
          result.url,
          result.path,
          result.size,
          i
        );

        console.log('Photo', i + 1, 'metadata saved successfully');
      } catch (error) {
        console.error(`Error uploading photo ${i}:`, error);
        // Continue with other photos even if one fails
      }
    }

    console.log('Batch upload completed. Results:', results.length);
    return results;
  }

  /**
   * Upload multiple photos for a contract with photo type support
   * @param contractId Contract ID
   * @param photoUris Array of local photo URIs
   * @param photoType Photo type (pickup, dropoff, damage, general)
   * @returns Array of upload results
   */
  static async uploadContractPhotosWithType(
    contractId: string,
    photoUris: string[],
    photoType: 'pickup' | 'dropoff' | 'damage' | 'general' = 'general'
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (let i = 0; i < photoUris.length; i++) {
      try {
        const result = await this.uploadContractPhoto(contractId, photoUris[i], i);
        results.push(result);

        // Save metadata to database with photo type
        await this.savePhotoMetadataWithType(
          contractId,
          result.url,
          result.path,
          result.size,
          i,
          photoType
        );
      } catch (error) {
        console.error(`Error uploading photo ${i}:`, error);
        // Continue with other photos even if one fails
      }
    }

    return results;
  }

  /**
   * Save photo metadata with photo type to database
   */
  static async savePhotoMetadataWithType(
    contractId: string,
    photoUrl: string,
    storagePath: string,
    fileSize: number,
    orderIndex: number,
    photoType: 'pickup' | 'dropoff' | 'damage' | 'general'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('contract_photos')
        .insert({
          contract_id: contractId,
          photo_url: photoUrl,
          photo_type: photoType,
          description: `${photoType.charAt(0).toUpperCase() + photoType.slice(1)} photo ${orderIndex + 1}`,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving photo metadata:', error);
        throw new Error(`Failed to save metadata: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in savePhotoMetadataWithType:', error);
      throw error;
    }
  }

  /**
   * Convert base64 string to ArrayBuffer (React Native compatible)
   * React Native doesn't have atob, so we use a manual conversion
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }

    // Calculate buffer length accounting for padding
    let bufferLength = base64.length * 0.75;
    if (base64.length > 0 && base64[base64.length - 1] === '=') {
      bufferLength--;
      if (base64.length > 1 && base64[base64.length - 2] === '=') {
        bufferLength--;
      }
    }

    const bytes = new Uint8Array(bufferLength);
    let p = 0;

    for (let i = 0; i < base64.length; i += 4) {
      const encoded1 = lookup[base64.charCodeAt(i)] ?? 0;
      const encoded2 = lookup[base64.charCodeAt(i + 1)] ?? 0;
      const encoded3 = i + 2 < base64.length ? (lookup[base64.charCodeAt(i + 2)] ?? 0) : 0;
      const encoded4 = i + 3 < base64.length ? (lookup[base64.charCodeAt(i + 3)] ?? 0) : 0;

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      if (i + 2 < base64.length && base64[i + 2] !== '=') {
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      }
      if (i + 3 < base64.length && base64[i + 3] !== '=') {
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
      }
    }

    return bytes.buffer;
  }

  /**
   * Test Supabase connection and permissions
   */
  static async testConnection(): Promise<void> {
    try {
      console.log('Testing Supabase connection...');

      // Test database connection
      const { data: dbData, error: dbError } = await supabase
        .from('contracts')
        .select('id')
        .limit(1);

      if (dbError) {
        console.error('Database connection error:', dbError);
      } else {
        console.log('Database connection successful');
      }

      // Test storage connection
      const { data: storageData, error: storageError } = await supabase.storage
        .from(this.BUCKET_CONTRACT_PHOTOS)
        .list('', { limit: 1 });

      if (storageError) {
        console.error('Storage connection error:', storageError);
      } else {
        console.log('Storage connection successful');
      }

      console.log('Connection test completed');
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  }
}