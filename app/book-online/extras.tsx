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

interface ExtraOption {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  price_per_day: number;
  is_one_time_fee: boolean;
  icon_name?: string;
  is_active: boolean;
}

const ICON_OPTIONS = [
  { name: 'navigate', label: 'GPS' },
  { name: 'car-seat', label: 'Child Seat' },
  { name: 'person-add', label: 'Driver' },
  { name: 'shield-checkmark', label: 'Insurance' },
  { name: 'wifi', label: 'WiFi' },
  { name: 'snow', label: 'Snow Chains' },
];

export default function ExtrasScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [extras, setExtras] = useState<ExtraOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ExtraOption | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    price_per_day: '0',
    is_one_time_fee: false,
    icon_name: 'add-circle',
    is_active: true,
  });

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('extra_options')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setExtras(data || []);
    } catch (error) {
      console.error('Error loading extras:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης πρόσθετων');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingExtra(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      price_per_day: '0',
      is_one_time_fee: false,
      icon_name: 'add-circle',
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(extra: ExtraOption) {
    setEditingExtra(extra);
    setFormData({
      name: extra.name,
      name_el: extra.name_el,
      description: extra.description || '',
      description_el: extra.description_el || '',
      price_per_day: extra.price_per_day.toString(),
      is_one_time_fee: extra.is_one_time_fee,
      icon_name: extra.icon_name || 'add-circle',
      is_active: extra.is_active,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      Alert.alert('Σφάλμα', 'Το όνομα είναι υποχρεωτικό');
      return;
    }

    try {
      const extraData = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        price_per_day: parseFloat(formData.price_per_day) || 0,
        is_one_time_fee: formData.is_one_time_fee,
        icon_name: formData.icon_name,
        is_active: formData.is_active,
      };

      if (editingExtra) {
        const { error } = await supabase
          .from('extra_options')
          .update(extraData)
          .eq('id', editingExtra.id);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Το πρόσθετο ενημερώθηκε');
      } else {
        const { error } = await supabase
          .from('extra_options')
          .insert(extraData);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Το πρόσθετο δημιουργήθηκε');
      }

      setModalVisible(false);
      loadExtras();
    } catch (error) {
      console.error('Error saving extra:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης');
    }
  }

  async function handleDelete(extra: ExtraOption) {
    Alert.alert(
      'Διαγραφή Πρόσθετου',
      `Διαγραφή "${extra.name_el}";`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('extra_options')
                .delete()
                .eq('id', extra.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Το πρόσθετο διαγράφηκε');
              loadExtras();
            } catch (error) {
              console.error('Error deleting extra:', error);
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Πρόσθετα</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {extras.length} πρόσθετα
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
        ) : extras.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="add-circle-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Δεν υπάρχουν πρόσθετα</Text>
          </View>
        ) : (
          extras.map((extra) => (
            <View key={extra.id} style={[styles.extraCard, { backgroundColor: colors.card }]}>
              <View style={styles.extraHeader}>
                <View style={[styles.extraIcon, { backgroundColor: '#06b6d4' + '20' }]}>
                  <Ionicons name={extra.icon_name as any || 'add-circle'} size={24} color="#06b6d4" />
                </View>
                <View style={styles.extraInfo}>
                  <Text style={[styles.extraName, { color: colors.text }]}>{extra.name_el}</Text>
                  {extra.description_el && (
                    <Text style={[styles.extraDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {extra.description_el}
                    </Text>
                  )}
                </View>
                <Switch
                  value={extra.is_active}
                  onValueChange={async () => {
                    await supabase.from('extra_options').update({ is_active: !extra.is_active }).eq('id', extra.id);
                    loadExtras();
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.priceContainer}>
                <Text style={[styles.price, { color: colors.primary }]}>
                  €{extra.price_per_day.toFixed(2)}
                </Text>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  {extra.is_one_time_fee ? 'Εφάπαξ' : 'Ανά ημέρα'}
                </Text>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => openEditModal(extra)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Επεξεργασία</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                  onPress={() => handleDelete(extra)}
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
              {editingExtra ? 'Επεξεργασία' : 'Νέο Πρόσθετο'}
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
                placeholder="π.χ. GPS Πλοήγηση"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Όνομα (English)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g. GPS Navigation"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Περιγραφή (Ελληνικά)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.description_el}
                onChangeText={(text) => setFormData({ ...formData, description_el: text })}
                placeholder="Περιγραφή πρόσθετου..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Τιμή</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.price_per_day}
                onChangeText={(text) => setFormData({ ...formData, price_per_day: text })}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.formGroup, styles.switchRow]}>
              <View>
                <Text style={[styles.label, { color: colors.text }]}>Εφάπαξ Κόστος</Text>
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  Αν ενεργό, χρεώνεται μία φορά και όχι ανά ημέρα
                </Text>
              </View>
              <Switch
                value={formData.is_one_time_fee}
                onValueChange={(value) => setFormData({ ...formData, is_one_time_fee: value })}
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
  extraCard: { borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md },
  extraHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  extraIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  extraInfo: { flex: 1 },
  extraName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  extraDescription: { fontSize: 13 },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  price: { fontSize: 20, fontWeight: '700' },
  priceLabel: { fontSize: 12 },
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
  helpText: { fontSize: 12, marginTop: 2 },
  input: { borderRadius: 8, padding: Spacing.md, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

