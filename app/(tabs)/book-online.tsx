import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../contexts/theme-context';
import { Spacing } from '../../utils/design-system';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  gradientColors: string[];
}

const menuItems: MenuItem[] = [
  {
    id: 'locations',
    title: 'Τοποθεσίες',
    subtitle: 'Διαχείριση σημείων παραλαβής/παράδοσης',
    icon: 'location',
    route: '/book-online/locations',
    color: '#3b82f6',
    gradientColors: ['#3b82f6', '#2563eb'],
  },
  {
    id: 'categories',
    title: 'Κατηγορίες Οχημάτων',
    subtitle: 'Δημιουργία και επεξεργασία κατηγοριών',
    icon: 'grid',
    route: '/book-online/categories',
    color: '#8b5cf6',
    gradientColors: ['#8b5cf6', '#7c3aed'],
  },
  {
    id: 'cars',
    title: 'Αυτοκίνητα',
    subtitle: 'Διαχείριση οχημάτων και φωτογραφιών',
    icon: 'car-sport',
    route: '/book-online/cars',
    color: '#10b981',
    gradientColors: ['#10b981', '#059669'],
  },
  {
    id: 'pricing',
    title: 'Τιμολόγηση',
    subtitle: 'Calendar τιμών με drag-to-select',
    icon: 'calendar',
    route: '/book-online/pricing',
    color: '#f59e0b',
    gradientColors: ['#f59e0b', '#d97706'],
  },
  {
    id: 'extras',
    title: 'Πρόσθετα',
    subtitle: 'GPS, παιδικό κάθισμα, επιπλέον οδηγός',
    icon: 'add-circle',
    route: '/book-online/extras',
    color: '#06b6d4',
    gradientColors: ['#06b6d4', '#0891b2'],
  },
  {
    id: 'insurance',
    title: 'Ασφάλειες',
    subtitle: 'Τύποι ασφάλειας και κάλυψη',
    icon: 'shield-checkmark',
    route: '/book-online/insurance',
    color: '#ec4899',
    gradientColors: ['#ec4899', '#db2777'],
  },
  {
    id: 'payment',
    title: 'Μέθοδοι Πληρωμής',
    subtitle: 'Stripe, Viva Wallet, PayPal',
    icon: 'card',
    route: '/book-online/payment-methods',
    color: '#6366f1',
    gradientColors: ['#6366f1', '#4f46e5'],
  },
  {
    id: 'bookings',
    title: 'Κρατήσεις',
    subtitle: 'Προβολή και διαχείριση κρατήσεων',
    icon: 'list',
    route: '/book-online/bookings',
    color: '#14b8a6',
    gradientColors: ['#14b8a6', '#0d9488'],
  },
  {
    id: 'design',
    title: 'Εμφάνιση',
    subtitle: 'Χρώματα, λογότυπο, brand settings',
    icon: 'color-palette',
    route: '/book-online/design',
    color: '#f43f5e',
    gradientColors: ['#f43f5e', '#e11d48'],
  },
  {
    id: 'analytics',
    title: 'Αναλυτικά',
    subtitle: 'Στατιστικά και αναφορές κρατήσεων',
    icon: 'stats-chart',
    route: '/book-online/analytics',
    color: '#8b5cf6',
    gradientColors: ['#8b5cf6', '#7c3aed'],
  },
];

export default function BookOnlineScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="globe-outline" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              Online Booking System
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Διαχείριση συστήματος online κρατήσεων
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Ενεργές Κρατήσεις
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>8</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Διαθέσιμα Αυτ/τα
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>€3,450</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Μηνιαία Έσοδα
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Διαχείριση
        </Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemContent}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Website Preview Button */}
      <View style={styles.previewContainer}>
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.previewButton}
        >
          <TouchableOpacity
            style={styles.previewButtonContent}
            onPress={() => {
              // TODO: Open booking website preview
              console.log('Open booking website preview');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="eye" size={24} color="#fff" />
            <Text style={styles.previewButtonText}>
              Προεπισκόπηση Website
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Bottom Padding for Tab Bar */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  menuContainer: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  previewContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  previewButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

