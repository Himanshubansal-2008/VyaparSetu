import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  validateFullName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
  validateSignupForm,
  prepareSignupPayload,
} from '../utils/validation.utils';
import { signupUser } from '../services/authService';

export default function SignupScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToLogin,
  onSubmit,
}) {
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error State for field-specific validation messages
  const [errors, setErrors] = useState({});

  // Loading and API Status State
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Focus tracking for interactive field borders & icons
  const [focusedField, setFocusedField] = useState(null);

  // Handlers that update form values and clear/update field errors on correction
  const handleNameChange = (val) => {
    setName(val);
    if (apiError) setApiError(null);
    if (successMessage) setSuccessMessage(null);
    if (errors.name) {
      const err = validateFullName(val);
      setErrors((prev) => ({ ...prev, name: err }));
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    if (apiError) setApiError(null);
    if (successMessage) setSuccessMessage(null);
    if (errors.email) {
      const err = validateEmail(val);
      setErrors((prev) => ({ ...prev, email: err }));
    }
  };

  const handlePhoneChange = (val) => {
    setPhone(val);
    if (apiError) setApiError(null);
    if (successMessage) setSuccessMessage(null);
    if (errors.phone) {
      const err = validatePhone(val);
      setErrors((prev) => ({ ...prev, phone: err }));
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (apiError) setApiError(null);
    if (successMessage) setSuccessMessage(null);
    if (errors.password) {
      const err = validatePassword(val);
      setErrors((prev) => ({ ...prev, password: err }));
    }
    if (errors.confirmPassword && confirmPassword) {
      const confirmErr = validateConfirmPassword(confirmPassword, val);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleConfirmPasswordChange = (val) => {
    setConfirmPassword(val);
    if (apiError) setApiError(null);
    if (successMessage) setSuccessMessage(null);
    if (errors.confirmPassword) {
      const err = validateConfirmPassword(val, password);
      setErrors((prev) => ({ ...prev, confirmPassword: err }));
    }
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

  const handleLoginPress = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else if (navigation?.navigate) {
      navigation.navigate('Login');
    }
  };

  const handleCreateAccount = async () => {
    if (isLoading) return;

    setApiError(null);
    setSuccessMessage(null);

    const formData = {
      name,
      email,
      phone,
      password,
      confirmPassword,
    };

    const { isValid, errors: validationErrors } = validateSignupForm(formData);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    const payload = prepareSignupPayload(formData);

    if (onSubmit) {
      onSubmit(payload);
    }

    setIsLoading(true);

    try {
      const result = await signupUser(payload);
      setSuccessMessage(result?.message || 'Account created successfully! Redirecting to login...');

      setTimeout(() => {
        if (onNavigateToLogin) {
          onNavigateToLogin();
        } else if (navigation?.navigate) {
          navigation.navigate('Login');
        }
      }, 1000);
    } catch (err) {
      let message = err?.message || 'Unable to create account. Please try again.';

      if (err?.statusCode === 409) {
        message = err?.data?.message || 'An account with this email already exists. Please login instead.';
      } else if (err?.statusCode === 400 && Array.isArray(err?.data?.errors)) {
        const backendFieldErrors = {};
        err.data.errors.forEach((e) => {
          if (e.field && e.message) {
            backendFieldErrors[e.field] = e.message;
          }
        });
        if (Object.keys(backendFieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendFieldErrors }));
        }
      }

      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const canGoBack = Boolean(onBackPress || navigation?.canGoBack?.());

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Button */}
          {canGoBack && (
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
                accessibilityRole="button"
                disabled={isLoading}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Header Section: Logo Branding, Heading & Subtitle */}
          <View style={styles.headerContainer}>
            <View style={styles.brandingRow}>
              <View style={styles.logoBadge}>
                <MaterialCommunityIcons
                  name="handshake"
                  size={28}
                  color={colors.surface}
                />
              </View>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandPrimary}>Vyapar</Text>
                <Text style={styles.brandAccent}>Setu</Text>
              </View>
            </View>

            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join VyaparSetu and start exploring opportunities.
            </Text>
          </View>

          {/* Global API Feedback Banners */}
          {apiError ? (
            <View style={styles.apiErrorBanner}>
              <Ionicons
                name="alert-circle"
                size={20}
                color={colors.error}
                style={styles.bannerIcon}
              />
              <Text style={styles.apiErrorBannerText}>{apiError}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
                style={styles.bannerIcon}
              />
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Signup Form */}
          <View style={styles.formContainer}>
            {/* 1. Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'name' && styles.inputWrapperFocused,
                  Boolean(errors.name) && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={
                    errors.name
                      ? colors.error
                      : focusedField === 'name'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={handleNameChange}
                  keyboardType="default"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Full Name input"
                />
              </View>
              {errors.name ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{errors.name}</Text>
                </View>
              ) : null}
            </View>

            {/* 2. Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                  Boolean(errors.email) && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={
                    errors.email
                      ? colors.error
                      : focusedField === 'email'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  textContentType="emailAddress"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Email Address input"
                />
              </View>
              {errors.email ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              ) : null}
            </View>

            {/* 3. Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'phone' && styles.inputWrapperFocused,
                  Boolean(errors.phone) && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={
                    errors.phone
                      ? colors.error
                      : focusedField === 'phone'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Phone Number input"
                />
              </View>
              {errors.phone ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{errors.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* 4. Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                  Boolean(errors.password) && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={
                    errors.password
                      ? colors.error
                      : focusedField === 'password'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  textContentType="newPassword"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              ) : null}
            </View>

            {/* 5. Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'confirmPassword' &&
                    styles.inputWrapperFocused,
                  Boolean(errors.confirmPassword) && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={
                    errors.confirmPassword
                      ? colors.error
                      : focusedField === 'confirmPassword'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  textContentType="newPassword"
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Confirm Password input"
                />
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? 'eye-off-outline' : 'eye-outline'
                    }
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                </View>
              ) : null}
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleCreateAccount}
              activeOpacity={0.85}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Create Account button"
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.textInverse} />
                  <Text style={styles.primaryButtonText}>Creating Account...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Footer with Login Link */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={handleLoginPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Navigate to Login"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={isLoading}
              >
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandPrimary: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  brandAccent: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  apiErrorBannerText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  successBannerText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  bannerIcon: {
    marginRight: spacing.sm,
  },
  formContainer: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 4,
    fontWeight: '500',
    flex: 1,
  },
  inputIcon: {
    marginRight: spacing.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  visibilityButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
