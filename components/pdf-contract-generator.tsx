import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Contract, User } from '../models/contract.interface';
import { APPROVED_CONTRACT_TERMS } from '../config/contract-terms';
import { PDFContractProService } from '../services/pdf-contract-pro.service';
import { Colors, Typography, Spacing, Shadows, BorderRadius, Glass } from '../utils/design-system';

interface PDFContractGeneratorProps {
  contract: Contract;
  user: User;
  style?: any;
}

/**
 * Professional PDF Contract Generator Component
 * Beautiful UI with options for language, photos, and sharing
 */
export function PDFContractGenerator({ contract, user, style }: PDFContractGeneratorProps) {
  const hasApprovedTerms = !!(contract.organizationId && APPROVED_CONTRACT_TERMS[contract.organizationId]?.paragraphs.length);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState({
    language: 'el' as 'el' | 'en',
    includePhotos: true,
    includeDamages: true,
    includeQRCode: false,
  });

  const handleGeneratePDF = async (generationOptions = options) => {
    try {
      setIsGenerating(true);
      setShowOptions(false);

      const pdfUri = await PDFContractProService.generateProfessionalContract(
        contract,
        user,
        generationOptions
      );

      // On web, PDF opens in new window automatically
      // On mobile, share the PDF
      if (pdfUri !== 'web-print-initiated') {
        await handleSharePDF(pdfUri);
      }

      Alert.alert(
        hasApprovedTerms ? 'Το PDF δημιουργήθηκε' : 'Δημιουργήθηκε προσχέδιο PDF',
        !hasApprovedTerms ? 'Η μορφοποίηση ολοκληρώθηκε. Εκκρεμεί η πίσω όψη του έντυπου συμβολαίου για να ενσωματωθούν οι πλήρεις όροι.' : pdfUri === 'web-print-initiated'
          ? 'Το PDF ανοίχτηκε σε νέο παράθυρο! Μπορείτε να το εκτυπώσετε ή να το αποθηκεύσετε ως PDF.'
          : 'Το PDF δημιουργήθηκε με επιτυχία και είναι έτοιμο για κοινοποίηση!'
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(
        'Σφάλμα',
        error instanceof Error ? error.message : 'Αποτυχία δημιουργίας PDF. Παρακαλώ δοκιμάστε ξανά.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePDF = async (uri: string) => {
    try {
      await PDFContractProService.sharePDF(uri, contract.id);
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία κοινοποίησης PDF');
    }
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  return (
    <View style={[styles.container, style]}>
      {/* Main Generate Button */}
      <TouchableOpacity
        style={styles.mainButton}
        onPress={() => setShowOptions(true)}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.mainButtonText}>Δημιουργία PDF...</Text>
          </>
        ) : (
          <>
            <Ionicons name="document-text" size={24} color="#fff" />
            <Text style={styles.mainButtonText}>Δημιουργία Συμβολαίου PDF</Text>
            <Ionicons name="chevron-down" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      {/* Quick Generate Buttons */}
      <View style={styles.quickButtons}>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => {
            setOptions({ language: 'el', includePhotos: true, includeDamages: true, includeQRCode: false });
            handleGeneratePDF({ language: 'el', includePhotos: true, includeDamages: true, includeQRCode: false });
          }}
          disabled={isGenerating}
        >
          <Ionicons name="flash" size={16} color={Colors.success} />
          <Text style={styles.quickButtonText}>Γρήγορη Δημιουργία</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => {
            setOptions({ language: 'en', includePhotos: true, includeDamages: true, includeQRCode: false });
            handleGeneratePDF({ language: 'en', includePhotos: true, includeDamages: true, includeQRCode: false });
          }}
          disabled={isGenerating}
        >
          <Ionicons name="language" size={16} color={Colors.info} />
          <Text style={styles.quickButtonText}>English Version</Text>
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="settings-outline" size={24} color={Colors.primary} />
                <Text style={styles.modalTitle}>Επιλογές PDF</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowOptions(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Language Selection */}
              <View style={styles.optionSection}>
                <Text style={styles.optionSectionTitle}>Γλώσσα / Language</Text>
                <View style={styles.languageButtons}>
                  <TouchableOpacity
                    style={[
                      styles.languageButton,
                      options.language === 'el' && styles.languageButtonActive,
                    ]}
                    onPress={() => setOptions(prev => ({ ...prev, language: 'el' }))}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        options.language === 'el' && styles.languageButtonTextActive,
                      ]}
                    >
                      🇬🇷 Ελληνικά
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageButton,
                      options.language === 'en' && styles.languageButtonActive,
                    ]}
                    onPress={() => setOptions(prev => ({ ...prev, language: 'en' }))}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        options.language === 'en' && styles.languageButtonTextActive,
                      ]}
                    >
                      🇬🇧 English
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Include Options */}
              <View style={styles.optionSection}>
                <Text style={styles.optionSectionTitle}>Περιεχόμενο</Text>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => toggleOption('includePhotos')}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name={options.includePhotos ? 'camera' : 'camera-outline'}
                      size={24}
                      color={options.includePhotos ? Colors.success : Colors.textSecondary}
                    />
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionTitle}>Φωτογραφίες και έγγραφα</Text>
                      <Text style={styles.optionDescription}>
                        Συμπερίληψη {contract.photoUris.length} φωτογραφιών
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.toggle,
                      options.includePhotos && styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        options.includePhotos && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => toggleOption('includeDamages')}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name={options.includeDamages ? 'warning' : 'warning-outline'}
                      size={24}
                      color={options.includeDamages ? Colors.warning : Colors.textSecondary}
                    />
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionTitle}>Καταγεγραμμένες Ζημιές</Text>
                      <Text style={styles.optionDescription}>
                        {contract.damagePoints.length} {contract.damagePoints.length === 1 ? 'ζημιά' : 'ζημιές'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.toggle,
                      options.includeDamages && styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        options.includeDamages && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Contract Info Preview */}
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Προεπισκόπηση</Text>
                {!hasApprovedTerms && <Text style={styles.optionDescription}>Προσχέδιο: εκκρεμούν οι πλήρεις όροι από την πίσω όψη του έντυπου συμβολαίου.</Text>}
                <View style={styles.previewCard}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Ενοικιαστής:</Text>
                    <Text style={styles.previewValue}>{contract.renterInfo.fullName}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Όχημα:</Text>
                    <Text style={styles.previewValue}>
                      {contract.carInfo.makeModel} ({contract.carInfo.licensePlate})
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Κόστος:</Text>
                    <Text style={styles.previewValue}>
                      €{contract.rentalPeriod.totalCost?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Generate Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => handleGeneratePDF()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.generateButtonText}>Δημιουργία...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>Δημιουργία PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },

  // Main Button
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  mainButtonText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Quick Buttons
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickButtonText: {
    ...Typography.caption1,
    color: Colors.text,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    ...Typography.title3,
    color: Colors.text,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 20,
  },

  // Options
  optionSection: {
    marginBottom: 24,
  },
  optionSectionTitle: {
    ...Typography.headline,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Language
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  languageButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  languageButtonText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: Colors.primary,
  },

  // Option Item
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: BorderRadius.lg,
    marginBottom: 10,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },

  // Toggle
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.success,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    ...Shadows.sm,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },

  // Preview
  previewSection: {
    marginTop: 10,
  },
  previewTitle: {
    ...Typography.headline,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  previewValue: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  // Footer
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  generateButtonText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

