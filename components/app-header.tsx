import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/auth.service';
import { Colors, Typography, Spacing, Glass, BorderRadius, BlurIntensity } from '../utils/design-system';
import { FleetOSHeaderLogo } from './fleetos-logo';
import { useThemeColors } from '../contexts/theme-context';

interface AppHeaderProps {
  showBack?: boolean;
  title?: string;
  showActions?: boolean;
  onBackPress?: () => void;
}

interface UserInfo {
  name: string;
  email: string;
  avatarLetter: string;
}

export function AppHeader({ showBack = false, title, showActions = true, onBackPress }: AppHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: 'User',
    email: 'user@example.com',
    avatarLetter: 'U',
  });

  useEffect(() => {
    loadUserInfo();
  }, []);

  async function loadUserInfo() {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        const profile = await AuthService.getUserProfile(user.id);
        if (profile) {
          setUserInfo({
            name: profile.name || 'User',
            email: profile.email || user.email || 'user@example.com',
            avatarLetter: (profile.name || 'U').charAt(0).toUpperCase(),
          });
        } else {
          // If no profile but we have auth user, show auth user email
          setUserInfo({
            name: user.email?.split('@')[0] || 'User',
            email: user.email || 'user@example.com',
            avatarLetter: (user.email?.charAt(0) || 'U').toUpperCase(),
          });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  async function handleSignOut() {
    Alert.alert('Αποσύνδεση', 'Είστε σίγουροι;', [
      { text: 'Ακύρωση', style: 'cancel' },
      {
        text: 'Αποσύνδεση',
        style: 'destructive',
        onPress: async () => {
          await AuthService.signOut();
          setShowUserMenu(false);
          router.replace('/auth/sign-in');
        },
      },
    ]);
  }

  const menuItems = [
    { icon: 'person', label: 'Προφίλ', route: '/profile' },
    { icon: 'settings', label: 'Ρυθμίσεις', route: '/settings' },
    { icon: 'stats-chart', label: 'Αναλυτικά', route: '/analytics' },
    { icon: 'receipt', label: 'AADE', route: '/aade-settings' },
    { icon: 'people', label: 'Χρήστες', route: '/user-management' },
  ];

  return (
    <>
      <BlurView intensity={BlurIntensity.regular} tint="light" style={[styles.container, { backgroundColor: colors.glass }]}>
        <View style={styles.content}>
          {/* Left */}
          {showBack ? (
            <TouchableOpacity onPress={onBackPress || (() => router.back())} style={styles.iconButton} activeOpacity={0.6}>
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/')} style={styles.logoContainer} activeOpacity={0.6}>
              <FleetOSHeaderLogo size={160} />
            </TouchableOpacity>
          )}

          {/* Center */}
          {title && <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>}

          {/* Right */}
          {showActions && (
            <View style={styles.rightActions}>
              <TouchableOpacity onPress={() => router.push('/calendar')} style={styles.actionIcon} activeOpacity={0.6}>
                <Ionicons name="calendar-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.actionIcon} activeOpacity={0.6}>
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                {/* TODO: Add badge for unread notifications count */}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setShowUserMenu(true)} style={[styles.avatar, { backgroundColor: colors.primary }]} activeOpacity={0.6}>
                <Text style={[styles.avatarText, { color: colors.textInverse }]}>{userInfo.avatarLetter}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BlurView>

      {/* User Menu Modal */}
      <Modal visible={showUserMenu} transparent animationType="fade" onRequestClose={() => setShowUserMenu(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowUserMenu(false)}>
          <BlurView intensity={BlurIntensity.strong} tint="dark" style={styles.overlayBlur}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.menu}>
                {/* Header */}
                <View style={styles.menuHeader}>
                  <View style={styles.menuAvatar}>
                    <Text style={styles.menuAvatarText}>{userInfo.avatarLetter}</Text>
                  </View>
                  <View style={styles.menuUserInfo}>
                    <Text style={styles.menuUserName}>{userInfo.name}</Text>
                    <Text style={styles.menuUserEmail}>{userInfo.email}</Text>
                  </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuItems}>
                  {menuItems.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.menuItem, idx < menuItems.length - 1 && styles.menuItemBorder]}
                      onPress={() => {
                        setShowUserMenu(false);
                        router.push(item.route);
                      }}
                      activeOpacity={0.6}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={styles.menuItemIconContainer}>
                          <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
                        </View>
                        <Text style={styles.menuItemText}>{item.label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Colors.systemGray3} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.6}>
                  <Ionicons name="log-out" size={20} color={Colors.systemRed} />
                  <Text style={styles.signOutText}>Αποσύνδεση</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </BlurView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  logoContainer: {
    height: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.headline,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.subheadline,
    color: Colors.textInverse,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
  },
  overlayBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menu: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    overflow: 'hidden',
    ...Glass.thick,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(242, 242, 247, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  menuAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuAvatarText: {
    fontSize: 22,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: 2,
  },
  menuUserEmail: {
    ...Typography.footnote,
    color: Colors.textSecondary,
  },
  menuItems: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    ...Typography.body,
    color: Colors.text,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: Colors.systemRed + '10',
    gap: 8,
  },
  signOutText: {
    ...Typography.body,
    color: Colors.systemRed,
    fontWeight: '600',
  },
});
