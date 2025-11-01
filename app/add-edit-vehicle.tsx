import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VehicleService } from '../services/vehicle.service';
import { Vehicle, VehicleCategory, VehicleStatus, InsuranceType } from '../models/vehicle.interface';
import { Colors, Shadows } from '../utils/design-system';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { AuthService } from '../services/auth.service';

type DateField = 'kteoLast' | 'kteoExpiry' | 'insuranceExpiry' | 'tiresFront' | 'tiresRear' | 'tiresNext' | 'lastService';

export default function AddEditVehicleScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();
  const isEdit = !!vehicleId;

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<DateField | null>(null);
  
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: '',
    category: 'car' as VehicleCategory,
    currentMileage: 0,
    status: 'available' as VehicleStatus,
    
    // GPS Tracking
    hasGps: false,
    
    // KTEO
    kteoLastDate: null as Date | null,
    kteoExpiryDate: null as Date | null,
    
    // Insurance
    insuranceType: 'basic' as InsuranceType,
    insuranceExpiryDate: null as Date | null,
    insuranceCompany: '',
    insurancePolicyNumber: '',
    insuranceHasMixedCoverage: false,
    
    // Tires
    tiresFrontDate: null as Date | null,
    tiresFrontBrand: '',
    tiresRearDate: null as Date | null,
    tiresRearBrand: '',
    tiresNextChangeDate: null as Date | null,
    
    // Service
    lastServiceDate: null as Date | null,
    lastServiceMileage: null as number | null,
    nextServiceMileage: null as number | null,
    
    notes: '',
  });

  useEffect(() => {
    if (isEdit && typeof vehicleId === 'string') {
      loadVehicle(vehicleId);
    }
  }, [vehicleId]);

  async function loadVehicle(id: string) {
    try {
      setLoading(true);
      const vehicle = await VehicleService.getVehicleById(id);
      if (vehicle) {
        setFormData({
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year || new Date().getFullYear(),
          licensePlate: vehicle.licensePlate,
          color: vehicle.color || '',
          category: vehicle.category || 'car',
          currentMileage: vehicle.currentMileage ?? 0,
          status: vehicle.status,
          hasGps: vehicle.hasGps || false,
          kteoLastDate: vehicle.kteoLastDate,
          kteoExpiryDate: vehicle.kteoExpiryDate,
          insuranceType: vehicle.insuranceType || 'basic',
          insuranceExpiryDate: vehicle.insuranceExpiryDate,
          insuranceCompany: vehicle.insuranceCompany || '',
          insurancePolicyNumber: vehicle.insurancePolicyNumber || '',
          insuranceHasMixedCoverage: vehicle.insuranceHasMixedCoverage || false,
          tiresFrontDate: vehicle.tiresFrontDate,
          tiresFrontBrand: vehicle.tiresFrontBrand || '',
          tiresRearDate: vehicle.tiresRearDate,
          tiresRearBrand: vehicle.tiresRearBrand || '',
          tiresNextChangeDate: vehicle.tiresNextChangeDate,
          lastServiceDate: vehicle.lastServiceDate,
          lastServiceMileage: vehicle.lastServiceMileage,
          nextServiceMileage: vehicle.nextServiceMileage,
          notes: vehicle.notes || '',
        });
      }
    } catch (error) {
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης οχήματος');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.make || !formData.model || !formData.licensePlate) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία');
      return;
    }

    try {
      setLoading(true);
      const user = await AuthService.getCurrentUser();
      if (!user) {
        Alert.alert('Σφάλμα', 'Δεν είστε συνδεδεμένος');
        return;
      }

      const vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.id,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        licensePlate: formData.licensePlate,
        color: formData.color || null,
        category: formData.category,
        currentMileage: formData.currentMileage,
        status: formData.status,
        hasGps: formData.hasGps,
        kteoLastDate: formData.kteoLastDate,
        kteoExpiryDate: formData.kteoExpiryDate,
        insuranceType: formData.insuranceType,
        insuranceExpiryDate: formData.insuranceExpiryDate,
        insuranceCompany: formData.insuranceCompany || null,
        insurancePolicyNumber: formData.insurancePolicyNumber || null,
        insuranceHasMixedCoverage: formData.insuranceHasMixedCoverage,
        tiresFrontDate: formData.tiresFrontDate,
        tiresFrontBrand: formData.tiresFrontBrand || null,
        tiresRearDate: formData.tiresRearDate,
        tiresRearBrand: formData.tiresRearBrand || null,
        tiresNextChangeDate: formData.tiresNextChangeDate,
        lastServiceDate: formData.lastServiceDate,
        lastServiceMileage: formData.lastServiceMileage,
        nextServiceMileage: formData.nextServiceMileage,
        notes: formData.notes || null,
      };

      if (isEdit && typeof vehicleId === 'string') {
        await VehicleService.updateVehicle(vehicleId, vehicleData);
        Alert.alert('Επιτυχία', 'Το όχημα ενημερώθηκε επιτυχώς');
      } else {
        await VehicleService.createVehicle(vehicleData);
        Alert.alert('Επιτυχία', 'Το όχημα προστέθηκε επιτυχώς');
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης οχήματος');
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(field: DateField, date: Date | undefined) {
    if (date) {
      switch (field) {
        case 'kteoLast':
          setFormData(prev => ({ ...prev, kteoLastDate: date }));
          break;
        case 'kteoExpiry':
          setFormData(prev => ({ ...prev, kteoExpiryDate: date }));
          break;
        case 'insuranceExpiry':
          setFormData(prev => ({ ...prev, insuranceExpiryDate: date }));
          break;
        case 'tiresFront':
          setFormData(prev => ({ ...prev, tiresFrontDate: date }));
          break;
        case 'tiresRear':
          setFormData(prev => ({ ...prev, tiresRearDate: date }));
          break;
        case 'tiresNext':
          setFormData(prev => ({ ...prev, tiresNextChangeDate: date }));
          break;
        case 'lastService':
          setFormData(prev => ({ ...prev, lastServiceDate: date }));
          break;
      }
    }
    setShowDatePicker(null);
  }

  function formatDateDisplay(date: Date | null): string {
    return date ? format(date, 'd MMM yyyy', { locale: el }) : 'Επιλογή ημερομηνίας';
  }

  function getDateForPicker(field: DateField): Date {
    switch (field) {
      case 'kteoLast':
        return formData.kteoLastDate || new Date();
      case 'kteoExpiry':
        return formData.kteoExpiryDate || new Date();
      case 'insuranceExpiry':
        return formData.insuranceExpiryDate || new Date();
      case 'tiresFront':
        return formData.tiresFrontDate || new Date();
      case 'tiresRear':
        return formData.tiresRearDate || new Date();
      case 'tiresNext':
        return formData.tiresNextChangeDate || new Date();
      case 'lastService':
        return formData.lastServiceDate || new Date();
      default:
        return new Date();
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Επεξεργασία Οχήματος' : 'Νέο Όχημα'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[s.saveButton, loading && s.saveButtonDisabled]}>
            {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {/* Basic Information */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Βασικές Πληροφορίες</Text>
          
          <View style={s.row}>
            <View style={s.halfWidth}>
              <Text style={s.label}>Μάρκα *</Text>
              <TextInput
                style={s.input}
                value={formData.make}
                onChangeText={(text) => setFormData(prev => ({ ...prev, make: text }))}
                placeholder="Toyota"
              />
            </View>
            <View style={s.halfWidth}>
              <Text style={s.label}>Μοντέλο *</Text>
              <TextInput
                style={s.input}
                value={formData.model}
                onChangeText={(text) => setFormData(prev => ({ ...prev, model: text }))}
                placeholder="Yaris"
              />
            </View>
          </View>

          <View style={s.row}>
            <View style={s.halfWidth}>
              <Text style={s.label}>Πινακίδα *</Text>
              <TextInput
                style={s.input}
                value={formData.licensePlate}
                onChangeText={(text) => setFormData(prev => ({ ...prev, licensePlate: text.toUpperCase() }))}
                placeholder="ABC-1234"
                autoCapitalize="characters"
              />
            </View>
            <View style={s.halfWidth}>
              <Text style={s.label}>Έτος</Text>
              <TextInput
                style={s.input}
                value={formData.year?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, year: parseInt(text) || new Date().getFullYear() }))}
                placeholder="2023"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={s.label}>Χρώμα</Text>
          <TextInput
            style={s.input}
            value={formData.color}
            onChangeText={(text) => setFormData(prev => ({ ...prev, color: text }))}
            placeholder="Λευκό"
          />

          <Text style={s.label}>Τρέχοντα Χιλιόμετρα</Text>
          <TextInput
            style={s.input}
            value={formData.currentMileage?.toString() || '0'}
            onChangeText={(text) => setFormData(prev => ({ ...prev, currentMileage: parseInt(text) || 0 }))}
            placeholder="50000"
            keyboardType="numeric"
          />

          <View style={s.switchRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={s.label}>GPS Tracking</Text>
            </View>
            <Switch
              value={formData.hasGps}
              onValueChange={(value) => setFormData(prev => ({ ...prev, hasGps: value }))}
              trackColor={{ false: '#e5e7eb', true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* KTEO */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>KTEO</Text>
          
          <View style={s.row}>
            <View style={s.halfWidth}>
              <Text style={s.label}>Τελευταίο KTEO</Text>
              <TouchableOpacity
                style={s.dateButton}
                onPress={() => setShowDatePicker('kteoLast')}
              >
                <Text style={s.dateButtonText}>{formatDateDisplay(formData.kteoLastDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={s.halfWidth}>
              <Text style={s.label}>Λήξη KTEO</Text>
              <TouchableOpacity
                style={s.dateButton}
                onPress={() => setShowDatePicker('kteoExpiry')}
              >
                <Text style={s.dateButtonText}>{formatDateDisplay(formData.kteoExpiryDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Insurance */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ασφάλεια</Text>
          
          <View style={s.row}>
            <TouchableOpacity
              style={[s.insuranceOption, formData.insuranceType === 'basic' && s.insuranceOptionActive]}
              onPress={() => setFormData(prev => ({ ...prev, insuranceType: 'basic' }))}
            >
              <Text style={[s.insuranceOptionText, formData.insuranceType === 'basic' && s.insuranceOptionTextActive]}>
                Βασική
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.insuranceOption, formData.insuranceType === 'full' && s.insuranceOptionActive]}
              onPress={() => setFormData(prev => ({ ...prev, insuranceType: 'full' }))}
            >
              <Text style={[s.insuranceOptionText, formData.insuranceType === 'full' && s.insuranceOptionTextActive]}>
                Πλήρης
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.switchRow}>
            <Text style={s.label}>Περιλαμβάνει Μικτή Ασφάλιση</Text>
            <Switch
              value={formData.insuranceHasMixedCoverage}
              onValueChange={(value) => setFormData(prev => ({ ...prev, insuranceHasMixedCoverage: value }))}
              trackColor={{ false: '#e5e7eb', true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Text style={s.label}>Λήξη Ασφάλειας</Text>
          <TouchableOpacity
            style={s.dateButton}
            onPress={() => setShowDatePicker('insuranceExpiry')}
          >
            <Text style={s.dateButtonText}>{formatDateDisplay(formData.insuranceExpiryDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <Text style={s.label}>Ασφαλιστική Εταιρεία</Text>
          <TextInput
            style={s.input}
            value={formData.insuranceCompany}
            onChangeText={(text) => setFormData(prev => ({ ...prev, insuranceCompany: text }))}
            placeholder="π.χ. Εθνική Ασφαλιστική"
          />

          <Text style={s.label}>Αριθμός Ασφαλιστηρίου</Text>
          <TextInput
            style={s.input}
            value={formData.insurancePolicyNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, insurancePolicyNumber: text }))}
            placeholder="π.χ. POL123456"
          />
        </View>

        {/* Tires */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Λάστιχα</Text>
          
          <View style={s.row}>
            <View style={s.halfWidth}>
              <Text style={s.label}>Αλλαγή Εμπρός</Text>
              <TouchableOpacity
                style={s.dateButton}
                onPress={() => setShowDatePicker('tiresFront')}
              >
                <Text style={s.dateButtonText}>{formatDateDisplay(formData.tiresFrontDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={s.halfWidth}>
              <Text style={s.label}>Μάρκα Εμπρός</Text>
              <TextInput
                style={s.input}
                value={formData.tiresFrontBrand}
                onChangeText={(text) => setFormData(prev => ({ ...prev, tiresFrontBrand: text }))}
                placeholder="Michelin"
              />
            </View>
          </View>

          <View style={s.row}>
            <View style={s.halfWidth}>
              <Text style={s.label}>Αλλαγή Πίσω</Text>
              <TouchableOpacity
                style={s.dateButton}
                onPress={() => setShowDatePicker('tiresRear')}
              >
                <Text style={s.dateButtonText}>{formatDateDisplay(formData.tiresRearDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={s.halfWidth}>
              <Text style={s.label}>Μάρκα Πίσω</Text>
              <TextInput
                style={s.input}
                value={formData.tiresRearBrand}
                onChangeText={(text) => setFormData(prev => ({ ...prev, tiresRearBrand: text }))}
                placeholder="Michelin"
              />
            </View>
          </View>

          <Text style={s.label}>Επόμενη Αλλαγή (Προτεινόμενη)</Text>
          <TouchableOpacity
            style={s.dateButton}
            onPress={() => setShowDatePicker('tiresNext')}
          >
            <Text style={s.dateButtonText}>{formatDateDisplay(formData.tiresNextChangeDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Service */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Σέρβις</Text>
          
          <Text style={s.label}>Τελευταίο Σέρβις (Ημερομηνία)</Text>
          <TouchableOpacity
            style={s.dateButton}
            onPress={() => setShowDatePicker('lastService')}
          >
            <Text style={s.dateButtonText}>{formatDateDisplay(formData.lastServiceDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <View style={s.row}>
            <View style={s.halfWidth}>
              <Text style={s.label}>Χιλιόμετρα Τελευταίου Σέρβις</Text>
              <TextInput
                style={s.input}
                value={formData.lastServiceMileage?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lastServiceMileage: parseInt(text) || null }))}
                placeholder="48000"
                keyboardType="numeric"
              />
            </View>
            <View style={s.halfWidth}>
              <Text style={s.label}>Επόμενο Σέρβις (km)</Text>
              <TextInput
                style={s.input}
                value={formData.nextServiceMileage?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, nextServiceMileage: parseInt(text) || null }))}
                placeholder="60000"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Σημειώσεις</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            placeholder="Επιπλέον σημειώσεις..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={getDateForPicker(showDatePicker)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
              handleDateChange(showDatePicker, date);
            } else if (event.type === 'set') {
              handleDateChange(showDatePicker, date);
            } else {
              setShowDatePicker(null);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: Colors.text,
  },
  insuranceOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    marginRight: 8,
  },
  insuranceOptionActive: {
    backgroundColor: Colors.primary,
  },
  insuranceOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  insuranceOptionTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});

