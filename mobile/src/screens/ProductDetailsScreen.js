import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import { getProductById } from '../services/productService';
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
  products: propProducts,
}) {
  const scrollViewRef = useRef(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const allProducts =
    propProducts !== undefined
      ? propProducts
      : route?.params?.products !== undefined
      ? route.params.products
      : [];

  const targetProductId =
    route?.params?.productId ||
    route?.params?.id ||
    route?.params?.product?.id ||
    propProduct?.id;

  // --- Real API Data Fetching ---
  const [apiProduct, setApiProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(
    Boolean(targetProductId) && !propProduct
  );
  const [error, setError] = useState(null);

  const fetchProductDetails = useCallback(async () => {
    // If a full product object was passed as direct prop (e.g. testing) without route ID, skip fetch
    if (propProduct && !route?.params?.productId && !route?.params?.id) {
      setIsLoading(false);
      return;
    }

    if (!targetProductId) {
      setIsLoading(false);
      // If product object is present in route params, we can use it
      if (route?.params?.product) {
        return;
      }
      setError('Product ID is required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getProductById(targetProductId);
      const data = response?.data || response;
      if (!data || !data.id) {
        setError('Product not found.');
        setApiProduct(null);
      } else {
        setApiProduct(data);
      }
    } catch (err) {
      console.error('[ProductDetailsScreen] Error fetching product details:', err);
      setError(err?.message || 'Failed to load product details.');
      setApiProduct(null);
    } finally {
      setIsLoading(false);
    }
  }, [targetProductId, propProduct, route?.params?.productId, route?.params?.id, route?.params?.product]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  // Retrieve active product dynamically: API data takes priority over mock fallbacks
  const product = useMemo(() => {
    if (apiProduct) {
      return apiProduct;
    }

    if (propProduct) {
      return propProduct;
    }

    if (targetProductId) {
      const found = allProducts.find(
        (p) => String(p.id) === String(targetProductId)
      );
      if (found) {
        return found;
      }
    }

    if (route?.params?.product && !isLoading && !error) {
      return route.params.product;
    }

    return null;
  }, [apiProduct, propProduct, targetProductId, allProducts, route?.params?.product, isLoading, error]);

  // Extract images array from product data (supporting images array, imageUrl, and image)
  const productImages = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images;
    }
    if (product?.imageUrl) {
      return [product.imageUrl];
    }
    if (product?.image) {
      return [product.image];
    }
    return [];
  }, [product]);

  // Reset selected image index, error state, and scroll position when the product changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setImageError(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
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

  const categoryName = useMemo(() => {
    if (typeof product?.category === 'object' && product?.category?.name) {
      return product.category.name;
    }
    return product?.categoryName || (typeof product?.category === 'string' ? product.category : 'General');
  }, [product?.category, product?.categoryName]);

  const categoryImageUrl = useMemo(() => {
    return typeof product?.category === 'object' && product?.category?.imageUrl
      ? product.category.imageUrl
      : null;
  }, [product?.category]);

  const sellerBusiness = useMemo(() => {
    if (product?.business && typeof product.business === 'object') {
      const b = product.business;
      const locationParts = [b.city, b.state].filter(Boolean);
      return {
        name: b.name || product?.sellerName || product?.businessName || null,
        description: b.description || null,
        city: b.city || null,
        state: b.state || null,
        location: locationParts.length > 0 ? locationParts.join(', ') : null,
      };
    }
    if (product?.sellerName || product?.businessName) {
      const locationParts = [product?.city, product?.state].filter(Boolean);
      return {
        name: product.sellerName || product.businessName,
        description: product?.sellerDescription || null,
        city: product?.city || null,
        state: product?.state || null,
        location: product?.location || (locationParts.length > 0 ? locationParts.join(', ') : null),
      };
    }
    return null;
  }, [
    product?.business,
    product?.sellerName,
    product?.businessName,
    product?.city,
    product?.state,
    product?.location,
    product?.sellerDescription,
  ]);

  const resolvedMoq = useMemo(() => {
    const raw =
      product?.minOrderQuantity !== undefined
        ? product.minOrderQuantity
        : product?.moq;
    if (raw !== undefined && raw !== null && !isNaN(raw) && Number(raw) > 0) {
      return Math.max(1, Math.floor(Number(raw)));
    }
    return 1;
  }, [product?.minOrderQuantity, product?.moq]);

  const rawMoqDisplay =
    product?.minOrderQuantity !== undefined
      ? product.minOrderQuantity
      : product?.moq;

  // Pluralized / readable unit label
  const unitPlural = useMemo(() => {
    if (!product?.unit) return 'units';
    const u = String(product.unit).trim().toLowerCase();
    if (u === 'piece' || u === 'pieces') return 'pieces';
    if (u === 'pair' || u === 'pairs') return 'pairs';
    if (u === 'pack' || u === 'packs') return 'packs';
    if (u === 'set' || u === 'sets') return 'sets';
    if (u === 'meter' || u === 'metre' || u === 'meters' || u === 'metres')
      return 'meters';
    if (u === 'box' || u === 'boxes') return 'boxes';
    if (u === 'kg' || u === 'kgs') return 'kg';
    return product.unit;
  }, [product?.unit]);

  // Singular unit label for price per unit display
  const unitSingular = useMemo(() => {
    if (!product?.unit) return 'unit';
    const u = String(product.unit).trim().toLowerCase();
    if (u === 'pieces') return 'piece';
    if (u === 'pairs') return 'pair';
    if (u === 'packs') return 'pack';
    if (u === 'sets') return 'set';
    if (u === 'meters' || u === 'metres') return 'meter';
    if (u === 'boxes') return 'box';
    if (u === 'kgs') return 'kg';
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
  const sellerNameValue = sellerBusiness?.name || product?.sellerName || null;
  const brandOrMaker =
    brandValue || manufacturerValue || sellerNameValue || null;
  const brandLabel = brandValue
    ? 'Brand'
    : manufacturerValue
    ? 'Manufacturer'
    : 'Seller / Business';

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
  // - Out of Stock: stock <= 0
  // - Below MOQ: 0 < stock < minQty
  // - Low Stock: 1 <= stock <= 20
  // - In Stock: stock > 20
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
    if (stockValue <= 0) {
      return {
        status: 'out-of-stock',
        label: 'Out of Stock',
        color: colors.error,
        bgColor: colors.errorLight,
        borderColor: colors.error,
        icon: 'close-circle',
      };
    }

    if (stockValue < resolvedMoq) {
      return {
        status: 'below-moq',
        label: 'Below MOQ',
        color: colors.warning,
        bgColor: colors.warningLight,
        borderColor: colors.warning,
        icon: 'alert-circle',
      };
    }
    if (stockValue <= 20) {
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
      status: 'in-stock',
      label: 'In Stock',
      color: colors.success,
      bgColor: colors.successLight,
      borderColor: colors.success,
      icon: 'checkmark-circle',
    };
  }, [stockValue, resolvedMoq]);

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
    if (rawMoqDisplay !== undefined && rawMoqDisplay !== null) {
      details.push({
        label: 'Min. Order Qty (MOQ)',
        value: `${rawMoqDisplay} ${unitPlural}`,
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
    } else if (sellerBusiness?.name) {
      details.push({ label: 'Seller / Business', value: sellerBusiness.name });
    }

    return details;
  }, [
    product?.id,
    product?.unit,
    categoryName,
    rawMoqDisplay,
    unitPlural,
    stockValue,
    stockStatus,
    brandValue,
    manufacturerValue,
    sellerBusiness?.name,
  ]);

  // Extract and validate bulk pricing tiers from product data (sorted ascending by minQuantity)
  const bulkTiers = useMemo(() => {
    if (!Array.isArray(product?.bulkPricing) || product.bulkPricing.length === 0) {
      return [];
    }
    return product.bulkPricing
      .filter(
        (tier) =>
          tier &&
          tier.minQuantity !== undefined &&
          tier.minQuantity !== null &&
          tier.pricePerUnit !== undefined &&
          tier.pricePerUnit !== null
      )
      .sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity));
  }, [product?.bulkPricing]);

  // Minimum Order Quantity bound (defaults to 1 if missing, invalid, or non-positive)
  const minQty = resolvedMoq;

  // Maximum quantity bound (based on available stock)
  const maxQty = useMemo(() => {
    if (stockValue !== null && !isNaN(stockValue)) {
      return Math.max(0, Math.floor(Number(stockValue)));
    }
    return Infinity;
  }, [stockValue]);

  const isOutOfStock =
    stockValue !== null && !isNaN(stockValue) && stockValue <= 0;

  // Check if stock is greater than 0 but strictly lower than the minimum order quantity
  const isStockBelowMoq = useMemo(() => {
    return (
      stockValue !== null &&
      !isNaN(stockValue) &&
      stockValue > 0 &&
      stockValue < minQty
    );
  }, [stockValue, minQty]);

  // Initial quantity: 0 if out of stock or stock is below MOQ, otherwise MOQ
  const defaultQuantity = useMemo(() => {
    if (isOutOfStock || isStockBelowMoq) return 0;
    return minQty;
  }, [isOutOfStock, isStockBelowMoq, minQty]);

  const [quantity, setQuantity] = useState(defaultQuantity);
  const [quantityInputText, setQuantityInputText] = useState(
    String(defaultQuantity)
  );
  const [inputError, setInputError] = useState(null);

  // Sync state whenever selected product or default quantity changes
  useEffect(() => {
    setQuantity(defaultQuantity);
    setQuantityInputText(String(defaultQuantity));
    setInputError(null);
  }, [product?.id, defaultQuantity]);

  // Check if current quantity and input state represent a valid purchasable quantity
  const isValidQuantity = useMemo(() => {
    if (isOutOfStock || isStockBelowMoq) return false;
    if (inputError) return false;
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0)
      return false;
    if (quantity < minQty || quantity > maxQty) return false;
    return true;
  }, [isOutOfStock, isStockBelowMoq, inputError, quantity, minQty, maxQty]);

  // Identify applicable pricing tier based on entered quantity
  const activeTierIndex = useMemo(() => {
    if (!bulkTiers || bulkTiers.length === 0 || !isValidQuantity) return -1;
    return bulkTiers.findIndex((tier) => {
      const min =
        tier.minQuantity !== undefined && tier.minQuantity !== null
          ? Number(tier.minQuantity)
          : 0;
      const minMatch = quantity >= min;
      const maxMatch =
        tier.maxQuantity === null || tier.maxQuantity === undefined
          ? true
          : quantity <= Number(tier.maxQuantity);
      return minMatch && maxMatch;
    });
  }, [bulkTiers, quantity, isValidQuantity]);

  const activeTier = activeTierIndex >= 0 ? bulkTiers[activeTierIndex] : null;

  // Calculate applicable per-unit price:
  // - If quantity qualifies for a bulk tier, use the tier's pricePerUnit.
  // - If it does not qualify or no bulk pricing exists, use regular product price.
  const applicableUnitPrice = useMemo(() => {
    if (
      activeTier &&
      activeTier.pricePerUnit !== undefined &&
      activeTier.pricePerUnit !== null
    ) {
      return Number(activeTier.pricePerUnit);
    }
    return product?.price !== undefined && product?.price !== null
      ? Number(product.price)
      : 0;
  }, [activeTier, product?.price]);

  const formattedApplicableUnitPrice = useMemo(() => {
    return applicableUnitPrice.toLocaleString('en-IN');
  }, [applicableUnitPrice]);

  // Estimated total: Quantity × Applicable Unit Price (only for valid quantities)
  const estimatedTotal = useMemo(() => {
    if (!isValidQuantity || quantity <= 0) return 0;
    return quantity * applicableUnitPrice;
  }, [isValidQuantity, quantity, applicableUnitPrice]);

  const formattedEstimatedTotal = useMemo(() => {
    return estimatedTotal > 0 ? estimatedTotal.toLocaleString('en-IN') : '0';
  }, [estimatedTotal]);

  // Savings: (Regular Price - Applicable Unit Price) × Selected Quantity
  const savings = useMemo(() => {
    if (!isValidQuantity || quantity <= 0 || !product?.price) {
      return { amount: 0, formattedAmount: '0', percent: 0, hasSavings: false };
    }
    const regularPrice = Number(product.price);
    const unitSavings = regularPrice - applicableUnitPrice;
    const amount = unitSavings * quantity;
    if (amount > 0) {
      const regularTotal = regularPrice * quantity;
      const percent =
        regularTotal > 0 ? Math.round((amount / regularTotal) * 100) : 0;
      return {
        amount,
        formattedAmount: amount.toLocaleString('en-IN'),
        percent,
        hasSavings: true,
      };
    }
    return { amount: 0, formattedAmount: '0', percent: 0, hasSavings: false };
  }, [isValidQuantity, quantity, product?.price, applicableUnitPrice]);

  const handleIncrement = () => {
    if (isOutOfStock || isStockBelowMoq) return;
    setInputError(null);
    setQuantity((prev) => {
      const current = prev < minQty ? minQty : prev;
      if (current >= maxQty) {
        setInputError(
          `Cannot exceed available stock of ${maxQty.toLocaleString('en-IN')} ${unitPlural}`
        );
        return current;
      }
      const next = current + 1;
      setQuantityInputText(String(next));
      return next;
    });
  };

  const handleDecrement = () => {
    if (isOutOfStock || isStockBelowMoq) return;
    setInputError(null);
    setQuantity((prev) => {
      if (prev <= minQty) {
        setInputError(`Minimum order quantity is ${minQty} ${unitPlural}`);
        setQuantityInputText(String(minQty));
        return minQty;
      }
      const next = prev - 1;
      setQuantityInputText(String(next));
      return next;
    });
  };

  const handleQuantityInputChange = (text) => {
    if (isOutOfStock || isStockBelowMoq) return;

    if (text === '') {
      setQuantityInputText('');
      setInputError(`Minimum order quantity is ${minQty} ${unitPlural}`);
      setQuantity(0);
      return;
    }

    // Check if input contains non-digit characters (decimals, negatives, symbols, letters)
    const hasNonDigits = /[^0-9]/.test(text);
    if (hasNonDigits) {
      setQuantityInputText(text);
      setInputError('Please enter a valid positive whole number');
      const parsedFloat = parseFloat(text);
      const val = !isNaN(parsedFloat)
        ? Math.floor(parsedFloat)
        : parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(val) && val > 0) {
        setQuantity(Math.min(Math.max(val, minQty), maxQty));
      } else {
        setQuantity(minQty);
      }
      return;
    }

    setQuantityInputText(text);
    const val = parseInt(text, 10);
    if (isNaN(val) || val <= 0) {
      setInputError(`Minimum order quantity is ${minQty} ${unitPlural}`);
      setQuantity(0);
      return;
    }

    if (val < minQty) {
      setInputError(`Minimum order quantity is ${minQty} ${unitPlural}`);
      setQuantity(val);
    } else if (val > maxQty) {
      setInputError(
        `Cannot exceed available stock of ${maxQty.toLocaleString('en-IN')} ${unitPlural}`
      );
      setQuantity(maxQty);
    } else {
      setInputError(null);
      setQuantity(val);
    }
  };

  const handleQuantityInputBlur = () => {
    if (isOutOfStock || isStockBelowMoq) return;
    if (quantityInputText === '') {
      setQuantity(minQty);
      setQuantityInputText(String(minQty));
      setInputError(null);
      return;
    }

    const val = parseInt(quantityInputText, 10);
    if (isNaN(val) || val < minQty) {
      setQuantity(minQty);
      setQuantityInputText(String(minQty));
      setInputError(null);
    } else if (val > maxQty) {
      setQuantity(maxQty);
      setQuantityInputText(String(maxQty));
      setInputError(null);
    } else {
      setQuantity(val);
      setQuantityInputText(String(val));
      setInputError(null);
    }
  };

  const handleSelectTier = (tierMin) => {
    if (isOutOfStock || isStockBelowMoq) return;
    if (tierMin > maxQty) {
      setInputError(
        `Tier requires at least ${tierMin} ${unitPlural}, but only ${maxQty.toLocaleString('en-IN')} available in stock`
      );
      setQuantity(maxQty);
      setQuantityInputText(String(maxQty));
      return;
    }
    const targetQty = Math.max(tierMin, minQty);
    setQuantity(targetQty);
    setQuantityInputText(String(targetQty));
    setInputError(null);
  };

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

  // Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <View style={styles.centerContainer} testID="product-details-loading">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error State with Retry
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <View style={styles.centerContainer} testID="product-details-error">
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error || '#EF4444'}
          />
          <Text style={styles.errorTitle}>Failed to load product</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchProductDetails}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Retry loading product details"
          >
            <Ionicons
              name="refresh"
              size={15}
              color={colors.textInverse}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

        {/* A. Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        {/* Empty / Not Found State */}
        <EmptyState
          icon="alert-circle-outline"
          iconSize={48}
          title="Product not found"
          description="The selected product could not be found or may no longer be available."
          actionText="Go Back"
          actionIcon="arrow-back"
          onActionPress={handleBack}
          style={styles.notFoundContainer}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* A. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* Scrollable Content Container */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
                {categoryImageUrl ? (
                  <Image
                    source={{ uri: categoryImageUrl }}
                    style={styles.categoryBadgeImage}
                  />
                ) : (
                  <Ionicons
                    name="pricetag-outline"
                    size={12}
                    color={colors.info}
                    style={styles.categoryIcon}
                  />
                )}
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
                  const isActive = index === activeTierIndex;

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
                    <TouchableOpacity
                      key={`bulk-tier-${index}`}
                      style={[
                        styles.bulkTableRow,
                        isAlt && styles.bulkTableRowAlt,
                        isLast && styles.bulkTableRowLast,
                        isActive && styles.bulkTableRowActive,
                      ]}
                      onPress={() => handleSelectTier(tier.minQuantity)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Select tier ${quantityLabel} at ₹${formattedTierPrice} per ${product?.unit || 'unit'}${isActive ? ', currently active' : ''}`}
                    >
                      <View style={styles.bulkColLeft}>
                        <View
                          style={[
                            styles.qtyBadge,
                            isActive && styles.qtyBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.qtyText,
                              isActive && styles.qtyTextActive,
                            ]}
                          >
                            {quantityLabel}
                            <Text
                              style={[
                                styles.qtyUnit,
                                isActive && styles.qtyUnitActive,
                              ]}
                            >
                              {unitText}
                            </Text>
                          </Text>
                        </View>
                        {isActive && (
                          <View style={styles.activeTierBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color={colors.primary}
                            />
                            <Text style={styles.activeTierText}>Current Tier</Text>
                          </View>
                        )}
                        {!isActive && isBestTier && savingsPercent > 0 && (
                          <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>
                              Best Value · Save {savingsPercent}%
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.bulkColRight}>
                        <View style={styles.bulkPriceRow}>
                          <Text
                            style={[
                              styles.bulkPriceSymbol,
                              isActive && styles.bulkPriceSymbolActive,
                            ]}
                          >
                            ₹
                          </Text>
                          <Text
                            style={[
                              styles.bulkPriceValue,
                              isActive && styles.bulkPriceValueActive,
                            ]}
                          >
                            {formattedTierPrice}
                          </Text>
                          {product?.unit && (
                            <Text
                              style={[
                                styles.bulkPriceUnit,
                                isActive && styles.bulkPriceUnitActive,
                              ]}
                            >
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
                    </TouchableOpacity>
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

          {/* Select Quantity & Estimated Price Section */}
          <View style={styles.quantityCard}>
            <View style={styles.quantityHeaderRow}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons
                  name="calculator-outline"
                  size={18}
                  color={colors.primary}
                  style={styles.sectionHeaderIcon}
                />
                <Text style={styles.sectionTitle}>Select Quantity</Text>
              </View>
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>
                  Per {unitSingular}
                </Text>
              </View>
            </View>

            {isOutOfStock ? (
              <View style={styles.outOfStockBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.error}
                />
                <View style={styles.outOfStockTextWrapper}>
                  <Text style={styles.outOfStockTitle}>Out of Stock</Text>
                  <Text style={styles.outOfStockSubtext}>
                    This item is currently out of stock. Quantity selection is disabled.
                  </Text>
                </View>
              </View>
            ) : isStockBelowMoq ? (
              <View style={styles.stockBelowMoqBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.warning}
                />
                <View style={styles.stockBelowMoqTextWrapper}>
                  <Text style={styles.stockBelowMoqTitle}>
                    Stock Below Minimum Order Quantity
                  </Text>
                  <Text style={styles.stockBelowMoqSubtext}>
                    Available stock ({stockValue.toLocaleString('en-IN')} {unitPlural}) is lower than the minimum order quantity ({minQty} {unitPlural}). Quantity selection is unavailable until restocked.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.quantityControlsWrapper}>
                {/* Stepper & Input Row */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={[
                      styles.stepperButton,
                      (isOutOfStock || quantity <= minQty) && styles.stepperButtonDisabled,
                    ]}
                    onPress={handleDecrement}
                    disabled={isOutOfStock || quantity <= minQty}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                    accessibilityState={{ disabled: isOutOfStock || quantity <= minQty }}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={
                        isOutOfStock || quantity <= minQty
                          ? colors.textMuted
                          : colors.primary
                      }
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.inputWrapper,
                      inputError && styles.inputWrapperError,
                    ]}
                  >
                    <TextInput
                      style={styles.quantityInput}
                      value={quantityInputText}
                      onChangeText={handleQuantityInputChange}
                      onBlur={handleQuantityInputBlur}
                      onSubmitEditing={handleQuantityInputBlur}
                      returnKeyType="done"
                      keyboardType="number-pad"
                      selectTextOnFocus
                      accessibilityRole="spinbutton"
                      accessibilityLabel="Order quantity"
                      accessibilityValue={{ min: minQty, max: maxQty, now: quantity }}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.stepperButton,
                      (isOutOfStock || quantity >= maxQty) && styles.stepperButtonDisabled,
                    ]}
                    onPress={handleIncrement}
                    disabled={isOutOfStock || quantity >= maxQty}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                    accessibilityState={{ disabled: isOutOfStock || quantity >= maxQty }}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={
                        isOutOfStock || quantity >= maxQty
                          ? colors.textMuted
                          : colors.primary
                      }
                    />
                  </TouchableOpacity>

                  <View style={styles.unitLabelBox}>
                    <Text style={styles.unitLabelText}>{unitPlural}</Text>
                  </View>
                </View>

                {/* Validation message if input is invalid / out of bounds */}
                {inputError && (
                  <View style={styles.validationRow}>
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={colors.warning}
                    />
                    <Text style={styles.validationText}>{inputError}</Text>
                  </View>
                )}

                {/* Constraints limits helper row */}
                <View style={styles.limitsRow}>
                  <Text style={styles.limitText}>
                    MOQ: <Text style={styles.limitBold}>{minQty} {unitPlural}</Text>
                  </Text>
                  <Text style={styles.limitDot}>·</Text>
                  <Text style={styles.limitText}>
                    Available Stock:{' '}
                    <Text style={styles.limitBold}>
                      {stockValue !== null && !isNaN(stockValue)
                        ? `${stockValue.toLocaleString('en-IN')} ${unitPlural}`
                        : 'Available'}
                    </Text>
                  </Text>
                </View>

                {/* Price Calculation Summary Container */}
                <View style={styles.calculationContainer}>
                  {/* Applicable Unit Price Row */}
                  <View style={styles.calculationRow}>
                    <View>
                      <Text style={styles.calcLabel}>Applicable Unit Price</Text>
                      <Text style={styles.calcTierApplied}>
                        {activeTier
                          ? `Tier ${activeTierIndex + 1} Applied (${activeTier.maxQuantity !== null && activeTier.maxQuantity !== undefined ? `${activeTier.minQuantity}–${activeTier.maxQuantity}` : `${activeTier.minQuantity}+`} ${unitPlural})`
                          : 'Standard Wholesale Price'}
                      </Text>
                    </View>
                    <View style={styles.calcPriceRow}>
                      <Text style={styles.calcCurrency}>₹</Text>
                      <Text style={styles.calcUnitPriceValue}>
                        {formattedApplicableUnitPrice}
                      </Text>
                      {product?.unit && (
                        <Text style={styles.calcUnit}>/{product.unit}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.calcDivider} />

                  {/* Estimated Total Price Row */}
                  <View style={styles.calculationRow}>
                    <View style={styles.calcFormulaWrapper}>
                      <Text style={styles.calcTotalLabel}>Estimated Total</Text>
                      <Text
                        style={[
                          styles.calcTotalFormula,
                          !isValidQuantity && inputError && styles.calcTotalFormulaError,
                        ]}
                      >
                        {isValidQuantity
                          ? `${quantity} ${unitPlural} × ₹${formattedApplicableUnitPrice}`
                          : inputError || `Enter a valid quantity (min. ${minQty} ${unitPlural})`}
                      </Text>
                    </View>
                    <View style={styles.calcPriceRow}>
                      {isValidQuantity ? (
                        <>
                          <Text style={styles.calcTotalCurrency}>₹</Text>
                          <Text style={styles.calcTotalValue}>
                            {formattedEstimatedTotal}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.calcTotalPlaceholder}>—</Text>
                      )}
                    </View>
                  </View>

                  {/* Savings Callout (if bulk tier gives savings) */}
                  {savings.hasSavings && (
                    <View style={styles.savingsCallout}>
                      <Ionicons
                        name="pricetag"
                        size={15}
                        color={colors.success}
                      />
                      <Text style={styles.savingsCalloutText}>
                        You save <Text style={styles.savingsCalloutBold}>₹{savings.formattedAmount}</Text> on this purchase ({savings.percent}% off)!
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
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

          {/* Seller & Business Information Section */}
          {sellerBusiness && (sellerBusiness.name || sellerBusiness.location || sellerBusiness.description) ? (
            <View style={styles.sellerCard} testID="product-seller-info">
              <View style={styles.sectionHeaderRow}>
                <Ionicons
                  name="storefront-outline"
                  size={18}
                  color={colors.primary}
                  style={styles.sectionHeaderIcon}
                />
                <Text style={styles.sectionTitle}>Seller Information</Text>
              </View>

              <View style={styles.sellerContent}>
                {sellerBusiness.name ? (
                  <View style={styles.sellerNameRow}>
                    <Text style={styles.sellerBusinessName}>
                      {sellerBusiness.name}
                    </Text>
                    <View style={styles.verifiedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={colors.success}
                      />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                ) : null}

                {sellerBusiness.description ? (
                  <Text style={styles.sellerDescription}>
                    {sellerBusiness.description}
                  </Text>
                ) : null}

                {sellerBusiness.location ? (
                  <View style={styles.sellerLocationRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.sellerLocationText}>
                      {sellerBusiness.location}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
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
        shadowOpacity: 0.04,
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
  backButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceSubtle,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl * 1.5,
  },
  galleryContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainImageContainer: {
    width: '100%',
    height: 320,
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
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  imageCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.3,
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
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailWrapperUnselected: {
    borderWidth: 1.5,
    borderColor: colors.border,
    opacity: 0.8,
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
        shadowRadius: 4,
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
        shadowOpacity: 0.04,
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
    gap: spacing.sm,
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
    fontSize: 11,
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
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 28,
    letterSpacing: -0.3,
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
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  priceSymbol: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  originalPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: spacing.xs,
  },
  discountBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2.5,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textInverse,
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
        shadowOpacity: 0.04,
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bulkHeaderColLeft: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulkHeaderColRight: {
    fontSize: 11.5,
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
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  bulkTableRowAlt: {
    backgroundColor: colors.surfaceSubtle + '60',
  },
  bulkTableRowLast: {
    borderBottomWidth: 0,
  },
  bulkTableRowActive: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
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
  qtyTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  qtyUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  qtyUnitActive: {
    color: colors.primary,
    fontWeight: '600',
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
  bulkPriceSymbolActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  bulkPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  bulkPriceValueActive: {
    color: colors.primary,
    fontSize: 17,
  },
  bulkPriceUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 1,
  },
  bulkPriceUnitActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  savingsSubtext: {
    fontSize: 10,
    fontWeight: '700',
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
  activeTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  activeTierText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
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
        shadowOpacity: 0.04,
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
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  moqUnitText: {
    fontSize: 15,
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
  quantityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  quantityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  unitBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  outOfStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: spacing.sm + 2,
  },
  outOfStockTextWrapper: {
    flex: 1,
  },
  outOfStockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 2,
  },
  outOfStockSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  stockBelowMoqBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.sm + 2,
  },
  stockBelowMoqTextWrapper: {
    flex: 1,
  },
  stockBelowMoqTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 2,
  },
  stockBelowMoqSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  quantityControlsWrapper: {
    gap: spacing.sm + 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.35,
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderDark,
  },
  inputWrapper: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  inputWrapperError: {
    borderColor: colors.warning,
  },
  quantityInput: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 0,
  },
  unitLabelBox: {
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 68,
  },
  unitLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
  },
  validationText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  limitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs + 2,
  },
  limitText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  limitBold: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  limitDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  calculationContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  calculationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calcTierApplied: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  calcPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calcCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calcUnitPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calcUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  calcDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm + 2,
  },
  calcFormulaWrapper: {
    flex: 1,
    marginRight: spacing.sm,
  },
  calcTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calcTotalFormula: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  calcTotalFormulaError: {
    color: colors.warning,
    fontWeight: '600',
  },
  calcTotalCurrency: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  calcTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  calcTotalPlaceholder: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMuted,
  },
  savingsCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  savingsCalloutText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
    lineHeight: 17,
  },
  savingsCalloutBold: {
    fontWeight: '800',
    color: '#065F46',
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
        shadowOpacity: 0.04,
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
        shadowOpacity: 0.04,
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
        shadowOpacity: 0.04,
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
    backgroundColor: colors.surfaceSubtle + '60',
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
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  notFoundIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  notFoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notFoundButtonIcon: {
    marginRight: spacing.xs + 2,
  },
  notFoundButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl * 2,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl * 2,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryBadgeImage: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginRight: 4,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sellerContent: {
    gap: spacing.sm,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sellerBusinessName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  sellerDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  sellerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sellerLocationText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
