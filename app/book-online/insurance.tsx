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

interface InsuranceType {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  deductible: number;
  coverage_amount?: number;
  price_per_day: number;
  covers_theft: boolean;
  covers_glass: boolean;
  covers_tires: boolean;
  covers_undercarriage: boolean;
  badge_text?: string;
  is_default: boolean;
  is_active: boolean;
}

export default function InsuranceScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<InsuranceType | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    deductible: '0',
    coverage_amount: '',
    price_per_day: '0',
    covers_theft: false,
    covers_glass: false,
    covers_tires: false,
    covers_undercarriage: false,
    badge_text: '',
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    loadInsuranceTypes();
  }, []);

  async function loadInsuranceTypes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('insurance_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setInsuranceTypes(data || []);
    } catch (error) {
      console.error('Error loading insurance types:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης ασφαλειών');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingInsurance(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      deductible: '0',
      coverage_amount: '',
      price_per_day: '0',
      covers_theft: false,
      covers_glass: false,
      covers_tires: false,
      covers_undercarriage: false,
      badge_text: '',
      is_default: false,
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(insurance: InsuranceType) {
    setEditingInsurance(insurance);
    setFormData({
      name: insurance.name,
      name_el: insurance.name_el,
      description: insurance.description || '',
      description_el: insurance.description_el || '',
      deductible: insurance.deductible.toString(),
      coverage_amount: insurance.coverage_amount?.toString() || '',
      price_per_day: insurance.price_per_day.toString(),
      covers_theft: insurance.covers_theft,
      covers_glass: insurance.covers_glass,
      covers_tires: insurance.covers_tires,
      covers_undercarriage: insurance.covers_undercarriage,
      badge_text: insurance.badge_text || '',
      is_default: insurance.is_default,
      is_active: insurance.is_active,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      Alert.alert('Σφάλμα', 'Το όνομα είναι υποχρεωτικό');
      return;
    }

    try {
      const insuranceData = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        deductible: parseFloat(formData.deductible) || 0,
        coverage_amount: formData.coverage_amount ? parseFloat(formData.coverage_amount) : null,
        price_per_day: parseFloat(formData.price_per_day) || 0,
        covers_theft: formData.covers_theft,
        covers_glass: formData.covers_glass,
        covers_tires: formData.covers_tires,
        covers_undercarriage: formData.covers_undercarriage,
        badge_text: formData.badge_text || null,
        is_default: formData.is_default,
        is_active: formData.is_active,
      };

      if (editingInsurance) {
        const { error } = await supabase
          .from('insurance_types')
          .update(insuranceData)
          .eq('id', editingInsurance.id);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η ασφάλεια ενημερώθηκε');
      } else {
        const { error } = await supabase
          .from('insurance_types')
          .insert(insuranceData);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η ασφάλεια δημιουργήθηκε');
      }

      setModalVisible(false);
      loadInsuranceTypes();
    } catch (error) {
      console.error('Error saving insurance:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης');
    }
  }

  async function handleDelete(insurance: InsuranceType) {
    Alert.alert(
      'Διαγραφή Ασφάλειας',
      `Διαγραφή "${insurance.name_el}";`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('insurance_types')
                .delete()
                .eq('id', insurance.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Η ασφάλεια διαγράφηκε');
              loadInsuranceTypes();
            } catch (error) {
              console.error('Error deleting insurance:', error);
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Ασφάλειες</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {insuranceTypes.length} τύποι
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
        ) : insuranceTypes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Δεν υπάρχουν ασφάλειες</Text>
          </View>
        ) : (
          insuranceTypes.map((insurance) => (
            <View key={insurance.id} style={[styles.insuranceCard, { backgroundColor: colors.card }]}>
              <View style={styles.insuranceHeader}>
                <View style={[styles.insuranceIcon, { backgroundColor: '#ec4899' + '20' }]}>
                  <Ionicons name="shield-checkmark" size={24} color="#ec4899" />
                </View>
                <View style={styles.insuranceInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.insuranceName, { color: colors.text }]}>{insurance.name_el}</Text>
                    {insurance.badge_text && (
                      <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>
                          {insurance.badge_text}
                        </Text>
                      </View>
                    )}
                    {insurance.is_default && (
                      <View style={[styles.badge, { backgroundColor: '#10b981' + '20' }]}>
                        <Text style={[styles.badgeText, { color: '#10b981' }]}>ΠΡΟΕΠΙΛΟΓΗ</Text>
                      </View>
                    )}
                  </View>
                  {insurance.description_el && (
                    <Text style={[styles.insuranceDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {insurance.description_el}
                    </Text>
                  )}
                </View>
                <Switch
                  value={insurance.is_active}
                  onValueChange={async () => {
                    await supabase.from('insurance_types').update({ is_active: !insurance.is_active }).eq('id', insurance.id);
                    loadInsuranceTypes();
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Details */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Απαλλαγή:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    €{insurance.deductible.toFixed(2)}
                  </Text>
                </View>
                {insurance.coverage_amount && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Κάλυψη:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      €{insurance.coverage_amount.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Τιμή/Ημέρα:</Text>
                  <Text style={[styles.priceValue, { color: colors.primary }]}>
                    €{insurance.price_per_day.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Coverage */}
              <View style={styles.coverageContainer}>
                {insurance.covers_theft && (
                  <View style={styles.coverageItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={[styles.coverageText, { color: colors.textSecondary }]}>Κλοπή</Text>
                  </View>
                )}
                {insurance.covers_glass && (
                  <View style={styles.coverageItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={[styles.coverageText, { color: colors.textSecondary }]}>Τζάμια</Text>
                  </View>
                )}
                {insurance.covers_tires && (
                  <View style={styles.coverageItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={[styles.coverageText, { color: colors.textSecondary }]}>Ελαστικά</Text>
                  </View>
                )}
                {insurance.covers_undercarriage && (
                  <View style={styles.coverageItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={[styles.coverageText, { color: colors.textSecondary }]}>Υποπλαίσιο</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => openEditModal(insurance)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Επεξεργασία</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                  onPress={() => handleDelete(insurance)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Διαγραφή</Text>
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
              {editingInsurance ? 'Επεξεργασία' : 'Νέα Ασφάλεια'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSaveButton, { color: colors.primary }]}>Αποθήκευση</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Όνομα (Ελληνικά) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.name_el}
                onChangeText={(text) => setFormData({ ...formData, name_el: text })}
                placeholder="π.χ. Βασική Ασφάλεια"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Περιγραφή (Ελληνικά)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.description_el}
                onChangeText={(text) => setFormData({ ...formData, description_el: text })}
                placeholder="Περιγραφή..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Απαλλαγή (€)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.deductible}
                  onChangeText={(text) => setFormData({ ...formData, deductible: text })}
                  placeholder="500"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Τιμή/Ημέρα (€)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.price_per_day}
                  onChangeText={(text) => setFormData({ ...formData, price_per_day: text })}
                  placeholder="15.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Badge Text (προαιρετικό)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.badge_text}
                onChangeText={(text) => setFormData({ ...formData, badge_text: text })}
                placeholder="ΣΥΝΙΣΤΆΤΑΙ"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Κάλυψη</Text>

            {[
              { key: 'covers_theft', label: 'Κλοπή' },
              { key: 'covers_glass', label: 'Τζάμια' },
              { key: 'covers_tires', label: 'Ελαστικά' },
              { key: 'covers_undercarriage', label: 'Υποπλαίσιο' },
            ].map(({ key, label }) => (
              <View key={key} style={[styles.formGroup, styles.switchRow]}>
                <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
                <Switch
                  value={formData[key as keyof typeof formData] as boolean}
                  onValueChange={(value) => setFormData({ ...formData, [key]: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}

            <View style={[styles.formGroup, styles.switchRow]}>
              <Text style={[styles.label, { color: colors.text }]}>Προεπιλογή</Text>
              <Switch
                value={formData.is_default}
                onValueChange={(value) => setFormData({ ...formData, is_default: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

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
  insuranceCard: { borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md },
  insuranceHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  insuranceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  insuranceInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4, flexWrap: 'wrap' },
  insuranceName: { fontSize: 16, fontWeight: '600' },
  insuranceDescription: { fontSize: 13 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  detailsContainer: { marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  priceValue: { fontSize: 16, fontWeight: '700' },
  coverageContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  coverageItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coverageText: { fontSize: 12 },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  formHalf: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.sm },
});

