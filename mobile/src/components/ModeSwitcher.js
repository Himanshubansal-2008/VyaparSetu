import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useMode, MODES } from '../context/ModeContext';

export default function ModeSwitcher({
  onRequireBusinessProfile,
  compact = false,
  style,
}) {
  const {
    mode,
    isSellerMode,
    isBuyerMode,
    canSwitchToSeller,
    switchToBuyer,
    switchToSeller,
  } = useMode();

  const handleBuyerPress = async () => {
    if (isBuyerMode) return;
    await switchToBuyer();
  };

  const handleSellerPress = async () => {
    if (isSellerMode) return;
    if (!canSwitchToSeller) {
      if (onRequireBusinessProfile) {
        onRequireBusinessProfile();
      }
      return;
    }
    await switchToSeller();
  };

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        style,
      ]}
      testID="mode-switcher"
    >
      {/* 1. Buyer Mode Tab */}
      <TouchableOpacity
        style={[
          styles.tab,
          compact && styles.tabCompact,
          isBuyerMode && styles.tabActive,
        ]}
        onPress={handleBuyerPress}
        activeOpacity={0.75}
        accessibilityRole="tab"
        accessibilityLabel="Buyer Mode"
        accessibilityState={{ selected: isBuyerMode }}
      >
        <Ionicons
          name={isBuyerMode ? 'cart' : 'cart-outline'}
          size={compact ? 15 : 17}
          color={isBuyerMode ? colors.primary : colors.textSecondary}
          style={styles.tabIcon}
        />
        <Text
          style={[
            styles.tabText,
            compact && styles.tabTextCompact,
            isBuyerMode && styles.tabTextActive,
          ]}
          numberOfLines={1}
        >
          Buyer Mode
        </Text>
        {isBuyerMode && (
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Seller Mode Tab */}
      <TouchableOpacity
        style={[
          styles.tab,
          compact && styles.tabCompact,
          isSellerMode && styles.tabActive,
        ]}
        onPress={handleSellerPress}
        activeOpacity={0.75}
        accessibilityRole="tab"
        accessibilityLabel={
          canSwitchToSeller
            ? 'Seller Mode'
            : 'Seller Mode (Business Profile Required)'
        }
        accessibilityState={{ selected: isSellerMode }}
      >
        <Ionicons
          name={isSellerMode ? 'storefront' : 'storefront-outline'}
          size={compact ? 15 : 17}
          color={isSellerMode ? colors.primary : colors.textSecondary}
          style={styles.tabIcon}
        />
        <Text
          style={[
            styles.tabText,
            compact && styles.tabTextCompact,
            isSellerMode && styles.tabTextActive,
          ]}
          numberOfLines={1}
        >
          Seller Mode
        </Text>
        {isSellerMode ? (
          <View style={styles.activeIndicator}>
            <View style={[styles.activeDot, styles.activeDotSeller]} />
          </View>
        ) : !canSwitchToSeller ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.xs,
  },
  containerCompact: {
    borderRadius: borderRadius.md,
    padding: 2,
    marginVertical: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  tabCompact: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: borderRadius.sm + 2,
  },
  tabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark || colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },
  tabTextCompact: {
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  activeIndicator: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  activeDotSeller: {
    backgroundColor: colors.success,
  },
  lockBadge: {
    marginLeft: 5,
    backgroundColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

