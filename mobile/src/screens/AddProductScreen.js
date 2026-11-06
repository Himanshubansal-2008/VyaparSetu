import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  });

  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // Field change helper
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
