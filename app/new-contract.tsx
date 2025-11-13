import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Contract, RenterInfo, RentalPeriod, CarInfo, CarCondition, DamagePoint, DamageMarkerType, User } from '../models/contract.interface';
import { ContractTemplate } from '../models/contract-template.interface';
import { SignaturePad } from '../components/signature-pad';
import { CarDiagram } from '../components/car-diagram';
import { ContractTemplateSelector } from '../components/contract-template-selector';
import { ContractPhotoUploader } from '../components/contract-photo-uploader';
import { SupabaseContractService } from '../services/supabase-contract.service';
import { AuthService } from '../services/auth.service';
import { PhotoStorageService } from '../services/photo-storage.service';
import { CarService } from '../services/car.service';
import { NotificationScheduler } from '../services/notification-scheduler.service';
import { Car } from '../models/car.interface';
import Svg, { Path } from 'react-native-svg';
import { format } from 'date-fns/format';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '../contexts/theme-context';

type CarView = 'front' | 'rear' | 'left' | 'right';

const LOCATION_OPTIONS = ['Piraeus Office', 'Piraeus Port', 'Athens Airport', 'Other'] as const;
type LocationOption = typeof LOCATION_OPTIONS[number];

/**
 * Compact contract creation screen optimized for mobile use
 */
export default function NewContractScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [isLoadingCars, setIsLoadingCars] = useState(true);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [pickupLocationOption, setPickupLocationOption] = useState<LocationOption>('Piraeus Office');
  const [pickupCustomLocation, setPickupCustomLocation] = useState('');
  const [dropoffLocationOption, setDropoffLocationOption] = useState<LocationOption>('Piraeus Office');
  const [dropoffCustomLocation, setDropoffCustomLocation] = useState('');
  
  // Essential fields only
  const [renterInfo, setRenterInfo] = useState<RenterInfo>({
    fullName: '',
    idNumber: '',
    taxId: '',
    driverLicenseNumber: '',
    phoneNumber: '',
    phone: '', // Add missing phone property
    email: '',
    address: '',
  });

  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>({
    pickupDate: new Date(),
    pickupTime: format(new Date(), 'HH:mm'),
    pickupLocation: 'Piraeus Office',
    dropoffDate: new Date(),
    dropoffTime: format(new Date(), 'HH:mm'),
    dropoffLocation: 'Piraeus Office',
    isDifferentDropoffLocation: false,
    totalCost: 0,
  });

  const [carInfo, setCarInfo] = useState<CarInfo>({
    makeModel: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    mileage: 0,
  });

  const [carCondition, setCarCondition] = useState<CarCondition>({
    fuelLevel: 8, // Full tank by default
    mileage: 0,
    insuranceType: 'basic',
    exteriorCondition: 'Καλή',
    interiorCondition: 'Καλή',
    mechanicalCondition: 'Καλή',
  });

  const [damagePoints, setDamagePoints] = useState<DamagePoint[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [clientSignature, setClientSignature] = useState<string>('');
  const [clientSignaturePaths, setClientSignaturePaths] = useState<string[]>([]);
  const [observations, setObservations] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);

  // Date picker states
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showDropoffDatePicker, setShowDropoffDatePicker] = useState(false);

  function handleSelectTemplate(template: ContractTemplate) {
    setSelectedTemplate(template);
    applyTemplateData(template);
  }

  function applyTemplateData(template: ContractTemplate) {
    const templateData = template.templateData;
    const templatePickup = templateData.defaultPickupLocation || 'Piraeus Office';
    const pickupIsPreset = LOCATION_OPTIONS.includes(templatePickup as LocationOption);
    const resolvedPickupOption: LocationOption = pickupIsPreset
      ? (templatePickup as LocationOption)
      : 'Other';
    const resolvedPickupValue = resolvedPickupOption === 'Other' ? templatePickup : resolvedPickupOption;

    const templateDropoff = templateData.defaultDropoffLocation || templatePickup;
    const dropoffIsPreset = LOCATION_OPTIONS.includes(templateDropoff as LocationOption);
    const resolvedDropoffOption: LocationOption = dropoffIsPreset
      ? (templateDropoff as LocationOption)
      : 'Other';
    const resolvedDropoffValue = resolvedDropoffOption === 'Other' ? templateDropoff : resolvedDropoffOption;
    
    // Apply template defaults
    setRentalPeriod(prev => ({
      ...prev,
      pickupTime: templateData.defaultPickupTime,
      dropoffTime: templateData.defaultDropoffTime,
      pickupLocation: resolvedPickupValue,
      dropoffLocation: resolvedDropoffValue,
      isDifferentDropoffLocation: resolvedDropoffValue !== resolvedPickupValue,
      depositAmount: templateData.depositAmount,
      insuranceCost: templateData.insuranceCost,
    }));

    setPickupLocationOption(resolvedPickupOption);
    setPickupCustomLocation(resolvedPickupOption === 'Other' ? templatePickup : '');

    setDropoffLocationOption(resolvedDropoffOption);
    setDropoffCustomLocation(resolvedDropoffOption === 'Other' ? templateDropoff : '');

    // Set car condition defaults
    setCarCondition(prev => ({
      ...prev,
      fuelLevel: templateData.minimumFuelLevel,
    }));

    Alert.alert(
      'Πρότυπο Εφαρμόστηκε',
      `Το πρότυπο "${template.name}" εφαρμόστηκε επιτυχώς. Μπορείτε να τροποποιήσετε τα στοιχεία αν χρειάζεται.`
    );
  }

  function handleCreateCustom() {
    setShowTemplateSelector(false);
    // Continue with manual contract creation
  }

  useEffect(() => {
    async function loadCars() {
      try {
        setIsLoadingCars(true);
        const cars = await CarService.getAllCars();
        setAvailableCars(cars);
      } catch (error) {
        console.error('Error loading cars:', error);
        Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης οχημάτων. Δοκιμάστε ξανά.');
      } finally {
        setIsLoadingCars(false);
      }
    }
    loadCars();
  }, []);

  const filteredCars = useMemo(() => {
    if (!vehicleSearchQuery.trim()) {
      return availableCars;
    }
    const query = vehicleSearchQuery.trim().toLowerCase();
    return availableCars.filter(car =>
      car.licensePlate.toLowerCase().includes(query) ||
      (car.makeModel || '').toLowerCase().includes(query) ||
      `${car.make} ${car.model}`.toLowerCase().includes(query)
    );
  }, [availableCars, vehicleSearchQuery]);

  function handleVehicleSelect(car: Car) {
    const makeModel = car.makeModel || `${car.make} ${car.model}`.trim();
    setSelectedVehicleId(car.id);
    setCarInfo(prev => ({
      ...prev,
      makeModel,
      make: car.make,
      model: car.model,
      year: car.year || new Date().getFullYear(),
      licensePlate: car.licensePlate,
      category: car.category || undefined,
      color: car.color || undefined,
    }));
    setVehicleSearchQuery('');
    setIsVehicleModalVisible(false);
  }

  function handlePickupOptionChange(option: LocationOption) {
    if (!rentalPeriod.isDifferentDropoffLocation) {
      setDropoffLocationOption(option);
      if (option !== 'Other') {
        setDropoffCustomLocation('');
      }
    }

    setPickupLocationOption(option);
    if (option !== 'Other') {
      setPickupCustomLocation('');
    }

    setRentalPeriod(prev => {
      const resolved = option === 'Other' ? pickupCustomLocation.trim() : option;
      return {
        ...prev,
        pickupLocation: resolved,
        dropoffLocation: prev.isDifferentDropoffLocation ? prev.dropoffLocation : resolved,
      };
    });
  }

  function handlePickupCustomChange(text: string) {
    setPickupCustomLocation(text);
    if (!rentalPeriod.isDifferentDropoffLocation) {
      setDropoffCustomLocation(text);
    }

    setRentalPeriod(prev => {
      const resolved = pickupLocationOption === 'Other' ? text.trim() : pickupLocationOption;
      return {
        ...prev,
        pickupLocation: resolved,
        dropoffLocation: prev.isDifferentDropoffLocation ? prev.dropoffLocation : resolved,
      };
    });
  }

  function handleDropoffOptionChange(option: LocationOption) {
    setDropoffLocationOption(option);
    if (option !== 'Other') {
      setDropoffCustomLocation('');
    }

    setRentalPeriod(prev => {
      if (!prev.isDifferentDropoffLocation) {
        return prev;
      }
      const resolved = option === 'Other' ? dropoffCustomLocation.trim() : option;
      return {
        ...prev,
        dropoffLocation: resolved,
      };
    });
  }

  function handleDropoffCustomChange(text: string) {
    setDropoffCustomLocation(text);
    setRentalPeriod(prev => {
      if (!prev.isDifferentDropoffLocation) {
        return prev;
      }
      const resolved = dropoffLocationOption === 'Other' ? text.trim() : dropoffLocationOption;
      return {
        ...prev,
        dropoffLocation: resolved,
      };
    });
  }

  function handleDropoffToggle(value: boolean) {
    if (!value) {
      setDropoffLocationOption(pickupLocationOption);
      setDropoffCustomLocation(pickupLocationOption === 'Other' ? pickupCustomLocation : '');
    }

    setRentalPeriod(prev => {
      const resolved = value
        ? (dropoffLocationOption === 'Other' ? dropoffCustomLocation.trim() : dropoffLocationOption)
        : prev.pickupLocation;
      return {
        ...prev,
        isDifferentDropoffLocation: value,
        dropoffLocation: resolved,
      };
    });
  }

  function handleSignatureSave(uri: string) {
    setClientSignature(uri);
    
    try {
      // Decode base64 data URI to get SVG content
      // URI format: data:image/svg+xml;base64,XXX
      if (uri.startsWith('data:image/svg+xml;base64,')) {
        const base64Data = uri.split(',')[1];
        const svgContent = decodeURIComponent(escape(atob(base64Data)));
        
        // Extract paths from SVG content
        const pathMatches = svgContent.match(/<path[^>]*d="([^"]*)"[^>]*>/g);
        if (pathMatches) {
          const paths = pathMatches.map(match => {
            const dMatch = match.match(/d="([^"]*)"/);
            return dMatch ? dMatch[1] : '';
          }).filter(path => path !== '');
          setClientSignaturePaths(paths);
          console.log('Extracted signature paths:', paths);
        }
      }
    } catch (error) {
      console.error('Error parsing signature data:', error);
    }
  }

  function handleAddDamage(x: number, y: number, view: CarView, markerType: DamageMarkerType) {
    console.log('Adding damage point:', { x, y, view, markerType });
    // Generate a simple unique ID for damage points (not UUID required)
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
    console.log('New damage point created:', newDamage);
    setDamagePoints((prev) => {
      const updated = [...prev, newDamage];
      console.log('Updated damage points count:', updated.length);
      return updated;
    });
  }

  function handleRemoveLastDamage() {
    if (damagePoints.length > 0) {
      setDamagePoints(damagePoints.slice(0, -1));
    }
  }

  function handlePhotoTaken(uri: string) {
    setPhotos([...photos, uri]);
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
      setPhotos(prev => [...prev, uri]);
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
      setPhotos(prev => [...prev, uri]);
    }
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    // Also remove from uploaded URLs if they exist
    if (uploadedPhotoUrls.length > 0) {
      setUploadedPhotoUrls(prev => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSavePhotosToStorage() {
    if (photos.length === 0) {
      Alert.alert('Προσοχή', 'Δεν υπάρχουν φωτογραφίες για αποθήκευση.');
      return;
    }

    setIsUploadingPhotos(true);

    try {
      // Generate a temporary contract ID for photo upload
      const tempContractId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Upload photos to Supabase
      const uploadResults = await PhotoStorageService.uploadContractPhotos(tempContractId, photos);

      if (uploadResults.length > 0) {
        // Extract URLs from upload results
        const uploadedUrls = uploadResults.map(result => result.url);
        setUploadedPhotoUrls(uploadedUrls);

        Alert.alert(
          'Επιτυχία',
          `Αποθηκεύτηκαν ${uploadedUrls.length} φωτογραφίες επιτυχώς στο Supabase!\n\nΟι φωτογραφίες θα χρησιμοποιηθούν αυτόματα όταν αποθηκεύσετε το συμβόλαιο.`
        );
      } else {
        Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η αποθήκευση των φωτογραφιών.');
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης φωτογραφιών στο Supabase.');
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  async function uploadPhotosAfterContractSave(contractId: string) {
    if (photos.length === 0) return;

    try {
      // Upload all photos to Supabase with the new contract ID
      const uploadPromises = photos.map((photoUri, index) =>
        PhotoStorageService.uploadContractPhoto(contractId, photoUri, index)
      );

      const results = await Promise.allSettled(uploadPromises);

      // Update contract with uploaded URLs
      const uploadedUrls = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value.url);

      // Update contract with new photo URLs
      const updatedContract = await SupabaseContractService.getContractById(contractId);
      if (updatedContract) {
        await SupabaseContractService.updateContract(contractId, {
          ...updatedContract,
          photoUris: uploadedUrls
        });
      }
    } catch (error) {
      console.error('Error uploading photos after contract save:', error);
      // Continue even if photo upload fails
    }
  }

  function validateContract(): boolean {
    // Only essential fields are mandatory
    if (!renterInfo.fullName.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε το ονοματεπώνυμο');
      return false;
    }
    if (!renterInfo.idNumber.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον αριθμό ταυτότητας');
      return false;
    }
    if (!renterInfo.taxId.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον ΑΦΜ');
      return false;
    }
    if (!renterInfo.driverLicenseNumber.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον αριθμό διπλώματος οδήγησης');
      return false;
    }
    if (!renterInfo.phoneNumber.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τον αριθμό τηλεφώνου');
      return false;
    }
    if (!renterInfo.address.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τη διεύθυνση');
      return false;
    }
    if (!carInfo.licensePlate.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε την πινακίδα');
      return false;
    }
    if (!rentalPeriod.pickupLocation.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε την τοποθεσία παραλαβής');
      return false;
    }
    if (rentalPeriod.isDifferentDropoffLocation && !rentalPeriod.dropoffLocation.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε την τοποθεσία επιστροφής');
      return false;
    }
    if (rentalPeriod.totalCost <= 0) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε το συνολικό κόστος');
      return false;
    }
    if (!clientSignature.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ προσθέστε την υπογραφή του ενοικιαστή');
      return false;
    }
    return true;
  }

  async function handleSaveContract() {
    if (!validateContract()) {
      return;
    }

    setIsSaving(true);

    try {
      // Get the current authenticated user
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Σφάλμα', 'Δεν είστε συνδεδεμένος. Παρακαλώ συνδεθείτε πρώτα.');
        setIsSaving(false);
        return;
      }

      const finalDropoffLocation = rentalPeriod.isDifferentDropoffLocation
        ? rentalPeriod.dropoffLocation
        : rentalPeriod.pickupLocation;

      // Determine contract status based on dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pickupDate = new Date(rentalPeriod.pickupDate);
      pickupDate.setHours(0, 0, 0, 0);
      const dropoffDate = new Date(rentalPeriod.dropoffDate);
      dropoffDate.setHours(0, 0, 0, 0);

      let status: 'active' | 'completed' | 'upcoming';
      if (today < pickupDate) {
        status = 'upcoming';
      } else if (today > dropoffDate) {
        status = 'completed';
      } else {
        status = 'active';
      }

      // Generate a proper UUID v4
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const contract: Contract = {
        id: generateUUID(),
        renterInfo,
        rentalPeriod: {
          ...rentalPeriod,
          dropoffLocation: finalDropoffLocation,
        },
        carInfo,
        carCondition,
        damagePoints,
        photoUris: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : photos,
        clientSignature,
        observations,
        userId: currentUser.id, // Use authenticated user's ID
        status,
        createdAt: new Date(),
      };

      await SupabaseContractService.saveContract(contract);

      // Schedule all contract notifications
      try {
        await NotificationScheduler.scheduleContractNotifications(contract);
      } catch (error) {
        console.error('Error scheduling contract notifications:', error);
        // Don't block contract creation if notification scheduling fails
      }

      // Save the contract ID for photo uploads
      setSavedContractId(contract.id);

      // Clear uploaded photo URLs since they're now saved with the contract
      setUploadedPhotoUrls([]);
      setPhotos([]);

      Alert.alert(
        'Επιτυχία', 
        'Το συμβόλαιο αποθηκεύτηκε επιτυχώς! Θέλετε να προσθέσετε φωτογραφίες τώρα;', 
        [
          {
            text: 'Αργότερα',
            style: 'cancel',
            onPress: () => {
              // Navigate to contract details to view the contract
              router.replace({
                pathname: '/contract-details',
                params: { contractId: contract.id }
              });
            }
          },
          {
            text: 'Προσθήκη Φωτογραφιών',
            onPress: () => {
              // Navigate to dedicated photo upload screen
              router.push({
                pathname: '/contract-add-photos',
                params: { contractId: contract.id }
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving contract:', error);
      Alert.alert('Σφάλμα', `Αποτυχία αποθήκευσης συμβολαίου: ${error}`);
    } finally {
      setIsSaving(false);
    }
  }

  const onPickupDateChange = (event: any, selectedDate?: Date) => {
    setShowPickupDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRentalPeriod((prev) => ({ ...prev, pickupDate: selectedDate }));
    }
  };

  const onDropoffDateChange = (event: any, selectedDate?: Date) => {
    setShowDropoffDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRentalPeriod((prev) => ({ ...prev, dropoffDate: selectedDate }));
    }
  };

  return (
    <>
      <Modal
        visible={isVehicleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsVehicleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsVehicleModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Επιλογή Οχήματος</Text>
              <TouchableOpacity onPress={() => setIsVehicleModalVisible(false)}>
                <Text style={styles.modalCloseText}>Κλείσιμο</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Αναζήτηση πινακίδας ή μοντέλου..."
              value={vehicleSearchQuery}
              onChangeText={setVehicleSearchQuery}
            />
            {isLoadingCars ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.modalLoadingText}>Φόρτωση οχημάτων...</Text>
              </View>
            ) : filteredCars.length > 0 ? (
              <ScrollView style={styles.modalList}>
                {filteredCars.map((car) => {
                  const displayName = car.makeModel || `${car.make} ${car.model}`.trim();
                  const isSelected = selectedVehicleId === car.id;
                  return (
                    <TouchableOpacity
                      key={car.id}
                      style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                      onPress={() => handleVehicleSelect(car)}
                    >
                      <View>
                        <Text style={styles.modalOptionTitle}>{displayName}</Text>
                        <Text style={styles.modalOptionSubtitle}>{car.licensePlate}</Text>
                      </View>
                      {isSelected && <Text style={styles.modalOptionCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.modalEmptyState}>
                <Text style={styles.modalEmptyText}>Δεν βρέθηκαν οχήματα.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Πίσω</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Νέο Συμβόλαιο Ενοικίασης</Text>
        </View>

        {/* 1. Essential Renter Info - Compact */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>1. Στοιχεία Ενοικιαστή</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="Ονοματεπώνυμο *"
              placeholderTextColor={colors.textSecondary}
              value={renterInfo.fullName}
              onChangeText={(text) => setRenterInfo({ ...renterInfo, fullName: text })}
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="ΑΔΤ/Διαβατήριο *"
              value={renterInfo.idNumber}
              onChangeText={(text) => setRenterInfo({ ...renterInfo, idNumber: text })}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="ΑΦΜ *"
              value={renterInfo.taxId}
              onChangeText={(text) => setRenterInfo({ ...renterInfo, taxId: text })}
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Δίπλωμα Οδήγησης *"
              value={renterInfo.driverLicenseNumber}
              onChangeText={(text) => setRenterInfo({ ...renterInfo, driverLicenseNumber: text })}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Τηλέφωνο *"
              keyboardType="phone-pad"
              value={renterInfo.phoneNumber}
              onChangeText={(text) => setRenterInfo({ ...renterInfo, phoneNumber: text })}
            />
            <TextInput
              style={[styles.input, styles.halfWidth]}
              placeholder="Διεύθυνση *"
              value={renterInfo.address}
              onChangeText={(text) => setRenterInfo({ ...renterInfo, address: text })}
            />
          </View>
        </View>

        {/* 2. Rental Period - Compact */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>2. Περίοδος Ενοικίασης</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Παραλαβή *</Text>
              <TouchableOpacity onPress={() => setShowPickupDatePicker(true)} style={styles.dateButton}>
                <Text style={styles.dateText}>{format(rentalPeriod.pickupDate, 'dd/MM')}</Text>
              </TouchableOpacity>
              {showPickupDatePicker && (
                <DateTimePicker
                  value={rentalPeriod.pickupDate}
                  mode="date"
                  display="default"
                  onChange={onPickupDateChange}
                />
              )}
              <TextInput
                style={styles.timeInput}
                placeholder="10:00"
                value={rentalPeriod.pickupTime}
                onChangeText={(text) => setRentalPeriod({ ...rentalPeriod, pickupTime: text })}
              />
            </View>
            
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Επιστροφή *</Text>
              <TouchableOpacity onPress={() => setShowDropoffDatePicker(true)} style={styles.dateButton}>
                <Text style={styles.dateText}>{format(rentalPeriod.dropoffDate, 'dd/MM')}</Text>
              </TouchableOpacity>
              {showDropoffDatePicker && (
                <DateTimePicker
                  value={rentalPeriod.dropoffDate}
                  mode="date"
                  display="default"
                  onChange={onDropoffDateChange}
                />
              )}
              <TextInput
                style={styles.timeInput}
                placeholder="18:00"
                value={rentalPeriod.dropoffTime}
                onChangeText={(text) => setRentalPeriod({ ...rentalPeriod, dropoffTime: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Τοποθεσία παραλαβής *</Text>
            <View style={styles.locationOptions}>
              {LOCATION_OPTIONS.map((option) => {
                const isActive = pickupLocationOption === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.locationOptionButton,
                      isActive && styles.locationOptionButtonActive,
                    ]}
                    onPress={() => handlePickupOptionChange(option)}
                  >
                    <Text
                      style={[
                        styles.locationOptionText,
                        isActive && styles.locationOptionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {pickupLocationOption === 'Other' && (
              <TextInput
                style={styles.input}
                placeholder="Καταχώριση τοποθεσίας"
                value={pickupCustomLocation}
                onChangeText={handlePickupCustomChange}
              />
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Συνολικό Κόστος (€) *"
            keyboardType="numeric"
            value={rentalPeriod.totalCost > 0 ? rentalPeriod.totalCost.toString() : ''}
            onChangeText={(text) => setRentalPeriod({ ...rentalPeriod, totalCost: parseFloat(text) || 0 })}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Διαφορετική τοποθεσία επιστροφής</Text>
            <Switch
              onValueChange={handleDropoffToggle}
              value={rentalPeriod.isDifferentDropoffLocation}
            />
          </View>

          {rentalPeriod.isDifferentDropoffLocation && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Τοποθεσία επιστροφής *</Text>
              <View style={styles.locationOptions}>
                {LOCATION_OPTIONS.map((option) => {
                  const isActive = dropoffLocationOption === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.locationOptionButton,
                        isActive && styles.locationOptionButtonActive,
                      ]}
                      onPress={() => handleDropoffOptionChange(option)}
                    >
                      <Text
                        style={[
                          styles.locationOptionText,
                          isActive && styles.locationOptionTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {dropoffLocationOption === 'Other' && (
                <TextInput
                  style={styles.input}
                  placeholder="Καταχώριση τοποθεσίας"
                  value={dropoffCustomLocation}
                  onChangeText={handleDropoffCustomChange}
                />
              )}
            </View>
          )}
        </View>

        {/* 3. Car Info & Condition - Compact */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>3. Οχημα & Κατάσταση</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Όχημα *</Text>
            <TouchableOpacity
              style={styles.selectorInput}
              onPress={() => setIsVehicleModalVisible(true)}
            >
              {carInfo.licensePlate ? (
                <View>
                  <Text style={styles.selectorPrimaryText}>
                    {carInfo.makeModel || `${carInfo.make} ${carInfo.model}`.trim()}
                  </Text>
                  <Text style={styles.selectorSecondaryText}>{carInfo.licensePlate}</Text>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Επιλέξτε όχημα από τον στόλο</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Καύσιμο *</Text>
              <View style={styles.fuelContainer}>
                <View style={styles.fuelBarContainer}>
                  <View style={styles.fuelBar}>
                    <View style={[
                      styles.fuelBarFill, 
                      { width: `${(carCondition.fuelLevel / 8) * 100}%` }
                    ]} />
                  </View>
                  <Text style={styles.fuelLevelText}>{carCondition.fuelLevel}/8</Text>
                </View>
                <View style={styles.fuelButtons}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.fuelButton,
                        carCondition.fuelLevel >= level && styles.fuelButtonActive
                      ]}
                      onPress={() => setCarCondition({ ...carCondition, fuelLevel: level })}
                    >
                      <Text style={[
                        styles.fuelText,
                        carCondition.fuelLevel >= level && styles.fuelTextActive
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
                placeholder="50000"
                keyboardType="numeric"
                value={carCondition.mileage.toString()}
                onChangeText={(text) => setCarCondition({ ...carCondition, mileage: parseInt(text) || 0 })}
              />
            </View>
          </View>

          <View style={styles.insuranceContainer}>
            <Text style={styles.label}>Ασφάλεια *</Text>
            <View style={styles.insuranceButtons}>
              <TouchableOpacity
                style={[
                  styles.insuranceButton,
                  carCondition.insuranceType === 'basic' && styles.insuranceButtonActive
                ]}
                onPress={() => setCarCondition({ ...carCondition, insuranceType: 'basic' })}
              >
                <Text style={[
                  styles.insuranceText,
                  carCondition.insuranceType === 'basic' && styles.insuranceTextActive
                ]}>
                  Βασική
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.insuranceButton,
                  carCondition.insuranceType === 'full' && styles.insuranceButtonActive
                ]}
                onPress={() => setCarCondition({ ...carCondition, insuranceType: 'full' })}
              >
                <Text style={[
                  styles.insuranceText,
                  carCondition.insuranceType === 'full' && styles.insuranceTextActive
                ]}>
                  Πλήρης
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. Car Diagram - Compact */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <CarDiagram 
            onAddDamage={handleAddDamage} 
            onRemoveLastDamage={handleRemoveLastDamage}
            damagePoints={damagePoints}
            isEditable={true}
          />
        </View>

        {/* 5. Photos - Compact */}
        <ContractPhotoUploader
          contractId={savedContractId}
          onPhotosChanged={(count) => console.log(`Contract has ${count} photos`)}
        />

        {/* 6. Client Signature */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>6. Υπογραφή Ενοικιαστή</Text>
          <View style={styles.signatureContainer}>
            <Text style={styles.signatureLabel}>Υπογραφή Ενοικιαστή *</Text>
            <View style={styles.signatureBox}>
              {clientSignaturePaths.length > 0 ? (
                <View style={styles.signaturePreview}>
                  <Svg width="100%" height="100%" style={styles.signatureSvg} viewBox="0 0 300 200">
                    {clientSignaturePaths.map((path, index) => (
                      <Path
                        key={index}
                        d={path}
                        stroke="black"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </Svg>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => {
                      setClientSignature('');
                      setClientSignaturePaths([]);
                    }}
                  >
                    <Text style={styles.retakeButtonText}>Αλλαγή Υπογραφής</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.signatureCapture}>
                  <SignaturePad
                    onSignatureSave={handleSignatureSave}
                    initialSignature={clientSignature}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 7. Observations / Notes */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>7. Παρατηρήσεις / Σημειώσεις</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Παρατηρήσεις</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observations}
              onChangeText={setObservations}
              placeholder="Προσθέστε τυχόν παρατηρήσεις ή σημειώσεις για το συμβόλαιο..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveContract}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Συμβολαίου'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  userButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  userButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 50,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  halfWidth: {
    width: '48%',
  },
  input: {
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f5f5f5',
  },
  selectorInput: {
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  selectorPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  selectorSecondaryText: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: '#888',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  dateButton: {
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  timeInput: {
    borderRadius: 6,
    padding: 8,
    marginTop: 5,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f5f5f5',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  locationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    marginHorizontal: -4,
  },
  locationOptionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#d0d7e2',
    marginHorizontal: 4,
    marginBottom: 6,
  },
  locationOptionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  locationOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  locationOptionTextActive: {
    color: '#fff',
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
    color: '#666',
    fontWeight: 'bold',
  },
  fuelTextActive: {
    color: '#fff',
  },
  insuranceContainer: {
    marginTop: 10,
  },
  insuranceButtons: {
    flexDirection: 'row',
    marginTop: 5,
  },
  insuranceButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  insuranceButtonActive: {
    backgroundColor: '#007AFF',
  },
  insuranceText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  insuranceTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: '#a0c8ff',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signatureContainer: {
    marginTop: 10,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  signatureBox: {
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  signaturePreview: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  signatureCapture: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  signatureSvg: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
  signaturePlaceholder: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCloseText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSearchInput: {
    borderRadius: 8,
    backgroundColor: '#f2f4f7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    marginBottom: 12,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalLoadingText: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
  },
  modalList: {
    maxHeight: 320,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalOptionActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  modalOptionCheck: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '700',
  },
  modalEmptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    paddingVertical: 5,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  modalPlaceholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  helperText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  helperTextSuccess: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 4,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputGroup: {
    marginBottom: 15,
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
  photoWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 8,
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
  photoPlaceholderText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  photoPreviewUploaded: {
    opacity: 1,
  },
  uploadedIndicator: {
    position: 'absolute',
    top: -8,
    right: 25,
    backgroundColor: '#28a745',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedIndicatorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
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
});