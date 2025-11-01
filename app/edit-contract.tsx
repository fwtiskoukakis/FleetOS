import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Contract, RenterInfo, RentalPeriod, CarInfo, DamagePoint, DamageMarkerType, CarCondition } from '../models/contract.interface';
import { CarDiagram } from '../components/car-diagram';
import { PhotoStorageService } from '../services/photo-storage.service';
import { SupabaseContractService } from '../services/supabase-contract.service';
import { ImageModal } from '../components/image-modal';
import { ContractPhotoUploader } from '../components/contract-photo-uploader';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { AuthService } from '../services/auth.service';

type CarView = 'front' | 'rear' | 'left' | 'right';

/**
 * Screen for editing an existing rental contract
 */
export default function EditContractScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // State for date picker visibility
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showDropoffDatePicker, setShowDropoffDatePicker] = useState(false);

  // State for image modal
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  // State for photo management
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  useEffect(() => {
    loadContract();
    loadCurrentUser();
  }, [params.contractId]);

  async function loadCurrentUser() {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  async function loadContract() {
    try {
      if (!params.contractId || typeof params.contractId !== 'string') {
        Alert.alert('Σφάλμα', 'Μη έγκυρο αναγνωριστικό συμβολαίου');
        router.back();
        return;
      }

      const foundContract = await SupabaseContractService.getContractById(params.contractId);
      
      if (foundContract) {
        setContract(foundContract);
      } else {
        Alert.alert('Σφάλμα', 'Το συμβόλαιο δεν βρέθηκε');
        router.back();
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης συμβολαίου');
    } finally {
      setLoading(false);
    }
  }

  function handleAddDamage(x: number, y: number, view: CarView, markerType: DamageMarkerType) {
    if (!contract) return;
    
    const newDamage: DamagePoint = {
      id: `damage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      view,
      description: '',
      severity: 'minor',
      markerType,
      timestamp: new Date(),
    };
    setContract({
      ...contract,
      damagePoints: [...contract.damagePoints, newDamage]
    });
  }

  function handleRemoveLastDamage() {
    if (!contract || contract.damagePoints.length === 0) return;
    
    setContract({
      ...contract,
      damagePoints: contract.damagePoints.slice(0, -1)
    });
  }

  function handlePhotoTaken(uri: string) {
    if (!contract) return;
    
    setContract({
      ...contract,
      photoUris: [...contract.photoUris, uri]
    });
  }

  function handleImagePress(imageUri: string) {
    setSelectedImageUri(imageUri);
    setIsImageModalVisible(true);
  }

  function handleCloseImageModal() {
    setIsImageModalVisible(false);
    setSelectedImageUri(null);
  }

  // Photo handling functions
  async function handleCapturePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Σφάλμα', 'Η εφαρμογή χρειάζεται άδεια πρόσβασης στην κάμερα.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Works on both iOS and Android
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      setNewPhotos(prev => [...prev, uri]);
    }
  }

  async function handleUploadFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Σφάλμα', 'Η εφαρμογή χρειάζεται άδεια για πρόσβαση στη συλλογή.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Works on both iOS and Android
      allowsMultipleSelection: false,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      setNewPhotos(prev => [...prev, uri]);
    }
  }

  function removeNewPhoto(index: number) {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    // Also remove from uploaded URLs if they exist
    if (uploadedPhotoUrls.length > 0) {
      setUploadedPhotoUrls(prev => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSavePhotosToStorage() {
    if (newPhotos.length === 0) {
      Alert.alert('Προσοχή', 'Δεν υπάρχουν φωτογραφίες για αποθήκευση.');
      return;
    }

    setIsUploadingPhotos(true);

    try {
      if (!contract) {
        Alert.alert('Σφάλμα', 'Το συμβόλαιο δεν είναι διαθέσιμο.');
        return;
      }

      console.log('Starting photo upload for contract:', contract.id);
      console.log('Photos to upload:', newPhotos.length);

      // Upload photos to Supabase
      const uploadResults = await PhotoStorageService.uploadContractPhotos(contract.id, newPhotos);

      console.log('Upload results:', uploadResults);

      if (uploadResults.length > 0) {
        // Extract URLs from upload results
        const uploadedUrls = uploadResults.map(result => result.url);
        setUploadedPhotoUrls(uploadedUrls);

        // Update contract with new photos
        setContract(prev => {
          if (!prev) return null;
          return {
            ...prev,
            photoUris: [...prev.photoUris, ...uploadedUrls]
          };
        });

        // Clear new photos since they're now uploaded
        setNewPhotos([]);

        console.log('Photos uploaded successfully:', uploadedUrls);
        Alert.alert(
          'Επιτυχία',
          `Αποθηκεύτηκαν ${uploadedUrls.length} φωτογραφίες επιτυχώς στο Supabase!\n\nΟι φωτογραφίες προστέθηκαν στο συμβόλαιο.`
        );
      } else {
        console.error('No upload results returned');
        Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η αποθήκευση των φωτογραφιών.');
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      Alert.alert('Σφάλμα', `Αποτυχία αποθήκευσης φωτογραφιών στο Supabase: ${error}`);
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  function validateContract(): boolean {
    if (!contract) return false;
    
    if (!contract.renterInfo.fullName.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε το ονοματεπώνυμο');
      return false;
    }
    if (!contract.renterInfo.idNumber.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον αριθμό ταυτότητας');
      return false;
    }
    if (!contract.renterInfo.taxId?.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον ΑΦΜ');
      return false;
    }
    if (!contract.renterInfo.driverLicenseNumber?.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον αριθμό διπλώματος οδήγησης');
      return false;
    }
    if (!contract.renterInfo.phoneNumber.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον αριθμό τηλεφώνου');
      return false;
    }
    if (!contract.renterInfo.address.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τη διεύθυνση');
      return false;
    }
    if (!contract.carInfo.licensePlate.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε την πινακίδα');
      return false;
    }
    if (!contract.rentalPeriod.pickupLocation.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε την τοποθεσία παραλαβής');
      return false;
    }
    if (contract.rentalPeriod.isDifferentDropoffLocation && !contract.rentalPeriod.dropoffLocation.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε την τοποθεσία επιστροφής');
      return false;
    }
    if ((contract.rentalPeriod.totalCost || 0) <= 0) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε το συνολικό κόστος');
      return false;
    }
    return true;
  }

  async function handleSaveContract() {
    if (!contract || !validateContract()) {
      return;
    }

    setIsSaving(true);

    const finalDropoffLocation = contract.rentalPeriod.isDifferentDropoffLocation
      ? contract.rentalPeriod.dropoffLocation
      : contract.rentalPeriod.pickupLocation;

    const updatedContract: Contract = {
      ...contract,
      rentalPeriod: {
        ...contract.rentalPeriod,
        dropoffLocation: finalDropoffLocation,
      },
      // Use uploaded photos if available, otherwise use existing photos plus any new photos that weren't uploaded
      photoUris: uploadedPhotoUrls.length > 0
        ? [...contract.photoUris, ...uploadedPhotoUrls]
        : [...contract.photoUris, ...newPhotos]
    };

    try {
      console.log('Starting contract update...');
      const result = await SupabaseContractService.updateContract(updatedContract.id, updatedContract);
      console.log('Contract updated successfully!', result);

      setIsSaving(false);

      // Clear uploaded photos and new photos since they're now saved with the contract
      setUploadedPhotoUrls([]);
      setNewPhotos([]);

      // Show success notification
      Alert.alert(
        '✅ Επιτυχία!',
        'Το συμβόλαιο ενημερώθηκε επιτυχώς!\n\nΟλες οι αλλαγές σας έχουν αποθηκευτεί στη βάση δεδομένων.',
        [
          {
            text: 'Προβολή',
            onPress: () => router.push(`/contract-details?contractId=${updatedContract.id}`)
          },
          {
            text: 'Αρχική',
            onPress: () => router.push('/(tabs)/'),
            style: 'cancel'
          }
        ]
      );
    } catch (error: any) {
      console.error('Error saving contract:', error);
      setIsSaving(false);
      
      // Show detailed error message
      const errorMessage = error?.message || 'Αποτυχία ενημέρωσης συμβολαίου.';
      
      if (errorMessage.includes('migration') || errorMessage.includes('columns')) {
        Alert.alert(
          '⚠️ Απαιτείται Ενημέρωση Βάσης',
          'Χρειάζεται να εκτελέσετε το migration στο Supabase:\n\n1. Ανοίξτε το Supabase Dashboard\n2. Πηγαίνετε στο SQL Editor\n3. Εκτελέστε: supabase/ensure-contracts-table-complete.sql\n\nΑυτό θα προσθέσει τα απαραίτητα πεδία.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          '❌ Σφάλμα',
          `Αποτυχία αποθήκευσης:\n\n${errorMessage}`,
          [
            { text: 'OK' }
          ]
        );
      }
    }
  }

  const onPickupDateChange = (event: any, selectedDate?: Date) => {
    setShowPickupDatePicker(Platform.OS === 'ios');
    if (selectedDate && contract) {
      setContract({
        ...contract,
        rentalPeriod: { ...contract.rentalPeriod, pickupDate: selectedDate }
      });
    }
  };

  const onDropoffDateChange = (event: any, selectedDate?: Date) => {
    setShowDropoffDatePicker(Platform.OS === 'ios');
    if (selectedDate && contract) {
      setContract({
        ...contract,
        rentalPeriod: { ...contract.rentalPeriod, dropoffDate: selectedDate }
      });
    }
  };

  // Callback for photo changes - must be at top level (Rules of Hooks)
  const handlePhotosChanged = useCallback((count: number) => {
    console.log(`Contract has ${count} photos`);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Φόρτωση...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Το συμβόλαιο δεν βρέθηκε</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Πίσω</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Επεξεργασία Συμβολαίου</Text>
          <View style={styles.placeholder} />
        </View>

        {/* 1. Essential Renter Info - Compact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Στοιχεία Ενοικιαστή</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Ονοματεπώνυμο *"
              value={contract.renterInfo.fullName}
              onChangeText={(text) => setContract({
                ...contract,
                renterInfo: { ...contract.renterInfo, fullName: text }
              })}
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="ΑΔΤ/Διαβατήριο *"
              value={contract.renterInfo.idNumber}
              onChangeText={(text) => setContract({
                ...contract,
                renterInfo: { ...contract.renterInfo, idNumber: text }
              })}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="ΑΦΜ *"
              value={contract.renterInfo.taxId || ''}
              onChangeText={(text) => setContract({
                ...contract,
                renterInfo: { ...contract.renterInfo, taxId: text }
              })}
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Δίπλωμα Οδήγησης *"
              value={contract.renterInfo.driverLicenseNumber || ''}
              onChangeText={(text) => setContract({
                ...contract,
                renterInfo: { ...contract.renterInfo, driverLicenseNumber: text }
              })}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Τηλέφωνο *"
              keyboardType="phone-pad"
              value={contract.renterInfo.phoneNumber}
              onChangeText={(text) => setContract({
                ...contract,
                renterInfo: { ...contract.renterInfo, phoneNumber: text }
              })}
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Διεύθυνση *"
              value={contract.renterInfo.address}
              onChangeText={(text) => setContract({
                ...contract,
                renterInfo: { ...contract.renterInfo, address: text }
              })}
            />
          </View>
        </View>

        {/* 2. Rental Period - Compact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Περίοδος Ενοικίασης</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Παραλαβή Ημερομηνία *</Text>
              <TouchableOpacity onPress={() => setShowPickupDatePicker(true)} style={styles.datePickerButton}>
                <Text style={styles.datePickerButtonText}>
                  {format(contract.rentalPeriod.pickupDate, 'dd/MM/yyyy')}
                </Text>
              </TouchableOpacity>
              {showPickupDatePicker && (
                <DateTimePicker
                  value={contract.rentalPeriod.pickupDate}
                  mode="date"
                  display="default"
                  onChange={onPickupDateChange}
                />
              )}
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Παραλαβή Ωρα *</Text>
              <TextInput
                style={styles.input}
                placeholder="π.χ. 10:00"
                value={contract.rentalPeriod.pickupTime}
                onChangeText={(text) => setContract({
                  ...contract,
                  rentalPeriod: { ...contract.rentalPeriod, pickupTime: text }
                })}
              />
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Τοποθεσία Παραλαβής *"
            value={contract.rentalPeriod.pickupLocation}
            onChangeText={(text) => setContract({
              ...contract,
              rentalPeriod: { ...contract.rentalPeriod, pickupLocation: text }
            })}
          />

          <TextInput
            style={styles.input}
            placeholder="Συνολικό Κόστος (€) *"
            keyboardType="numeric"
            value={(contract.rentalPeriod.totalCost || 0) > 0 ? (contract.rentalPeriod.totalCost || 0).toString() : ''}
            onChangeText={(text) => setContract({
              ...contract,
              rentalPeriod: { ...contract.rentalPeriod, totalCost: parseFloat(text) || 0 }
            })}
          />

          {/* Dropoff Location Toggle */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Διαφορετική τοποθεσία επιστροφής</Text>
            <Switch
              onValueChange={(value) => setContract({
                ...contract,
                rentalPeriod: { ...contract.rentalPeriod, isDifferentDropoffLocation: value }
              })}
              value={contract.rentalPeriod.isDifferentDropoffLocation}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Επιστροφή Ημερομηνία *</Text>
              <TouchableOpacity onPress={() => setShowDropoffDatePicker(true)} style={styles.datePickerButton}>
                <Text style={styles.datePickerButtonText}>
                  {format(contract.rentalPeriod.dropoffDate, 'dd/MM/yyyy')}
                </Text>
              </TouchableOpacity>
              {showDropoffDatePicker && (
                <DateTimePicker
                  value={contract.rentalPeriod.dropoffDate}
                  mode="date"
                  display="default"
                  onChange={onDropoffDateChange}
                />
              )}
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Επιστροφή Ωρα *</Text>
              <TextInput
                style={styles.input}
                placeholder="π.χ. 18:00"
                value={contract.rentalPeriod.dropoffTime}
                onChangeText={(text) => setContract({
                  ...contract,
                  rentalPeriod: { ...contract.rentalPeriod, dropoffTime: text }
                })}
              />
            </View>
          </View>

          {contract.rentalPeriod.isDifferentDropoffLocation && (
            <TextInput
              style={styles.input}
              placeholder="Τοποθεσία Επιστροφής *"
              value={contract.rentalPeriod.dropoffLocation}
              onChangeText={(text) => setContract({
                ...contract,
                rentalPeriod: { ...contract.rentalPeriod, dropoffLocation: text }
              })}
            />
          )}
        </View>

        {/* 3. Car Info & Condition - Compact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Οχημα & Κατάσταση</Text>
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Μάρκα & Μοντέλο"
              value={contract.carInfo.makeModel || `${contract.carInfo.make || ''} ${contract.carInfo.model || ''}`.trim()}
              onChangeText={(text) => setContract({
                ...contract,
                carInfo: { ...contract.carInfo, makeModel: text }
              })}
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Πινακίδα *"
              value={contract.carInfo.licensePlate}
              onChangeText={(text) => setContract({
                ...contract,
                carInfo: { ...contract.carInfo, licensePlate: text }
              })}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Καύσιμο *</Text>
              <View style={styles.fuelContainer}>
                <View style={styles.fuelBarContainer}>
                  <View style={styles.fuelBar}>
                    <View style={[
                      styles.fuelBarFill, 
                      { width: `${((contract.carCondition?.fuelLevel || 8) / 8) * 100}%` }
                    ]} />
                  </View>
                  <Text style={styles.fuelLevelText}>{contract.carCondition?.fuelLevel || 8}/8</Text>
                </View>
                <View style={styles.fuelButtons}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.fuelButton,
                        (contract.carCondition?.fuelLevel || 8) >= level && styles.fuelButtonActive,
                      ]}
                      onPress={() => setContract({
                        ...contract,
                        carCondition: {
                          fuelLevel: level,
                          mileage: contract.carCondition?.mileage || 0,
                          insuranceType: contract.carCondition?.insuranceType || 'basic',
                          exteriorCondition: contract.carCondition?.exteriorCondition || 'Καλή',
                          interiorCondition: contract.carCondition?.interiorCondition || 'Καλή',
                          mechanicalCondition: contract.carCondition?.mechanicalCondition || 'Καλή'
                        }
                      })}
                    >
                      <Text style={[
                        styles.fuelText,
                        (contract.carCondition?.fuelLevel || 8) >= level && styles.fuelTextActive,
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Χιλιόμετρα *</Text>
              <TextInput
                style={styles.input}
                placeholder="Χιλιόμετρα"
                keyboardType="numeric"
                value={(contract.carCondition?.mileage || 0).toString()}
                onChangeText={(text) => setContract({
                  ...contract,
                  carCondition: { 
                    fuelLevel: contract.carCondition?.fuelLevel || 8,
                    mileage: parseInt(text) || 0,
                    insuranceType: contract.carCondition?.insuranceType || 'basic',
                    exteriorCondition: contract.carCondition?.exteriorCondition || 'Καλή',
                    interiorCondition: contract.carCondition?.interiorCondition || 'Καλή',
                    mechanicalCondition: contract.carCondition?.mechanicalCondition || 'Καλή'
                  }
                })}
              />
            </View>
          </View>

          <Text style={styles.label}>Ασφάλιση *</Text>
          <View style={styles.insuranceToggleContainer}>
            <TouchableOpacity
              style={[styles.insuranceToggleButton, (contract.carCondition?.insuranceType || 'basic') === 'basic' && styles.activeInsuranceButton]}
              onPress={() => setContract({
                ...contract,
                carCondition: { 
                  fuelLevel: contract.carCondition?.fuelLevel || 8,
                  mileage: contract.carCondition?.mileage || 0,
                  insuranceType: 'basic',
                  exteriorCondition: contract.carCondition?.exteriorCondition || 'Καλή',
                  interiorCondition: contract.carCondition?.interiorCondition || 'Καλή',
                  mechanicalCondition: contract.carCondition?.mechanicalCondition || 'Καλή'
                }
              })}
            >
              <Text style={[styles.insuranceButtonText, (contract.carCondition?.insuranceType || 'basic') === 'basic' && styles.activeInsuranceButtonText]}>
                Βασική
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.insuranceToggleButton, (contract.carCondition?.insuranceType || 'basic') === 'full' && styles.activeInsuranceButton]}
              onPress={() => setContract({
                ...contract,
                carCondition: { 
                  fuelLevel: contract.carCondition?.fuelLevel || 8,
                  mileage: contract.carCondition?.mileage || 0,
                  insuranceType: 'full',
                  exteriorCondition: contract.carCondition?.exteriorCondition || 'Καλή',
                  interiorCondition: contract.carCondition?.interiorCondition || 'Καλή',
                  mechanicalCondition: contract.carCondition?.mechanicalCondition || 'Καλή'
                }
              })}
            >
              <Text style={[styles.insuranceButtonText, (contract.carCondition?.insuranceType || 'basic') === 'full' && styles.activeInsuranceButtonText]}>
                Πλήρης
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Car Diagram for Damages */}
        <View style={styles.section}>
          <CarDiagram 
            onAddDamage={handleAddDamage} 
            onRemoveLastDamage={handleRemoveLastDamage}
            damagePoints={contract.damagePoints} 
          />
        </View>

        {/* 5. Photos */}
        <ContractPhotoUploader
          contractId={contract.id}
          onPhotosChanged={handlePhotosChanged}
        />

        {/* Save Button (Bottom) */}
        <TouchableOpacity
          style={[styles.saveButtonBottom, isSaving && styles.saveButtonBottomDisabled]}
          onPress={handleSaveContract}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonBottomText}>{isSaving ? 'Αποθήκευση...' : 'Ενημέρωση Συμβολαίου'}</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <ImageModal
        visible={isImageModalVisible}
        imageUri={selectedImageUri}
        onClose={handleCloseImageModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 50,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  datePickerButton: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'flex-start',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
    paddingVertical: 5,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  fuelContainer: {
    marginTop: 5,
  },
  fuelBarContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  fuelBar: {
    width: 60,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fuelBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  fuelLevelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  fuelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  fuelButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fuelButtonActive: {
    backgroundColor: '#007AFF',
  },
  fuelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
  },
  fuelTextActive: {
    color: '#fff',
  },
  insuranceToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
    marginTop: 10,
  },
  insuranceToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeInsuranceButton: {
    backgroundColor: '#007AFF',
  },
  insuranceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  activeInsuranceButtonText: {
    color: '#fff',
  },
  saveButtonBottom: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 50,
  },
  saveButtonBottomText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonBottomDisabled: {
    backgroundColor: '#a0c8ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  photoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    marginRight: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  photoButtonSecondary: {
    flex: 1,
    backgroundColor: '#555',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    width: '100%',
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  viewPhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPhotoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  photoSaveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  photoSaveButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  photoSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadSuccessContainer: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  uploadSuccessText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});
