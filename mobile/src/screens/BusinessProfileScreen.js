import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import businessProfileData from '../data/businessProfileData';

export default function BusinessProfileScreen({
  navigation,
  route,
  onBackPress,
  business: propBusiness,
}) {
  const business =
    propBusiness ||
    route?.params?.business ||
    route?.params?.businessProfile ||
    businessProfileData;

  const {
    businessName = 'Sharma Handicrafts',
    description = '',
    category = '',
    ownerName = '',
    contactNumber = '',
    email = '',
    address = '',
    location = '',
    isVerified = true,
    specialties = [],
  } = business || {};

  const canGoBack = Boolean(
    onBackPress || (navigation && typeof navigation.goBack === 'function')
  );

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

      {/* A. Screen Heading */}
      <View style={[styles.header, !canGoBack && styles.headerCentered]}>
        {canGoBack && (
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
        )}
        <Text style={styles.headerTitle}>Business Profile</Text>
        {canGoBack && <View style={styles.headerRightSpacer} />}
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Header / Identity Section */}
        <View style={styles.businessHeaderCard}>
          <View style={styles.businessLogoPlaceholder}>
            <Ionicons
              name="storefront-outline"
              size={32}
              color={colors.primary}
            />
          </View>
          <View style={styles.businessHeaderInfo}>
            <Text style={styles.businessNameText}>
              {businessName || businessProfileData.businessName}
            </Text>
            {Boolean(category || businessProfileData.category) && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {category || businessProfileData.category}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* D. Business Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Business Information</Text>
          </View>

          <View style={styles.fieldList}>
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Business Description</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {description || 'No description available'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Business Category</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {category || 'No category specified'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Owner Name</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {ownerName || 'No owner name specified'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Business Location</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {location || 'No location specified'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldItemLast}>
              <Text style={styles.fieldLabel}>Verification Status</Text>
              <View style={styles.valueBox}>
                <View
                  style={[
                    styles.verificationBadge,
                    isVerified
                      ? styles.verificationBadgeVerified
                      : styles.verificationBadgeUnverified,
                  ]}
                >
                  <Ionicons
                    name={
                      isVerified
                        ? 'checkmark-circle'
                        : 'close-circle-outline'
                    }
                    size={14}
                    color={
                      isVerified ? colors.success : colors.textSecondary
                    }
                    style={styles.verificationBadgeIcon}
                  />
                  <Text
                    style={[
                      styles.verificationBadgeText,
                      isVerified
                        ? styles.verificationBadgeTextVerified
                        : styles.verificationBadgeTextUnverified,
                    ]}
                  >
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* E. Contact Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="call-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          <View style={styles.fieldList}>
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Contact Number</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {contactNumber || 'No contact number available'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {email || 'No email address available'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Business Address</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {address || 'No address available'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldItemLast}>
              <Text style={styles.fieldLabel}>Business Location</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {location || 'No location available'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Specialties */}
        {Array.isArray(specialties) && specialties.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={colors.primary}
                style={styles.sectionHeaderIcon}
              />
              <Text style={styles.sectionTitle}>Business Specialties</Text>
            </View>

            <View style={styles.specialtiesWrapper}>
              {specialties.map((specialty, index) => (
                <View key={`specialty-${index}`} style={styles.specialtyChip}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color={colors.primary}
                    style={styles.specialtyIcon}
                  />
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* F. Products Placeholder */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="cube-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Products</Text>
          </View>

          <View style={styles.emptyProductsArea}>
            <Ionicons
              name="cube-outline"
              size={36}
              color={colors.textMuted}
              style={styles.emptyProductsIcon}
            />
            <Text style={styles.emptyProductsText}>
              Your products will appear here
            </Text>
          </View>
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
  headerCentered: {
    justifyContent: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
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
  businessHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  businessLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  businessHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  businessNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs + 2,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
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
  fieldList: {
    marginTop: spacing.xs,
  },
  fieldItem: {
    marginBottom: spacing.md,
  },
  fieldItemLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs + 2,
  },
  valueBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  valueTextBold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  verificationBadgeVerified: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  verificationBadgeUnverified: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderDark,
  },
  verificationBadgeIcon: {
    marginRight: 1,
  },
  verificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  verificationBadgeTextVerified: {
    color: colors.success,
  },
  verificationBadgeTextUnverified: {
    color: colors.textSecondary,
  },
  specialtiesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  specialtyIcon: {
    marginRight: spacing.xs,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyProductsArea: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyProductsIcon: {
    marginBottom: spacing.xs + 2,
  },
  emptyProductsText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
