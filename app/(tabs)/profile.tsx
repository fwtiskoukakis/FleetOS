import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SimpleGlassCard } from '../../components/glass-card';
import { Breadcrumb } from '../../components/breadcrumb';
import { AuthService } from '../../services/auth.service';
import { supabase } from '../../utils/supabase';
import { Colors, Typography, Spacing, Shadows, BorderRadius, Glass } from '../../utils/design-system';
import { smoothScrollConfig } from '../../utils/animations';
import { useNotifications } from '../../hooks/useNotifications';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  // AADE Fields
  aadeEnabled?: boolean;
  aadeUserId?: string;
  aadeSubscriptionKey?: string;
  companyVatNumber?: string;
  companyName?: string;
  companyAddress?: string;
  companyActivity?: string;
}

interface EditField {
  key: string;
  value: string;
  label: string;
  icon: string;
  placeholder: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { sendTestNotification } = useNotifications();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [showKeys, setShowKeys] = useState({
    userId: false,
    subscriptionKey: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const user = await AuthService.getCurrentUser();
      
      if (user) {
        const profileData = await AuthService.getUserProfile(user.id);
        if (profileData) {
          setProfile({
            id: profileData.id,
            name: profileData.name || 'Χρήστης',
            email: user.email || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
            aadeEnabled: profileData.aade_enabled || false,
            aadeUserId: profileData.aade_user_id || '',
            aadeSubscriptionKey: profileData.aade_subscription_key || '',
            companyVatNumber: profileData.company_vat_number || '',
            companyName: profileData.company_name || '',
            companyAddress: profileData.company_address || '',
            companyActivity: profileData.company_activity || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης προφίλ');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveField() {
    if (!profile || !editingField) return;

    try {
      setSaving(true);

      const updateData: any = {};
      const key = editingField.key;

      // Map frontend keys to database columns
      if (key === 'name') updateData.name = editValue;
      else if (key === 'phone') updateData.phone = editValue;
      else if (key === 'address') updateData.address = editValue;
      else if (key === 'companyName') updateData.company_name = editValue;
      else if (key === 'companyVatNumber') updateData.company_vat_number = editValue;
      else if (key === 'companyAddress') updateData.company_address = editValue;
      else if (key === 'companyActivity') updateData.company_activity = editValue;
      else if (key === 'aadeUserId') updateData.aade_user_id = editValue;
      else if (key === 'aadeSubscriptionKey') updateData.aade_subscription_key = editValue;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      // Update local state
      setProfile({
        ...profile,
        [key]: editValue,
      });

      setEditingField(null);
      setEditValue('');
      Alert.alert('Επιτυχία', 'Τα στοιχεία ενημερώθηκαν επιτυχώς');
    } catch (error) {
      console.error('Error saving field:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης. Παρακαλώ προσπαθήστε ξανά.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAADE(value: boolean) {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ aade_enabled: value })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, aadeEnabled: value });
      Alert.alert('Επιτυχία', value ? 'Το ΑΑΔΕ ενεργοποιήθηκε' : 'Το ΑΑΔΕ απενεργοποιήθηκε');
    } catch (error) {
      console.error('Error toggling AADE:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία ενημέρωσης');
    }
  }

  function startEdit(field: EditField) {
    setEditingField(field);
    setEditValue(field.value);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue('');
  }

  async function handleSignOut() {
    Alert.alert(
      'Αποσύνδεση',
      'Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Αποσύνδεση',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              router.replace('/auth/sign-in');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία αποσύνδεσης');
            }
          },
        },
      ]
    );
  }

  function renderProfileCard(
    title: string,
    icon: any,
    iconColor: string,
    fields: EditField[]
  ) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>

        <View style={styles.card}>
          {fields.map((field, index) => (
            <View key={field.key}>
              <TouchableOpacity
                style={styles.fieldRow}
                onPress={() => startEdit(field)}
                activeOpacity={0.7}
              >
                <View style={styles.fieldLeft}>
                  <Ionicons name={field.icon as any} size={20} color={Colors.textSecondary} />
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <Text style={styles.fieldValue}>
                      {field.value || 'Δεν έχει οριστεί'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
              {index < fields.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderQuickActions() {
    const actions = [
      {
        icon: 'document-text-outline',
        label: 'Συμβόλαια',
        color: Colors.primary,
        route: '/contracts',
      },
      {
        icon: 'car-sport-outline',
        label: 'Στόλος',
        color: Colors.info,
        route: '/cars',
      },
      {
        icon: 'calendar-outline',
        label: 'Ημερολόγιο',
        color: Colors.success,
        route: '/calendar',
      },
      {
        icon: 'bar-chart-outline',
        label: 'Αναλυτικά',
        color: Colors.warning,
        route: '/analytics',
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.quickActionsTitle}>Γρήγορη Πρόσβαση</Text>
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon as any} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Φόρτωση προφίλ...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>Αποτυχία φόρτωσης προφίλ</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryText}>Δοκιμάστε ξανά</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Προφίλ & Ρυθμίσεις' },
        ]}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          {...smoothScrollConfig}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarEditButton}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
            
            {profile.companyName && (
              <View style={styles.companyBadge}>
                <Ionicons name="business" size={14} color={Colors.primary} />
                <Text style={styles.companyBadgeText}>{profile.companyName}</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Personal Information */}
          {renderProfileCard(
            'Προσωπικά Στοιχεία',
            'person-outline',
            Colors.primary,
            [
              {
                key: 'name',
                value: profile.name,
                label: 'Ονοματεπώνυμο',
                icon: 'person',
                placeholder: 'Εισάγετε το όνομά σας',
              },
              {
                key: 'phone',
                value: profile.phone || '',
                label: 'Τηλέφωνο',
                icon: 'call',
                placeholder: 'Εισάγετε το τηλέφωνό σας',
              },
              {
                key: 'address',
                value: profile.address || '',
                label: 'Διεύθυνση',
                icon: 'location',
                placeholder: 'Εισάγετε τη διεύθυνσή σας',
              },
            ]
          )}

          {/* AADE Digital Client Registry */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.info + '15' }]}>
                <Ionicons name="shield-checkmark-outline" size={24} color={Colors.info} />
              </View>
              <Text style={styles.sectionTitle}>Ψηφιακό Πελατολόγιο (ΑΑΔΕ)</Text>
            </View>

            {/* AADE Toggle */}
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Ενεργοποίηση ΑΑΔΕ</Text>
                  <Text style={styles.toggleSubtitle}>
                    Αυτόματη υποβολή στο Digital Client Registry
                  </Text>
                </View>
                <Switch
                  value={profile.aadeEnabled}
                  onValueChange={toggleAADE}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={profile.aadeEnabled ? '#FFFFFF' : Colors.textSecondary}
                />
              </View>
            </View>

            {/* AADE Settings (shown when enabled) */}
            {profile.aadeEnabled && (
              <>
                {renderProfileCard(
                  'Διαπιστευτήρια ΑΑΔΕ',
                  'key-outline',
                  Colors.info,
                  [
                    {
                      key: 'aadeUserId',
                      value: profile.aadeUserId || '',
                      label: 'AADE User ID',
                      icon: 'person-circle',
                      placeholder: 'Εισάγετε το AADE User ID',
                    },
                    {
                      key: 'aadeSubscriptionKey',
                      value: profile.aadeSubscriptionKey || '',
                      label: 'Subscription Key',
                      icon: 'key',
                      placeholder: 'Εισάγετε το Subscription Key',
                    },
                  ]
                )}

                {renderProfileCard(
                  'Στοιχεία Επιχείρησης',
                  'business-outline',
                  Colors.info,
                  [
                    {
                      key: 'companyVatNumber',
                      value: profile.companyVatNumber || '',
                      label: 'ΑΦΜ (9 ψηφία)',
                      icon: 'card',
                      placeholder: '123456789',
                    },
                    {
                      key: 'companyName',
                      value: profile.companyName || '',
                      label: 'Επωνυμία Εταιρείας',
                      icon: 'business',
                      placeholder: 'π.χ. AGGELOS RENTALS ΙΚΕ',
                    },
                    {
                      key: 'companyAddress',
                      value: profile.companyAddress || '',
                      label: 'Διεύθυνση Έδρας',
                      icon: 'location',
                      placeholder: 'Λεωφ. Συγγρού 123, Αθήνα',
                    },
                    {
                      key: 'companyActivity',
                      value: profile.companyActivity || '',
                      label: 'Δραστηριότητα',
                      icon: 'briefcase',
                      placeholder: 'Ενοικίαση Αυτοκινήτων',
                    },
                  ]
                )}

                {/* AADE Help */}
                <View style={styles.helpCard}>
                  <Text style={styles.helpTitle}>ℹ️ Πού να βρω αυτά τα στοιχεία;</Text>
                  <Text style={styles.helpText}>
                    • Εγγραφείτε στο AADE Developer Portal{'\n'}
                    • Συνδεθείτε στο Digital Client Registry API Portal{'\n'}
                    • Θα βρείτε το User ID και το Subscription Key{'\n'}
                    • Production: https://mydatapi.aade.gr/DCL/{'\n'}
                    • Development: https://mydataapidev.aade.gr/DCL/
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* App Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.secondary + '15' }]}>
                <Ionicons name="settings-outline" size={24} color={Colors.secondary} />
              </View>
              <Text style={styles.sectionTitle}>Ρυθμίσεις Εφαρμογής</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Ειδοποιήσεις Push</Text>
                  <Text style={styles.toggleSubtitle}>Λήψη ειδοποιήσεων για νέες ενοικιάσεις</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={notificationsEnabled ? '#FFFFFF' : Colors.textSecondary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Biometric Login</Text>
                  <Text style={styles.toggleSubtitle}>Χρήση δακτυλικού αποτυπώματος/Face ID</Text>
                </View>
                <Switch
                  value={biometricsEnabled}
                  onValueChange={setBiometricsEnabled}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={biometricsEnabled ? '#FFFFFF' : Colors.textSecondary}
                />
              </View>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.fieldRow}
                onPress={async () => {
                  try {
                    await sendTestNotification();
                    Alert.alert('Επιτυχία', 'Η δοκιμαστική ειδοποίηση στάλθηκε!');
                  } catch (error) {
                    Alert.alert('Σφάλμα', 'Αποτυχία αποστολής ειδοποίησης');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.fieldLeft}>
                  <Ionicons name="flask" size={20} color={Colors.textSecondary} />
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>Δοκιμή Ειδοποίησης</Text>
                    <Text style={styles.fieldValue}>Αποστολή test push notification</Text>
                  </View>
                </View>
                <Ionicons name="send-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitleSimple}>Εργαλεία & Δοκιμές</Text>
            
            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => router.push('/pdf-template-test?contractId=86951486-8c18-4e1f-88e8-9baa9a25af34')}
              activeOpacity={0.7}
            >
              <View style={styles.settingButtonLeft}>
                <View style={[styles.settingButtonIcon, { backgroundColor: '#8e44ad15' }]}>
                  <Ionicons name="document-text-outline" size={22} color="#8e44ad" />
                </View>
                <Text style={styles.settingButtonText}>🎨 Δοκιμή Προτύπων PDF</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => router.push('/contract-photo-upload-test')}
              activeOpacity={0.7}
            >
              <View style={styles.settingButtonLeft}>
                <View style={[styles.settingButtonIcon, { backgroundColor: Colors.info + '15' }]}>
                  <Ionicons name="camera-outline" size={22} color={Colors.info} />
                </View>
                <Text style={styles.settingButtonText}>📸 Photo Upload Test</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => router.push('/notification-settings')}
              activeOpacity={0.7}
            >
              <View style={styles.settingButtonLeft}>
                <View style={[styles.settingButtonIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.settingButtonText}>Ρυθμίσεις Ειδοποιήσεων</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => router.push('/auth/reset-password')}
              activeOpacity={0.7}
            >
              <View style={styles.settingButtonLeft}>
                <View style={[styles.settingButtonIcon, { backgroundColor: Colors.warning + '15' }]}>
                  <Ionicons name="key-outline" size={22} color={Colors.warning} />
                </View>
                <Text style={styles.settingButtonText}>Αλλαγή Κωδικού</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingButton, styles.signOutButton]}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.settingButtonLeft}>
                <View style={[styles.settingButtonIcon, { backgroundColor: Colors.error + '15' }]}>
                  <Ionicons name="log-out-outline" size={22} color={Colors.error} />
                </View>
                <Text style={[styles.settingButtonText, { color: Colors.error }]}>Αποσύνδεση</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>AGGELOS Rentals v1.0.0</Text>
            <Text style={styles.footerSubtext}>© 2024 Ολα τα δικαιώματα διατηρούνται</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit Field Modal */}
      {editingField && (
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Επεξεργασία</Text>
              <TouchableOpacity onPress={cancelEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.editLabel}>{editingField.label}</Text>
            <View style={styles.editInputContainer}>
              <Ionicons name={editingField.icon as any} size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.editInput}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={editingField.placeholder}
                placeholderTextColor={Colors.textSecondary}
                autoFocus
                editable={!saving}
                secureTextEntry={editingField.key.includes('Key') || editingField.key.includes('UserId')}
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.editCancelButton}
                onPress={cancelEdit}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.editCancelText}>Ακύρωση</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveButton}
                onPress={handleSaveField}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.editSaveText}>Αποθήκευση</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: 17,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  avatarText: {
    fontSize: 42,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Shadows.md,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    marginTop: Spacing.xs,
  },
  companyBadgeText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Quick Actions
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  // Section
  section: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionTitleSimple: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },
  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // Help Card
  helpCard: {
    backgroundColor: Colors.info + '08',
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Settings Buttons
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  settingButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  signOutButton: {
    backgroundColor: Colors.error + '08',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  // Edit Modal
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  editModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.xl,
    ...Shadows.xl,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Spacing.md,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  editSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
