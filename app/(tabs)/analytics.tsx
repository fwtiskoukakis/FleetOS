import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Breadcrumb } from '../../components/breadcrumb';
import { SimpleGlassCard } from '../../components/glass-card';
import { SupabaseContractService } from '../../services/supabase-contract.service';
import { Colors, Typography, Glass } from '../../utils/design-system';
import { smoothScrollConfig } from '../../utils/animations';

export default function AnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    upcoming: 0,
    revenue: 0,
    monthRevenue: 0,
    avgValue: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const contracts = await SupabaseContractService.getAllContracts();
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();

      setStats({
        total: contracts.length,
        active: contracts.filter(c => c.status === 'active').length,
        completed: contracts.filter(c => c.status === 'completed').length,
        upcoming: contracts.filter(c => c.status === 'upcoming').length,
        revenue: contracts.reduce((sum, c) => sum + (c.rentalPeriod.totalCost || 0), 0),
        monthRevenue: contracts.filter(c => {
          const d = new Date(c.rentalPeriod.pickupDate);
          return d.getMonth() === month && d.getFullYear() === year;
        }).reduce((sum, c) => sum + (c.rentalPeriod.totalCost || 0), 0),
        avgValue: contracts.length ? contracts.reduce((sum, c) => sum + (c.rentalPeriod.totalCost || 0), 0) / contracts.length : 0,
      });
    } catch (error) {
      console.error(error);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const StatCard = ({ icon, label, value, color }: any) => (
    <View style={[s.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={[s.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={s.statContent}>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>

      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Αναλυτικά' },
        ]}
      />

      <ScrollView style={s.content} {...smoothScrollConfig} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={s.sectionTitle}>Επισκόπηση</Text>
        <View style={s.grid}>
          <StatCard icon="documents" label="Συνολικά" value={stats.total} color={Colors.primary} />
          <StatCard icon="checkmark-circle" label="Ενεργά" value={stats.active} color={Colors.success} />
          <StatCard icon="time" label="Επερχόμενα" value={stats.upcoming} color={Colors.info} />
          <StatCard icon="checkmark-done" label="Ολοκληρωμένα" value={stats.completed} color={Colors.textSecondary} />
        </View>

        <Text style={s.sectionTitle}>Εσοδα</Text>
        <View style={s.revenueSection}>
          <View style={s.revenueCard}>
            <View style={s.revenueRow}>
              <View style={s.revenueItem}>
                <Ionicons name="trending-up" size={18} color={Colors.success} />
                <View style={s.revenueTextContainer}>
                  <Text style={s.revenueLabel}>Συνολικά</Text>
                  <Text style={s.revenueValue}>€{stats.revenue.toLocaleString()}</Text>
                </View>
              </View>
              <View style={s.revenueDivider} />
              <View style={s.revenueItem}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
                <View style={s.revenueTextContainer}>
                  <Text style={s.revenueLabel}>Αυτόν τον Μήνα</Text>
                  <Text style={s.revenueValue}>€{stats.monthRevenue.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={s.revenueCard}>
            <View style={s.revenueRowSingle}>
              <Ionicons name="calculator" size={18} color={Colors.info} />
              <View style={s.revenueTextContainer}>
                <Text style={s.revenueLabel}>Μέση Αξία Συμβολαίου</Text>
                <Text style={s.revenueValue}>€{Math.round(stats.avgValue)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginVertical: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  statCard: { flex: 1, minWidth: '47%', backgroundColor: '#fff', borderRadius: 10, padding: 8, flexDirection: 'row', alignItems: 'center' },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  statContent: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },
  revenueSection: { gap: 6 },
  revenueCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  revenueRowSingle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueTextContainer: { flex: 1 },
  revenueDivider: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  revenueLabel: { fontSize: 10, color: Colors.textSecondary, marginBottom: 2, fontWeight: '500' },
  revenueValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
});
