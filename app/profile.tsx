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
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/auth.service';
import { supabase } from '../utils/supabase';
import { Colors, Typography, Spacing, Shadows } from '../utils/design-system';
import { useTheme, useThemeColors } from '../contexts/theme-context';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  signature_url: string | null;
  // AADE Fields
  aade_enabled: boolean;
  company_vat_number: string;
  company_name: string;
  company_address: string;
  company_activity: string;
  aade_username: string;
  aade_subscription_key: string;
  created_at: string;
  updated_at: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    aade_enabled: false,
    company_vat_number: '',
    company_name: '',
    company_address: '',
    company_activity: '',
    aade_username: '',
    aade_subscription_key: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const user = await AuthService.getCurrentUser();
      
      if (!user) {
        router.replace('/auth/sign-in');
        return;
      }

      // Fetch user profile from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          aade_enabled: data.aade_enabled || false,
          company_vat_number: data.company_vat_number || '',
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_activity: data.company_activity || '',
          aade_username: data.aade_username || '',
          aade_subscription_key: data.aade_subscription_key || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης προφίλ');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;

    try {
      setSaving(true);

      const updateData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        aade_enabled: formData.aade_enabled,
        company_vat_number: formData.company_vat_number,
        company_name: formData.company_name,
        company_address: formData.company_address,
        company_activity: formData.company_activity,
        aade_username: formData.aade_username,
        aade_subscription_key: formData.aade_subscription_key,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setEditMode(false);
      Alert.alert('Επιτυχία', 'Το προφίλ ενημερώθηκε επιτυχώς');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης προφίλ');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        aade_enabled: profile.aade_enabled || false,
        company_vat_number: profile.company_vat_number || '',
        company_name: profile.company_name || '',
        company_address: profile.company_address || '',
        company_activity: profile.company_activity || '',
        aade_username: profile.aade_username || '',
        aade_subscription_key: profile.aade_subscription_key || '',
      });
    }
    setEditMode(false);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Φόρτωση προφίλ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Αποτυχία φόρτωσης προφίλ</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Δοκιμάστε Ξανά</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Προφίλ</Text>
        <View style={styles.headerActions}>
          {editMode ? (
            <>
              <TouchableOpacity onPress={handleCancel} style={styles.headerAction}>
                <Ionicons name="close" size={24} color={Colors.error} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.headerAction} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.success} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={Colors.success} />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setEditMode(true)} style={styles.headerAction}>
              <Ionicons name="create-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(formData.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <Text style={styles.profileDate}>
            Μέλος από {new Date(profile.created_at).toLocaleDateString('el-GR')}
          </Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Βασικές Πληροφορίες</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ονοματεπώνυμο</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Εισάγετε το όνομά σας"
                editable={editMode}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputText}>{profile.email}</Text>
              </View>
              <Text style={styles.fieldHint}>Το email δεν μπορεί να αλλάξει</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Τηλέφωνο</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Εισάγετε το τηλέφωνό σας"
                keyboardType="phone-pad"
                editable={editMode}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Διεύθυνση</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, !editMode && styles.inputDisabled]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Εισάγετε τη διεύθυνσή σας"
                multiline
                numberOfLines={3}
                editable={editMode}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Εμφάνιση</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.fieldLabel}>Σκούρο Θέμα</Text>
                  <Text style={styles.fieldHint}>Χρησιμοποιήστε σκούρα χρώματα</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: Colors.systemGray4, true: Colors.primary + '80' }}
                  thumbColor={isDark ? Colors.primary : Colors.systemGray}
                />
              </View>
            </View>
          </View>
        </View>

        {/* AADE Integration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={24} color={Colors.success} />
            <Text style={styles.sectionTitle}>Ρυθμίσεις AADE</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.fieldLabel}>Ενεργοποίηση AADE</Text>
                  <Text style={styles.fieldHint}>Αυτόματη υποβολή συμβολαίων</Text>
                </View>
                <Switch
                  value={formData.aade_enabled}
                  onValueChange={(value) => setFormData({ ...formData, aade_enabled: value })}
                  disabled={!editMode}
                  trackColor={{ false: Colors.systemGray4, true: Colors.success + '80' }}
                  thumbColor={formData.aade_enabled ? Colors.success : Colors.systemGray}
                />
              </View>
            </View>

            {formData.aade_enabled && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ΑΦΜ Επιχείρησης</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.inputDisabled]}
                    value={formData.company_vat_number}
                    onChangeText={(text) => setFormData({ ...formData, company_vat_number: text })}
                    placeholder="Εισάγετε το ΑΦΜ"
                    keyboardType="numeric"
                    editable={editMode}
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Επωνυμία Επιχείρησης</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.inputDisabled]}
                    value={formData.company_name}
                    onChangeText={(text) => setFormData({ ...formData, company_name: text })}
                    placeholder="Εισάγετε την επωνυμία"
                    editable={editMode}
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Διεύθυνση Επιχείρησης</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline, !editMode && styles.inputDisabled]}
                    value={formData.company_address}
                    onChangeText={(text) => setFormData({ ...formData, company_address: text })}
                    placeholder="Εισάγετε τη διεύθυνση"
                    multiline
                    numberOfLines={2}
                    editable={editMode}
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Δραστηριότητα</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.inputDisabled]}
                    value={formData.company_activity}
                    onChangeText={(text) => setFormData({ ...formData, company_activity: text })}
                    placeholder="π.χ. Ενοικίαση Αυτοκινήτων"
                    editable={editMode}
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>AADE Username</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.inputDisabled]}
                    value={formData.aade_username}
                    onChangeText={(text) => setFormData({ ...formData, aade_username: text })}
                    placeholder="Το όνομα χρήστη σας στο AADE"
                    autoCapitalize="none"
                    editable={editMode}
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Subscription Key</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.inputDisabled]}
                    value={formData.aade_subscription_key}
                    onChangeText={(text) => setFormData({ ...formData, aade_subscription_key: text })}
                    placeholder="Το κλειδί API σας"
                    secureTextEntry={!editMode}
                    autoCapitalize="none"
                    editable={editMode}
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color={Colors.error} />
              <Text style={[styles.actionButtonText, { color: Colors.error }]}>Αποσύνδεση</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.versionText}>© 2024 AGGELOS Rentals</Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    ...Typography.title2,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.title2,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerAction: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileEmail: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  profileDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.text,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.md,
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    ...Typography.subheadline,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  fieldHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputDisabled: {
    backgroundColor: Colors.systemGray6,
    borderColor: Colors.systemGray5,
  },
  inputText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginRight: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    ...Typography.body,
    fontWeight: '600',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});

