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

interface PaymentMethod {
  id: string;
  name: string;
  name_el: string;
  description?: string;
  description_el?: string;
  provider: 'stripe' | 'paypal' | 'bank_transfer' | 'cash' | 'viva_wallet' | 'revolut';
  is_active: boolean;
  requires_full_payment: boolean;
  deposit_percentage: number;
  min_deposit_amount: number;
  display_order: number;
}

const PROVIDER_OPTIONS = [
  { value: 'stripe', label: 'Stripe', icon: 'card' },
  { value: 'viva_wallet', label: 'Viva Wallet', icon: 'wallet' },
  { value: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
  { value: 'bank_transfer', label: 'Τραπεζική Κατάθεση', icon: 'business' },
  { value: 'cash', label: 'Μετρητά', icon: 'cash' },
  { value: 'revolut', label: 'Revolut', icon: 'card-outline' },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    description: '',
    description_el: '',
    provider: 'stripe' as PaymentMethod['provider'],
    is_active: true,
    requires_full_payment: false,
    deposit_percentage: '30',
    min_deposit_amount: '50',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  async function loadPaymentMethods() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης μεθόδων πληρωμής');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingMethod(null);
    setFormData({
      name: '',
      name_el: '',
      description: '',
      description_el: '',
      provider: 'stripe',
      is_active: true,
      requires_full_payment: false,
      deposit_percentage: '30',
      min_deposit_amount: '50',
    });
    setModalVisible(true);
  }

  function openEditModal(method: PaymentMethod) {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      name_el: method.name_el,
      description: method.description || '',
      description_el: method.description_el || '',
      provider: method.provider,
      is_active: method.is_active,
      requires_full_payment: method.requires_full_payment,
      deposit_percentage: method.deposit_percentage.toString(),
      min_deposit_amount: method.min_deposit_amount.toString(),
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      Alert.alert('Σφάλμα', 'Το όνομα μεθόδου είναι υποχρεωτικό');
      return;
    }

    try {
      const methodData = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        description: formData.description,
        description_el: formData.description_el,
        provider: formData.provider,
        is_active: formData.is_active,
        requires_full_payment: formData.requires_full_payment,
        deposit_percentage: parseFloat(formData.deposit_percentage) || 30,
        min_deposit_amount: parseFloat(formData.min_deposit_amount) || 50,
      };

      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update(methodData)
          .eq('id', editingMethod.id);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η μέθοδος ενημερώθηκε');
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert(methodData);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η μέθοδος δημιουργήθηκε');
      }

      setModalVisible(false);
      loadPaymentMethods();
    } catch (error) {
      console.error('Error saving payment method:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης');
    }
  }

  async function handleDelete(method: PaymentMethod) {
    Alert.alert(
      'Διαγραφή Μεθόδου',
      `Διαγραφή "${method.name_el}";`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', method.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Η μέθοδος διαγράφηκε');
              loadPaymentMethods();
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής');
            }
          },
        },
      ]
    );
  }

  function getProviderIcon(provider: string) {
    return PROVIDER_OPTIONS.find(p => p.value === provider)?.icon || 'card';
  }

  function getProviderLabel(provider: string) {
    return PROVIDER_OPTIONS.find(p => p.value === provider)?.label || provider;
  }

  function getProviderColor(provider: string) {
    const colors: Record<string, string> = {
      stripe: '#635BFF',
      viva_wallet: '#009EE3',
      paypal: '#0070BA',
      bank_transfer: '#10b981',
      cash: '#f59e0b',
      revolut: '#0075EB',
    };
    return colors[provider] || '#6366f1';
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Μέθοδοι Πληρωμής</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {paymentMethods.length} μέθοδοι
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
        ) : paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Δεν υπάρχουν μέθοδοι πληρωμής
            </Text>
          </View>
        ) : (
          paymentMethods.map((method) => {
            const providerColor = getProviderColor(method.provider);
            return (
              <View key={method.id} style={[styles.methodCard, { backgroundColor: colors.card }]}>
                <View style={styles.methodHeader}>
                  <View style={[styles.methodIcon, { backgroundColor: providerColor + '20' }]}>
                    <Ionicons name={getProviderIcon(method.provider) as any} size={24} color={providerColor} />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={[styles.methodName, { color: colors.text }]}>{method.name_el}</Text>
                    <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                      {getProviderLabel(method.provider)}
                    </Text>
                  </View>
                  <Switch
                    value={method.is_active}
                    onValueChange={async () => {
                      await supabase.from('payment_methods').update({ is_active: !method.is_active }).eq('id', method.id);
                      loadPaymentMethods();
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                  {method.requires_full_payment ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        Απαιτείται πλήρης πληρωμή
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.detailRow}>
                        <Ionicons name="card" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          Προκαταβολή: {method.deposit_percentage}%
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="cash" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          Ελάχιστο: €{method.min_deposit_amount.toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => openEditModal(method)}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                      Επεξεργασία
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                    onPress={() => handleDelete(method)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                      Διαγραφή
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
              {editingMethod ? 'Επεξεργασία' : 'Νέα Μέθοδος'}
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
                placeholder="π.χ. Πιστωτική Κάρτα"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Provider *</Text>
              <View style={styles.providerGrid}>
                {PROVIDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.providerOption,
                      { backgroundColor: colors.card },
                      formData.provider === option.value && { 
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                        borderWidth: 2
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, provider: option.value as any })}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={24} 
                      color={formData.provider === option.value ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.providerOptionText,
                      { color: colors.textSecondary },
                      formData.provider === option.value && { color: colors.primary, fontWeight: '600' }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.formGroup, styles.switchRow]}>
              <View>
                <Text style={[styles.label, { color: colors.text }]}>Απαιτείται Πλήρης Πληρωμή</Text>
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  Αν ενεργό, δεν επιτρέπεται προκαταβολή
                </Text>
              </View>
              <Switch
                value={formData.requires_full_payment}
                onValueChange={(value) => setFormData({ ...formData, requires_full_payment: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {!formData.requires_full_payment && (
              <>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Text style={[styles.label, { color: colors.text }]}>Προκαταβολή (%)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                      value={formData.deposit_percentage}
                      onChangeText={(text) => setFormData({ ...formData, deposit_percentage: text })}
                      placeholder="30"
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <Text style={[styles.label, { color: colors.text }]}>Ελάχιστο (€)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                      value={formData.min_deposit_amount}
                      onChangeText={(text) => setFormData({ ...formData, min_deposit_amount: text })}
                      placeholder="50"
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={[styles.formGroup, styles.switchRow]}>
              <Text style={[styles.label, { color: colors.text }]}>Ενεργή</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Τα API keys για payment providers διαχειρίζονται ξεχωριστά για ασφάλεια.
              </Text>
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
  methodCard: { borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md },
  methodHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  providerText: { fontSize: 13 },
  detailsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  detailText: { fontSize: 13 },
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
  formRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  formHalf: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  providerOption: {
    width: '31%',
    aspectRatio: 1.2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  providerOptionText: {
    fontSize: 11,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

