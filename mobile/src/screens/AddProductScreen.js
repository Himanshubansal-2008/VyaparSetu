import React, { useState } from 'react';
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
import { categories } from '../data/products';

// Extract product categories (excluding filter-only 'all')
const PRODUCT_CATEGORIES = categories
  .filter((cat) => cat.id !== 'all')
  .map((cat) => cat.name);

export default function AddProductScreen({ navigation, route, onBackPress }) {
  // 1. Form State
  const [formData, setFormData] = useState({
    productName: '',
    brand: '',
    manufacturer: '',
    description: '',
    category: '',
    productImages: [],
  });

  const productImages = Array.isArray(formData.productImages)
    ? formData.productImages
    : [];

  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // Field change helper
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Image Picker Logic (Multiple Images, Gallery Only, Non-destructive)
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

      // If the seller cancels the picker, do not modify existing selections
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newUris = result.assets
        .map((asset) => asset?.uri)
        .filter((uri) => typeof uri === 'string' && uri.trim().length > 0);

      if (newUris.length === 0) {
        return;
      }

      // Append newly selected images while avoiding duplicate URIs
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

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      productImages: (prev.productImages || []).filter(
        (_, index) => index !== indexToRemove
      ),
    }));
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
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={styles.headerRightSpacer} />
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
          {/* Section: Product Images */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Product Images</Text>
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
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Section: Basic Product Information */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Product Information</Text>

            {/* 1. Product Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formData.productName}
                  onChangeText={(val) => handleFieldChange('productName', val)}
                  placeholder="Enter product name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* 2. Brand */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formData.brand}
                  onChangeText={(val) => handleFieldChange('brand', val)}
                  placeholder="Enter brand name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* 3. Manufacturer */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Manufacturer</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={formData.manufacturer}
                  onChangeText={(val) =>
                    handleFieldChange('manufacturer', val)
                  }
                  placeholder="Enter manufacturer name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* 4. Product Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Description</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={formData.description}
                  onChangeText={(val) => handleFieldChange('description', val)}
                  placeholder="Describe your product"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* 5. Product Category */}
            <View style={[styles.inputGroup, styles.inputGroupLast]}>
              <Text style={styles.label}>Product Category</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, styles.dropdownWrapper]}
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
            </View>
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 76,
    height: 76,
  },
  thumbnailImage: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
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
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 6,
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
});
