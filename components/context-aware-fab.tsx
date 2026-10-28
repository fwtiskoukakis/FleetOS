import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Shadows, BorderRadius, Glass } from '../utils/design-system';
import { FleetOSLogo as FleetOSIcon } from '../components/fleetos-logo';

const { width } = Dimensions.get('window');

interface FabAction {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
}

interface ContextAwareFabProps {
  onNewContract?: () => void;
  onNewDamage?: () => void;
  onNewCar?: () => void;
  onNewUser?: () => void;
  onQuickPhoto?: () => void;
  onDamageTemplate?: () => void;
  onCarMaintenance?: () => void;
  onCarInspection?: () => void;
  onGenerateReport?: () => void;
  onExportData?: () => void;
  onScheduleReport?: () => void;
}

export function ContextAwareFab({
  onNewContract,
  onNewDamage,
  onNewCar,
  onNewUser,
  onQuickPhoto,
  onDamageTemplate,
  onCarMaintenance,
  onCarInspection,
  onGenerateReport,
  onExportData,
  onScheduleReport,
}: ContextAwareFabProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Continuous pulse animation for the icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  function getActionsForCurrentPage(): FabAction[] {
    // Normalize pathname to handle both /page and /(tabs)/page formats
    const normalizedPath = pathname.replace('/(tabs)', '').replace('//', '/');
    
    switch (normalizedPath) {
      case '/':
        return [
          {
            id: 'new-contract',
            label: 'Νέο Συμβόλαιο',
            icon: '📋',
            onPress: () => {
              closeMenu();
              onNewContract?.();
            },
          },
          {
            id: 'new-damage',
            label: 'Καταγραφή Ζημιάς',
            icon: '⚠️',
            onPress: () => {
              closeMenu();
              onNewDamage?.();
            },
          },
          {
            id: 'new-user',
            label: 'Νέος Χρήστης',
            icon: '👤',
            onPress: () => {
              closeMenu();
              onNewUser?.();
            },
          },
        ];

      case '/contracts':
        return [
          {
            id: 'new-contract',
            label: 'Νέο Συμβόλαιο',
            icon: '📋',
            onPress: () => {
              closeMenu();
              onNewContract?.();
            },
          },
          {
            id: 'bulk-operations',
            label: 'Μαζικές Ενέργειες',
            icon: '⚡',
            onPress: () => {
              closeMenu();
              // TODO: Implement bulk operations
            },
          },
          {
            id: 'import-contracts',
            label: 'Εισαγωγή',
            icon: '📥',
            onPress: () => {
              closeMenu();
              // TODO: Implement import
            },
          },
        ];

      case '/damage-report':
        return [
          {
            id: 'new-damage',
            label: 'Νέα Ζημιά',
            icon: '⚠️',
            onPress: () => {
              closeMenu();
              onNewDamage?.();
            },
          },
          {
            id: 'quick-photo',
            label: 'Γρήγορη Φωτογραφία',
            icon: '📷',
            onPress: () => {
              closeMenu();
              onQuickPhoto?.();
            },
          },
        {
          id: 'damage-template',
          label: 'Πρότυπο Ζημιάς',
          icon: '📝',
          onPress: () => {
            closeMenu();
            onDamageTemplate?.();
          },
        },
        ];

      case '/cars':
        return [
          {
            id: 'new-car',
            label: 'Νέο Οχημα',
            icon: '🚗',
            onPress: () => {
              closeMenu();
              onNewCar?.();
            },
          },
          {
            id: 'car-maintenance',
            label: 'Συντήρηση',
            icon: '🔧',
            onPress: () => {
              closeMenu();
              onCarMaintenance?.();
            },
          },
          {
            id: 'car-inspection',
            label: 'Επιθεώρηση',
            icon: '🔍',
            onPress: () => {
              closeMenu();
              onCarInspection?.();
            },
          },
        ];

      case '/analytics':
        return [
          {
            id: 'generate-report',
            label: 'Αναφορά',
            icon: '📊',
            onPress: () => {
              closeMenu();
              onGenerateReport?.();
            },
          },
          {
            id: 'export-data',
            label: 'Εξαγωγή',
            icon: '📤',
            onPress: () => {
              closeMenu();
              onExportData?.();
            },
          },
          {
            id: 'schedule-report',
            label: 'Προγραμματισμός',
            icon: '⏰',
            onPress: () => {
              closeMenu();
              onScheduleReport?.();
            },
          },
        ];

      case '/profile':
        return [
          {
            id: 'edit-profile',
            label: 'Επεξεργασία',
            icon: '✏️',
            onPress: () => {
              closeMenu();
              // TODO: Implement profile edit
            },
          },
          {
            id: 'settings',
            label: 'Ρυθμίσεις',
            icon: '⚙️',
            onPress: () => {
              closeMenu();
              // TODO: Navigate to settings
            },
          },
          {
            id: 'backup-data',
            label: 'Αντίγραφο',
            icon: '💾',
            onPress: () => {
              closeMenu();
              // TODO: Implement data backup
            },
          },
        ];

      default:
        return [
          {
            id: 'new-contract',
            label: 'Νέο Συμβόλαιο',
            icon: '📋',
            onPress: () => {
              closeMenu();
              onNewContract?.();
            },
          },
        ];
    }
  }

  function toggleExpanded() {
    const newExpanded = !isExpanded;
    console.log('🔄 FAB toggleExpanded:', { isExpanded, newExpanded });
    
    // Stop any running animations first
    fadeAnim.stopAnimation();
    scaleAnim.stopAnimation();
    rotateAnim.stopAnimation();
    
    setIsExpanded(newExpanded);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('🔄 FAB animation completed, rotateAnim value:', rotateAnim._value);
    });
  }

  function closeMenu() {
    console.log('🔄 FAB closeMenu called, isExpanded:', isExpanded);
    
    // Stop any running animations first
    fadeAnim.stopAnimation();
    scaleAnim.stopAnimation();
    rotateAnim.stopAnimation();
    
    // Reset rotation to 0 immediately
    rotateAnim.setValue(0);
    console.log('🔄 FAB rotateAnim reset to 0, current value:', rotateAnim._value);
    
    // Always run the close animation, regardless of state
    setIsExpanded(false);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Don't animate rotation since we set it directly
    ]).start(() => {
      console.log('🔄 FAB closeMenu animation completed, rotateAnim value:', rotateAnim._value);
    });
  }

  const actions = getActionsForCurrentPage();

  return (
    <View style={styles.container}>
      {/* Actions Modal */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <Animated.View
                key={action.id}
                style={[
                  styles.actionItem,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        scale: scaleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                      {
                        translateY: scaleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.actionButton, Glass.regular]}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Main FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <Animated.View
          style={{
            transform: [
              { scale: pulseAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <FleetOSIcon variant="icon" size={28} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16, // The tab bar now occupies its own layout space below the content.
    right: 16,
    zIndex: 9999, // Above navbar (navbar is z-index: 10)
    elevation: 9999, // For Android
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Shadows.lg,
  },
  fabIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 120, // Space above bottom tab bar
  },
  actionsContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionItem: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    minWidth: 160,
    ...Shadows.md,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionLabel: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
});
