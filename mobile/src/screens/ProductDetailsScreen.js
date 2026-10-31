import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { products } from '../data/products';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function ProductDetailsScreen({
  navigation,
  route,
  onBackPress,
  product: propProduct,
}) {
  const [imageError, setImageError] = useState(false);

  // Fallback to sample product from hardcoded data if dynamic navigation is not implemented yet
  const sampleProduct = products[0];
  const routeProduct = route?.params?.product;
  const routeProductId = route?.params?.productId || route?.params?.id;

  const product =
    propProduct ||
    routeProduct ||
    (routeProductId ? products.find((p) => p.id === routeProductId) : null) ||
    sampleProduct;

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const discountPercent =
    product.originalPrice && product.price && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100
        )
      : 0;

  const categoryName = product.categoryName || product.category || 'General';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* A. Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* Scrollable Content Container */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* B. Product Image / Placeholder Container */}
        <View style={styles.imageContainer}>
          {product.image && !imageError ? (
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
              accessibilityLabel={product.name}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={56}
                color={colors.textMuted}
              />
              <Text style={styles.imagePlaceholderText}>
                No image available
              </Text>
            </View>
          )}
        </View>

        {/* C & D. Basic Product Information & Layout */}
        <View style={styles.contentContainer}>
          {/* Main Info Card */}
          <View style={styles.infoCard}>
            {/* Category Name Tag */}
            <View style={styles.categoryBadge}>
              <Ionicons
                name="pricetag-outline"
                size={12}
                color={colors.primary}
                style={styles.categoryIcon}
              />
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>

            {/* Product Name */}
            <Text style={styles.productName}>{product.name}</Text>

            {/* Product Price Row */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.priceSymbol}>₹</Text>
                <Text style={styles.price}>{product.price ?? 0}</Text>
                {product.unit ? (
                  <Text style={styles.unit}>/{product.unit}</Text>
                ) : null}
                {product.originalPrice &&
                product.originalPrice > product.price ? (
                  <Text style={styles.originalPrice}>
                    ₹{product.originalPrice}
                  </Text>
                ) : null}
                {discountPercent > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {discountPercent}% OFF
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.priceSubtext}>Wholesale base price</Text>
            </View>
          </View>

          {/* Short Product Description Card */}
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Product Description</Text>
            <Text style={styles.descriptionText}>
              {product.description ||
                'No product description provided by seller.'}
            </Text>
          </View>

          {/*
            Layout ready for upcoming sections:
            - Bulk Pricing tiers
            - Minimum Order Quantity (MOQ) & Stock Availability
            - Seller & Business Information
          */}
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
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceSubtle,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  categoryIcon: {
    marginRight: 2,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.info,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  priceContainer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  priceSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  originalPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: spacing.xs,
  },
  discountBadge: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  priceSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});

