import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/app-header';
import { BottomTabBar } from '../components/bottom-tab-bar';
import { SimpleGlassCard } from '../components/glass-card';
import { Breadcrumb } from '../components/breadcrumb';
import { PDFContractGenerator } from '../components/pdf-contract-generator';
import { ImageModal } from '../components/image-modal';
import { ContractPhotoButton } from '../components/contract-photo-button';
import { Contract, User } from '../models/contract.interface';
import { SupabaseContractService } from '../services/supabase-contract.service';
import { PhotoStorageService } from '../services/photo-storage.service';
import { supabase } from '../utils/supabase';
import { Colors, Typography, Shadows, Glass } from '../utils/design-system';
import { smoothScrollConfig } from '../utils/animations';
import { createContractWithAADE, canSubmitToAADE, getAADEStatusMessage } from '../utils/aade-contract-helper';
import { AuthService } from '../services/auth.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function ContractDetailsScreen() {
  const router = useRouter();
  const { contractId } = useLocalSearchParams();
  const [contract, setContract] = React.useState<Contract | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [submittingAADE, setSubmittingAADE] = React.useState(false);
  const [selectedImageUri, setSelectedImageUri] = React.useState<string | null>(null);
  const [isImageModalVisible, setIsImageModalVisible] = React.useState(false);
  const [contractPhotos, setContractPhotos] = React.useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [renewModalVisible, setRenewModalVisible] = React.useState(false);
  const [renewPickupDate, setRenewPickupDate] = React.useState<Date>(new Date());
  const [renewDropoffDate, setRenewDropoffDate] = React.useState<Date>(new Date());
  const [renewPickupTime, setRenewPickupTime] = React.useState<string>('10:00');
  const [renewDropoffTime, setRenewDropoffTime] = React.useState<string>('10:00');
  const [renewTotalCost, setRenewTotalCost] = React.useState<string>('0');
  const [renewDepositAmount, setRenewDepositAmount] = React.useState<string>('0');
  const [renewInsuranceCost, setRenewInsuranceCost] = React.useState<string>('0');
  const [renewNotes, setRenewNotes] = React.useState<string>('');
  const [copyPhotos, setCopyPhotos] = React.useState<boolean>(false);
  const [copySignature, setCopySignature] = React.useState<boolean>(false);
  const [isRenewing, setIsRenewing] = React.useState<boolean>(false);
  const [showRenewPickupDatePicker, setShowRenewPickupDatePicker] = React.useState<boolean>(false);
  const [showRenewDropoffDatePicker, setShowRenewDropoffDatePicker] = React.useState<boolean>(false);

  React.useEffect(() => {
    loadContract();
    loadContractPhotos();
    loadCurrentUser();
  }, [contractId]);

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
    if (typeof contractId === 'string') {
      try {
        const c = await SupabaseContractService.getContractById(contractId);
        if (c) {
          setContract(c);
          if (c.userId) {
            const { data: userData } = await supabase.from('users').select('id,name,email,phone,address,signature_url,created_at,updated_at').eq('id', c.userId).single();
            if (userData) {
              setUser({
                id: userData.id,
                name: userData.name,
                email: userData.email || '',
                phone: userData.phone || '',
                address: userData.address || '',
                signature: userData.signature_url || '',
                signatureUrl: userData.signature_url,
                createdAt: new Date(userData.created_at),
                updatedAt: userData.updated_at ? new Date(userData.updated_at) : undefined,
              });
            }
          }
        } else {
          Alert.alert('Σφάλμα', 'Το συμβόλαιο δεν βρέθηκε.');
          router.back();
        }
      } catch (error) {
        Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης');
        router.back();
      }
    }
  }

  async function loadContractPhotos() {
    if (typeof contractId === 'string') {
      try {
        const photos = await PhotoStorageService.getContractPhotos(contractId);
        const photoUrls = photos.map(photo => photo.photo_url).filter(Boolean);
        setContractPhotos(photoUrls);
      } catch (error) {
        console.error('Error loading contract photos:', error);
      }
    }
  }

  function handleContractPhotosUpdated(photos: string[]) {
    setContractPhotos(photos);
  }

  function handleOpenRenewModal() {
    if (!contract) return;
    const basePickup = new Date(contract.rentalPeriod.dropoffDate || new Date());
    basePickup.setDate(basePickup.getDate() + 1);
    basePickup.setHours(0, 0, 0, 0);
    const defaultPickup = basePickup > new Date() ? basePickup : new Date();
    const defaultDropoff = new Date(defaultPickup);
    defaultDropoff.setMonth(defaultDropoff.getMonth() + 1);

    const pickupTime = contract.rentalPeriod?.pickupTime || '10:00';
    const dropoffTime = contract.rentalPeriod?.dropoffTime || pickupTime;

    setRenewPickupDate(defaultPickup);
    setRenewDropoffDate(defaultDropoff);
    setRenewPickupTime(pickupTime);
    setRenewDropoffTime(dropoffTime);
    setRenewTotalCost(String(contract.rentalPeriod?.totalCost || 0));
    setRenewDepositAmount(String(contract.rentalPeriod?.depositAmount || 0));
    setRenewInsuranceCost(String(contract.rentalPeriod?.insuranceCost || 0));
    setRenewNotes(`Ανανέωση από συμβόλαιο ${contract.id}`);
    setCopyPhotos(false);
    setCopySignature(false);
    setRenewModalVisible(true);
  }

  function handleCloseRenewModal() {
    if (isRenewing) return;
    setRenewModalVisible(false);
    setShowRenewPickupDatePicker(false);
    setShowRenewDropoffDatePicker(false);
  }

  function onRenewPickupDateChange(event: any, selectedDate?: Date) {
    setShowRenewPickupDatePicker(false);
    if (selectedDate) {
      const adjusted = new Date(selectedDate);
      adjusted.setHours(0, 0, 0, 0);
      setRenewPickupDate(adjusted);
      if (adjusted > renewDropoffDate) {
        const newDropoff = new Date(adjusted);
        newDropoff.setMonth(newDropoff.getMonth() + 1);
        setRenewDropoffDate(newDropoff);
      }
    }
  }

  function onRenewDropoffDateChange(event: any, selectedDate?: Date) {
    setShowRenewDropoffDatePicker(false);
    if (selectedDate) {
      const adjusted = new Date(selectedDate);
      adjusted.setHours(0, 0, 0, 0);
      if (adjusted <= renewPickupDate) {
        Alert.alert('Μη έγκυρη ημερομηνία', 'Η ημερομηνία επιστροφής πρέπει να είναι μετά την ημερομηνία παραλαβής.');
        return;
      }
      setRenewDropoffDate(adjusted);
    }
  }

  async function handleRenewContract() {
    if (!contract) return;

    const totalCostValue = parseFloat(renewTotalCost.replace(',', '.')) || 0;
    if (totalCostValue <= 0) {
      Alert.alert('Σφάλμα', 'Εισάγετε έγκυρο συνολικό κόστος.');
      return;
    }

    if (renewDropoffDate <= renewPickupDate) {
      Alert.alert('Σφάλμα', 'Η ημερομηνία επιστροφής πρέπει να είναι μεταγενέστερη της παραλαβής.');
      return;
    }

    setIsRenewing(true);

    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Σφάλμα', 'Δεν είστε συνδεδεμένος. Παρακαλώ συνδεθείτε πρώτα.');
        setIsRenewing(false);
        return;
      }

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const pickupDate = new Date(renewPickupDate);
      const dropoffDate = new Date(renewDropoffDate);

      const pickup = new Date(pickupDate);
      const dropoff = new Date(dropoffDate);
      const now = new Date();
      pickup.setHours(0, 0, 0, 0);
      dropoff.setHours(0, 0, 0, 0);

      let status: 'active' | 'completed' | 'upcoming';
      if (now < pickup) {
        status = 'upcoming';
      } else if (now >= pickup && now <= dropoff) {
        status = 'active';
      } else {
        status = 'completed';
      }

      const depositValue = parseFloat(renewDepositAmount.replace(',', '.')) || 0;
      const insuranceValue = parseFloat(renewInsuranceCost.replace(',', '.')) || 0;

      const renewalNote = `Ανανέωση από συμβόλαιο ${contract.id}`;
      const customNote = renewNotes.trim();
      const combinedObservations = [
        contract.observations?.trim(),
        customNote && customNote !== renewalNote ? customNote : '',
        renewalNote,
      ].filter(Boolean).join('\n');

      const photosToCopy = copyPhotos ? [...(contract.photoUris && contract.photoUris.length > 0 ? contract.photoUris : contractPhotos)] : [];
      const signatureToCopy = copySignature ? contract.clientSignature : '';
      const signaturePathsToCopy = copySignature ? (contract.clientSignaturePaths || []) : [];

      const newContract: Contract = {
        id: generateUUID(),
        renterInfo: { ...contract.renterInfo },
        rentalPeriod: {
          pickupDate,
          pickupTime: renewPickupTime || contract.rentalPeriod.pickupTime || '10:00',
          pickupLocation: contract.rentalPeriod.pickupLocation,
          dropoffDate,
          dropoffTime: renewDropoffTime || contract.rentalPeriod.dropoffTime || renewPickupTime || '10:00',
          dropoffLocation: contract.rentalPeriod.isDifferentDropoffLocation
            ? contract.rentalPeriod.dropoffLocation
            : contract.rentalPeriod.pickupLocation,
          isDifferentDropoffLocation: contract.rentalPeriod.isDifferentDropoffLocation,
          totalCost: totalCostValue,
          depositAmount: depositValue,
          insuranceCost: insuranceValue,
        },
        carInfo: { ...contract.carInfo },
        carCondition: { ...contract.carCondition },
        damagePoints: [],
        photoUris: photosToCopy,
        clientSignature: signatureToCopy,
        clientSignaturePaths: signaturePathsToCopy,
        observations: combinedObservations || undefined,
        userId: currentUser.id,
        status,
        createdAt: new Date(),
        aadeStatus: null,
        aadeDclId: null,
        tags: contract.tags ? [...contract.tags] : undefined,
        categoryId: contract.categoryId,
      };

      const saved = await SupabaseContractService.saveContract(newContract);

      Alert.alert(
        'Επιτυχία',
        'Η ανανέωση δημιουργήθηκε επιτυχώς.',
        [
          {
            text: 'Προβολή',
            onPress: () => {
              setRenewModalVisible(false);
              router.replace(`/contract-details?contractId=${saved.id}`);
            },
          },
          {
            text: 'Κλείσιμο',
            style: 'cancel',
            onPress: () => {
              setRenewModalVisible(false);
              loadContract();
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error('Error renewing contract:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία δημιουργίας ανανέωσης συμβολαίου.');
    } finally {
      setIsRenewing(false);
    }
  }

  function handleEdit() {
    if (contract) router.push(`/edit-contract?contractId=${contract.id}`);
  }

  async function handleDelete() {
    if (!contract) return;
    
    Alert.alert(
      'Επιβεβαίωση Διαγραφής',
      `Είστε σίγουροι ότι θέλετε να διαγράψετε το συμβόλαιο του/της ${contract.renterInfo.fullName}; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`,
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              await SupabaseContractService.deleteContract(contract.id);
              Alert.alert('Επιτυχία', 'Το συμβόλαιο διαγράφηκε επιτυχώς.', [
                { text: 'OK', onPress: () => router.push('/(tabs)/') }
              ]);
            } catch (error: any) {
              console.error('Error deleting contract:', error);
              
              // Check if this is a permission/authorization error
              const errorMessage = error?.message?.toLowerCase() || '';
              const errorCode = error?.code || '';
              
              // RLS policy violation or permission denied
              if (
                errorMessage.includes('policy') || 
                errorMessage.includes('permission') ||
                errorMessage.includes('denied') ||
                errorCode === 'PGRST301' ||
                errorCode === '42501'
              ) {
                Alert.alert(
                  'Δεν Επιτρέπεται',
                  'Δεν έχετε δικαίωμα να διαγράψετε αυτό το συμβόλαιο. Μπορείτε να διαγράψετε μόνο τα δικά σας συμβόλαια.',
                  [{ text: 'OK' }]
                );
              } else {
                // Generic error
                Alert.alert(
                  'Σφάλμα', 
                  'Αποτυχία διαγραφής συμβολαίου. Παρακαλώ δοκιμάστε ξανά.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        }
      ]
    );
  }

  function handleViewPhoto(uri: string) {
    setSelectedImageUri(uri);
    setIsImageModalVisible(true);
  }

  async function handlePushToAADE() {
    if (!contract) return;

    // Check if can submit
    const validation = canSubmitToAADE(contract);
    if (!validation.canSubmit) {
      Alert.alert('Σφάλμα', validation.reason || 'Δεν είναι δυνατή η υποβολή στο AADE');
      return;
    }

    // Check if already submitted
    if (contract.aadeStatus === 'submitted' || contract.aadeStatus === 'completed') {
      Alert.alert(
        'Ειδοποίηση',
        'Αυτό το συμβόλαιο έχει ήδη υποβληθεί στο AADE.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Υποβολή στο AADE',
      'Θέλετε να υποβάλετε αυτό το συμβόλαιο στο AADE;',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Υποβολή',
          onPress: async () => {
            setSubmittingAADE(true);
            try {
              const result = await createContractWithAADE(contract, contract.id, contract.userId);
              
              if (result.success) {
                Alert.alert(
                  'Επιτυχία',
                  `Το συμβόλαιο υποβλήθηκε επιτυχώς στο AADE${result.aadeDclId ? ` με DCL ID: ${result.aadeDclId}` : ''}`
                );
                // Reload contract to get updated AADE status
                await loadContract();
              } else {
                Alert.alert('Σφάλμα', result.error || 'Αποτυχία υποβολής στο AADE');
              }
            } catch (error) {
              Alert.alert('Σφάλμα', 'Αποτυχία υποβολής στο AADE');
              console.error('AADE submission error:', error);
            } finally {
              setSubmittingAADE(false);
            }
          },
        },
      ]
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <AppHeader title="Λεπτομέρειες" showBack={true} showActions={true} />
        <View style={s.loading}>
          <Text style={s.loadingText}>Φόρτωση...</Text>
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  const InfoRow = ({ icon, label, value }: any) => (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <AppHeader title="Λεπτομέρειες Συμβολαίου" showBack={true} showActions={true} />

      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Συμβόλαια', path: '/contracts' },
          { label: `#${contract.id.slice(0, 8)}` },
        ]}
      />

      <ScrollView style={s.content} contentContainerStyle={s.scrollContent} {...smoothScrollConfig}>
        {/* AADE Status Badge */}
        {contract.aadeStatus && (
          <View style={s.aadeStatusContainer}>
            <View style={[s.aadeBadge, { backgroundColor: getAADEStatusMessage(contract.aadeStatus).color + '15' }]}>
              <Ionicons 
                name={contract.aadeStatus === 'submitted' || contract.aadeStatus === 'completed' ? 'checkmark-circle' : 'alert-circle'} 
                size={18} 
                color={getAADEStatusMessage(contract.aadeStatus).color} 
              />
              <Text style={[s.aadeStatusText, { color: getAADEStatusMessage(contract.aadeStatus).color }]}>
                {getAADEStatusMessage(contract.aadeStatus).text}
              </Text>
            </View>
            {contract.aadeDclId && (
              <Text style={s.aadeDclId}>DCL ID: {contract.aadeDclId}</Text>
            )}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ενοικιαστής</Text>
          <View style={s.card}>
            <InfoRow icon="person" label="Ονομα" value={contract.renterInfo?.fullName || 'N/A'} />
            <InfoRow icon="mail" label="Email" value={contract.renterInfo?.email || 'N/A'} />
            <InfoRow icon="call" label="Τηλέφωνο" value={contract.renterInfo?.phoneNumber || 'N/A'} />
            {contract.renterInfo?.driverLicenseNumber && (
              <InfoRow icon="card" label="Αδεια" value={contract.renterInfo.driverLicenseNumber} />
            )}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Οχημα</Text>
          <View style={s.card}>
            <InfoRow icon="car" label="Οχημα" value={contract.carInfo?.makeModel || 'N/A'} />
            <InfoRow icon="pricetag" label="Πινακίδα" value={contract.carInfo?.licensePlate || 'N/A'} />
            <InfoRow icon="speedometer" label="Χιλιόμετρα" value={`${contract.carCondition?.mileage || contract.carInfo?.mileage || 0} km`} />
            <InfoRow icon="water" label="Καύσιμο" value={`${contract.carCondition?.fuelLevel || 0}/8`} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Περιοδος & Κοστος</Text>
          <View style={s.card}>
            <InfoRow icon="calendar" label="Παραλαβή" value={contract.rentalPeriod?.pickupDate ? new Date(contract.rentalPeriod.pickupDate).toLocaleDateString('el-GR') : 'N/A'} />
            <InfoRow icon="calendar" label="Επιστροφή" value={contract.rentalPeriod?.dropoffDate ? new Date(contract.rentalPeriod.dropoffDate).toLocaleDateString('el-GR') : 'N/A'} />
            <InfoRow icon="time" label="Ημέρες" value={(() => {
              if (contract.rentalPeriod?.pickupDate && contract.rentalPeriod?.dropoffDate) {
                const days = Math.ceil((new Date(contract.rentalPeriod.dropoffDate).getTime() - new Date(contract.rentalPeriod.pickupDate).getTime()) / (1000 * 60 * 60 * 24));
                return days.toString();
              }
              return '0';
            })()} />
            <InfoRow icon="cash" label="Σύνολο" value={`€${contract.rentalPeriod?.totalCost || 0}`} />
          </View>
        </View>

        {contract.damagePoints && contract.damagePoints.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ζημιες ({contract.damagePoints.length})</Text>
            <View style={s.card}>
              {contract.damagePoints.map((d, idx) => {
                const markerTypeLabels: Record<string, string> = {
                  'slight-scratch': 'Γρατζουνιά',
                  'heavy-scratch': 'Βαθιά γρατζουνιά',
                  'bent': 'Λυγισμένη λαμαρίνα',
                  'broken': 'Σπασμένο/Λείπει'
                };
                const markerLabel = d.markerType ? markerTypeLabels[d.markerType] : 'Ζημιά';
                return (
                  <View key={idx} style={s.damageRow}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error} />
                    <Text style={s.damageText}>{markerLabel} - {d.description || d.view} ({d.severity})</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Contract Photos */}
        {contract && (
          <ContractPhotoButton
            contractId={contract.id}
            onPhotosUpdated={(count) => console.log(`Contract has ${count} photos`)}
          />
        )}

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, s.btnRenew]} onPress={handleOpenRenewModal}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={s.btnText}>Ανανέωση</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={handleEdit}>
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={s.btnText}>Επεξεργασία</Text>
          </TouchableOpacity>
          {/* Only show delete button if user owns this contract */}
          {currentUserId === contract.userId ? (
            <TouchableOpacity style={[s.btn, s.btnDelete]} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={s.btnText}>Διαγραφή</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.btn, s.btnDisabled]}>
              <Ionicons name="lock-closed" size={18} color="#999" />
              <Text style={[s.btnText, s.btnTextDisabled]}>Μη Διαθέσιμο</Text>
            </View>
          )}
        </View>

        {/* Professional PDF Generator */}
        {user && (
          <PDFContractGenerator
            contract={contract}
            user={user}
            style={{ marginHorizontal: 16, marginTop: 16 }}
          />
        )}

        {/* AADE Push Button */}
        <TouchableOpacity 
          style={[s.aadeButton, submittingAADE && s.aadeButtonDisabled]} 
          onPress={handlePushToAADE}
          disabled={submittingAADE}
        >
          {submittingAADE ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={s.aadeButtonText}>Αποστολή στο AADE...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={s.aadeButtonText}>Αποστολή στο AADE</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={renewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseRenewModal}
      >
        <View style={s.renewModalOverlay}>
          <TouchableOpacity
            style={s.renewModalBackdrop}
            activeOpacity={1}
            onPress={handleCloseRenewModal}
          />
          <View style={s.renewModalCard}>
            <View style={s.renewModalHeader}>
              <Text style={s.renewModalTitle}>Ανανέωση Συμβολαίου</Text>
              <TouchableOpacity onPress={handleCloseRenewModal} disabled={isRenewing}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.renewModalContent} showsVerticalScrollIndicator={false}>
              <View style={s.renewSection}>
                <Text style={s.renewSectionTitle}>Περίοδος Ενοικίασης</Text>
                <View style={s.renewRow}>
                  <View style={s.renewField}>
                    <Text style={s.renewLabel}>Παραλαβή</Text>
                    <TouchableOpacity
                      style={s.renewDateButton}
                      onPress={() => setShowRenewPickupDatePicker(true)}
                      disabled={isRenewing}
                    >
                      <Text style={s.renewDateText}>{format(renewPickupDate, 'dd/MM/yyyy')}</Text>
                    </TouchableOpacity>
                    {showRenewPickupDatePicker && (
                      <DateTimePicker
                        value={renewPickupDate}
                        mode="date"
                        display="default"
                        onChange={onRenewPickupDateChange}
                      />
                    )}
                    <TextInput
                      style={s.renewInput}
                      value={renewPickupTime}
                      onChangeText={setRenewPickupTime}
                      placeholder="Ώρα (π.χ. 10:00)"
                      keyboardType="numbers-and-punctuation"
                      editable={!isRenewing}
                    />
                  </View>
                  <View style={s.renewField}>
                    <Text style={s.renewLabel}>Επιστροφή</Text>
                    <TouchableOpacity
                      style={s.renewDateButton}
                      onPress={() => setShowRenewDropoffDatePicker(true)}
                      disabled={isRenewing}
                    >
                      <Text style={s.renewDateText}>{format(renewDropoffDate, 'dd/MM/yyyy')}</Text>
                    </TouchableOpacity>
                    {showRenewDropoffDatePicker && (
                      <DateTimePicker
                        value={renewDropoffDate}
                        mode="date"
                        display="default"
                        onChange={onRenewDropoffDateChange}
                      />
                    )}
                    <TextInput
                      style={s.renewInput}
                      value={renewDropoffTime}
                      onChangeText={setRenewDropoffTime}
                      placeholder="Ώρα (π.χ. 10:00)"
                      keyboardType="numbers-and-punctuation"
                      editable={!isRenewing}
                    />
                  </View>
                </View>
              </View>

              <View style={s.renewSection}>
                <Text style={s.renewSectionTitle}>Οικονομικά</Text>
                <TextInput
                  style={s.renewInput}
                  value={renewTotalCost}
                  onChangeText={setRenewTotalCost}
                  placeholder="Συνολικό Κόστος (€)"
                  keyboardType="numeric"
                  editable={!isRenewing}
                />
                <TextInput
                  style={s.renewInput}
                  value={renewDepositAmount}
                  onChangeText={setRenewDepositAmount}
                  placeholder="Προκαταβολή (€)"
                  keyboardType="numeric"
                  editable={!isRenewing}
                />
                <TextInput
                  style={s.renewInput}
                  value={renewInsuranceCost}
                  onChangeText={setRenewInsuranceCost}
                  placeholder="Κόστος Ασφάλειας (€)"
                  keyboardType="numeric"
                  editable={!isRenewing}
                />
              </View>

              <View style={s.renewToggles}>
                <View style={s.renewToggleRow}>
                  <View>
                    <Text style={s.renewToggleLabel}>Αντιγραφή Φωτογραφιών</Text>
                    <Text style={s.renewToggleHint}>Χρήση των ίδιων φωτογραφιών με το αρχικό συμβόλαιο</Text>
                  </View>
                  <Switch
                    value={copyPhotos}
                    onValueChange={setCopyPhotos}
                    disabled={isRenewing}
                  />
                </View>
                <View style={s.renewToggleRow}>
                  <View>
                    <Text style={s.renewToggleLabel}>Αντιγραφή Υπογραφής</Text>
                    <Text style={s.renewToggleHint}>Διατήρηση της υπάρχουσας υπογραφής ενοικιαστή</Text>
                  </View>
                  <Switch
                    value={copySignature}
                    onValueChange={setCopySignature}
                    disabled={isRenewing}
                  />
                </View>
              </View>

              <View style={s.renewSection}>
                <Text style={s.renewSectionTitle}>Σημειώσεις</Text>
                <TextInput
                  style={[s.renewInput, s.renewTextarea]}
                  value={renewNotes}
                  onChangeText={setRenewNotes}
                  placeholder="Προσθέστε σημειώσεις για την ανανέωση (προαιρετικό)"
                  multiline
                  numberOfLines={3}
                  editable={!isRenewing}
                />
              </View>
            </ScrollView>

            <View style={s.renewActions}>
              <TouchableOpacity
                style={[s.renewButton, s.renewButtonSecondary]}
                onPress={handleCloseRenewModal}
                disabled={isRenewing}
              >
                <Text style={s.renewButtonSecondaryText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.renewButton, s.renewButtonPrimary, isRenewing && s.renewButtonDisabled]}
                onPress={handleRenewContract}
                disabled={isRenewing}
              >
                {isRenewing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.renewButtonPrimaryText}>Δημιουργία Ανανέωσης</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Modal for viewing photos */}
      <ImageModal
        visible={isImageModalVisible}
        imageUri={selectedImageUri}
        onClose={() => {
          setIsImageModalVisible(false);
          setSelectedImageUri(null);
        }}
      />

      <BottomTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  content: { flex: 1, padding: 8 },
  scrollContent: { paddingBottom: 120 },
  aadeStatusContainer: { marginBottom: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, ...Shadows.sm },
  aadeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8 },
  aadeStatusText: { fontSize: 14, fontWeight: '600' },
  aadeDclId: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, fontFamily: 'monospace' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, ...Shadows.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', minWidth: 80 },
  infoValue: { fontSize: 13, color: Colors.text, flex: 1, fontWeight: '600' },
  damageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  damageText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, padding: 12, borderRadius: 12 },
  btnRenew: { backgroundColor: Colors.secondary },
  btnSecondary: { backgroundColor: Colors.success },
  btnDelete: { backgroundColor: Colors.error },
  btnDisabled: { backgroundColor: '#e0e0e0' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnTextDisabled: { color: '#999' },
  aadeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    ...Shadows.sm,
  },
  aadeButtonDisabled: {
    opacity: 0.6,
  },
  aadeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  photosScroll: {
    marginTop: 8,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    ...Shadows.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  renewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  renewModalBackdrop: {
    flex: 1,
  },
  renewModalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  renewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  renewModalTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '600',
  },
  renewModalContent: {
    paddingHorizontal: 20,
  },
  renewSection: {
    marginBottom: 16,
  },
  renewSectionTitle: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  renewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  renewField: {
    flex: 1,
  },
  renewLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  renewDateButton: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundSecondary,
    marginBottom: 8,
  },
  renewDateText: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '500',
  },
  renewInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.text,
    ...Typography.bodyMedium,
    marginBottom: 10,
  },
  renewTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  renewToggles: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundSecondary,
    marginBottom: 16,
  },
  renewToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  renewToggleLabel: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
  },
  renewToggleHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  renewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    gap: 12,
  },
  renewButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  renewButtonSecondary: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  renewButtonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  renewButtonSecondaryText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  renewButtonDisabled: {
    opacity: 0.7,
  },
});
