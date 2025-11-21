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

interface Location {
  id: string;
  name: string;
  name_el: string;
  address: string;
  address_el?: string;
  google_maps_url?: string;
  extra_delivery_fee: number;
  extra_pickup_fee: number;
  opening_time?: string;
  closing_time?: string;
  display_order: number;
  is_active: boolean;
}

export default function LocationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_el: '',
    address: '',
    address_el: '',
    google_maps_url: '',
    extra_delivery_fee: '0',
    extra_pickup_fee: '0',
    opening_time: '08:00',
    closing_time: '20:00',
    is_active: true,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης τοποθεσιών');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingLocation(null);
    setFormData({
      name: '',
      name_el: '',
      address: '',
      address_el: '',
      google_maps_url: '',
      extra_delivery_fee: '0',
      extra_pickup_fee: '0',
      opening_time: '08:00',
      closing_time: '20:00',
      is_active: true,
    });
    setModalVisible(true);
  }

  function openEditModal(location: Location) {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      name_el: location.name_el,
      address: location.address,
      address_el: location.address_el || '',
      google_maps_url: location.google_maps_url || '',
      extra_delivery_fee: location.extra_delivery_fee.toString(),
      extra_pickup_fee: location.extra_pickup_fee.toString(),
      opening_time: location.opening_time || '08:00',
      closing_time: location.closing_time || '20:00',
      is_active: location.is_active,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formData.name_el.trim()) {
      Alert.alert('Σφάλμα', 'Το όνομα τοποθεσίας (ελληνικά) είναι υποχρεωτικό');
      return;
    }

    try {
      const locationData = {
        name: formData.name || formData.name_el,
        name_el: formData.name_el,
        address: formData.address,
        address_el: formData.address_el,
        google_maps_url: formData.google_maps_url,
        extra_delivery_fee: parseFloat(formData.extra_delivery_fee) || 0,
        extra_pickup_fee: parseFloat(formData.extra_pickup_fee) || 0,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        is_active: formData.is_active,
      };

      if (editingLocation) {
        // Update existing
        const { error } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η τοποθεσία ενημερώθηκε');
      } else {
        // Create new
        const { error } = await supabase
          .from('locations')
          .insert(locationData);

        if (error) throw error;
        Alert.alert('Επιτυχία', 'Η τοποθεσία δημιουργήθηκε');
      }

      setModalVisible(false);
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης τοποθεσίας');
    }
  }

  async function handleDelete(location: Location) {
    Alert.alert(
      'Διαγραφή Τοποθεσίας',
      `Θέλετε σίγουρα να διαγράψετε την τοποθεσία "${location.name_el}";`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', location.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Η τοποθεσία διαγράφηκε');
              loadLocations();
            } catch (error) {
              console.error('Error deleting location:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής τοποθεσίας');
            }
          },
        },
      ]
    );
  }

  async function toggleActive(location: Location) {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: !location.is_active })
        .eq('id', location.id);

      if (error) throw error;
      loadLocations();
    } catch (error) {
      console.error('Error toggling location:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία ενημέρωσης τοποθεσίας');
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Τοποθεσίες</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {locations.length} τοποθεσίες
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
        ) : locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Δεν υπάρχουν τοποθεσίες
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Πατήστε + για να προσθέσετε
            </Text>
          </View>
        ) : (
          locations.map((location) => (
            <View
              key={location.id}
              style={[styles.locationCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.locationHeader}>
                <View style={[styles.locationIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="location" size={24} color={colors.primary} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={[styles.locationName, { color: colors.text }]}>
                    {location.name_el}
                  </Text>
                  <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>
                    {location.address}
                  </Text>
                </View>
                <Switch
                  value={location.is_active}
                  onValueChange={() => toggleActive(location)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Details */}
              {(location.extra_delivery_fee > 0 || location.extra_pickup_fee > 0) && (
                <View style={styles.feesContainer}>
                  {location.extra_pickup_fee > 0 && (
                    <View style={styles.feeRow}>
                      <Ionicons name="arrow-up" size={16} color={colors.textSecondary} />
                      <Text style={[styles.feeText, { color: colors.textSecondary }]}>
                        Παραλαβή: €{location.extra_pickup_fee.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {location.extra_delivery_fee > 0 && (
                    <View style={styles.feeRow}>
                      <Ionicons name="arrow-down" size={16} color={colors.textSecondary} />
                      <Text style={[styles.feeText, { color: colors.textSecondary }]}>
                        Παράδοση: €{location.extra_delivery_fee.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => openEditModal(location)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    Επεξεργασία
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                  onPress={() => handleDelete(location)}
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
              {editingLocation ? 'Επεξεργασία' : 'Νέα Τοποθεσία'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSaveButton, { color: colors.primary }]}>
                Αποθήκευση
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Greek Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Όνομα (Ελληνικά) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.name_el}
                onChangeText={(text) => setFormData({ ...formData, name_el: text })}
                placeholder="π.χ. Αεροδρόμιο Αθηνών"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* English Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Όνομα (English)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g. Athens Airport"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Address */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Διεύθυνση</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Διεύθυνση"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>

            {/* Google Maps URL */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Google Maps URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                value={formData.google_maps_url}
                onChangeText={(text) => setFormData({ ...formData, google_maps_url: text })}
                placeholder="https://maps.google.com/..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            </View>

            {/* Fees */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Κόστος Παραλαβής</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.extra_pickup_fee}
                  onChangeText={(text) => setFormData({ ...formData, extra_pickup_fee: text })}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Κόστος Παράδοσης</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.extra_delivery_fee}
                  onChangeText={(text) => setFormData({ ...formData, extra_delivery_fee: text })}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Working Hours */}
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Ώρα Ανοίγματος</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.opening_time}
                  onChangeText={(text) => setFormData({ ...formData, opening_time: text })}
                  placeholder="08:00"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={[styles.label, { color: colors.text }]}>Ώρα Κλεισίματος</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={formData.closing_time}
                  onChangeText={(text) => setFormData({ ...formData, closing_time: text })}
                  placeholder="20:00"
                  placeholderTextColor={colors.textSecondary}
                />
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
  locationCard: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
  },
  feesContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeText: {
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
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
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

