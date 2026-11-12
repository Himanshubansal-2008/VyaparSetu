import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useCart } from '../context/CartContext';

export default function CartScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToProductDetails,
  onNavigateToHome,
}) {
  const { cartItems, cartItemCount } = useCart();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  const handleProductPress = (item) => {
    const product = item?.product || item;
    if (onNavigateToProductDetails) {
      onNavigateToProductDetails(product);
    } else if (navigation?.navigate) {
      navigation.navigate('ProductDetails', {
        productId: product.id,
        product,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* 1. Header Bar */}
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
          <Text style={styles.headerTitle}>Wholesale Cart</Text>
          {cartItemCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* 2. Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemsListContainer}>
          {cartItems.map((item, index) => {
            const product = item.product || {};
            return (
              <View key={`cart-item-${item.id || index}`} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.itemTopRow}
                  onPress={() => handleProductPress(item)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${product.name}`}
                >
                  <View style={styles.itemDetails}>
                    {product.categoryName && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {product.categoryName}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name || 'Wholesale Product'}
                    </Text>

                    {(product.sellerName || product.location) && (
                      <View style={styles.sellerRow}>
                        <Ionicons
                          name="storefront-outline"
                          size={13}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.sellerText} numberOfLines={1}>
                          {product.sellerName || 'Verified Seller'}
                          {product.location ? ` · ${product.location}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  headerBadge: {
    backgroundColor: colors.primaryLight + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  headerBadgeText: {
    fontSize: 12,
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
  itemsListContainer: {
    gap: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
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
  itemTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sellerText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
});
