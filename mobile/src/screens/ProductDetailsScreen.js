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
    product?.originalPrice &&
    product?.price &&
    product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100
        )
      : 0;

  const categoryName = product?.categoryName || product?.category || 'General';

  // Pluralized / readable unit label
  const unitPlural = useMemo(() => {
    if (!product?.unit) return 'units';
    const u = product.unit.toLowerCase();
    if (u === 'piece') return 'pieces';
    if (u === 'pair') return 'pairs';
    if (u === 'pack') return 'packs';
    if (u === 'set') return 'sets';
    if (u === 'meter') return 'meters';
    if (u === 'box') return 'boxes';
    if (u === 'kg') return 'kg';
    return product.unit;
  }, [product?.unit]);

  // Format price safely using Indian Rupee format
  const formattedPrice =
    product?.price !== undefined && product?.price !== null
      ? typeof product.price === 'number'
        ? product.price.toLocaleString('en-IN')
        : String(product.price)
      : '0';

  const formattedOriginalPrice =
    product?.originalPrice !== undefined && product?.originalPrice !== null
      ? typeof product.originalPrice === 'number'
        ? product.originalPrice.toLocaleString('en-IN')
        : String(product.originalPrice)
      : null;

  // Resolve brand or manufacturer label and value
  const brandValue = product?.brand || null;
  const manufacturerValue = product?.manufacturer || null;
  const brandOrMaker =
    brandValue || manufacturerValue || product?.sellerName || null;
  const brandLabel = brandValue
    ? 'Brand'
    : manufacturerValue
    ? 'Manufacturer'
    : 'Manufacturer / Seller';

  // Resolve stock quantity (using stock property or availableQuantity fallback)
  const stockValue = useMemo(() => {
    if (product?.stock !== undefined && product?.stock !== null) {
      return Number(product.stock);
    }
    if (
      product?.availableQuantity !== undefined &&
      product?.availableQuantity !== null
    ) {
      return Number(product.availableQuantity);
    }
    return null;
  }, [product?.stock, product?.availableQuantity]);

  // Calculate dynamic availability status:
  // - In Stock: stock > 20
  // - Low Stock: 1 <= stock <= 20
  // - Out of Stock: stock === 0
  const stockStatus = useMemo(() => {
    if (stockValue === null || isNaN(stockValue)) {
      return {
        status: 'unknown',
        label: 'Check Availability',
        color: colors.textSecondary,
        bgColor: colors.surfaceSubtle,
        borderColor: colors.border,
        icon: 'help-circle-outline',
      };
    }
    if (stockValue > 20) {
      return {
        status: 'in-stock',
        label: 'In Stock',
        color: colors.success,
        bgColor: colors.successLight,
        borderColor: colors.success,
        icon: 'checkmark-circle',
      };
    }
    if (stockValue >= 1 && stockValue <= 20) {
      return {
        status: 'low-stock',
        label: 'Low Stock',
        color: colors.warning,
        bgColor: colors.warningLight,
        borderColor: colors.warning,
        icon: 'alert-circle',
      };
    }
    return {
      status: 'out-of-stock',
      label: 'Out of Stock',
      color: colors.error,
      bgColor: colors.errorLight,
      borderColor: colors.error,
      icon: 'close-circle',
    };
  }, [stockValue]);

  // Build key details list dynamically from available basic product properties
  const keyDetails = useMemo(() => {
    const details = [];

    if (product?.id) {
      details.push({ label: 'Product ID', value: String(product.id) });
    }
    if (categoryName) {
      details.push({ label: 'Category', value: categoryName });
    }
    if (product?.unit) {
      details.push({ label: 'Sold By', value: `Per ${product.unit}` });
    }
    if (product?.moq !== undefined && product?.moq !== null) {
      details.push({
        label: 'Min. Order Qty (MOQ)',
        value: `${product.moq} ${unitPlural}`,
      });
    }
    if (stockValue !== null && !isNaN(stockValue)) {
      details.push({
        label: 'Stock Availability',
        value: `${stockStatus.label} (${stockValue.toLocaleString('en-IN')} ${unitPlural})`,
      });
    }
    if (brandValue) {
      details.push({ label: 'Brand', value: brandValue });
    }
    if (manufacturerValue) {
      details.push({ label: 'Manufacturer', value: manufacturerValue });
    } else if (product?.sellerName && !brandValue) {
      details.push({ label: 'Manufacturer / Seller', value: product.sellerName });
    }

    return details;
  }, [
    product,
    categoryName,
    brandValue,
    manufacturerValue,
    unitPlural,
    stockValue,
    stockStatus,
  ]);

  // Extract and validate bulk pricing tiers from product data
  const bulkTiers = useMemo(() => {
    if (!Array.isArray(product?.bulkPricing) || product.bulkPricing.length === 0) {
      return [];
    }
    return product.bulkPricing.filter(
      (tier) =>
        tier &&
        tier.minQuantity !== undefined &&
        tier.minQuantity !== null &&
        tier.pricePerUnit !== undefined &&
        tier.pricePerUnit !== null
    );
  }, [product]);

  // Dynamically extract specifications from product data
  const productSpecs = useMemo(() => {
    // 1. If product has explicit specifications object or array
    if (product?.specifications) {
      if (Array.isArray(product.specifications)) {
        return product.specifications
          .filter(
            (item) =>
              item &&
              item.label &&
              item.value !== null &&
              item.value !== undefined &&
              String(item.value).trim() !== ''
          )
          .map((item) => ({
            label: String(item.label),
            value: String(item.value),
          }));
      }
      if (typeof product.specifications === 'object') {
        return Object.entries(product.specifications)
          .filter(
            ([_, val]) =>
              val !== null &&
              val !== undefined &&
              String(val).trim() !== ''
          )
          .map(([key, val]) => ({
            label: key,
            value: String(val),
          }));
      }
    }

    // 2. Otherwise, dynamically extract from known candidate specification fields
    const candidateFields = [
      { key: 'material', label: 'Material' },
      { key: 'color', label: 'Color' },
      { key: 'size', label: 'Size' },
      { key: 'weight', label: 'Weight' },
      { key: 'dimensions', label: 'Dimensions' },
      { key: 'packagingType', label: 'Packaging Type' },
      { key: 'modelNumber', label: 'Model Number' },
      { key: 'countryOfOrigin', label: 'Country of Origin' },
      { key: 'brand', label: 'Brand' },
      { key: 'manufacturer', label: 'Manufacturer' },
    ];

    const extracted = [];
    candidateFields.forEach(({ key, label }) => {
      const val = product?.[key];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        extracted.push({ label, value: String(val) });
      }
    });

    return extracted;
  }, [product]);

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
                accessibilityLabel={`${product?.name || 'Product'} image ${
                  selectedImageIndex + 1
                }`}
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
                    key={`${product?.id || 'prod'}-thumb-${index}`}
                    uri={uri}
                    index={index}
                    isSelected={index === selectedImageIndex}
                    onPress={handleSelectImage}
                    productName={product?.name || 'Product'}
                    totalImages={productImages.length}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* C & D. Product Information, Bulk Pricing, MOQ, Stock, Description & Specifications */}
        <View style={styles.contentContainer}>
          {/* Main Info Card: Category, ID, Name, Brand, Price */}
          <View style={styles.infoCard}>
            {/* Badges: Category Name & Product ID */}
            <View style={styles.tagsRow}>
              <View style={styles.categoryBadge}>
                <Ionicons
                  name="pricetag-outline"
                  size={12}
                  color={colors.info}
                  style={styles.categoryIcon}
                />
                <Text style={styles.categoryText}>{categoryName}</Text>
              </View>

              {product?.id ? (
                <View style={styles.idBadge}>
                  <Ionicons
                    name="barcode-outline"
                    size={12}
                    color={colors.textSecondary}
                    style={styles.idIcon}
                  />
                  <Text style={styles.idText}>ID: {product.id}</Text>
                </View>
              ) : null}
            </View>

            {/* Product Name */}
            <Text style={styles.productName}>
              {product?.name || 'Unnamed Product'}
            </Text>

            {/* Brand or Manufacturer Row (if available) */}
            {brandOrMaker ? (
              <View style={styles.brandContainer}>
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.brandLabel}>{brandLabel}: </Text>
                <Text style={styles.brandValue}>{brandOrMaker}</Text>
              </View>
            ) : null}

            {/* Product Price Row */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.priceSymbol}>₹</Text>
                <Text style={styles.price}>{formattedPrice}</Text>
                {product?.unit ? (
                  <Text style={styles.unit}>/ {product.unit}</Text>
                ) : null}
                {formattedOriginalPrice &&
                product?.originalPrice > product?.price ? (
                  <Text style={styles.originalPrice}>
                    ₹{formattedOriginalPrice}
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
              <Text style={styles.priceSubtext}>
                Wholesale base price
                {product?.unit ? ` (per ${product.unit})` : ''}
              </Text>
            </View>
          </View>

          {/* Bulk Pricing Section */}
          <View style={styles.bulkPricingCard}>
            <View style={styles.bulkHeaderRow}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons
                  name="layers-outline"
                  size={18}
                  color={colors.primary}
                  style={styles.sectionHeaderIcon}
                />
                <Text style={styles.sectionTitle}>Bulk Pricing</Text>
              </View>
              {bulkTiers.length > 0 && (
                <View style={styles.helperBadge}>
                  <Ionicons name="sparkles" size={11} color={colors.accent} />
                  <Text style={styles.helperBadgeText}>Buy more, save more</Text>
                </View>
              )}
            </View>

            {bulkTiers.length > 0 ? (
              <View style={styles.bulkTable}>
                {/* Table Header */}
                <View style={styles.bulkTableHeader}>
                  <Text style={styles.bulkHeaderColLeft}>Quantity Range</Text>
                  <Text style={styles.bulkHeaderColRight}>Price per Unit</Text>
                </View>

                {/* Tier Rows */}
                {bulkTiers.map((tier, index) => {
                  const isLast = index === bulkTiers.length - 1;
                  const isAlt = index % 2 === 1;
                  const isBestTier = isLast && bulkTiers.length > 1;

                  // Format quantity range
                  let quantityLabel = '';
                  if (tier.maxQuantity !== null && tier.maxQuantity !== undefined) {
                    quantityLabel = `${tier.minQuantity} - ${tier.maxQuantity}`;
                  } else {
                    quantityLabel = `${tier.minQuantity}+`;
                  }

                  const unitText = product?.unit
                    ? ` ${product.unit}${tier.maxQuantity !== 1 ? 's' : ''}`
                    : ' units';
                  const formattedTierPrice =
                    typeof tier.pricePerUnit === 'number'
                      ? tier.pricePerUnit.toLocaleString('en-IN')
                      : String(tier.pricePerUnit);

                  // Savings compared to regular base price
                  const hasSavings =
                    product?.price && tier.pricePerUnit < product.price;
                  const savingsPercent = hasSavings
                    ? Math.round(
                        ((product.price - tier.pricePerUnit) / product.price) *
                          100
                      )
                    : 0;

                  return (
                    <View
                      key={`bulk-tier-${index}`}
                      style={[
                        styles.bulkTableRow,
                        isAlt && styles.bulkTableRowAlt,
                        isLast && styles.bulkTableRowLast,
                      ]}
                    >
                      <View style={styles.bulkColLeft}>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyText}>
                            {quantityLabel}
                            <Text style={styles.qtyUnit}>{unitText}</Text>
                          </Text>
                        </View>
                        {isBestTier && savingsPercent > 0 && (
                          <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>
                              Best Value · Save {savingsPercent}%
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.bulkColRight}>
                        <View style={styles.bulkPriceRow}>
                          <Text style={styles.bulkPriceSymbol}>₹</Text>
                          <Text style={styles.bulkPriceValue}>
                            {formattedTierPrice}
                          </Text>
                          {product?.unit && (
                            <Text style={styles.bulkPriceUnit}>
                              /{product.unit}
                            </Text>
                          )}
                        </View>
                        {savingsPercent > 0 && !isBestTier && (
                          <Text style={styles.savingsSubtext}>
                            Save {savingsPercent}%
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyBulkContainer}>
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.emptyBulkIcon}
                />
                <View style={styles.emptyBulkTextWrapper}>
                  <Text style={styles.emptyBulkTitle}>
                    Bulk pricing not available
                  </Text>
                  <Text style={styles.emptyBulkSubtext}>
                    This item is sold at the standard wholesale unit price.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Minimum Order Quantity (MOQ) Section */}
          <View style={styles.orderMetricCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="cart-outline"
                size={18}
                color={colors.primary}
                style={styles.sectionHeaderIcon}
              />
              <Text style={styles.sectionTitle}>Minimum Order Quantity</Text>
            </View>
            <View style={styles.metricContent}>
              {product?.moq !== undefined && product?.moq !== null ? (
                <View style={styles.moqValueRow}>
                  <Text style={styles.moqNumber}>{product.moq}</Text>
                  <Text style={styles.moqUnitText}>{unitPlural}</Text>
                </View>
              ) : (
                <Text style={styles.metricFallback}>
                  No minimum order required
                </Text>
              )}
              <Text style={styles.moqHelperText}>
                Minimum quantity required per order
              </Text>
            </View>
          </View>

          {/* Stock Availability Section */}
          <View style={styles.orderMetricCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="cube-outline"
                size={18}
                color={colors.primary}
                style={styles.sectionHeaderIcon}
              />
              <Text style={styles.sectionTitle}>Stock Availability</Text>
            </View>
            <View style={styles.metricContent}>
              {/* Dynamic Availability Status Badge */}
              <View style={styles.stockBadgeRow}>
                <View
                  style={[
                    styles.stockStatusBadge,
                    {
                      backgroundColor: stockStatus.bgColor,
                      borderColor: stockStatus.borderColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={stockStatus.icon}
                    size={14}
                    color={stockStatus.color}
                    style={styles.stockStatusIcon}
                  />
                  <Text
                    style={[
                      styles.stockStatusText,
                      { color: stockStatus.color },
                    ]}
                  >
                    {stockStatus.label}
                  </Text>
                </View>
              </View>

              {/* Stock Quantity Display */}
              {stockValue !== null && !isNaN(stockValue) ? (
                <Text style={styles.stockQuantityText}>
                  {stockValue > 0 ? (
                    <>
                      <Text style={styles.stockQuantityNumber}>
                        {stockValue.toLocaleString('en-IN')}
                      </Text>{' '}
                      {unitPlural} available in stock
                    </>
                  ) : (
                    '0 units available · Currently out of stock'
                  )}
                </Text>
              ) : (
                <Text style={styles.metricFallback}>
                  Stock quantity available upon inquiry
                </Text>
              )}
            </View>
          </View>

          {/* Product Overview / Key Information Card */}
          {keyDetails.length > 0 && (
            <View style={styles.overviewCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.primary}
                  style={styles.sectionHeaderIcon}
                />
                <Text style={styles.sectionTitle}>Product Information</Text>
              </View>
              <View style={styles.detailsGrid}>
                {keyDetails.map((item, index) => (
                  <View
                    key={`detail-${index}`}
                    style={[
                      styles.detailRow,
                      index === keyDetails.length - 1 && styles.detailRowLast,
                    ]}
                  >
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Product Description Section */}
          <View style={styles.descriptionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.primary}
                style={styles.sectionHeaderIcon}
              />
              <Text style={styles.sectionTitle}>Product Description</Text>
            </View>
            <Text style={styles.descriptionText}>
              {product?.description?.trim() ||
                'No product description provided by seller.'}
            </Text>
          </View>

          {/* Product Specifications Section */}
          {productSpecs.length > 0 && (
            <View style={styles.specificationsCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={colors.primary}
                  style={styles.sectionHeaderIcon}
                />
                <Text style={styles.sectionTitle}>Product Specifications</Text>
              </View>

              <View style={styles.specsTable}>
                {productSpecs.map((item, index) => {
                  const isLast = index === productSpecs.length - 1;
                  const isAlt = index % 2 === 1;
                  return (
                    <View
                      key={`spec-${item.label}-${index}`}
                      style={[
                        styles.specRow,
                        isAlt && styles.specRowAlt,
                        isLast && styles.specRowLast,
                      ]}
                    >
                      <Text style={styles.specLabel}>{item.label}</Text>
                      <Text style={styles.specValue}>{item.value}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/*
            Layout ready for upcoming sections:
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
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
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
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  idIcon: {
    marginRight: 2,
  },
  idText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  brandLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  brandValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
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
  bulkPricingCard: {
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
  bulkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  helperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  helperBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  bulkTable: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bulkTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bulkHeaderColLeft: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulkHeaderColRight: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulkTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bulkTableRowAlt: {
    backgroundColor: colors.surfaceSubtle,
  },
  bulkTableRowLast: {
    borderBottomWidth: 0,
  },
  bulkColLeft: {
    flex: 1.2,
  },
  qtyBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  qtyUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  bestValueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 3,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  bulkColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  bulkPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bulkPriceSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  bulkPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  bulkPriceUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 1,
  },
  savingsSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
  },
  emptyBulkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  emptyBulkIcon: {
    marginRight: spacing.xs,
  },
  emptyBulkTextWrapper: {
    flex: 1,
  },
  emptyBulkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyBulkSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderMetricCard: {
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
  metricContent: {
    marginTop: spacing.xs,
  },
  moqValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  moqNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  moqUnitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  moqHelperText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metricFallback: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  stockBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  stockStatusIcon: {
    marginRight: 2,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stockQuantityText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stockQuantityNumber: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overviewCard: {
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
  },
  sectionHeaderIcon: {
    marginRight: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailsGrid: {
    marginTop: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1.5,
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
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  specificationsCard: {
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
  specsTable: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specRowAlt: {
    backgroundColor: colors.surfaceSubtle,
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1.3,
    textAlign: 'right',
  },
});
