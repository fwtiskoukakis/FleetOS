import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Alert, Modal, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { PhotoStorageService } from '../services/photo-storage.service';

interface PhotoCaptureProps {
  onPhotoTaken: (uri: string) => void;
  photos?: string[];
  buttonText?: string;
  captureMode?: 'photo' | 'signature';
  contractId?: string; // For Supabase integration
}

/**
 * Component for capturing and managing photos of the rental car
 */
export function PhotoCapture({ onPhotoTaken, photos = [], buttonText, captureMode = 'photo', contractId }: PhotoCaptureProps) {
  const [isSourceModalVisible, setIsSourceModalVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<any>(null);

  async function requestPermissions() {
    const cameraResult = await requestCameraPermission();
    const mediaResult = await requestMediaPermission();

    if (!cameraResult?.granted || !mediaResult?.granted) {
      Alert.alert('Άδεια απαιτείται', 'Χρειαζόμαστε πρόσβαση στην κάμερα και τη βιβλιοθήκη φωτογραφιών');
      return false;
    }
    return true;
  }

  async function handleOpenSourceModal() {
    const hasPermission = await requestPermissions();
    if (hasPermission) {
      setIsSourceModalVisible(true);
    }
  }

  async function handleOpenCamera() {
    setIsSourceModalVisible(false);
    setIsCameraVisible(true);
  }

  async function handleOpenGallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Works on both iOS and Android
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία επιλογής εικόνας');
    } finally {
      setIsSourceModalVisible(false);
    }
  }

  async function uploadPhoto(localUri: string) {
    if (!contractId) {
      // If no contractId, just use local URI
      onPhotoTaken(localUri);
      return;
    }

    setUploading(true);
    try {
      const uploadResult = await PhotoStorageService.uploadContractPhoto(
        contractId,
        localUri,
        photos.length
      );

      onPhotoTaken(uploadResult.url);
      Alert.alert('✅ Επιτυχία!', 'Η φωτογραφία αποθηκεύτηκε επιτυχώς!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποστολής φωτογραφίας. Η φωτογραφία θα χρησιμοποιηθεί τοπικά.');

      // Fallback to local URI
      onPhotoTaken(localUri);
    } finally {
      setUploading(false);
    }
  }

  async function handleTakePhoto() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo && photo.uri) {
          await uploadPhoto(photo.uri);
          setIsCameraVisible(false);
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Σφάλμα', 'Αποτυχία λήψης φωτογραφίας');
      }
    }
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {captureMode === 'signature' ? 'Υπογραφή' : `Φωτογραφίες Οχήματος (${photos.length})`}
      </Text>

      <View style={styles.photoGrid}>
        {photos.map((uri, index) => (
          <Image key={index} source={{ uri }} style={styles.photo} />
        ))}
      </View>

      {!isCameraVisible ? (
        <>
          <TouchableOpacity
            style={[styles.button, uploading && styles.buttonDisabled]}
            onPress={handleOpenSourceModal}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>
              {uploading
                ? 'Αποστολή...'
                : (buttonText || (captureMode === 'signature' ? '✍️ Προσθήκη Υπογραφής' : '📷 Προσθήκη Φωτογραφίας'))
              }
            </Text>
          </TouchableOpacity>

          <Modal
            animationType="slide"
            transparent={true}
            visible={isSourceModalVisible}
            onRequestClose={() => setIsSourceModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Επιλέξτε πηγή</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                    onPress={handleOpenCamera}
                  >
                    <Text style={styles.modalButtonText}>📷 Κάμερα</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#34C759' }]}
                    onPress={handleOpenGallery}
                  >
                    <Text style={styles.modalButtonText}>🖼️ Βιβλιοθήκη</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => setIsSourceModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Ακύρωση</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
              <Text style={styles.buttonText}>Λήψη</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Text style={styles.buttonText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsCameraVisible(false)}
            >
              <Text style={styles.buttonText}>Ακύρωση</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a0c8ff',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    height: 400,
    marginTop: 10,
  },
  camera: {
    flex: 1,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    gap: 5,
  },
  captureButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  flipButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    width: 60,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
});

