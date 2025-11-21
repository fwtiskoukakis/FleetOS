import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '../../contexts/theme-context';
import { Spacing } from '../../utils/design-system';
import { supabase } from '../../services/supabase.service';

interface BookingCar {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color?: string;
  category_id: string;
  main_photo_url?: string;
  is_featured: boolean;
  is_available_for_booking: boolean;
  is_active: boolean;
  min_age_requirement: number;
  min_license_years: number;
  category?: {
    name_el: string;
  };
}

interface CarCategory {
  id: string;
  name_el: string;
}

export default function CarsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [cars, setCars] = useState<BookingCar[]>([]);
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCar, setEditingCar] = useState<BookingCar | null>(null);
  
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    license_plate: '',
    color: '',
    category_id: '',
    min_age_requirement: '21',
    min_license_years: '1',
    is_featured: false,
    is_available_for_booking: true,
    is_active: true,
  });

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('car_categories')
        .select('id, name_el')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load cars
      const { data: carsData, error: carsError } = await supabase
        .from('booking_cars')
        .select(`
          *,
          category:car_categories(name_el)
        `)
        .order('created_at', { ascending: false });

      if (carsError) throw carsError;
      setCars(carsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCar(null);
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear().toString(),
      license_plate: '',
      color: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      min_age_requirement: '21',
      min_license_years: '1',
      is_featured: false,
      is_available_for_booking: true,
      is_active: true,
    });
    setSelectedImages([]);
    setModalVisible(true);
  }

  function openEditModal(car: BookingCar) {
    setEditingCar(car);
    setFormData({
      make: car.make,
      model: car.model,
      year: car.year.toString(),
      license_plate: car.license_plate,
      color: car.color || '',
      category_id: car.category_id,
      min_age_requirement: car.min_age_requirement.toString(),
      min_license_years: car.min_license_years.toString(),
      is_featured: car.is_featured,
      is_available_for_booking: car.is_available_for_booking,
      is_active: car.is_active,
    });
    setSelectedImages([]);
    setModalVisible(true);
  }

  async function pickImages() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία επιλογής φωτογραφιών');
    }
  }

  function removeImage(index: number) {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!formData.make.trim() || !formData.model.trim() || !formData.license_plate.trim()) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία');
      return;
    }

    if (!formData.category_id) {
      Alert.alert('Σφάλμα', 'Παρακαλώ επιλέξτε κατηγορία');
      return;
    }

    try {
      const carData = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year) || new Date().getFullYear(),
        license_plate: formData.license_plate.toUpperCase(),
        color: formData.color,
        category_id: formData.category_id,
        min_age_requirement: parseInt(formData.min_age_requirement) || 21,
        min_license_years: parseInt(formData.min_license_years) || 1,
        is_featured: formData.is_featured,
        is_available_for_booking: formData.is_available_for_booking,
        is_active: formData.is_active,
      };

      if (editingCar) {
        const { error } = await supabase
          .from('booking_cars')
          .update(carData)
          .eq('id', editingCar.id);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Το αυτοκίνητο ενημερώθηκε');
      } else {
        const { data, error } = await supabase
          .from('booking_cars')
          .insert(carData)
          .select()
          .single();

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Το αυτοκίνητο δημιουργήθηκε');
        
        // TODO: Upload photos to storage
        if (selectedImages.length > 0 && data) {
          console.log('Upload photos for car:', data.id);
          // Implementation for photo upload would go here
        }
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving car:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης');
    }
  }

  async function handleDelete(car: BookingCar) {
    Alert.alert(
      'Διαγραφή Αυτοκινήτου',
      `Διαγραφή ${car.make} ${car.model};`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('booking_cars')
                .delete()
                .eq('id', car.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Το αυτοκίνητο διαγράφηκε');
              loadData();
            } catch (error) {
              console.error('Error deleting car:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής');
            }
          },
        },
      ]
    );
  }

  async function toggleAvailability(car: BookingCar) {
    try {
      const { error } = await supabase
        .from('booking_cars')
        .update({ is_available_for_booking: !car.is_available_for_booking })
        .eq('id', car.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling availability:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία ενημέρωσης');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Αυτοκίνητα</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {cars.length} αυτοκίνητα
          </Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={[styles.addButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Φόρτωση...</Text>
        ) : cars.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-sport-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Δεν υπάρχουν αυτοκίνητα
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Πατήστε + για να προσθέσετε
            </Text>
          </View>
        ) : (
          cars.map((car) => (
            <View key={car.id} style={[styles.carCard, { backgroundColor: colors.card }]}>
              <View style={styles.carHeader}>
                <View style={[styles.carIcon, { backgroundColor: '#10b981' + '20' }]}>
                  <Ionicons name="car-sport" size={24} color="#10b981" />
                </View>
                <View style={styles.carInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.carName, { color: colors.text }]}>
                      {car.make} {car.model}
                    </Text>
                    {car.is_featured && (
                      <View style={[styles.badge, { backgroundColor: '#f59e0b' + '20' }]}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={[styles.badgeText, { color: '#f59e0b' }]}>FEATURED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.carDetails, { color: colors.textSecondary }]}>
                    {car.year} • {car.license_plate}
                  </Text>
                  {car.category && (
                    <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                      {car.category.name_el}
                    </Text>
                  )}
                </View>
                <Switch
                  value={car.is_available_for_booking}
                  onValueChange={() => toggleAvailability(car)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Requirements */}
              <View style={styles.requirementsContainer}>
                <View style={styles.requirementItem}>
                  <Ionicons name="person" size={16} color={colors.textSecondary} />
                  <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                    {car.min_age_requirement}+ ετών
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="card" size={16} color={colors.textSecondary} />
                  <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                    {car.min_license_years}+ έτη άδεια
                  </Text>
                </View>
                {!car.is_active && (
                  <View style={[styles.inactiveBadge, { backgroundColor: '#ef4444' + '20' }]}>
                    <Text style={[styles.inactiveText, { color: '#ef4444' }]}>ΑΝΕΝΕΡΓΟ</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => openEditModal(car)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    Επεξεργασία
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                  onPress={() => handleDelete(car)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                    Διαγραφή
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalCancelButton, { color: colors.primary }]}>Άκυρο</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCar ? 'Επεξεργασία' : 'Νέο Αυτοκίνητο'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSaveButton, { color: colors.primary }]}>Αποθήκευση</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Make & Model */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Μάρκα *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.make}
                  onChangeText={(text) => setFormData({ ...formData, make: text })}
                  placeholder="Toyota"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Μοντέλο *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.model}
                  onChangeText={(text) => setFormData({ ...formData, model: text })}
                  placeholder="Corolla"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Year & License Plate */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Έτος</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.year}
                  onChangeText={(text) => setFormData({ ...formData, year: text })}
                  placeholder="2024"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Πινακίδα *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.license_plate}
                  onChangeText={(text) => setFormData({ ...formData, license_plate: text.toUpperCase() })}
                  placeholder="ΑΒΓ-1234"
                  autoCapitalize="characters"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Color & Category */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Χρώμα</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.color}
                  onChangeText={(text) => setFormData({ ...formData, color: text })}
                  placeholder="Λευκό"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Κατηγορία *</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.pickerText, { color: colors.text }]} numberOfLines={1}>
                    {categories.find(c => c.id === formData.category_id)?.name_el || 'Επιλέξτε'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Requirements */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Ελάχ. Ηλικία</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.min_age_requirement}
                  onChangeText={(text) => setFormData({ ...formData, min_age_requirement: text })}
                  placeholder="21"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Έτη Άδειας</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.min_license_years}
                  onChangeText={(text) => setFormData({ ...formData, min_license_years: text })}
                  placeholder="1"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Photos */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Φωτογραφίες</Text>
              <TouchableOpacity
                style={[styles.photoButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={pickImages}
              >
                <Ionicons name="camera" size={24} color={colors.primary} />
                <Text style={[styles.photoButtonText, { color: colors.primary }]}>
                  Προσθήκη Φωτογραφιών
                </Text>
              </TouchableOpacity>

              {selectedImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.photoItem}>
                      <Image source={{ uri }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Toggles */}
            <View style={[styles.formGroup, styles.switchRow]}>
              <Text style={[styles.label, { color: colors.text }]}>Featured (Προτεινόμενο)</Text>
              <Switch
                value={formData.is_featured}
                onValueChange={(value) => setFormData({ ...formData, is_featured: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.formGroup, styles.switchRow]}>
              <Text style={[styles.label, { color: colors.text }]}>Διαθέσιμο για Booking</Text>
              <Switch
                value={formData.is_available_for_booking}
                onValueChange={(value) => setFormData({ ...formData, is_available_for_booking: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.formGroup, styles.switchRow]}>
              <Text style={[styles.label, { color: colors.text }]}>Ενεργό</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: { padding: Spacing.xs },
  headerTextContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: 14, marginTop: Spacing.xs },
  carCard: { borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md },
  carHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  carIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  carInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4, flexWrap: 'wrap' },
  carName: { fontSize: 16, fontWeight: '600' },
  carDetails: { fontSize: 13, marginBottom: 2 },
  categoryText: { fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  requirementItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requirementText: { fontSize: 12 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  inactiveText: { fontSize: 11, fontWeight: '700' },
  actionsContainer: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: { fontSize: 14, fontWeight: '600' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalCancelButton: { fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSaveButton: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: Spacing.md },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.xs },
  input: { borderRadius: 8, padding: Spacing.md, fontSize: 16 },
  formRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  formHalf: { flex: 1 },
  pickerContainer: {
    borderRadius: 8,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  pickerText: { fontSize: 16 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  photoButtonText: { fontSize: 16, fontWeight: '600' },
  photosContainer: { marginTop: Spacing.md },
  photoItem: { marginRight: Spacing.sm, position: 'relative' },
  photoImage: { width: 100, height: 100, borderRadius: 8 },
  removePhotoButton: { position: 'absolute', top: -8, right: -8 },
});

