import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useCart, getProductMoq } from '../context/CartContext';

export default function CartScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToProductDetails,
  onNavigateToHome,
}) {
  const { cartItems, cartItemCount, increaseQuantity, decreaseQuantity, removeFromCart, clearCart } = useCart();

  const handleClearCartPress = () => {
    Alert.alert(
      'Clear Wholesale Cart',
      'Are you sure you want to remove all wholesale items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearCart(),
        },
      ]
    );
  };

  const handleRemoveItem = (item) => {
    const productName = item.product?.name || 'this item';
    Alert.alert(
      'Remove Product',
      `Remove "${productName}" from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromCart(item.id),
        },
      ]
    );
  };

  const handleDecrement = (item) => {
    const moq = getProductMoq(item.product);
    const unit = item.product?.unit || 'units';
    if (item.quantity <= moq) {
      Alert.alert(
        'Minimum Order Quantity Reached',
        `The minimum wholesale order quantity for this item is ${moq} ${unit}. To remove it from your cart, tap the Remove button.`,
        [
          { text: 'Keep Item', style: 'cancel' },
          {
            text: 'Remove Item',
            style: 'destructive',
            onPress: () => removeFromCart(item.id),
          },
        ]
      );
      return;
    }
    decreaseQuantity(item.id);
  };

  const handleIncrement = (item) => {
    increaseQuantity(item.id);
  };

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

        {cartItemCount > 0 ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCartPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Clear cart"
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
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
            const moq = getProductMoq(product);
            const unitSingular = product.unit || 'unit';
            const isAtMoq = item.quantity <= moq;
            const imageUri =
              product.image ||
              (Array.isArray(product.images) && product.images[0]) ||
              null;

            return (
              <View key={`cart-item-${item.id || index}`} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.itemTopRow}
                  onPress={() => handleProductPress(item)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${product.name}`}
                >
                  <View style={styles.thumbnailContainer}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailFallback}>
                        <Ionicons
                          name="cube-outline"
                          size={28}
                          color={colors.textMuted}
                        />
                      </View>
                    )}
                  </View>

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

                {/* Pricing Breakdown Row */}
                <View style={styles.pricingRow}>
                  <View style={styles.unitPriceContainer}>
                    <Text style={styles.unitPriceLabel}>Unit Price:</Text>
                    <View style={styles.unitPriceValues}>
                      <Text style={styles.unitPriceCurrent}>
                        ₹{item.unitPrice.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.unitPriceUnit}>
                        /{unitSingular}
                      </Text>
                      {product.originalPrice && product.originalPrice > item.unitPrice && (
                        <Text style={styles.unitPriceOriginal}>
                          ₹{Number(product.originalPrice).toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Item Total */}
                  <View style={styles.itemTotalContainer}>
                    <Text style={styles.itemTotalLabel}>Item Total</Text>
                    <Text style={styles.itemTotalAmount}>
                      ₹{item.itemTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Controls Row: Stepper */}
                <View style={styles.controlsRow}>
                  <View style={styles.stepperWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.stepperBtn,
                        isAtMoq && styles.stepperBtnMoq,
                      ]}
                      onPress={() => handleDecrement(item)}
                      activeOpacity={0.7}
                      accessibilityLabel="Decrease quantity"
                    >
                      <Ionicons
                        name={isAtMoq ? 'alert-circle-outline' : 'remove'}
                        size={isAtMoq ? 16 : 18}
                        color={isAtMoq ? colors.warning : colors.primary}
                      />
                    </TouchableOpacity>

                    <View style={styles.quantityDisplay}>
                      <Text style={styles.quantityNumber}>
                        {item.quantity}
                      </Text>
                      <Text style={styles.quantityUnitLabel}>
                        {unitSingular}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleIncrement(item)}
                      activeOpacity={0.7}
                      accessibilityLabel="Increase quantity"
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(item)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${product.name} from cart`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={colors.error}
                    />
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  stepperBtnMoq: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '55',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
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
  thumbnailContainer: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    justifyContent: 'center',
    alignItems: 'center',
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
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  unitPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  unitPriceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unitPriceValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  unitPriceCurrent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  unitPriceUnit: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unitPriceOriginal: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  itemTotalContainer: {
    alignItems: 'flex-end',
  },
  itemTotalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  itemTotalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityDisplay: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  quantityNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  quantityUnitLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
});
