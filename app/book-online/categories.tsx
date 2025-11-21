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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../contexts/theme-context';
import { Spacing } from '../../utils/design-system';
import { supabase } from '../../services/supabase.service';

interface CarCategory {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  seats: number;
  doors: number;
  transmission: 'manual' | 'automatic' | 'both';
  luggage_capacity: number;
  features?: string[];
  icon_name?: string;
  display_order: number;
  is_active: boolean;
}

const ICON_OPTIONS = [
  { name: 'car-outline', label: 'Car' },
  { name: 'car-sport-outline', label: 'Sport' },
  { name: 'airplane-outline', label: 'Luxury' },
  { name: 'bus-outline', label: 'Van/SUV' },
  { name: 'bicycle-outline', label: 'Economy' },
];

const FEATURE_OPTIONS = [
  { id: 'air_conditioning', label: 'A/C', icon: 'snow-outline' },
  { id: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth-outline' },
  { id: 'gps', label: 'GPS', icon: 'navigate-outline' },
  { id: 'usb', label: 'USB', icon: 'flash-outline' },
  { id: 'aux', label: 'AUX', icon: 'headset-outline' },
  { id: 'cruise_control', label: 'Cruise Control', icon: 'speedometer-outline' },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CarCategory | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    seats: '5',
    doors: '4',
    transmission: 'manual' as 'manual' | 'automatic' | 'both',
    luggage_capacity: '2',
    features: [] as string[],
    icon_name: 'car-outline',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('car_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης κατηγοριών');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCategory(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      seats: '5',
      doors: '4',
      transmission: 'manual',
      luggage_capacity: '2',
      features: [],
      icon_name: 'car-outline',
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(category: CarCategory) {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      name_el: category.name_el,
      description: category.description || '',
      description_el: category.description_el || '',
      seats: category.seats.toString(),
      doors: category.doors.toString(),
      transmission: category.transmission,
      luggage_capacity: category.luggage_capacity.toString(),
      features: category.features || [],
      icon_name: category.icon_name || 'car-outline',
      is_active: category.is_active,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      Alert.alert('Σφάλμα', 'Το όνομα κατηγορίας (ελληνικά) είναι υποχρεωτικό');
      return;
    }

    try {
      const categoryData = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        seats: parseInt(formData.seats) || 5,
        doors: parseInt(formData.doors) || 4,
        transmission: formData.transmission,
        luggage_capacity: parseInt(formData.luggage_capacity) || 2,
        features: formData.features,
        icon_name: formData.icon_name,
        is_active: formData.is_active,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('car_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η κατηγορία ενημερώθηκε');
      } else {
        const { error } = await supabase
          .from('car_categories')
          .insert(categoryData);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η κατηγορία δημιουργήθηκε');
      }

      setModalVisible(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης κατηγορίας');
    }
  }

  async function handleDelete(category: CarCategory) {
    Alert.alert(
      'Διαγραφή Κατηγορίας',
      `Θέλετε σίγουρα να διαγράψετε την κατηγορία "${category.name_el}";`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('car_categories')
                .delete()
                .eq('id', category.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Η κατηγορία διαγράφηκε');
              loadCategations();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής κατηγορίας');
            }
          },
        },
      ]
    );
  }

  function toggleFeature(featureId: string) {
    setFormData(prev => {
      const features = prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId];
      return { ...prev, features };
    });
  }

  function getTransmissionLabel(transmission: string) {
    switch (transmission) {
      case 'manual': return 'Χειροκίνητο';
      case 'automatic': return 'Αυτόματο';
      case 'both': return 'Και τα δύο';
      default: return transmission;
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Κατηγορίες</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {categories.length} κατηγορίες
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
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Φόρτωση...
          </Text>
        ) : categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Δεν υπάρχουν κατηγορίες
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Πατήστε + για να προσθέσετε
            </Text>
          </View>
        ) : (
          categories.map((category) => (
            <View
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
                  <Ionicons name={category.icon_name as any || 'car-outline'} size={24} color="#8b5cf6" />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {category.name_el}
                  </Text>
                  {category.description_el && (
                    <Text style={[styles.categoryDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {category.description_el}
                    </Text>
                  )}
                </View>
                <View style={[styles.activeBadge, { backgroundColor: category.is_active ? '#10b981' : '#ef4444' }]}>
                  <Text style={styles.activeBadgeText}>
                    {category.is_active ? 'ΕΝΕΡΓΗ' : 'ΑΝΕΝΕΡΓΗ'}
                  </Text>
                </View>
              </View>

              {/* Specs */}
              <View style={styles.specsContainer}>
                <View style={styles.specItem}>
                  <Ionicons name="people" size={16} color={colors.textSecondary} />
                  <Text style={[styles.specText, { color: colors.textSecondary }]}>
                    {category.seats} θέσεις
                  </Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="disc" size={16} color={colors.textSecondary} />
                  <Text style={[styles.specText, { color: colors.textSecondary }]}>
                    {category.doors} πόρτες
                  </Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="settings" size={16} color={colors.textSecondary} />
                  <Text style={[styles.specText, { color: colors.textSecondary }]}>
                    {getTransmissionLabel(category.transmission)}
                  </Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="briefcase" size={16} color={colors.textSecondary} />
                  <Text style={[styles.specText, { color: colors.textSecondary }]}>
                    {category.luggage_capacity} βαλίτσες
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => openEditModal(category)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    Επεξεργασία
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                  onPress={() => handleDelete(category)}
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
              <Text style={[styles.modalCancelButton, { color: colors.primary }]}>
                Άκυρο
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCategory ? 'Επεξεργασία' : 'Νέα Κατηγορία'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSaveButton, { color: colors.primary }]}>
                Αποθήκευση
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Names */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Όνομα (Ελληνικά) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.name_el}
                onChangeText={(text) => setFormData({ ...formData, name_el: text })}
                placeholder="π.χ. Οικονομικά"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Όνομα (English)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g. Economy"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Περιγραφή (Ελληνικά)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.description_el}
                onChangeText={(text) => setFormData({ ...formData, description_el: text })}
                placeholder="Περιγραφή κατηγορίας..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Εικονίδιο</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.name}
                    style={[
                      styles.iconOption,
                      { backgroundColor: colors.card },
                      formData.icon_name === icon.name && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 2 }
                    ]}
                    onPress={() => setFormData({ ...formData, icon_name: icon.name })}
                  >
                    <Ionicons name={icon.name as any} size={28} color={formData.icon_name === icon.name ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.iconLabel, { color: formData.icon_name === icon.name ? colors.primary : colors.textSecondary }]}>
                      {icon.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Specs */}
            <View style={styles.formRow}>
              <View style={styles.formQuarter}>
                <Text style={[styles.label, { color: colors.text }]}>Θέσεις</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.seats}
                  onChangeText={(text) => setFormData({ ...formData, seats: text })}
                  placeholder="5"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formQuarter}>
                <Text style={[styles.label, { color: colors.text }]}>Πόρτες</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.doors}
                  onChangeText={(text) => setFormData({ ...formData, doors: text })}
                  placeholder="4"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formQuarter}>
                <Text style={[styles.label, { color: colors.text }]}>Βαλίτσες</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.luggage_capacity}
                  onChangeText={(text) => setFormData({ ...formData, luggage_capacity: text })}
                  placeholder="2"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Transmission */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Κιβώτιο</Text>
              <View style={styles.transmissionOptions}>
                {['manual', 'automatic', 'both'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.transmissionOption,
                      { backgroundColor: colors.card },
                      formData.transmission === type && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setFormData({ ...formData, transmission: type as any })}
                  >
                    <Text style={[
                      styles.transmissionText,
                      { color: colors.text },
                      formData.transmission === type && { color: '#fff', fontWeight: '600' }
                    ]}>
                      {getTransmissionLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Features */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Χαρακτηριστικά</Text>
              <View style={styles.featuresGrid}>
                {FEATURE_OPTIONS.map((feature) => (
                  <TouchableOpacity
                    key={feature.id}
                    style={[
                      styles.featureChip,
                      { backgroundColor: colors.card },
                      formData.features.includes(feature.id) && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1.5 }
                    ]}
                    onPress={() => toggleFeature(feature.id)}
                  >
                    <Ionicons
                      name={feature.icon as any}
                      size={18}
                      color={formData.features.includes(feature.id) ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                      styles.featureText,
                      { color: colors.textSecondary },
                      formData.features.includes(feature.id) && { color: colors.primary, fontWeight: '600' }
                    ]}>
                      {feature.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Active Status */}
            <View style={[styles.formGroup, styles.switchRow]}>
              <Text style={[styles.label, { color: colors.text }]}>Ενεργή</Text>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  categoryCard: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 13,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  specsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalCancelButton: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  formQuarter: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  transmissionOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  transmissionOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  transmissionText: {
    fontSize: 14,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 13,
  },
});

