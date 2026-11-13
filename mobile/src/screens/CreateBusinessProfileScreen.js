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
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getSessionBusinessProfile,
  setSessionBusinessProfile,
  updateBusinessProfile,
  savePersistedMode,
  MODES,
} from '../data/businessProfileData';
import businessService from '../services/businessService';
import { isUUID } from '../services/businessMigrationService';
import { remapProductSellerId } from '../data/products';
import { remapOrderSellerId } from '../data/orders';
import { remapQuotationSellerId } from '../data/quotations';

const CATEGORIES = [
  'Handicrafts',
  'Clothing and Textiles',
  'Food and Beverages',
  'Furniture and Home Decor',
  'Electronics',
  'Agriculture and Farm Products',
  'Beauty and Personal Care',
  'Manufacturing',
  'Other',
];

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Other / UT',
];

export default function CreateBusinessProfileScreen({
  navigation,
  route,
  onBackPress,
}) {
  const existingProfile = getSessionBusinessProfile();
  const isEditMode = Boolean(
    route?.params?.isEdit || route?.params?.business || existingProfile
  );
  const initialBusiness =
    route?.params?.business || existingProfile || null;

  // 1. Form State
  const [businessImage, setBusinessImage] = useState(() => {
    if (initialBusiness?.imageUri) return initialBusiness.imageUri;
    if (typeof initialBusiness?.image === 'string') return initialBusiness.image;
    return null;
  });

  const [formData, setFormData] = useState(() => {
    if (!initialBusiness) {
      return {
        businessName: '',
        ownerName: '',
        category: '',
        description: '',
        contactNumber: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
      };
    }

    const cleanDigits = (
      initialBusiness.phone ||
      initialBusiness.contactNumber ||
      ''
    ).replace(/\D/g, '');
    const contactNumber =
      cleanDigits.length >= 10
        ? cleanDigits.slice(-10)
        : initialBusiness.contactNumber || initialBusiness.phone || '';

    let city = initialBusiness.city || '';
    let state = initialBusiness.state || '';
    if (!city && !state && initialBusiness.location) {
      const parts = initialBusiness.location.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        city = parts[0];
        state = parts[1];
      } else if (parts.length === 1) {
        city = parts[0];
      }
    }

    let category = initialBusiness.category || '';
    const exactCat = CATEGORIES.find(
      (c) => c.toLowerCase() === category.toLowerCase()
    );
    if (exactCat) {
      category = exactCat;
    } else {
      const partialCat = CATEGORIES.find(
        (c) =>
          category.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(category.toLowerCase())
      );
      if (partialCat) {
        category = partialCat;
      }
    }

    let pincode = initialBusiness.pincode || '';
    if (!pincode && initialBusiness.address) {
      const pinMatch = initialBusiness.address.match(/\b\d{6}\b/);
      if (pinMatch) pincode = pinMatch[0];
    }

    return {
      businessName:
        initialBusiness.businessName || initialBusiness.sellerName || '',
      ownerName:
        initialBusiness.ownerName || initialBusiness.sellerName || '',
      category,
      description: initialBusiness.description || initialBusiness.about || '',
      contactNumber,
      email: initialBusiness.email || '',
      address: initialBusiness.streetAddress || initialBusiness.address || '',
      city,
      state,
      pincode,
    };
  });

  // 2. Specialties State
  const [specialties, setSpecialties] = useState(() => {
    return Array.isArray(initialBusiness?.specialties)
      ? [...initialBusiness.specialties]
      : [];
  });
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [specialtyError, setSpecialtyError] = useState('');

  // 3. Validation & UI State
  const [errors, setErrors] = useState({});
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isStateModalVisible, setIsStateModalVisible] = useState(false);

  // Field change helper
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Back Navigation
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Image Picker Logic
  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Permission to access device photo gallery is required to choose a business image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setBusinessImage(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('[CreateBusinessProfile] Image pick error:', error);
      Alert.alert(
        'Image Selection Error',
        'Could not select the image. Please try again.'
      );
    }
  };

  const handleRemoveImage = () => {
    setBusinessImage(null);
  };

  // Specialties Management
  const handleAddSpecialty = () => {
    const trimmed = specialtyInput.trim();
    if (!trimmed) {
      setSpecialtyError('Please enter a specialty');
      return;
    }

    const isDuplicate = specialties.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setSpecialtyError('This specialty has already been added');
      return;
    }

    setSpecialties((prev) => [...prev, trimmed]);
    setSpecialtyInput('');
    setSpecialtyError('');
  };

  const handleRemoveSpecialty = (indexToRemove) => {
    setSpecialties((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Form Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = "Owner's full name is required";
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Please select a business category';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Business description is required';
    }

    // Phone number validation: valid 10-digit Indian mobile number
    const trimmedPhone = formData.contactNumber.trim().replace(/\s+/g, '');
    const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
    if (!trimmedPhone) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!phoneRegex.test(trimmedPhone)) {
      newErrors.contactNumber =
        'Enter a valid 10-digit Indian mobile number (e.g. 9876543210)';
    }

    // Email validation
    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Business address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    // PIN code validation: exactly 6 digits
    const trimmedPin = formData.pincode.trim();
    if (!trimmedPin) {
      newErrors.pincode = 'PIN code is required';
    } else if (!/^\d{6}$/.test(trimmedPin)) {
      newErrors.pincode = 'PIN code must be exactly 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission
  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert(
        'Incomplete Information',
        'Please correct the highlighted fields before submitting.'
      );
      return;
    }

    const businessPayload = {
      name: formData.businessName.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      phone: formData.contactNumber.trim(),
      email: formData.email.trim().toLowerCase(),
    };

    let backendBiz = null;
    const editId = initialBusiness?.id || initialBusiness?.sellerId;
    const isLegacyId = editId && !isUUID(editId);

    if (isEditMode) {
      if (editId && !isLegacyId) {
        try {
          backendBiz = await businessService.updateBusiness(editId, businessPayload);
        } catch (apiErr) {
          console.warn('[CreateBusinessProfileScreen] API update error, falling back to local storage:', apiErr?.message);
        }
      } else {
        // Legacy ID edit: check backend first via getMyBusiness, then create or update
        try {
          const myBiz = await businessService.getMyBusiness();
          if (myBiz && myBiz.id) {
            backendBiz = await businessService.updateBusiness(myBiz.id, businessPayload);
          } else {
            backendBiz = await businessService.createBusiness(businessPayload);
          }
        } catch (apiErr) {
          console.warn('[CreateBusinessProfileScreen] API sync error for legacy business:', apiErr?.message);
        }
      }
    } else {
      try {
        backendBiz = await businessService.createBusiness(businessPayload);
      } catch (apiErr) {
        console.warn('[CreateBusinessProfileScreen] API create error, falling back to local storage:', apiErr?.message);
      }
    }

    if (backendBiz?.id && isLegacyId && editId) {
      try {
        await remapProductSellerId(editId, backendBiz.id);
        await remapOrderSellerId(editId, backendBiz.id);
        await remapQuotationSellerId(editId, backendBiz.id);
      } catch (remapErr) {
        console.warn('[CreateBusinessProfileScreen] Error remapping legacy references on edit:', remapErr);
      }
    }

    const targetId =
      backendBiz?.id ||
      (isEditMode && initialBusiness?.id
        ? initialBusiness.id
        : `biz-submitted-${Date.now()}`);
    const targetSellerId =
      backendBiz?.id ||
      (isEditMode && initialBusiness?.sellerId
        ? initialBusiness.sellerId
        : targetId);

    const payload = {
      ...(initialBusiness || {}),
      ...(backendBiz || {}),
      id: targetId,
      sellerId: targetSellerId,
      businessName: formData.businessName.trim(),
      sellerName: formData.businessName.trim(),
      ownerName: formData.ownerName.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      contactNumber: formData.contactNumber.trim(),
      phone: formData.contactNumber.trim(),
      email: formData.email.trim().toLowerCase(),
      streetAddress: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      address: [
        formData.address.trim(),
        formData.city.trim(),
        formData.state.trim(),
        formData.pincode.trim(),
      ]
        .filter(Boolean)
        .join(', '),
      location: `${formData.city.trim()}, ${formData.state.trim()}`,
      imageUri: businessImage,
      image: businessImage,
      specialties: [...specialties],
      isVerified:
        isEditMode && initialBusiness?.isVerified !== undefined
          ? initialBusiness.isVerified
          : false,
      verificationStatus:
        isEditMode && initialBusiness?.verificationStatus
          ? initialBusiness.verificationStatus
          : 'Not Verified',
      isSubmitted: true,
      createdAt:
        isEditMode && initialBusiness?.createdAt
          ? initialBusiness.createdAt
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isEditMode) {
      await updateBusinessProfile(payload);
    } else {
      await setSessionBusinessProfile(payload);
      await savePersistedMode(MODES.SELLER);
    }

    if (navigation?.navigate) {
      navigation.navigate('BusinessProfile', { business: payload });
    }
  };

  // Render Selection Modal
  const renderSelectionModal = (visible, title, data, onSelect, onClose) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.modalOptionText}>{item}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
          />
        </View>
      </View>
    </Modal>
  );

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
          {isEditMode ? 'Edit Business Profile' : 'Create Business Profile'}
        </Text>
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
          {/* Form Intro Banner */}
          <View style={styles.introCard}>
            <Text style={styles.introHeading}>
              {isEditMode ? 'Edit Your Business' : 'Register Your Business'}
            </Text>
            <Text style={styles.introSubtext}>
              {isEditMode
                ? 'Update your business details below. Changes will be reflected on your business profile.'
                : 'Fill in your details below to set up your business profile and start selling on VyaparSetu.'}
            </Text>
          </View>

          {/* SECTION A: Business Image */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Business Image</Text>
            <View style={styles.imageSectionContent}>
              <View style={styles.imagePreviewContainer}>
                {businessImage ? (
                  <Image
                    source={
                      typeof businessImage === 'number'
                        ? businessImage
                        : { uri: businessImage }
                    }
                    style={styles.imagePreview}
                  />
                ) : (
                  <Ionicons
                    name="storefront-outline"
                    size={38}
                    color={colors.textMuted}
                  />
                )}
              </View>

              <View style={styles.imageActionsContainer}>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.imagePickerButtonText}>
                    {businessImage ? 'Change Image' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>

                {businessImage && (
                  <TouchableOpacity
                    style={styles.imageRemoveButton}
                    onPress={handleRemoveImage}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.error}
                    />
                    <Text style={styles.imageRemoveButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.imageHelperText}>
                  Optional. Square logo or shop photo works best.
                </Text>
              </View>
            </View>
          </View>

          {/* SECTION B: Basic Business Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* 1. Business Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Business Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.businessName && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.businessName}
                  onChangeText={(val) => handleFieldChange('businessName', val)}
                  placeholder="Enter your business name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              {errors.businessName && (
                <Text style={styles.errorText}>{errors.businessName}</Text>
              )}
            </View>

            {/* 2. Owner Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Owner Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.ownerName && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.ownerName}
                  onChangeText={(val) => handleFieldChange('ownerName', val)}
                  placeholder="Enter owner's full name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              {errors.ownerName && (
                <Text style={styles.errorText}>{errors.ownerName}</Text>
              )}
            </View>

            {/* 3. Business Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Business Category <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  styles.dropdownWrapper,
                  errors.category && styles.inputWrapperError,
                ]}
                onPress={() => setIsCategoryModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dropdownValueText,
                    !formData.category && styles.placeholderText,
                  ]}
                >
                  {formData.category || 'Select business category'}
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

            {/* 4. Business Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Business Description{' '}
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.multilineWrapper,
                  errors.description && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={formData.description}
                  onChangeText={(val) => handleFieldChange('description', val)}
                  placeholder="Describe your business and the products you offer"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>
          </View>

          {/* SECTION C: Contact Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Contact Details</Text>

            {/* 1. Contact Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Number <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.contactNumber && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={colors.textSecondary}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.contactNumber}
                  onChangeText={(val) =>
                    handleFieldChange('contactNumber', val)
                  }
                  placeholder="Enter your contact number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.contactNumber && (
                <Text style={styles.errorText}>{errors.contactNumber}</Text>
              )}
            </View>

            {/* 2. Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email Address <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.textSecondary}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(val) => handleFieldChange('email', val)}
                  placeholder="Enter your business email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>
          </View>

          {/* SECTION D: Business Address */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Business Address</Text>

            {/* 1. Complete Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Address <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.multilineWrapper,
                  errors.address && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={formData.address}
                  onChangeText={(val) => handleFieldChange('address', val)}
                  placeholder="Enter your complete business address"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            {/* 2. City & State in a Row */}
            <View style={styles.inputRow}>
              {/* City */}
              <View style={[styles.inputGroup, styles.flexHalf]}>
                <Text style={styles.label}>
                  City <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.city && styles.inputWrapperError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    value={formData.city}
                    onChangeText={(val) => handleFieldChange('city', val)}
                    placeholder="Enter your city"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                {errors.city && (
                  <Text style={styles.errorText}>{errors.city}</Text>
                )}
              </View>

              {/* State */}
              <View style={[styles.inputGroup, styles.flexHalf]}>
                <Text style={styles.label}>
                  State <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    styles.dropdownWrapper,
                    errors.state && styles.inputWrapperError,
                  ]}
                  onPress={() => setIsStateModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dropdownValueText,
                      !formData.state && styles.placeholderText,
                    ]}
                    numberOfLines={1}
                  >
                    {formData.state || 'Select state'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {errors.state && (
                  <Text style={styles.errorText}>{errors.state}</Text>
                )}
              </View>
            </View>

            {/* 3. PIN Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                PIN Code <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.pincode && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={formData.pincode}
                  onChangeText={(val) => handleFieldChange('pincode', val)}
                  placeholder="Enter your 6-digit PIN code"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              {errors.pincode && (
                <Text style={styles.errorText}>{errors.pincode}</Text>
              )}
            </View>
          </View>

          {/* SECTION E: Business Specialties (Optional) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Business Specialties</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <Text style={styles.sectionHelperText}>
              Add key skills, products, or craftsmanship areas that make your
              business stand out.
            </Text>

            <View style={styles.specialtyInputRow}>
              <View
                style={[
                  styles.inputWrapper,
                  styles.specialtyInputWrapper,
                  specialtyError ? styles.inputWrapperError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={specialtyInput}
                  onChangeText={(val) => {
                    setSpecialtyInput(val);
                    if (specialtyError) setSpecialtyError('');
                  }}
                  placeholder="e.g. Handmade Wooden Decor"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleAddSpecialty}
                  returnKeyType="done"
                />
              </View>
              <TouchableOpacity
                style={styles.addSpecialtyButton}
                onPress={handleAddSpecialty}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={colors.textInverse} />
                <Text style={styles.addSpecialtyButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {specialtyError ? (
              <Text style={styles.errorText}>{specialtyError}</Text>
            ) : null}

            {/* Specialties Chips List */}
            {specialties.length > 0 && (
              <View style={styles.chipsContainer}>
                {specialties.map((item, index) => (
                  <View key={`specialty-${index}`} style={styles.chip}>
                    <Text style={styles.chipText}>{item}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveSpecialty(index)}
                      style={styles.chipRemoveButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              isEditMode ? 'Save Changes' : 'Create Business Profile'
            }
          >
            <Ionicons
              name={isEditMode ? 'save-outline' : 'checkmark-circle-outline'}
              size={20}
              color={colors.textInverse}
              style={styles.buttonIcon}
            />
            <Text style={styles.primaryButtonText}>
              {isEditMode ? 'Save Changes' : 'Create Business Profile'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      {renderSelectionModal(
        isCategoryModalVisible,
        'Select Business Category',
        CATEGORIES,
        (cat) => handleFieldChange('category', cat),
        () => setIsCategoryModalVisible(false)
      )}

      {/* State Selection Modal */}
      {renderSelectionModal(
        isStateModalVisible,
        'Select State',
        INDIAN_STATES,
        (st) => handleFieldChange('state', st),
        () => setIsStateModalVisible(false)
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
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
  headerRightSpacer: {
    width: 38,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  introCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  introHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  introSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  optionalBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sectionHelperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  imageSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  imagePreviewContainer: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  imageActionsContainer: {
    flex: 1,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSubtle,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  imagePickerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  imageRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  imageRemoveButtonText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  imageHelperText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  inputGroup: {
    marginBottom: spacing.md,
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
    backgroundColor: '#FFF5F5',
  },
  fieldIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 6,
  },
  dropdownWrapper: {
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  multilineWrapper: {
    minHeight: 90,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexHalf: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
  specialtyInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  specialtyInputWrapper: {
    flex: 1,
  },
  addSpecialtyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 46,
  },
  addSpecialtyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  chipRemoveButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textInverse,
    textAlign: 'center',
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
