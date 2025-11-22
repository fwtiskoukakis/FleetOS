import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../contexts/theme-context';
import { Spacing } from '../../utils/design-system';
import { supabase } from '../../services/supabase.service';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { el } from 'date-fns/locale';

interface PricingRule {
  id: string;
  category_id?: string;
  car_id?: string;
  start_date: string;
  end_date: string;
  price_per_day: number;
  min_rental_days: number;
  weekly_discount_percent: number;
  monthly_discount_percent: number;
  priority: number;
  category?: {
    name_el: string;
  };
  car?: {
    make: string;
    model: string;
    license_plate: string;
  };
}

interface CarCategory {
  id: string;
  name_el: string;
}

interface BookingCar {
  id: string;
  make: string;
  model: string;
  license_plate: string;
}

export default function PricingScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [cars, setCars] = useState<BookingCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [selectedType, setSelectedType] = useState<'category' | 'car'>('category');
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  
  const [formData, setFormData] = useState({
    category_id: '',
    car_id: '',
    start_date: '',
    end_date: '',
    price_per_day: '0',
    min_rental_days: '1',
    weekly_discount_percent: '0',
    monthly_discount_percent: '0',
  });

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
        .select('id, make, model, license_plate')
        .eq('is_active', true)
        .order('make, model');

      if (carsError) throw carsError;
      setCars(carsData || []);

      // Load pricing rules
      const { data: pricingData, error: pricingError } = await supabase
        .from('car_pricing')
        .select(`
          *,
          category:car_categories(name_el),
          car:booking_cars(make, model, license_plate)
        `)
        .order('start_date', { ascending: false });

      if (pricingError) throw pricingError;
      setPricingRules(pricingData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης δεδομένων');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingRule(null);
    setSelectedType('category');
    setFormData({
      category_id: categories.length > 0 ? categories[0].id : '',
      car_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      price_per_day: '0',
      min_rental_days: '1',
      weekly_discount_percent: '0',
      monthly_discount_percent: '0',
    });
    setModalVisible(true);
  }

  function openEditModal(rule: PricingRule) {
    setEditingRule(rule);
    setSelectedType(rule.car_id ? 'car' : 'category');
    setFormData({
      category_id: rule.category_id || '',
      car_id: rule.car_id || '',
      start_date: rule.start_date,
      end_date: rule.end_date,
      price_per_day: rule.price_per_day.toString(),
      min_rental_days: rule.min_rental_days.toString(),
      weekly_discount_percent: rule.weekly_discount_percent?.toString() || '0',
      monthly_discount_percent: rule.monthly_discount_percent?.toString() || '0',
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.price_per_day || parseFloat(formData.price_per_day) <= 0) {
      Alert.alert('Σφάλμα', 'Η τιμή ανά ημέρα είναι υποχρεωτική');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      Alert.alert('Σφάλμα', 'Οι ημερομηνίες είναι υποχρεωτικές');
      return;
    }

    if (selectedType === 'category' && !formData.category_id) {
      Alert.alert('Σφάλμα', 'Παρακαλώ επιλέξτε κατηγορία');
      return;
    }

    if (selectedType === 'car' && !formData.car_id) {
      Alert.alert('Σφάλμα', 'Παρακαλώ επιλέξτε αυτοκίνητο');
      return;
    }

    try {
      const pricingData: any = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        price_per_day: parseFloat(formData.price_per_day),
        min_rental_days: parseInt(formData.min_rental_days) || 1,
        weekly_discount_percent: parseFloat(formData.weekly_discount_percent) || 0,
        monthly_discount_percent: parseFloat(formData.monthly_discount_percent) || 0,
      };

      if (selectedType === 'category') {
        pricingData.category_id = formData.category_id;
        pricingData.car_id = null;
      } else {
        pricingData.car_id = formData.car_id;
        pricingData.category_id = null;
      }

      if (editingRule) {
        const { error } = await supabase
          .from('car_pricing')
          .update(pricingData)
          .eq('id', editingRule.id);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η τιμολόγηση ενημερώθηκε');
      } else {
        const { error } = await supabase
          .from('car_pricing')
          .insert(pricingData);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η τιμολόγηση δημιουργήθηκε');
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving pricing:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης τιμολόγησης');
    }
  }

  async function handleDelete(rule: PricingRule) {
    Alert.alert(
      'Διαγραφή Τιμολόγησης',
      'Θέλετε σίγουρα να διαγράψετε αυτήν την τιμολόγηση;',
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('car_pricing')
                .delete()
                .eq('id', rule.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Η τιμολόγηση διαγράφηκε');
              loadData();
            } catch (error) {
              console.error('Error deleting pricing:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Τιμολόγηση</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {pricingRules.length} κανόνες τιμολόγησης
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
        ) : pricingRules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Δεν υπάρχουν κανόνες τιμολόγησης
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Πατήστε + για να προσθέσετε
            </Text>
          </View>
        ) : (
          pricingRules.map((rule) => (
            <View key={rule.id} style={[styles.ruleCard, { backgroundColor: colors.card }]}>
              <View style={styles.ruleHeader}>
                <View style={[styles.ruleIcon, { backgroundColor: '#f59e0b' + '20' }]}>
                  <Ionicons name="calendar" size={24} color="#f59e0b" />
                </View>
                <View style={styles.ruleInfo}>
                  <Text style={[styles.ruleTitle, { color: colors.text }]}>
                    {rule.category ? rule.category.name_el : `${rule.car?.make} ${rule.car?.model} (${rule.car?.license_plate})`}
                  </Text>
                  <Text style={[styles.ruleDate, { color: colors.textSecondary }]}>
                    {format(parseISO(rule.start_date), 'dd MMM yyyy', { locale: el })} - {format(parseISO(rule.end_date), 'dd MMM yyyy', { locale: el })}
                  </Text>
                  <Text style={[styles.rulePrice, { color: colors.primary }]}>
                    €{rule.price_per_day.toFixed(2)}/ημέρα
                  </Text>
                </View>
              </View>

              <View style={styles.ruleDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Ελάχ. {rule.min_rental_days} ημέρες
                  </Text>
                </View>
                {rule.weekly_discount_percent > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="trending-down" size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Εβδομαδιαία έκπτωση: {rule.weekly_discount_percent}%
                    </Text>
                  </View>
                )}
                {rule.monthly_discount_percent > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="trending-down" size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Μηνιαία έκπτωση: {rule.monthly_discount_percent}%
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => openEditModal(rule)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    Επεξεργασία
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                  onPress={() => handleDelete(rule)}
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
              {editingRule ? 'Επεξεργασία' : 'Νέα Τιμολόγηση'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSaveButton, { color: colors.primary }]}>Αποθήκευση</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Type Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Τύπος Τιμολόγησης</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    selectedType === 'category' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedType('category')}
                >
                  <Text style={[styles.typeButtonText, { color: selectedType === 'category' ? colors.primary : colors.text }]}>
                    Κατηγορία
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    selectedType === 'car' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedType('car')}
                >
                  <Text style={[styles.typeButtonText, { color: selectedType === 'car' ? colors.primary : colors.text }]}>
                    Αυτοκίνητο
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category or Car Selection */}
            {selectedType === 'category' ? (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Κατηγορία *</Text>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.selectOption,
                      formData.category_id === category.id && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={() => setFormData({ ...formData, category_id: category.id })}
                  >
                    <Text style={[styles.selectOptionText, { color: colors.text }]}>
                      {category.name_el}
                    </Text>
                    {formData.category_id === category.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Αυτοκίνητο *</Text>
                {cars.map((car) => (
                  <TouchableOpacity
                    key={car.id}
                    style={[
                      styles.selectOption,
                      formData.car_id === car.id && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={() => setFormData({ ...formData, car_id: car.id })}
                  >
                    <Text style={[styles.selectOptionText, { color: colors.text }]}>
                      {car.make} {car.model} ({car.license_plate})
                    </Text>
                    {formData.car_id === car.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Date Range */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Από Ημερομηνία *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.start_date}
                  onChangeText={(text) => setFormData({ ...formData, start_date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Έως Ημερομηνία *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.end_date}
                  onChangeText={(text) => setFormData({ ...formData, end_date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Price */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Τιμή ανά Ημέρα (€) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.price_per_day}
                onChangeText={(text) => setFormData({ ...formData, price_per_day: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Min Rental Days */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Ελάχιστες Ημέρες Ενοικίασης</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.min_rental_days}
                onChangeText={(text) => setFormData({ ...formData, min_rental_days: text })}
                placeholder="1"
                keyboardType="number-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Discounts */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Εβδομαδιαία Έκπτωση (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.weekly_discount_percent}
                  onChangeText={(text) => setFormData({ ...formData, weekly_discount_percent: text })}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Μηνιαία Έκπτωση (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.monthly_discount_percent}
                  onChangeText={(text) => setFormData({ ...formData, monthly_discount_percent: text })}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: { fontSize: 16, marginTop: Spacing.md },
  emptySubtext: { fontSize: 14, marginTop: Spacing.xs },
  ruleCard: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  ruleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  ruleInfo: { flex: 1 },
  ruleTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  ruleDate: { fontSize: 13, marginBottom: 4 },
  rulePrice: { fontSize: 18, fontWeight: '700' },
  ruleDetails: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailText: { fontSize: 13, marginLeft: Spacing.xs },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.xs,
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
  modalCancelButton: { fontSize: 16, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSaveButton: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: Spacing.md },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.xs },
  input: { borderRadius: 8, padding: Spacing.md, fontSize: 16 },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formHalf: { flex: 1 },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: { fontSize: 14, fontWeight: '600' },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  selectOptionText: { fontSize: 14, flex: 1 },
});

