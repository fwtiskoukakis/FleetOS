/**
 * Notification Settings Screen
 * Allows users to customize notification preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../contexts/theme-context';
import { NotificationPreferencesService, NotificationPreferencesDB } from '../services/notification-preferences.service';
import { NOTIFICATION_CONFIGS } from '../services/notification-types';
import { supabase } from '../utils/supabase';
import { Colors, Typography, Spacing } from '../utils/design-system';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferencesDB | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Σφάλμα', 'Πρέπει να συνδεθείτε');
        router.back();
        return;
      }

      setUserId(user.id);

      // Load preferences
      const prefs = await NotificationPreferencesService.getPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης ρυθμίσεων');
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(updates: Partial<NotificationPreferencesDB>) {
    if (!userId || !preferences) return;

    try {
      setSaving(true);
      const success = await NotificationPreferencesService.updatePreferences(userId, updates);
      
      if (success) {
        setPreferences({ ...preferences, ...updates });
      } else {
        Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης');
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category: keyof Pick<NotificationPreferencesDB, 
    'enable_contract_notifications' | 
    'enable_maintenance_notifications' | 
    'enable_financial_notifications' | 
    'enable_operational_notifications' | 
    'enable_milestone_notifications'
  >) {
    if (!preferences) return;
    await updatePreference({ [category]: !preferences[category] });
  }

  function renderHeader() {
    return (
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Ρυθμίσεις Ειδοποιήσεων
        </Text>
        <View style={styles.backButton} />
      </View>
    );
  }

  function renderSection(title: string, icon: string, children: React.ReactNode) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon as any} size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
          {children}
        </View>
      </View>
    );
  }

  function renderSettingRow(
    label: string,
    value: boolean,
    onToggle: () => void,
    description?: string,
    disabled?: boolean
  ) {
    return (
      <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: disabled ? colors.textSecondary : colors.text }]}>
            {label}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.isDark ? '#3a3a3a' : '#d1d1d6', true: colors.primary + '50' }}
          thumbColor={value ? colors.primary : '#f4f3f4'}
          disabled={disabled || saving}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Φόρτωση ρυθμίσεων...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!preferences) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Αποτυχία φόρτωσης ρυθμίσεων
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadPreferences}
          >
            <Text style={styles.retryButtonText}>Δοκιμάστε Ξανά</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} />
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Settings */}
        {renderSection('Γρήγορες Ρυθμίσεις', 'settings-outline', (
          <>
            {renderSettingRow(
              'Μόνο Κρίσιμες',
              preferences.critical_only_mode,
              () => updatePreference({ critical_only_mode: !preferences.critical_only_mode }),
              'Εμφάνιση μόνο κρίσιμων ειδοποιήσεων'
            )}
            {renderSettingRow(
              'Ήχος',
              preferences.enable_sound,
              () => updatePreference({ enable_sound: !preferences.enable_sound }),
              'Αναπαραγωγή ήχου για ειδοποιήσεις'
            )}
            {renderSettingRow(
              'Δόνηση',
              preferences.enable_vibration,
              () => updatePreference({ enable_vibration: !preferences.enable_vibration }),
              'Δόνηση συσκευής για ειδοποιήσεις'
            )}
          </>
        ))}

        {/* Categories */}
        {renderSection('Κατηγορίες Ειδοποιήσεων', 'grid-outline', (
          <>
            {renderSettingRow(
              '🚗 Συμβόλαια',
              preferences.enable_contract_notifications,
              () => toggleCategory('enable_contract_notifications'),
              'Παραδόσεις, επιστροφές, υπενθυμίσεις'
            )}
            {renderSettingRow(
              '🔧 Συντήρηση',
              preferences.enable_maintenance_notifications,
              () => toggleCategory('enable_maintenance_notifications'),
              'ΚΤΕΟ, ασφάλειες, service, ελαστικά'
            )}
            {renderSettingRow(
              '💰 Οικονομικά',
              preferences.enable_financial_notifications,
              () => toggleCategory('enable_financial_notifications'),
              'Πληρωμές, προκαταβολές, περιλήψεις'
            )}
            {renderSettingRow(
              '📊 Λειτουργικά',
              preferences.enable_operational_notifications,
              () => toggleCategory('enable_operational_notifications'),
              'Briefings, περιλήψεις, διαθεσιμότητα'
            )}
            {renderSettingRow(
              '🏆 Επιτεύγματα',
              preferences.enable_milestone_notifications,
              () => toggleCategory('enable_milestone_notifications'),
              'Ορόσημα και γιορτές επιτυχιών'
            )}
          </>
        ))}

        {/* Quiet Hours */}
        {renderSection('Ώρες Ησυχίας', 'moon-outline', (
          <>
            {renderSettingRow(
              'Ενεργοποίηση Ωρών Ησυχίας',
              preferences.quiet_hours_enabled,
              () => updatePreference({ quiet_hours_enabled: !preferences.quiet_hours_enabled }),
              'Απόκρυψη μη-κρίσιμων ειδοποιήσεων τη νύχτα'
            )}
            <View style={styles.quietHoursInfo}>
              <Text style={[styles.quietHoursText, { color: colors.textSecondary }]}>
                Ώρες: {preferences.quiet_hours_start} - {preferences.quiet_hours_end}
              </Text>
              <Text style={[styles.quietHoursNote, { color: colors.textSecondary }]}>
                Οι κρίσιμες ειδοποιήσεις θα εμφανίζονται πάντα
              </Text>
            </View>
          </>
        ))}

        {/* Daily Limit */}
        {renderSection('Όριο Ημέρας', 'notifications-outline', (
          <>
            <View style={styles.limitInfo}>
              <Text style={[styles.limitLabel, { color: colors.text }]}>
                Μέγιστες Ειδοποιήσεις Ανά Ημέρα
              </Text>
              <Text style={[styles.limitValue, { color: colors.primary }]}>
                {preferences.max_daily_notifications === 0 
                  ? 'Απεριόριστο' 
                  : preferences.max_daily_notifications}
              </Text>
            </View>
            <Text style={[styles.limitDescription, { color: colors.textSecondary }]}>
              Περιορισμός για μη-κρίσιμες ειδοποιήσεις. Οι κρίσιμες ειδοποιήσεις δεν επηρεάζονται.
            </Text>
          </>
        ))}

        {/* Email Notifications */}
        {renderSection('Email Ειδοποιήσεις', 'mail-outline', (
          <>
            {renderSettingRow(
              'Ενεργοποίηση Email',
              preferences.enable_email_notifications,
              () => updatePreference({ enable_email_notifications: !preferences.enable_email_notifications }),
              'Λήψη σημαντικών ειδοποιήσεων μέσω email'
            )}
            {renderSettingRow(
              'Ημερήσια Περίληψη',
              preferences.email_daily_summary,
              () => updatePreference({ email_daily_summary: !preferences.email_daily_summary }),
              'Ημερήσια περίληψη στο email σας',
              !preferences.enable_email_notifications
            )}
            {renderSettingRow(
              'Εβδομαδιαία Περίληψη',
              preferences.email_weekly_summary,
              () => updatePreference({ email_weekly_summary: !preferences.email_weekly_summary }),
              'Εβδομαδιαία περίληψη κάθε Δευτέρα',
              !preferences.enable_email_notifications
            )}
          </>
        ))}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Οι ειδοποιήσεις σας βοηθούν να παραμείνετε ενημερωμένοι για κρίσιμα γεγονότα της επιχείρησής σας.
            Οι κρίσιμες ειδοποιήσεις (π.χ. καθυστερημένες επιστροφές, ληγμένα ΚΤΕΟ) θα εμφανίζονται πάντα.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.title3,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    ...Typography.body,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    ...Typography.headline,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.headline,
    fontWeight: '600',
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    ...Typography.footnote,
  },
  quietHoursInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quietHoursText: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: 4,
  },
  quietHoursNote: {
    ...Typography.footnote,
    fontStyle: 'italic',
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  limitLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  limitValue: {
    ...Typography.title3,
    fontWeight: '700',
  },
  limitDescription: {
    ...Typography.footnote,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 24,
  },
  infoText: {
    ...Typography.footnote,
    flex: 1,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

