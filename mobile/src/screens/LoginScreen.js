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
import { loginUser } from '../services/authService';

export default function LoginScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToSignup,
  onNavigateToHome,
  onLoginSuccess,
  onSubmit,
}) {
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);

  // Focus tracking for interactive field borders & icons
  const [focusedField, setFocusedField] = useState(null);

  const handleEmailChange = (val) => {
    setEmail(val);
    if (apiError) setApiError(null);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: null }));
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (apiError) setApiError(null);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: null }));
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

  const handleSignupPress = () => {
    if (onNavigateToSignup) {
      onNavigateToSignup();
    } else if (navigation?.navigate) {
      navigation.navigate('Signup');
    }
  };

  const handleLogin = async () => {
    if (isLoading) return;

    setApiError(null);
    const errors = {};

    const trimmedEmail = email ? String(email).trim() : '';
    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const credentials = {
      email: trimmedEmail.toLowerCase(),
      password,
    };

    setIsLoading(true);

    try {
      const result = await loginUser(credentials);

      if (onLoginSuccess) {
        onLoginSuccess({
          token: result?.token,
          user: result?.user,
        });
      }

      if (onSubmit) {
        onSubmit(credentials, result);
      }

      // Navigate to marketplace / Home
      if (onNavigateToHome) {
        onNavigateToHome();
      } else if (navigation?.navigate) {
        navigation.navigate('Home');
      }
    } catch (err) {
      let message = err?.message || 'Login failed. Please check your credentials.';
      if (err?.statusCode === 401) {
        message = 'Invalid email or password.';
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

            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Login to continue exploring VyaparSetu.
            </Text>
          </View>

          {/* Global API Feedback Banner */}
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

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* 1. Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                  Boolean(fieldErrors.email) && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={
                    fieldErrors.email
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
              {fieldErrors.email ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{fieldErrors.email}</Text>
                </View>
              ) : null}
            </View>

            {/* 2. Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                  Boolean(fieldErrors.password) && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={
                    fieldErrors.password
                      ? colors.error
                      : focusedField === 'password'
                      ? colors.primary
                      : colors.textSecondary
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  textContentType="password"
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
              {fieldErrors.password ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{fieldErrors.password}</Text>
                </View>
              ) : null}
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Login button"
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.textInverse} />
                  <Text style={styles.primaryButtonText}>Logging in...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Footer with Signup Link */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={handleSignupPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Navigate to Create Account"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={isLoading}
              >
                <Text style={styles.signupLink}>Create Account</Text>
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
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
