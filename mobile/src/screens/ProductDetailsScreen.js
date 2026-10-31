import React, { useState, useMemo, useEffect } from 'react';
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

function ThumbnailItem({
  uri,
  index,
  isSelected,
  onPress,
  productName,
  totalImages,
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.thumbnailWrapper,
        isSelected
          ? styles.thumbnailWrapperSelected
          : styles.thumbnailWrapperUnselected,
        pressed && styles.thumbnailWrapperPressed,
      ]}
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={`View ${productName} image ${index + 1} of ${totalImages}`}
      accessibilityState={{ selected: isSelected }}
    >
      {uri && !hasError ? (
        <Image
          source={{ uri }}
          style={styles.thumbnailImage}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={styles.thumbnailFallback}>
          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

export default function ProductDetailsScreen({
  navigation,
  route,
  onBackPress,
  product: propProduct,
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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

  // Extract images array from product data
  const productImages = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images;
    }
    if (product?.image) {
      return [product.image];
    }
    return [];
  }, [product]);

  // Reset selected image index and error state when the product changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setImageError(false);
  }, [product?.id]);

  const currentImage = productImages[selectedImageIndex] || null;

  const handleSelectImage = (index) => {
    if (index !== selectedImageIndex) {
      setSelectedImageIndex(index);
      setImageError(false);
    }
  };

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
        {/* B. Main Product Image & Gallery */}
        <View style={styles.galleryContainer}>
          {/* Main Image Container */}
          <View style={styles.mainImageContainer}>
            {currentImage && !imageError ? (
              <Image
                source={{ uri: currentImage }}
                style={styles.mainProductImage}
                resizeMode="contain"
                onError={() => setImageError(true)}
                accessibilityLabel={`${product.name} image ${selectedImageIndex + 1}`}
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

            {/* Image counter indicator when multiple images are available */}
            {productImages.length > 1 && !imageError && (
              <View style={styles.imageCounterBadge}>
                <Text style={styles.imageCounterText}>
                  {selectedImageIndex + 1}/{productImages.length}
                </Text>
              </View>
            )}
          </View>

          {/* Thumbnail Gallery Strip (rendered only when product has multiple images) */}
          {productImages.length > 1 && (
            <View style={styles.thumbnailsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsScrollContent}
              >
                {productImages.map((uri, index) => (
                  <ThumbnailItem
                    key={`${product.id}-thumb-${index}`}
                    uri={uri}
                    index={index}
                    isSelected={index === selectedImageIndex}
                    onPress={handleSelectImage}
                    productName={product.name}
                    totalImages={productImages.length}
                  />
                ))}
              </ScrollView>
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
  galleryContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mainProductImage: {
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
  imageCounterBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  imageCounterText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textInverse,
  },
  thumbnailsContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  thumbnailsScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm + 2,
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailWrapperUnselected: {
    borderWidth: 1.5,
    borderColor: colors.border,
    opacity: 0.7,
  },
  thumbnailWrapperSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  thumbnailWrapperPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
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
