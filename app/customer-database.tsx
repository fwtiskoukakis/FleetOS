import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SimpleGlassCard } from '../components/glass-card';
import { Colors, Typography, Spacing, Shadows, Glass } from '../utils/design-system';
import { smoothScrollConfig } from '../utils/animations';
import { CustomerService, CustomerStats } from '../services/customer.service';
import { OrganizationService } from '../services/organization.service';
import { CustomerProfile, CustomerHistory } from '../models/multi-tenant.types';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function CustomerDatabaseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip' | 'blacklisted' | 'expired'>('all');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    full_name: '',
    email: '',
    phone_primary: '',
    id_number: '',
    date_of_birth: '',
    nationality: 'GR',
    driver_license_number: '',
    driver_license_expiry: '',
    address: '',
    company_name: '',
    company_vat_number: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomerData();
  }, [selectedFilter]);

  async function loadCustomerData() {
    setLoading(true);
    try {
      const organization = await OrganizationService.getCurrentOrganization();
      if (!organization) {
        Alert.alert('Σφάλμα', 'Δεν βρέθηκε επιχείρηση.');
        router.back();
        return;
      }

      const [customersData, statsData] = await Promise.all([
        CustomerService.getCustomers(organization.id, {
          search: searchTerm || undefined,
          vipStatus: selectedFilter === 'vip' ? true : undefined,
          blacklistStatus: selectedFilter === 'blacklisted' ? true : undefined,
          hasExpiredDocuments: selectedFilter === 'expired',
        }),
        CustomerService.getCustomerStats(organization.id),
      ]);

      setCustomers(customersData);
      setCustomerStats(statsData);
    } catch (error) {
      console.error('Error loading customer data:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης δεδομένων πελατών.');
    } finally {
      setLoading(false);
    }
  }

  async function addCustomer() {
    const validation = CustomerService.validateCustomerData(newCustomer);
    if (!validation.isValid) {
      Alert.alert('Σφάλμα', validation.errors.join('\n'));
      return;
    }

    try {
      const organization = await OrganizationService.getCurrentOrganization();
      if (!organization) return;

      await CustomerService.createCustomer(organization.id, newCustomer);
      Alert.alert('Επιτυχία', 'Ο πελάτης προστέθηκε επιτυχώς!');
      setShowAddCustomerModal(false);
      setNewCustomer({
        full_name: '',
        email: '',
        phone_primary: '',
        id_number: '',
        date_of_birth: '',
        nationality: 'GR',
        driver_license_number: '',
        driver_license_expiry: '',
        address: '',
        company_name: '',
        company_vat_number: '',
        notes: '',
      });
      loadCustomerData();
    } catch (error) {
      console.error('Error adding customer:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία προσθήκης πελάτη.');
    }
  }

  async function viewCustomerDetails(customer: CustomerProfile) {
    try {
      const history = await CustomerService.getCustomerHistory(customer.id);
      setSelectedCustomer(customer);
      setCustomerHistory(history);
      setShowCustomerDetails(true);
    } catch (error) {
      console.error('Error loading customer history:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης ιστορικού πελάτη.');
    }
  }

  async function toggleVipStatus(customer: CustomerProfile) {
    try {
      await CustomerService.toggleVipStatus(customer.id);
      Alert.alert('Επιτυχία', `Ο πελάτης ${customer.full_name} ${customer.vip_status ? 'αφαιρέθηκε από' : 'προστέθηκε σε'} VIP status.`);
      loadCustomerData();
    } catch (error) {
      console.error('Error toggling VIP status:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία ενημέρωσης VIP status.');
    }
  }

  async function deleteCustomer(customer: CustomerProfile) {
    Alert.alert(
      'Επιβεβαίωση Διαγραφής',
      `Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη "${customer.full_name}"; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`,
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomerService.deleteCustomer(customer.id);
              Alert.alert('Επιτυχία', `Ο πελάτης ${customer.full_name} διαγράφηκε επιτυχώς.`);
              loadCustomerData();
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής πελάτη.');
            }
          }
        }
      ]
    );
  }

  function getCustomerStatusColor(customer: CustomerProfile): string {
    if (customer.blacklist_status) return Colors.error;
    if (customer.vip_status) return Colors.warning;
    if (customer.customer_rating && customer.customer_rating >= 4) return Colors.success;
    return Colors.textSecondary;
  }

  function getCustomerStatusLabel(customer: CustomerProfile): string {
    if (customer.blacklist_status) return 'Μαύρη Λίστα';
    if (customer.vip_status) return 'VIP';
    if (customer.customer_rating && customer.customer_rating >= 4) return 'Εξαιρετικός';
    return 'Κανονικός';
  }

  function renderCustomerCard(customer: CustomerProfile) {
    return (
      <SimpleGlassCard key={customer.id} style={styles.customerCard}>
        <TouchableOpacity onPress={() => viewCustomerDetails(customer)}>
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {customer.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.full_name}</Text>
              <Text style={styles.customerEmail}>{customer.email || 'Δεν υπάρχει email'}</Text>
              <Text style={styles.customerPhone}>{customer.phone_primary || 'Δεν υπάρχει τηλέφωνο'}</Text>
            </View>
            <View style={styles.customerStatusContainer}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getCustomerStatusColor(customer) + '20' }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: getCustomerStatusColor(customer) }
                ]}>
                  {getCustomerStatusLabel(customer)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.customerMenu}
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    'Ενέργειες Πελάτη',
                    `Επιλέξτε ενέργεια για τον πελάτη "${customer.full_name}":`,
                    [
                      { text: 'Ακύρωση', style: 'cancel' },
                      { text: 'Επεξεργασία', onPress: () => editCustomer(customer) },
                      { text: customer.vip_status ? 'Αφαίρεση VIP' : 'Προσθήκη VIP', onPress: () => toggleVipStatus(customer) },
                      { text: 'Ιστορικό', onPress: () => viewCustomerDetails(customer) },
                      { text: 'Διαγραφή', style: 'destructive', onPress: () => deleteCustomer(customer) },
                    ]
                  );
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.customerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ενοικιάσεις</Text>
              <Text style={styles.statValue}>{customer.total_rentals}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Συνολικό Έσοδο</Text>
              <Text style={styles.statValue}>€{customer.total_spent.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Βαθμολογία</Text>
              <Text style={styles.statValue}>
                {customer.customer_rating ? `${customer.customer_rating}/5` : 'N/A'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Μέλος από</Text>
              <Text style={styles.statValue}>
                {format(new Date(customer.created_at), 'MM/yyyy', { locale: el })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </SimpleGlassCard>
    );
  }

  function editCustomer(customer: CustomerProfile) {
    setEditingCustomer(customer);
    setNewCustomer({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone_primary: customer.phone_primary || '',
      id_number: customer.id_number || '',
      date_of_birth: customer.date_of_birth || '',
      nationality: customer.nationality || 'GR',
      driver_license_number: customer.driver_license_number || '',
      driver_license_expiry: customer.driver_license_expiry || '',
      address: customer.address || '',
      company_name: customer.company_name || '',
      company_vat_number: customer.company_vat_number || '',
      notes: customer.notes || '',
    });
    setShowEditCustomerModal(true);
  }

  async function updateCustomer() {
    if (!editingCustomer) return;

    const validation = CustomerService.validateCustomerData(newCustomer);
    if (!validation.isValid) {
      Alert.alert('Σφάλμα', validation.errors.join('\n'));
      return;
    }

    try {
      await CustomerService.updateCustomer(editingCustomer.id, newCustomer);
      Alert.alert('Επιτυχία', 'Ο πελάτης ενημερώθηκε επιτυχώς!');
      setShowEditCustomerModal(false);
      setEditingCustomer(null);
      setNewCustomer({
        full_name: '',
        email: '',
        phone_primary: '',
        id_number: '',
        date_of_birth: '',
        nationality: 'GR',
        driver_license_number: '',
        driver_license_expiry: '',
        address: '',
        company_name: '',
        company_vat_number: '',
        notes: '',
      });
      loadCustomerData();
    } catch (error) {
      console.error('Error updating customer:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία ενημέρωσης πελάτη.');
    }
  }

  function renderAddCustomerModal() {
    return (
      <Modal
        visible={showAddCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddCustomerModal(false)}>
              <Text style={styles.modalCancelButton}>Ακύρωση</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Νέος Πελάτης</Text>
            <TouchableOpacity onPress={addCustomer}>
              <Text style={styles.modalSaveButton}>Προσθήκη</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Βασικές Πληροφορίες</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Ονοματεπώνυμο *</Text>
                <TextInput
                  style={styles.input}
                  value={newCustomer.full_name}
                  onChangeText={(text) => setNewCustomer(prev => ({ ...prev, full_name: text }))}
                  placeholder="Ονοματεπώνυμο"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.email}
                    onChangeText={(text) => setNewCustomer(prev => ({ ...prev, email: text }))}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Τηλέφωνο</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.phone_primary}
                    onChangeText={(text) => setNewCustomer(prev => ({ ...prev, phone_primary: text }))}
                    placeholder="2101234567"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Αριθμός Ταυτότητας</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.id_number}
                    onChangeText={(text) => setNewCustomer(prev => ({ ...prev, id_number: text }))}
                    placeholder="AA123456"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Ημερομηνία Γέννησης</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.date_of_birth}
                    onChangeText={(text) => setNewCustomer(prev => ({ ...prev, date_of_birth: text }))}
                    placeholder="1990-01-01"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Διεύθυνση</Text>
                <TextInput
                  style={styles.input}
                  value={newCustomer.address}
                  onChangeText={(text) => setNewCustomer(prev => ({ ...prev, address: text }))}
                  placeholder="Διεύθυνση"
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Δίπλωμα Οδήγησης</Text>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Αριθμός Διπλώματος</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.driver_license_number}
                    onChangeText={(text) => setNewCustomer(prev => ({ ...prev, driver_license_number: text }))}
                    placeholder="123456789"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Λήξη Διπλώματος</Text>
                  <TextInput
                    style={styles.input}
                    value={newCustomer.driver_license_expiry}
                    onChangeText={(text) => setNewCustomer(prev => ({ ...prev, driver_license_expiry: text }))}
                    placeholder="2025-12-31"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Επιχειρηματικές Πληροφορίες (Προαιρετικά)</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Επωνυμία Εταιρείας</Text>
                <TextInput
                  style={styles.input}
                  value={newCustomer.company_name}
                  onChangeText={(text) => setNewCustomer(prev => ({ ...prev, company_name: text }))}
                  placeholder="Επωνυμία Εταιρείας"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>ΑΦΜ Εταιρείας</Text>
                <TextInput
                  style={styles.input}
                  value={newCustomer.company_vat_number}
                  onChangeText={(text) => setNewCustomer(prev => ({ ...prev, company_vat_number: text }))}
                  placeholder="123456789"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Σημειώσεις</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newCustomer.notes}
                  onChangeText={(text) => setNewCustomer(prev => ({ ...prev, notes: text }))}
                  placeholder="Σημειώσεις για τον πελάτη..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  function renderCustomerDetailsModal() {
    if (!selectedCustomer || !customerHistory) return null;

    return (
      <Modal
        visible={showCustomerDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCustomerDetails(false)}>
              <Text style={styles.modalCancelButton}>Κλείσιμο</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Λεπτομέρειες Πελάτη</Text>
            <TouchableOpacity onPress={() => {
              setShowCustomerDetails(false);
              editCustomer(selectedCustomer);
            }}>
              <Text style={styles.modalSaveButton}>Επεξεργασία</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <SimpleGlassCard style={styles.customerInfoCard}>
              <View style={styles.customerDetailHeader}>
                <View style={styles.customerDetailAvatar}>
                  <Text style={styles.customerDetailAvatarText}>
                    {selectedCustomer.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerDetailInfo}>
                  <Text style={styles.customerDetailName}>{selectedCustomer.full_name}</Text>
                  <Text style={styles.customerDetailEmail}>{selectedCustomer.email}</Text>
                  <Text style={styles.customerDetailPhone}>{selectedCustomer.phone_primary}</Text>
                </View>
                <View style={[
                  styles.customerDetailStatus,
                  { backgroundColor: getCustomerStatusColor(selectedCustomer) + '20' }
                ]}>
                  <Text style={[
                    styles.customerDetailStatusText,
                    { color: getCustomerStatusColor(selectedCustomer) }
                  ]}>
                    {getCustomerStatusLabel(selectedCustomer)}
                  </Text>
                </View>
              </View>
            </SimpleGlassCard>

            <SimpleGlassCard style={styles.historyCard}>
              <Text style={styles.sectionTitle}>Ιστορικό Ενοικιάσεων</Text>
              {customerHistory.rentals.length === 0 ? (
                <Text style={styles.emptyHistory}>Δεν υπάρχουν ενοικιάσεις</Text>
              ) : (
                customerHistory.rentals.slice(0, 5).map((rental) => (
                  <View key={rental.id} style={styles.rentalHistoryItem}>
                    <View style={styles.rentalHistoryInfo}>
                      <Text style={styles.rentalHistoryVehicle}>{rental.vehicle}</Text>
                      <Text style={styles.rentalHistoryDate}>
                        {format(new Date(rental.date), 'dd/MM/yyyy', { locale: el })}
                      </Text>
                    </View>
                    <View style={styles.rentalHistoryDetails}>
                      <Text style={styles.rentalHistoryCost}>€{rental.cost}</Text>
                      <Text style={styles.rentalHistoryDuration}>{rental.duration} ημέρες</Text>
                    </View>
                  </View>
                ))
              )}
            </SimpleGlassCard>

            <SimpleGlassCard style={styles.historyCard}>
              <Text style={styles.sectionTitle}>Επικοινωνία</Text>
              {customerHistory.communications.length === 0 ? (
                <Text style={styles.emptyHistory}>Δεν υπάρχει ιστορικό επικοινωνίας</Text>
              ) : (
                customerHistory.communications.slice(0, 5).map((comm) => (
                  <View key={comm.id} style={styles.communicationHistoryItem}>
                    <View style={styles.communicationHistoryInfo}>
                      <Text style={styles.communicationHistoryType}>
                        {comm.communication_type === 'email' ? 'Email' :
                         comm.communication_type === 'sms' ? 'SMS' :
                         comm.communication_type === 'phone' ? 'Τηλέφωνο' : comm.communication_type}
                      </Text>
                      <Text style={styles.communicationHistoryMessage}>{comm.message}</Text>
                    </View>
                    <Text style={styles.communicationHistoryDate}>
                      {format(new Date(comm.created_at), 'dd/MM/yyyy HH:mm', { locale: el })}
                    </Text>
                  </View>
                ))
              )}
            </SimpleGlassCard>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size=" здоровый" color={Colors.primary} />
          <Text style={styles.loadingText}>Φόρτωση πελατών...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} {...smoothScrollConfig}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Βάση Δεδομένων Πελατών</Text>
            <Text style={styles.headerSubtitle}>{customers.length} πελάτες</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddCustomerModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {customerStats && (
          <View style={styles.statsContainer}>
            <SimpleGlassCard style={styles.statCard}>
              <Ionicons name="people" size={20} color={Colors.primary} />
              <Text style={styles.statNumber}>{customerStats.totalCustomers}</Text>
              <Text style={styles.statLabel}>Σύνολο</Text>
            </SimpleGlassCard>
            <SimpleGlassCard style={styles.statCard}>
              <Ionicons name="star" size={20} color={Colors.warning} />
              <Text style={styles.statNumber}>{customerStats.vipCustomers}</Text>
              <Text style={styles.statLabel}>VIP</Text>
            </SimpleGlassCard>
            <SimpleGlassCard style={styles.statCard}>
              <Ionicons name="trending-up" size={20} color={Colors.success} />
              <Text style={styles.statNumber}>{customerStats.newCustomersThisMonth}</Text>
              <Text style={styles.statLabel}>Νέοι</Text>
            </SimpleGlassCard>
            <SimpleGlassCard style={styles.statCard}>
              <Ionicons name="cash" size={20} color={Colors.info} />
              <Text style={styles.statNumber}>€{customerStats.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Έσοδα</Text>
            </SimpleGlassCard>
          </View>
        )}

        {/* Search and Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Αναζήτηση πελατών..."
              placeholderTextColor={Colors.textSecondary}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            <View style={styles.filtersRow}>
              {[
                { value: 'all', label: 'Όλοι' },
                { value: 'vip', label: 'VIP' },
                { value: 'blacklisted', label: 'Μαύρη Λίστα' },
                { value: 'expired', label: 'Ληγμένα Έγγραφα' },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.value && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.value as any)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedFilter === filter.value && styles.filterChipTextActive,
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Customers List */}
        <View style={styles.customersContainer}>
          {customers.length === 0 ? (
            <SimpleGlassCard style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>Δεν βρέθηκαν πελάτες</Text>
              <Text style={styles.emptyDescription}>
                {searchTerm || selectedFilter !== 'all'
                  ? 'Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης'
                  : 'Προσθέστε τον πρώτο πελάτη στη βάση δεδομένων'
                }
              </Text>
              {(!searchTerm && selectedFilter === 'all') && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowAddCustomerModal(true)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Προσθήκη Πελάτη</Text>
                </TouchableOpacity>
              )}
            </SimpleGlassCard>
          ) : (
            customers.map(renderCustomerCard)
          )}
        </View>
      </ScrollView>

      {renderAddCustomerModal()}
      {renderEditCustomerModal()}
      {renderCustomerDetailsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: Spacing.sm,
    ...Shadows.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
  },
  statNumber: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  filtersScroll: {
    marginBottom: Spacing.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  customersContainer: {
    padding: Spacing.md,
  },
  customerCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  customerAvatarText: {
    ...Typography.h4,
    color: '#fff',
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  customerEmail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  customerPhone: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  customerStatusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  statusBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  customerMenu: {
    padding: Spacing.xs,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statValue: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  emptyButtonText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancelButton: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '700',
  },
  modalSaveButton: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  input: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customerInfoCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  customerDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerDetailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  customerDetailAvatarText: {
    ...Typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
  customerDetailInfo: {
    flex: 1,
  },
  customerDetailName: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '700',
  },
  customerDetailEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  customerDetailPhone: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  customerDetailStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  customerDetailStatusText: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  historyCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  emptyHistory: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rentalHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rentalHistoryInfo: {
    flex: 1,
  },
  rentalHistoryVehicle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  rentalHistoryDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rentalHistoryDetails: {
    alignItems: 'flex-end',
  },
  rentalHistoryCost: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  rentalHistoryDuration: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  communicationHistoryItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  communicationHistoryInfo: {
    marginBottom: Spacing.xs,
  },
  communicationHistoryType: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  communicationHistoryMessage: {
    ...Typography.body,
    color: Colors.text,
    marginTop: 2,
  },
  communicationHistoryDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
