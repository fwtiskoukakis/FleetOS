import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../contexts/theme-context';
import { Spacing } from '../../utils/design-system';
import { supabase } from '../../services/supabase.service';

interface DesignSettings {
  id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_name: string;
  company_name_el: string;
  tagline?: string;
  tagline_el?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  facebook_url?: string;
  instagram_url?: string;
  allow_instant_booking: boolean;
  require_approval: boolean;
  show_prices_without_vat: boolean;
  min_booking_hours: number;
}

export default function DesignSettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<DesignSettings>({
    primary_color: '#2563eb',
    secondary_color: '#10b981',
    accent_color: '#f59e0b',
    company_name: '',
    company_name_el: '',
    tagline: '',
    tagline_el: '',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    allow_instant_booking: true,
    require_approval: false,
    show_prices_without_vat: false,
    min_booking_hours: 24,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_design_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          primary_color: data.primary_color || '#2563eb',
          secondary_color: data.secondary_color || '#10b981',
          accent_color: data.accent_color || '#f59e0b',
          company_name: data.company_name || '',
          company_name_el: data.company_name_el || '',
          tagline: data.tagline || '',
          tagline_el: data.tagline_el || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          whatsapp_number: data.whatsapp_number || '',
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          allow_instant_booking: data.allow_instant_booking ?? true,
          require_approval: data.require_approval ?? false,
          show_prices_without_vat: data.show_prices_without_vat ?? false,
          min_booking_hours: data.min_booking_hours || 24,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης ρυθμίσεων');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings.company_name_el.trim()) {
      Alert.alert('Σφάλμα', 'Το όνομα εταιρείας είναι υποχρεωτικό');
      return;
    }

    try {
      setSaving(true);

      const settingsData = {
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        company_name: settings.company_name || settings.company_name_el,
        company_name_el: settings.company_name_el,
        tagline: settings.tagline,
        tagline_el: settings.tagline_el,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        whatsapp_number: settings.whatsapp_number,
        facebook_url: settings.facebook_url,
        instagram_url: settings.instagram_url,
        allow_instant_booking: settings.allow_instant_booking,
        require_approval: settings.require_approval,
        show_prices_without_vat: settings.show_prices_without_vat,
        min_booking_hours: settings.min_booking_hours,
      };

      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('booking_design_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('booking_design_settings')
          .insert(settingsData);

        if (error) throw error;
      }

      Alert.alert('Επιτυχία', 'Οι ρυθμίσεις αποθηκεύτηκαν');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία αποθήκευσης ρυθμίσεων');
    } finally {
      setSaving(false);
    }
  }

  const COLOR_PRESETS = [
    { label: 'Blue', value: '#2563eb' },
    { label: 'Green', value: '#10b981' },
    { label: 'Orange', value: '#f59e0b' },
    { label: 'Purple', value: '#8b5cf6' },
    { label: 'Pink', value: '#ec4899' },
    { label: 'Red', value: '#ef4444' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Ρυθμίσεις Εμφάνισης</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Customize website
          </Text>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Φόρτωση...</Text>
        ) : (
          <>
            {/* Brand Colors */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Χρώματα Brand</Text>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Κύριο Χρώμα</Text>
                <View style={styles.colorRow}>
                  <View style={[styles.colorPreview, { backgroundColor: settings.primary_color }]} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, flex: 1 }]}
                    value={settings.primary_color}
                    onChangeText={(text) => setSettings({ ...settings, primary_color: text })}
                    placeholder="#2563eb"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Δευτερεύον Χρώμα</Text>
                <View style={styles.colorRow}>
                  <View style={[styles.colorPreview, { backgroundColor: settings.secondary_color }]} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, flex: 1 }]}
                    value={settings.secondary_color}
                    onChangeText={(text) => setSettings({ ...settings, secondary_color: text })}
                    placeholder="#10b981"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Accent Χρώμα</Text>
                <View style={styles.colorRow}>
                  <View style={[styles.colorPreview, { backgroundColor: settings.accent_color }]} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, flex: 1 }]}
                    value={settings.accent_color}
                    onChangeText={(text) => setSettings({ ...settings, accent_color: text })}
                    placeholder="#f59e0b"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            {/* Company Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Στοιχεία Εταιρείας</Text>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Όνομα (Ελληνικά) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.company_name_el}
                  onChangeText={(text) => setSettings({ ...settings, company_name_el: text })}
                  placeholder="Ενοικιάσεις Αυτοκινήτων Πειραιάς"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Όνομα (English)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.company_name}
                  onChangeText={(text) => setSettings({ ...settings, company_name: text })}
                  placeholder="Piraeus Car Rentals"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Tagline (Ελληνικά)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.tagline_el}
                  onChangeText={(text) => setSettings({ ...settings, tagline_el: text })}
                  placeholder="Κλείστε το αυτοκίνητό σας online"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Contact Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Στοιχεία Επικοινωνίας</Text>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.contact_email}
                  onChangeText={(text) => setSettings({ ...settings, contact_email: text })}
                  placeholder="info@example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Τηλέφωνο</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.contact_phone}
                  onChangeText={(text) => setSettings({ ...settings, contact_phone: text })}
                  placeholder="+30 210 123 4567"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>WhatsApp</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.whatsapp_number}
                  onChangeText={(text) => setSettings({ ...settings, whatsapp_number: text })}
                  placeholder="+30 690 123 4567"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Social Media */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Social Media</Text>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Facebook URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.facebook_url}
                  onChangeText={(text) => setSettings({ ...settings, facebook_url: text })}
                  placeholder="https://facebook.com/yourpage"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Instagram URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.instagram_url}
                  onChangeText={(text) => setSettings({ ...settings, instagram_url: text })}
                  placeholder="https://instagram.com/yourprofile"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Booking Features */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Λειτουργίες Booking</Text>
              
              <View style={[styles.formGroup, styles.switchRow]}>
                <View>
                  <Text style={[styles.label, { color: colors.text }]}>Άμεση Κράτηση</Text>
                  <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                    Επιτρέπει κρατήσεις χωρίς έγκριση
                  </Text>
                </View>
                <Switch
                  value={settings.allow_instant_booking}
                  onValueChange={(value) => setSettings({ ...settings, allow_instant_booking: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={[styles.formGroup, styles.switchRow]}>
                <View>
                  <Text style={[styles.label, { color: colors.text }]}>Απαιτείται Έγκριση</Text>
                  <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                    Όλες οι κρατήσεις χρειάζονται έγκριση
                  </Text>
                </View>
                <Switch
                  value={settings.require_approval}
                  onValueChange={(value) => setSettings({ ...settings, require_approval: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={[styles.formGroup, styles.switchRow]}>
                <View>
                  <Text style={[styles.label, { color: colors.text }]}>Τιμές χωρίς ΦΠΑ</Text>
                  <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                    Εμφάνιση τιμών χωρίς ΦΠΑ
                  </Text>
                </View>
                <Switch
                  value={settings.show_prices_without_vat}
                  onValueChange={(value) => setSettings({ ...settings, show_prices_without_vat: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Ελάχιστες Ώρες Πριν την Κράτηση</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                  value={settings.min_booking_hours.toString()}
                  onChangeText={(text) => setSettings({ ...settings, min_booking_hours: parseInt(text) || 24 })}
                  placeholder="24"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.helpText, { color: colors.textSecondary, marginTop: 4 }]}>
                  Πόσες ώρες πριν μπορεί να γίνει κράτηση
                </Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 60 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.xs },
  helpText: { fontSize: 12, marginTop: 2 },
  input: { borderRadius: 8, padding: Spacing.md, fontSize: 16 },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

