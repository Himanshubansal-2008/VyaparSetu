import React, { useState, useMemo } from 'react';
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
  TouchableOpacity,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  categories,
  saveProduct,
  getProductById,
  deleteProduct,
  isProductActive,
} from '../data/products';
import {
  getSessionBusinessProfile,
  subscribeBusinessProfile,
  isProductOwnedByCurrentSeller,
} from '../data/businessProfileData';

// Extract product categories (excluding filter-only 'all')
const PRODUCT_CATEGORIES = categories
  .filter((cat) => cat.id !== 'all')
  .map((cat) => cat.name);

// Standard wholesale selling unit presets
const COMMON_UNITS = [
  'piece',
  'pair',
  'pack',
  'set',
  'box',
  'meter',
  'kg',
  'dozen',
];

export default function AddProductScreen({ navigation, route, onBackPress }) {
  const routeParams = route?.params || {};

  // Resolve initial product if editing
  const initialProduct = useMemo(() => {
    if (routeParams.product && typeof routeParams.product === 'object') {
      return routeParams.product;
    }
    if (routeParams.productId) {
      return getProductById(routeParams.productId);
    }
    return null;
  }, [routeParams.product, routeParams.productId]);

  const isEditMode = Boolean(
    routeParams.isEdit ||
    route?.name === 'EditProduct' ||
    Boolean(initialProduct)
  );

  // Initialize form state
  const [formData, setFormData] = useState(() => {
    const p = initialProduct;

    // Existing images
    let initialImages = [];
    if (Array.isArray(p?.images) && p.images.length > 0) {
      initialImages = [...p.images];
    } else if (p?.image) {
      initialImages = [p.image];
    }

    // Existing bulk pricing tiers
    let initialBulkTiers = [];
    if (Array.isArray(p?.bulkPricing) && p.bulkPricing.length > 0) {
      initialBulkTiers = p.bulkPricing.map((tier) => ({
        minQuantity:
          tier.minQuantity !== undefined && tier.minQuantity !== null
            ? String(tier.minQuantity)
            : '',
        maxQuantity:
          tier.maxQuantity !== undefined && tier.maxQuantity !== null
            ? String(tier.maxQuantity)
            : '',
        pricePerUnit:
          tier.pricePerUnit !== undefined && tier.pricePerUnit !== null
            ? String(tier.pricePerUnit)
            : '',
      }));
    }

    return {
      productName: p?.name || '',
      brand: p?.brand || '',
      manufacturer: p?.manufacturer || '',
      description: p?.description || '',
      category: p?.categoryName || p?.category || '',
      productImages: initialImages,
      price:
        p?.price !== undefined && p?.price !== null ? String(p.price) : '',
      originalPrice:
        p?.originalPrice !== undefined && p?.originalPrice !== null
          ? String(p.originalPrice)
          : '',
      unit: p?.unit || 'piece',
      moq: p?.moq !== undefined && p?.moq !== null ? String(p.moq) : '1',
      stock:
        p?.stock !== undefined && p?.stock !== null
          ? String(p.stock)
          : p?.availableQuantity !== undefined && p?.availableQuantity !== null
          ? String(p.availableQuantity)
          : '',
      bulkPricing: initialBulkTiers,
    };
  });

  const [errors, setErrors] = useState({});
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sessionProfile, setSessionProfile] = useState(getSessionBusinessProfile);

  useEffect(() => {
    setSessionProfile(getSessionBusinessProfile());
    return subscribeBusinessProfile((updated) => {
      setSessionProfile(updated);
    });
  }, []);

  const isOwner = useMemo(() => {
    return isProductOwnedByCurrentSeller(initialProduct, sessionProfile);
  }, [initialProduct, sessionProfile]);

  const productImages = Array.isArray(formData.productImages)
    ? formData.productImages
    : [];

  // Field change helper
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Image Selection: Multiple Gallery Images (Append unique)
  const handlePickImages = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Permission to access your photo gallery is required to select product images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newUris = result.assets
        .map((asset) => asset?.uri)
        .filter((uri) => typeof uri === 'string' && uri.trim().length > 0);

      if (newUris.length === 0) return;

      setFormData((prev) => {
        const existing = Array.isArray(prev.productImages)
          ? prev.productImages
          : [];
        const uniqueUris = newUris.filter((uri) => !existing.includes(uri));
        return {
          ...prev,
          productImages: [...existing, ...uniqueUris],
        };
      });
    } catch (error) {
      console.warn('[AddProductScreen] Image pick error:', error);
      Alert.alert(
        'Image Selection Error',
        'Could not select images from gallery. Please try again.'
      );
    }
  };

  // Image Removal
  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      productImages: (prev.productImages || []).filter(
        (_, index) => index !== indexToRemove
      ),
    }));
  };

  // Image Replacement (Single Image replacement at index)
  const handleReplaceImage = async (indexToReplace) => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Permission to access your photo gallery is required to replace product images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newUri = result.assets[0]?.uri;
      if (!newUri) return;

      setFormData((prev) => {
        const updated = [...(prev.productImages || [])];
        updated[indexToReplace] = newUri;
        return {
          ...prev,
          productImages: updated,
        };
      });
    } catch (error) {
      console.warn('[AddProductScreen] Image replace error:', error);
      Alert.alert(
        'Image Replace Error',
        'Could not replace the image. Please try again.'
      );
    }
  };

  // Bulk Pricing Tier Helpers
  const handleAddTier = () => {
    setFormData((prev) => ({
      ...prev,
      bulkPricing: [
        ...prev.bulkPricing,
        { minQuantity: '', maxQuantity: '', pricePerUnit: '' },
      ],
    }));
  };

  const handleRemoveTier = (index) => {
    setFormData((prev) => ({
      ...prev,
      bulkPricing: prev.bulkPricing.filter((_, i) => i !== index),
    }));
  };

  const handleTierChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.bulkPricing];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, bulkPricing: updated };
    });
  };

  // Live discount percentage calculation
  const discountPercent = useMemo(() => {
    const p = parseFloat(formData.price);
    const op = parseFloat(formData.originalPrice);
    if (!isNaN(p) && !isNaN(op) && op > p && p > 0) {
      return Math.round(((op - p) / op) * 100);
    }
    return 0;
  }, [formData.price, formData.originalPrice]);

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Product category is required';
    }

    const priceNum = parseFloat(formData.price);
    if (!formData.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Enter a valid price (greater than ₹0)';
    }

    if (formData.originalPrice.trim()) {
      const origNum = parseFloat(formData.originalPrice);
      if (isNaN(origNum) || origNum <= 0) {
        newErrors.originalPrice = 'Enter a valid original price';
      } else if (!isNaN(priceNum) && origNum < priceNum) {
        newErrors.originalPrice =
          'Original price should be greater than or equal to product price';
      }
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Selling unit is required';
    }

    const moqNum = parseInt(formData.moq, 10);
    if (!formData.moq.trim() || isNaN(moqNum) || moqNum < 1) {
      newErrors.moq = 'Minimum Order Quantity must be at least 1';
    }

    const stockNum = parseInt(formData.stock, 10);
    if (!formData.stock.trim() || isNaN(stockNum) || stockNum < 0) {
      newErrors.stock = 'Available stock is required';
    } else if (!isNaN(moqNum) && stockNum < moqNum) {
      newErrors.stock = `Available stock (${stockNum}) cannot be less than Minimum Order Quantity (${moqNum})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission & Persistence
  const handleSubmitProduct = () => {
    if (!validateForm()) {
      Alert.alert(
        'Required Fields Missing',
        'Please complete all required fields marked with * and correct any highlighted errors.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const sessionProfile = getSessionBusinessProfile();
      const resolvedBusiness =
        routeParams.business ||
        sessionProfile ||
        null;

      const businessId =
        (isEditMode && initialProduct?.businessId) ||
        routeParams.businessId ||
        routeParams.sellerId ||
        resolvedBusiness?.id ||
        'biz-submitted-001';

      const sellerId =
        (isEditMode && initialProduct?.sellerId) ||
        routeParams.sellerId ||
        routeParams.businessId ||
        resolvedBusiness?.sellerId ||
        resolvedBusiness?.id ||
        businessId;

      const sellerName =
        (isEditMode && initialProduct?.sellerName) ||
        resolvedBusiness?.businessName ||
        'My Business';

      const location =
        (isEditMode && initialProduct?.location) ||
        resolvedBusiness?.location ||
        [resolvedBusiness?.city, resolvedBusiness?.state]
          .filter(Boolean)
          .join(', ') ||
        'India';

      // Match category
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === formData.category.toLowerCase()
      );
      const categoryId = matchedCat
        ? matchedCat.id
        : formData.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Clean and format bulk pricing tiers
      const cleanBulkTiers = formData.bulkPricing
        .filter((t) => t.minQuantity && t.pricePerUnit)
        .map((t) => ({
          minQuantity: parseInt(t.minQuantity, 10),
          maxQuantity: t.maxQuantity ? parseInt(t.maxQuantity, 10) : null,
          pricePerUnit: parseFloat(t.pricePerUnit),
        }))
        .filter((t) => !isNaN(t.minQuantity) && !isNaN(t.pricePerUnit));

      const priceVal = parseFloat(formData.price);
      const originalPriceVal = formData.originalPrice.trim()
        ? parseFloat(formData.originalPrice)
        : undefined;

      const primaryImage =
        productImages.length > 0
          ? productImages[0]
          : isEditMode
          ? initialProduct?.image || null
          : null;

      const productId = isEditMode
        ? initialProduct?.id || routeParams.productId || `prod-custom-${Date.now()}`
        : `prod-custom-${Date.now()}`;

      const savedPayload = {
        ...(isEditMode && initialProduct ? initialProduct : {}),
        id: productId,
        name: formData.productName.trim(),
        brand: formData.brand.trim() || undefined,
        manufacturer: formData.manufacturer.trim() || undefined,
        description: formData.description.trim(),
        categoryId,
        categoryName: formData.category,
        category: formData.category,
        price: priceVal,
        originalPrice: originalPriceVal,
        unit: formData.unit.trim().toLowerCase(),
        moq: parseInt(formData.moq, 10),
        availableQuantity: parseInt(formData.stock, 10),
        stock: parseInt(formData.stock, 10),
        image: primaryImage,
        images:
          productImages.length > 0
            ? productImages
            : primaryImage
            ? [primaryImage]
            : [],
        sellerId,
        businessId,
        sellerName,
        location,
        bulkPricing: cleanBulkTiers,
        rating: isEditMode ? initialProduct?.rating || 4.8 : 4.8,
        totalReviews: isEditMode ? initialProduct?.totalReviews || 0 : 0,
        isFeatured: isEditMode ? Boolean(initialProduct?.isFeatured) : false,
        isSurplus: isEditMode ? Boolean(initialProduct?.isSurplus) : false,
        tags: [
          formData.category.toLowerCase(),
          ...formData.productName.toLowerCase().split(/\s+/).filter(Boolean),
        ],
      };

      saveProduct(savedPayload);

      Alert.alert(
        'Success',
        isEditMode
          ? 'Product details updated successfully.'
          : 'Product added successfully to your catalog.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onBackPress) {
                onBackPress();
              } else if (navigation?.goBack) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.warn('[AddProductScreen] Save product error:', error);
      Alert.alert('Error', 'Could not save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = () => {
    if (isDeleting || isSubmitting) return;
    if (!initialProduct || !initialProduct.id) return;

    if (!isOwner) {
      Alert.alert(
        'Action Not Allowed',
        'You can only delete products belonging to your own business.'
      );
      return;
    }

    const productName =
      formData.productName.trim() || initialProduct.name || 'this product';

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"?\n\nThis product will no longer be available for purchase.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const res = await deleteProduct(initialProduct.id, sessionProfile);
              if (res?.success) {
                Alert.alert(
                  'Product Deleted',
                  'This product has been removed from your catalog and will no longer appear in the marketplace.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        handleBack();
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Error',
                  res?.message || 'Could not delete product. Please try again.'
                );
              }
            } catch (err) {
              console.warn('[AddProductScreen] Delete product error:', err);
              Alert.alert(
                'Error',
                'An error occurred while deleting the product.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Back Navigation
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Screen Header */}
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
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Product' : 'Add Product'}
        </Text>
        {isEditMode && isOwner ? (
          <TouchableOpacity
            style={styles.headerDeleteButton}
            onPress={handleDeleteProduct}
            disabled={isDeleting || isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Delete Product"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightSpacer} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Product Images */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Product Images</Text>
                <Text style={styles.sectionSubtitle}>
                  Add photos of your product from your photo gallery
                </Text>
              </View>
              {productImages.length > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {productImages.length}{' '}
                    {productImages.length === 1 ? 'image' : 'images'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.imagePickerDottedBox}
              onPress={handlePickImages}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Select product images from device gallery"
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons
                  name="images-outline"
                  size={26}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.imagePickerTitle}>
                {productImages.length > 0
                  ? 'Add More Product Images'
                  : 'Select Product Images'}
              </Text>
              <Text style={styles.imagePickerSubtext}>
                Tap to choose multiple images from your photo gallery
              </Text>
            </TouchableOpacity>

            {productImages.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageThumbnailsScroll}
                contentContainerStyle={styles.imageThumbnailsContainer}
              >
                {productImages.map((uri, index) => (
                  <View
                    key={`product-image-${uri}-${index}`}
                    style={styles.thumbnailWrapper}
                  >
                    <Image source={{ uri }} style={styles.thumbnailImage} />

                    {index === 0 && (
                      <View style={styles.mainImageBadge}>
                        <Text style={styles.mainImageBadgeText}>Main</Text>
                      </View>
                    )}

                    {/* Remove Image Button */}
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove image ${index + 1}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="close"
                        size={13}
                        color={colors.textInverse}
                      />
                    </TouchableOpacity>

                    {/* Replace Image Button */}
                    <TouchableOpacity
                      style={styles.replaceImageButton}
                      onPress={() => handleReplaceImage(index)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Replace image ${index + 1}`}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name="sync-outline"
                        size={12}
                        color={colors.surface}
                      />
                      <Text style={styles.replaceImageText}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Section 2: Basic Product Information */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Product Information</Text>

            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Product Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.productName && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.productName}
                  onChangeText={(val) => handleFieldChange('productName', val)}
                  placeholder="Enter product name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              {errors.productName && (
                <Text style={styles.errorText}>{errors.productName}</Text>
              )}
            </View>

            {/* Brand */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formData.brand}
                  onChangeText={(val) => handleFieldChange('brand', val)}
                  placeholder="Enter brand name (optional)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Manufacturer */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Manufacturer</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formData.manufacturer}
                  onChangeText={(val) =>
                    handleFieldChange('manufacturer', val)
                  }
                  placeholder="Enter manufacturer name (optional)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Product Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Description</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={formData.description}
                  onChangeText={(val) => handleFieldChange('description', val)}
                  placeholder="Describe your product, materials, sizing, and details"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Product Category */}
            <View style={[styles.inputGroup, styles.inputGroupLast]}>
              <Text style={styles.label}>
                Product Category <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  styles.dropdownWrapper,
                  errors.category && styles.inputWrapperError,
                ]}
                onPress={() => setIsCategoryModalVisible(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select product category"
              >
                <Text
                  style={[
                    styles.dropdownValueText,
                    !formData.category && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {formData.category || 'Select product category'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {errors.category && (
                <Text style={styles.errorText}>{errors.category}</Text>
              )}
            </View>
          </View>

          {/* Section 3: Pricing & Selling Unit */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Pricing & Unit</Text>

            {/* Row: Product Price & Original Price */}
            <View style={styles.rowInputs}>
              {/* Product Price (Wholesale) */}
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>
                  Product Price (₹) <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.price && styles.inputWrapperError,
                  ]}
                >
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(val) => handleFieldChange('price', val)}
                    placeholder="e.g. 450"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                {errors.price && (
                  <Text style={styles.errorText}>{errors.price}</Text>
                )}
              </View>

              {/* Original Price / MRP */}
              <View
                style={[styles.inputGroup, styles.inputHalf, styles.inputHalfLast]}
              >
                <Text style={styles.label}>Original Price / MRP (₹)</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.originalPrice && styles.inputWrapperError,
                  ]}
                >
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.originalPrice}
                    onChangeText={(val) =>
                      handleFieldChange('originalPrice', val)
                    }
                    placeholder="e.g. 600"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                {errors.originalPrice && (
                  <Text style={styles.errorText}>{errors.originalPrice}</Text>
                )}
              </View>
            </View>

            {/* Discount Pill if Original Price is higher */}
            {discountPercent > 0 && (
              <View style={styles.discountBanner}>
                <Ionicons
                  name="pricetag"
                  size={14}
                  color={colors.success}
                />
                <Text style={styles.discountBannerText}>
                  Buyers will see a {discountPercent}% discount off MRP!
                </Text>
              </View>
            )}

            {/* Selling Unit */}
            <View style={[styles.inputGroup, styles.inputGroupLast, { marginTop: spacing.sm }]}>
              <Text style={styles.label}>
                Selling Unit <Text style={styles.requiredAsterisk}>*</Text>
              </Text>

              {/* Common Unit Preset Chips */}
              <View style={styles.unitChipsWrapper}>
                {COMMON_UNITS.map((u) => {
                  const isSelected =
                    formData.unit.toLowerCase() === u.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={`unit-${u}`}
                      style={[
                        styles.unitChip,
                        isSelected && styles.unitChipSelected,
                      ]}
                      onPress={() => handleFieldChange('unit', u)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          isSelected && styles.unitChipTextSelected,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Editable Unit Input */}
              <View
                style={[
                  styles.inputWrapper,
                  errors.unit && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.unit}
                  onChangeText={(val) => handleFieldChange('unit', val)}
                  placeholder="Or enter custom unit (e.g. bundle, roll, carton)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              {errors.unit && (
                <Text style={styles.errorText}>{errors.unit}</Text>
              )}
            </View>
          </View>

          {/* Section 4: MOQ, Stock and Bulk Pricing */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Inventory & Wholesale Pricing</Text>

            {/* Row: MOQ & Available Stock */}
            <View style={styles.rowInputs}>
              {/* MOQ */}
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>
                  Minimum Order Quantity <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.moq && styles.inputWrapperError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    value={formData.moq}
                    onChangeText={(val) => handleFieldChange('moq', val)}
                    placeholder="Min Order Qty"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                {errors.moq && (
                  <Text style={styles.errorText}>{errors.moq}</Text>
                )}
                <Text style={styles.inputHint}>The minimum number of pieces a customer must order.</Text>
              </View>

              {/* Available Stock */}
              <View
                style={[styles.inputGroup, styles.inputHalf, styles.inputHalfLast]}
              >
                <Text style={styles.label}>
                  Available Stock <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.stock && styles.inputWrapperError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    value={formData.stock}
                    onChangeText={(val) => handleFieldChange('stock', val)}
                    placeholder="e.g. 500"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                {errors.stock && (
                  <Text style={styles.errorText}>{errors.stock}</Text>
                )}
                <Text style={styles.inputHint}>Total units in stock</Text>
              </View>
            </View>

            {/* Bulk Pricing Tiers Subsection */}
            <View style={styles.bulkPricingHeaderRow}>
              <View>
                <Text style={styles.bulkPricingSectionTitle}>
                  Wholesale Pricing Tiers
                </Text>
                <Text style={styles.bulkPricingSectionSub}>
                  Buy more and get a lower price per item.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addTierButton}
                onPress={handleAddTier}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Add wholesale pricing tier"
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addTierButtonText}>Add Tier</Text>
              </TouchableOpacity>
            </View>

            {formData.bulkPricing.length > 0 ? (
              <View style={styles.tiersContainer}>
                {formData.bulkPricing.map((tier, index) => (
                  <View
                    key={`tier-${index}`}
                    style={styles.tierRowCard}
                  >
                    <View style={styles.tierHeader}>
                      <Text style={styles.tierIndexLabel}>
                        Tier #{index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTier(index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove tier ${index + 1}`}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.tierFieldsRow}>
                      {/* Min Qty */}
                      <View style={styles.tierFieldCol}>
                        <Text style={styles.tierFieldLabel}>Min Qty</Text>
                        <TextInput
                          style={styles.tierInput}
                          value={tier.minQuantity}
                          onChangeText={(val) =>
                            handleTierChange(index, 'minQuantity', val)
                          }
                          placeholder="e.g. 20"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                        />
                      </View>

                      {/* Max Qty (optional) */}
                      <View style={styles.tierFieldCol}>
                        <Text style={styles.tierFieldLabel}>
                          Max Qty (or blank)
                        </Text>
                        <TextInput
                          style={styles.tierInput}
                          value={tier.maxQuantity}
                          onChangeText={(val) =>
                            handleTierChange(index, 'maxQuantity', val)
                          }
                          placeholder="e.g. 49"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                        />
                      </View>

                      {/* Price Per Unit */}
                      <View style={styles.tierFieldCol}>
                        <Text style={styles.tierFieldLabel}>Price/Unit (₹)</Text>
                        <TextInput
                          style={styles.tierInput}
                          value={tier.pricePerUnit}
                          onChangeText={(val) =>
                            handleTierChange(index, 'pricePerUnit', val)
                          }
                          placeholder="e.g. 410"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyTiersBox}>
                <Ionicons
                  name="pricetags-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyTiersText}>
                  No wholesale pricing tiers added. Tap "+ Add Tier" to create
                  volume discounts.
                </Text>
              </View>
            )}
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitProduct}
            activeOpacity={0.8}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Save Changes' : 'Add Product'}
          >
            <Ionicons
              name={isEditMode ? 'checkmark-circle-outline' : 'add-circle-outline'}
              size={22}
              color={colors.textInverse}
            />
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Save Changes' : 'Add Product'}
            </Text>
          </TouchableOpacity>

          {/* Delete Product Section (Edit Mode Only for Product Owner) */}
          {isEditMode && isOwner && (
            <View style={styles.deleteSectionCard}>
              <View style={styles.deleteHeaderRow}>
                <View style={styles.deleteIconBox}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </View>
                <View style={styles.deleteTextWrapper}>
                  <Text style={styles.deleteTitle}>Delete Product</Text>
                  <Text style={styles.deleteSubtitle}>
                    Remove this product from your wholesale catalog. Once deleted, buyers will no longer be able to purchase it or request price quotations.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (isDeleting || isSubmitting) && styles.deleteButtonDisabled,
                ]}
                onPress={handleDeleteProduct}
                activeOpacity={0.8}
                disabled={isDeleting || isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Delete Product"
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.textInverse}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? 'Deleting Product...' : 'Delete Product'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Product Category</Text>
              <TouchableOpacity
                onPress={() => setIsCategoryModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close category selection"
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PRODUCT_CATEGORIES}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    handleFieldChange('category', item);
                    setIsCategoryModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {formData.category === item ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
            />
          </View>
        </View>
      </Modal>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRightSpacer: {
    width: 36,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 1.5,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  imagePickerDottedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
  },
  imagePickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  imagePickerSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  imageThumbnailsScroll: {
    marginTop: spacing.md,
  },
  imageThumbnailsContainer: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
  },
  thumbnailImage: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  mainImageBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  mainImageBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textInverse,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  replaceImageButton: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  replaceImageText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.surface,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  requiredAsterisk: {
    color: colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: '#fff5f5',
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 6,
  },
  inputHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 3,
    fontWeight: '500',
  },
  multilineWrapper: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  dropdownWrapper: {
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputHalf: {
    flex: 1,
    marginRight: spacing.sm,
  },
  inputHalfLast: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  discountBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  unitChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  unitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  unitChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitChipTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  bulkPricingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bulkPricingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bulkPricingSectionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    gap: 3,
  },
  addTierButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  tiersContainer: {
    gap: spacing.sm,
  },
  tierRowCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tierIndexLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tierFieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tierFieldCol: {
    flex: 1,
  },
  tierFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  tierInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : 4,
    fontSize: 13,
    color: colors.textPrimary,
  },
  emptyTiersBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTiersText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '65%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  headerDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteSectionCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  deleteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  deleteIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTextWrapper: {
    flex: 1,
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  deleteSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
