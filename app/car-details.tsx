import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/app-header';
import { BottomTabBar } from '../components/bottom-tab-bar';
import { Breadcrumb } from '../components/breadcrumb';
import { SimpleGlassCard } from '../components/glass-card';
import { Colors, Typography, Shadows, Glass } from '../utils/design-system';
import { smoothScrollConfig } from '../utils/animations';
import { supabase } from '../utils/supabase';
import { useThemeColors } from '../contexts/theme-context';

interface Car {
  id: string;
  makeModel: string;
  licensePlate: string;
  year: number | null;
  fuelType: string | null;
  transmission: string | null;
  seats: number | null;
  dailyRate: number | null;
  isAvailable: boolean | null;
}

interface CarStats {
  totalContracts: number;
  totalRevenue: number;
  totalDamages: number;
}

interface DamagePoint {
  id: string;
  contractId: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  viewSide: 'front' | 'rear' | 'left' | 'right';
  createdAt: string;
}

export default function CarDetailsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { carId } = useLocalSearchParams();
  const [car, setCar] = useState<Car | null>(null);
  const [stats, setStats] = useState<CarStats>({ totalContracts: 0, totalRevenue: 0, totalDamages: 0 });
  const [damages, setDamages] = useState<DamagePoint[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCar();
  }, [carId]);

  async function loadCar() {
    if (typeof carId !== 'string') return;
    try {
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select('*')
        .eq('id', carId)
        .single();

      if (carError || !carData) {
        Alert.alert('Σφάλμα', 'Το αυτοκίνητο δεν βρέθηκε');
        router.back();
        return;
      }

      setCar({
        id: carData.id,
        makeModel: carData.make_model || (carData.make && carData.model ? `${carData.make} ${carData.model}` : carData.make || carData.model || 'Unknown'),
        licensePlate: carData.license_plate || '',
        year: carData.year ?? null,
        fuelType: carData.fuel_type ?? null,
        transmission: carData.transmission ?? null,
        seats: carData.seats ?? null,
        dailyRate: carData.daily_rate ?? null,
        isAvailable: carData.is_available ?? true,
      });

      // Load contracts for this vehicle
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, total_cost')
        .eq('car_license_plate', carData.license_plate);

      // Load damages for all contracts of this vehicle
      let allDamages: DamagePoint[] = [];
      if (contracts && contracts.length > 0) {
        const contractIds = contracts.map(c => c.id);
        const { data: damagesData } = await supabase
          .from('damage_points')
          .select('*')
          .in('contract_id', contractIds)
          .order('created_at', { ascending: false });

        if (damagesData) {
          allDamages = damagesData.map(d => ({
            id: d.id,
            contractId: d.contract_id,
            description: d.description,
            severity: d.severity,
            viewSide: d.view_side,
            createdAt: d.created_at,
          }));
        }
      }

      setStats({
        totalContracts: contracts?.length || 0,
        totalRevenue: contracts?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0,
        totalDamages: allDamages.length,
      });

      setDamages(allDamages);
    } catch (error) {
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης');
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCar();
    setRefreshing(false);
  };

  async function handleDelete() {
    if (!car) return;
    
    Alert.alert(
      'Επιβεβαίωση Διαγραφής',
      `Είστε σίγουροι ότι θέλετε να διαγράψετε το αυτοκίνητο ${car.makeModel} (${car.licensePlate}); Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`,
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cars')
                .delete()
                .eq('id', car.id);

              if (error) throw error;

              Alert.alert('Επιτυχία', `Το αυτοκίνητο ${car.makeModel} διαγράφηκε επιτυχώς.`, [
                { text: 'OK', onPress: () => router.push('/(tabs)/cars') }
              ]);
            } catch (error) {
              console.error('Error deleting car:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής αυτοκινήτου.');
            }
          }
        }
      ]
    );
  }

  function handleEdit() {
    if (!car) return;
    router.push(`/add-edit-vehicle?vehicleId=${car.id}`);
  }

  if (!car) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
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

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'severe': return Colors.error;
      case 'moderate': return Colors.warning;
      case 'minor': return Colors.info;
      default: return Colors.textSecondary;
    }
  }

  function getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'severe': return 'Σοβαρό';
      case 'moderate': return 'Μέτριο';
      case 'minor': return 'Μικρό';
      default: return severity;
    }
  }

  function getViewSideLabel(viewSide: string): string {
    switch (viewSide) {
      case 'front': return 'Μπροστά';
      case 'rear': return 'Πίσω';
      case 'left': return 'Αριστερά';
      case 'right': return 'Δεξιά';
      default: return viewSide;
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader title="Λεπτομέρειες Αυτοκινήτου" showBack={true} showActions={true} />

      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Στόλος', path: '/cars' },
          { label: car.licensePlate },
        ]}
      />

      <ScrollView style={s.content} {...smoothScrollConfig} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={s.statusCard}>
          <View style={[s.statusDot, { backgroundColor: (car.isAvailable ?? true) ? Colors.success : Colors.error }]} />
          <Text style={s.statusText}>{(car.isAvailable ?? true) ? 'Διαθέσιμο' : 'Μη Διαθέσιμο'}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Πληροφορίες</Text>
          <View style={s.card}>
            <InfoRow icon="car" label="Οχημα" value={car.makeModel || 'N/A'} />
            <InfoRow icon="pricetag" label="Πινακίδα" value={car.licensePlate || 'N/A'} />
            <InfoRow icon="calendar" label="Ετος" value={car.year?.toString() || 'N/A'} />
            <InfoRow icon="flash" label="Καύσιμο" value={car.fuelType || 'N/A'} />
            <InfoRow icon="settings" label="Κιβώτιο" value={car.transmission || 'N/A'} />
            <InfoRow icon="people" label="Θέσεις" value={car.seats?.toString() || 'N/A'} />
            <InfoRow icon="cash" label="Ημερήσια Τιμή" value={car.dailyRate ? `€${car.dailyRate}` : 'N/A'} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Στατιστικά</Text>
          <View style={s.statsGrid}>
            <View style={[s.statCard, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="documents" size={24} color={Colors.primary} />
              <Text style={[s.statValue, { color: Colors.primary }]}>{stats.totalContracts}</Text>
              <Text style={s.statLabel}>Συμβόλαια</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: Colors.success + '15' }]}>
              <Ionicons name="trending-up" size={24} color={Colors.success} />
              <Text style={[s.statValue, { color: Colors.success }]}>€{stats.totalRevenue}</Text>
              <Text style={s.statLabel}>Εσοδα</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: Colors.error + '15' }]}>
              <Ionicons name="warning" size={24} color={Colors.error} />
              <Text style={[s.statValue, { color: Colors.error }]}>{stats.totalDamages}</Text>
              <Text style={s.statLabel}>Ζημιές</Text>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={s.actionButtons}>
            <TouchableOpacity
              style={s.editButton}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={s.editButtonText}>Επεξεργασία</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.deleteButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={s.deleteButtonText}>Διαγραφή</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Damages List */}
        {damages.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ζημιές ({damages.length})</Text>
            <View style={s.card}>
              {damages.map((damage, index) => (
                <View key={damage.id} style={[s.damageItem, index === damages.length - 1 && s.damageItemLast]}>
                  <View style={s.damageLeft}>
                    <View style={[s.damageSeverity, { backgroundColor: getSeverityColor(damage.severity) + '15' }]}>
                      <Ionicons name="alert-circle" size={16} color={getSeverityColor(damage.severity)} />
                    </View>
                    <View style={s.damageContent}>
                      <Text style={s.damageDescription}>{damage.description}</Text>
                      <Text style={s.damageMeta}>
                        {getSeverityLabel(damage.severity)} • {getViewSideLabel(damage.viewSide)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.damageDate}>
                    {new Date(damage.createdAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  content: { flex: 1, padding: 8 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, ...Shadows.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, ...Shadows.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', minWidth: 100 },
  infoValue: { fontSize: 13, color: Colors.text, flex: 1, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, ...Shadows.sm },
  statValue: { fontSize: 18, fontWeight: '700', marginVertical: 4 },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 10,
    ...Shadows.sm,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    padding: 10,
    borderRadius: 10,
    ...Shadows.sm,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  damageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  damageItemLast: {
    borderBottomWidth: 0,
  },
  damageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  damageSeverity: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  damageContent: {
    flex: 1,
  },
  damageDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  damageMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  damageDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
