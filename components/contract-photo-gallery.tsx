import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PhotoStorageService } from '../services/photo-storage.service';

interface ContractPhotoGalleryProps {
  contractId: string;
  photoType?: 'pickup' | 'dropoff' | 'damage' | 'general';
  maxPhotos?: number;
  showUploadButton?: boolean;
  columns?: number;
  onPhotosChanged?: (photoCount: number) => void;
}

interface PhotoItem {
  id?: string;
  photo_url: string;
  photo_type?: string;
  description?: string;
  created_at?: string;
}

const { width } = Dimensions.get('window');

/**
 * Reusable component for contract photo upload and gallery
 * 
 * @example
 * ```tsx
 * <ContractPhotoGallery
 *   contractId="contract-123"
 *   photoType="pickup"
 *   maxPhotos={10}
 *   onPhotosChanged={(count) => console.log(`${count} photos`)}
 * />
 * ```
 */
export function ContractPhotoGallery({
  contractId,
  photoType = 'general',
  maxPhotos = 20,
  showUploadButton = true,
  columns = 3,
  onPhotosChanged,
}: ContractPhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const imageSize = (width - 32 - (columns - 1) * 8) / columns;

  useEffect(() => {
    loadPhotos();
  }, [contractId]);

  /**
   * Load photos from database
   */
  async function loadPhotos(): Promise<void> {
    if (!contractId) return;

    setIsLoading(true);
    try {
      const loadedPhotos = await PhotoStorageService.getContractPhotos(contractId);
      setPhotos(loadedPhotos);
      onPhotosChanged?.(loadedPhotos.length);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Request camera and media permissions
   */
  async function requestPermissions(): Promise<boolean> {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!cameraPermission.granted || !mediaPermission.granted) {
      Alert.alert(
        'Άδεια απαιτείται',
        'Χρειαζόμαστε πρόσβαση στην κάμερα και τη βιβλιοθήκη φωτογραφιών'
      );
      return false;
    }
    return true;
  }

  /**
   * Show action sheet for photo source selection
   */
  function showPhotoSourceOptions(): void {
    if (photos.length >= maxPhotos) {
      Alert.alert(
        'Μέγιστος αριθμός φωτογραφιών',
        `Μπορείτε να προσθέσετε μέχρι ${maxPhotos} φωτογραφίες`
      );
      return;
    }

    Alert.alert(
      'Προσθήκη Φωτογραφίας',
      'Επιλέξτε πηγή',
      [
        {
          text: '📷 Κάμερα',
          onPress: handleTakePhoto,
        },
        {
          text: '🖼️ Βιβλιοθήκη',
          onPress: handlePickFromGallery,
        },
        {
          text: 'Ακύρωση',
          style: 'cancel',
        },
      ]
    );
  }

  /**
   * Take photo with camera
   */
  async function handleTakePhoto(): Promise<void> {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing for both platforms to ensure compatibility
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία λήψης φωτογραφίας');
    }
  }

  /**
   * Pick photo from gallery
   */
  async function handlePickFromGallery(): Promise<void> {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing for both platforms to ensure compatibility
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία επιλογής φωτογραφίας');
    }
  }

  /**
   * Upload photo to Supabase
   */
  async function uploadPhoto(uri: string): Promise<void> {
    setIsUploading(true);
    try {
      const uploadResult = await PhotoStorageService.uploadContractPhoto(
        contractId,
        uri,
        photos.length
      );

      await PhotoStorageService.savePhotoMetadataWithType(
        contractId,
        uploadResult.url,
        uploadResult.path,
        uploadResult.size,
        photos.length,
        photoType
      );

      Alert.alert('✅ Επιτυχία', 'Η φωτογραφία αποθηκεύτηκε επιτυχώς');
      await loadPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποστολής φωτογραφίας');
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * Delete photo
   */
  function handleDeletePhoto(photo: PhotoItem): void {
    Alert.alert(
      'Διαγραφή Φωτογραφίας',
      'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη φωτογραφία;',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              // Extract storage path from URL
              const urlParts = photo.photo_url.split('/contract-photos/');
              if (urlParts.length === 2) {
                const path = urlParts[1];
                await PhotoStorageService.deletePhoto('contract-photos', path);
              }

              // Delete from database
              // Note: You'll need to add a deletePhotoMetadata method to PhotoStorageService
              await loadPhotos();
              Alert.alert('✅ Επιτυχία', 'Η φωτογραφία διαγράφηκε');
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής φωτογραφίας');
            }
          },
        },
      ]
    );
  }

  /**
   * Render empty state
   */
  function renderEmptyState() {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📷</Text>
        <Text style={styles.emptyStateText}>Δεν υπάρχουν φωτογραφίες</Text>
        {showUploadButton && (
          <Text style={styles.emptyStateSubtext}>
            Πατήστε "Προσθήκη Φωτογραφίας" για να προσθέσετε
          </Text>
        )}
      </View>
    );
  }

  /**
   * Render loading state
   */
  function renderLoadingState() {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Φόρτωση φωτογραφιών...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Φωτογραφίες</Text>
          {photos.length > 0 && (
            <Text style={styles.subtitle}>
              {photos.length} {photos.length === 1 ? 'φωτογραφία' : 'φωτογραφίες'}
            </Text>
          )}
        </View>
        {showUploadButton && (
          <TouchableOpacity
            style={[styles.addButton, isUploading && styles.addButtonDisabled]}
            onPress={showPhotoSourceOptions}
            disabled={isUploading || photos.length >= maxPhotos}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.addButtonIcon}>+</Text>
                <Text style={styles.addButtonText}>Προσθήκη</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Gallery */}
      {isLoading ? (
        renderLoadingState()
      ) : photos.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.gallery}>
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={photo.id || index}
                style={[styles.photoItem, { width: imageSize, height: imageSize }]}
                onPress={() => setSelectedImage(photo.photo_url)}
                onLongPress={() => handleDeletePhoto(photo)}
              >
                <Image
                  source={{ uri: photo.photo_url }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                {photo.description && (
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoDescription} numberOfLines={1}>
                      {photo.description}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Full Screen Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.modalContent}>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonDisabled: {
    backgroundColor: '#475569',
  },
  addButtonIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#334155',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
  },
  photoDescription: {
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: width,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#ef4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

