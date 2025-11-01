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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { PhotoStorageService } from '../services/photo-storage.service';

interface ContractPhotoModalProps {
  visible: boolean;
  contractId: string;
  onClose: () => void;
  onPhotosUpdated?: (photoCount: number) => void;
}

interface PhotoItem {
  id?: string;
  photo_url: string;
  photo_type?: string;
  description?: string;
  created_at?: string;
}

const { width, height } = Dimensions.get('window');
const GALLERY_IMAGE_SIZE = (width - 48) / 3;

/**
 * Modal for managing contract photos - similar to test page
 */
export function ContractPhotoModal({
  visible,
  contractId,
  onClose,
  onPhotosUpdated,
}: ContractPhotoModalProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && contractId) {
      loadPhotos();
    }
  }, [visible, contractId]);

  /**
   * Load photos from database
   */
  async function loadPhotos(): Promise<void> {
    setIsLoading(true);
    try {
      const loadedPhotos = await PhotoStorageService.getContractPhotos(contractId);
      setPhotos(loadedPhotos);
      onPhotosUpdated?.(loadedPhotos.length);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Request permissions
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
   * Take photo with camera
   */
  async function handleTakePhoto(): Promise<void> {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Works on both iOS and Android
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
        allowsEditing: false, // Works on both iOS and Android
        quality: 0.8,
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

      await PhotoStorageService.savePhotoMetadata(
        contractId,
        uploadResult.url,
        uploadResult.path,
        uploadResult.size,
        photos.length
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
   * Handle close and notify parent
   */
  function handleClose(): void {
    onPhotosUpdated?.(photos.length);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>📸 Φωτογραφίες Συμβολαίου</Text>
            {photos.length > 0 && (
              <Text style={styles.subtitle}>
                {photos.length} {photos.length === 1 ? 'φωτογραφία' : 'φωτογραφίες'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Action Buttons */}
          <View style={styles.section}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cameraButton, isUploading && styles.buttonDisabled]}
                onPress={handleTakePhoto}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.actionButtonIcon}>📷</Text>
                    <Text style={styles.actionButtonText}>Κάμερα</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.galleryButton, isUploading && styles.buttonDisabled]}
                onPress={handlePickFromGallery}
                disabled={isUploading}
              >
                <Text style={styles.actionButtonIcon}>🖼️</Text>
                <Text style={styles.actionButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Gallery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Gallery ({photos.length})
            </Text>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Φόρτωση φωτογραφιών...</Text>
              </View>
            ) : photos.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📷</Text>
                <Text style={styles.emptyStateText}>Δεν υπάρχουν φωτογραφίες</Text>
                <Text style={styles.emptyStateSubtext}>
                  Χρησιμοποιήστε τα κουμπιά παραπάνω για να προσθέσετε
                </Text>
              </View>
            ) : (
              <View style={styles.gallery}>
                {photos.map((photo, index) => (
                  <TouchableOpacity
                    key={photo.id || index}
                    style={[styles.photoItem, { width: GALLERY_IMAGE_SIZE, height: GALLERY_IMAGE_SIZE }]}
                    onPress={() => setSelectedImage(photo.photo_url)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: photo.photo_url }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleClose}
          >
            <Text style={styles.saveButtonText}>✓ Αποθήκευση & Κλείσιμο</Text>
          </TouchableOpacity>
        </View>

        {/* Full Screen Image Viewer */}
        <Modal
          visible={selectedImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageModalContainer}>
            <TouchableOpacity
              style={styles.imageModalCloseArea}
              activeOpacity={1}
              onPress={() => setSelectedImage(null)}
            >
              <View style={styles.imageModalContent}>
                {selectedImage && (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.imageModalCloseButton}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.imageModalCloseButtonText}>✕ Κλείσιμο</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cameraButton: {
    backgroundColor: '#334155',
    borderColor: '#3b82f6',
  },
  galleryButton: {
    backgroundColor: '#334155',
    borderColor: '#8b5cf6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  footer: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageModalCloseArea: {
    flex: 1,
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: width,
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  imageModalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

