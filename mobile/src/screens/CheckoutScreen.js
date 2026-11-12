import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useCart } from '../context/CartContext';
import EmptyState from '../components/EmptyState';

export default function CheckoutScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToHome,
}) {
  const { cartItems, cartItemCount, totalUnits } = useCart();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Cart');
    }
  };

  const handleGoHome = () => {
    if (onNavigateToHome) {
      onNavigateToHome();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  const isEmpty = cartItems.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>Wholesale Checkout</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {isEmpty ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState
            icon="cart-outline"
            iconSize={64}
            iconColor={colors.primary}
            title="Your Cart is Empty"
            description="You have no items in your cart to checkout. Browse our wholesale catalog to discover great deals from verified suppliers."
            actionText="Browse Products"
            actionIcon="storefront-outline"
            onActionPress={handleGoHome}
            style={styles.emptyCard}
          />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Summary (Items List) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>
                  Order Items ({cartItemCount})
                </Text>
              </View>
              <Text style={styles.totalUnitsHeader}>
                {totalUnits} Total Units
              </Text>
            </View>

            <View style={styles.itemsList}>
              {cartItems.map((item, index) => {
                const product = item.product || {};
                const unitSingular = product.unit || 'unit';
                const imageUri =
                  product.image ||
                  (Array.isArray(product.images) && product.images[0]) ||
                  null;

                return (
                  <View
                    key={`checkout-item-${item.id || index}`}
                    style={[
                      styles.itemRow,
                      index > 0 && styles.itemRowBorder,
                    ]}
                  >
                    <View style={styles.itemImageContainer}>
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.itemImageFallback}>
                          <Ionicons
                            name="cube-outline"
                            size={22}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.itemDetails}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {product.name || 'Wholesale Product'}
                      </Text>
                      <Text style={styles.itemSeller} numberOfLines={1}>
                        By {product.sellerName || 'Verified Seller'}
                      </Text>

                      <View style={styles.itemPricingRow}>
                        <Text style={styles.itemQtyPrice}>
                          {item.quantity} {unitSingular}s × ₹{item.unitPrice}
                        </Text>
                        {item.activeTier && (
                          <View style={styles.tierPill}>
                            <Text style={styles.tierPillText}>Bulk Tier</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.itemTotalRight}>
                      <Text style={styles.itemTotal}>
                        ₹{item.itemTotal.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stepBadge: {
    backgroundColor: colors.primaryLight + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSpacer: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2.5,
    gap: spacing.md,
  },
  emptyContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm + 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  totalUnitsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemImageContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  itemSeller: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  itemQtyPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tierPill: {
    backgroundColor: colors.surplusLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surplus,
  },
  itemTotalRight: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
