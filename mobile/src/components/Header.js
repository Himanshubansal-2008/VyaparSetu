import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import SearchBar from './SearchBar';
import { useCart } from '../context/CartContext';

export default function Header({
  searchQuery = '',
  onSearchChange,
  onClearSearch,
  onSubmitSearch,
  onNotificationPress,
  onCartPress,
  onSettingsPress,
  onLogoutPress,
  onOrdersPress,
  unreadNotifications = 2,
  cartItemCount: propCartItemCount,
  showBack = false,
  onBackPress,
  children,
}) {
  const cart = useCart();
  const cartItemCount =
    propCartItemCount !== undefined
      ? propCartItemCount
      : (cart?.cartItemCount ?? 0);
  return (
    <View style={styles.container}>
      {/* Top Branding & Action Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackPress}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          )}
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons
              name="handshake"
              size={24}
              color={colors.surface}
            />
          </View>
          <View style={styles.titleWrapper}>
            <View style={styles.titleRow}>
              <Text style={styles.titlePrimary}>Vyapar</Text>
              <Text style={styles.titleAccent}>Setu</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.statusDot} />
              <Text style={styles.subtitle}>B2B Wholesale & Trade</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {onOrdersPress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onOrdersPress}
              activeOpacity={0.7}
              accessibilityLabel="My Orders"
            >
              <Ionicons
                name="receipt-outline"
                size={21}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.textPrimary}
            />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {onLogoutPress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onLogoutPress}
              activeOpacity={0.7}
              accessibilityLabel="Logout"
              accessibilityRole="button"
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color={colors.error}
              />
            </TouchableOpacity>
          )}

          {onSettingsPress ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSettingsPress}
              activeOpacity={0.7}
              accessibilityLabel="Settings"
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onCartPress}
              activeOpacity={0.7}
              accessibilityLabel="Shopping Cart"
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color={colors.textPrimary}
              />
              {cartItemCount > 0 && (
                <View style={[styles.notificationBadge, styles.cartBadge]}>
                  <Text style={styles.badgeText}>
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content positioned directly below header top row and above search bar */}
      {children}

      {/* Search Bar Section */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          onClear={onClearSearch}
          onSubmitEditing={onSubmitSearch}
          placeholder="Search products (e.g., Cotton Bags, Bluetooth, Pottery...)"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titlePrimary: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 5,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: colors.error,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  cartBadge: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: '700',
  },
  searchSection: {
    marginTop: spacing.xs,
  },
});
