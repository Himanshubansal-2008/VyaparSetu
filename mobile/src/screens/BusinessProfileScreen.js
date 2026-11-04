import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  businessProfileData,
  getBusinessById,
  getBusinessByName,
  getSessionBusinessProfile,
} from '../data/businessProfileData';
import { products as defaultProducts } from '../data/products';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';

export default function BusinessProfileScreen({
  navigation,
  route,
  onBackPress,
  business: propBusiness,
  products: propProducts,
  onNavigateToProductDetails,
}) {
  // 1. Resolve target business dynamically using ID, object, or lookup
  const resolvedBusiness = useMemo(() => {
    // Explicit business prop
    if (
      propBusiness &&
      typeof propBusiness === 'object' &&
      (propBusiness.id || propBusiness.businessName)
    ) {
      return propBusiness;
    }

    // Business object passed in route params
    if (
      route?.params?.business &&
      typeof route.params.business === 'object' &&
      (route.params.business.id || route.params.business.businessName)
    ) {
      return route.params.business;
    }

    if (
      route?.params?.businessProfile &&
      typeof route.params.businessProfile === 'object' &&
      (route.params.businessProfile.id || route.params.businessProfile.businessName)
    ) {
      return route.params.businessProfile;
    }

    // Direct submitted business object passed at root of route params
    if (
      route?.params &&
      typeof route.params === 'object' &&
      route.params.businessName &&
      (route.params.isSubmitted || route.params.category || route.params.description)
    ) {
      return route.params;
    }

    // Lookup by businessId or sellerId
    const targetId =
      route?.params?.businessId ??
      route?.params?.sellerId ??
      route?.params?.id;

    if (targetId !== undefined && targetId !== null && String(targetId).trim()) {
      const cleanTargetId = String(targetId).trim().toLowerCase();

      // Check if target matches session submitted business profile
      const sessionProfile = getSessionBusinessProfile();
      if (
        sessionProfile &&
        ((sessionProfile.id && sessionProfile.id.toLowerCase() === cleanTargetId) ||
          (sessionProfile.sellerId &&
            sessionProfile.sellerId.toLowerCase() === cleanTargetId))
      ) {
        return sessionProfile;
      }

      const found = getBusinessById(String(targetId));
      if (found) return found;

      // Try matching by name if provided in params alongside an ID
      if (route?.params?.businessName || route?.params?.sellerName) {
        const foundByName = getBusinessByName(
          String(route.params.businessName || route.params.sellerName)
        );
        if (foundByName) return foundByName;
      }

      // Explicit ID was provided but does not match any known business
      return null;
    }

    // Lookup by business name if provided without ID
    if (route?.params?.businessName || route?.params?.sellerName) {
      const foundByName = getBusinessByName(
        String(route.params.businessName || route.params.sellerName)
      );
      if (foundByName) return foundByName;
      return null;
    }

    // If route params explicitly has businessId as null/undefined (missing business reference)
    if (route?.params && ('businessId' in route.params || 'sellerId' in route.params)) {
      return null;
    }

    // Priority 1: Check if a business profile was submitted during this session
    const sessionProfile = getSessionBusinessProfile();
    if (sessionProfile) {
      return sessionProfile;
    }

    // Priority 2: Standalone fallback to mock data (Sharma Handicrafts)
    return businessProfileData;
  }, [propBusiness, route?.params]);

  const allProducts =
    propProducts !== undefined
      ? propProducts
      : route?.params?.products !== undefined
      ? route.params.products
      : defaultProducts;

  const businessProducts = useMemo(() => {
    if (!Array.isArray(allProducts) || !resolvedBusiness) return [];

    const normId = resolvedBusiness.id
      ? String(resolvedBusiness.id).trim().toLowerCase()
      : null;
    const normName = resolvedBusiness.businessName
      ? String(resolvedBusiness.businessName).trim().toLowerCase()
      : null;

    if (!normId && !normName) return [];

    // For submitted businesses, only match by business ID to prevent accidental collision
    // with existing mock sellers (e.g. if the user created a business named 'Sharma Handicrafts')
    const isSubmittedBusiness = Boolean(
      resolvedBusiness.isSubmitted ||
      (normId && normId.startsWith('biz-submitted-'))
    );

    return allProducts.filter((product) => {
      if (!product) return false;

      const pSellerId = product.sellerId
        ? String(product.sellerId).trim().toLowerCase()
        : null;
      const pBusinessId = product.businessId
        ? String(product.businessId).trim().toLowerCase()
        : null;
      const pSellerName = product.sellerName
        ? String(product.sellerName).trim().toLowerCase()
        : null;

      const matchesId =
        Boolean(normId) && (pSellerId === normId || pBusinessId === normId);

      if (isSubmittedBusiness) {
        return matchesId;
      }

      const matchesName =
        Boolean(normName) && pSellerName === normName;

      return matchesId || matchesName;
    });
  }, [allProducts, resolvedBusiness]);

  const handleProductPress = (product) => {
    if (onNavigateToProductDetails) {
      onNavigateToProductDetails(product);
    } else if (navigation?.navigate) {
      const productId = product?.id || product;
      navigation.navigate('ProductDetails', {
        productId,
        product: typeof product === 'object' ? product : undefined,
      });
    }
  };

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

  // If business was not found or invalid businessId was provided, render error state
  if (!resolvedBusiness) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
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

        <View style={styles.errorContainer}>
          <EmptyState
            icon="business-outline"
            iconSize={54}
            iconColor={colors.textMuted}
            title="Business Not Found"
            description="The requested business profile could not be found or has an invalid business ID."
            actionText={canGoBack ? 'Go Back' : undefined}
            onActionPress={canGoBack ? handleBack : undefined}
            actionIcon={canGoBack ? 'arrow-back' : undefined}
          />
        </View>
      </SafeAreaView>
    );
  }

  const {
    businessName = 'Business Profile',
    description = 'No business description provided.',
    category = '',
    ownerName = '',
    contactNumber = '',
    email = '',
    address = '',
    location = '',
    isVerified = false,
    specialties = [],
  } = resolvedBusiness;

  const specialtiesList = Array.isArray(specialties) ? specialties : [];

  const handlePhonePress = async () => {
    if (!contactNumber) return;
    const sanitizedNumber = String(contactNumber).replace(/[^\d+]/g, '');
    const url = `tel:${sanitizedNumber}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url).catch((err) => {
          console.warn('[BusinessProfileScreen] Cannot open phone dialer:', err);
          Alert.alert(
            'Unable to place call',
            `Device cannot make a call to ${contactNumber}.`
          );
        });
      }
    } catch (error) {
      console.warn('[BusinessProfileScreen] Phone dialer error:', error);
      Alert.alert(
        'Unable to place call',
        `An error occurred while trying to open dialer: ${error.message || error}`
      );
    }
  };

  const handleEmailPress = async () => {
    if (!email) return;
    const url = `mailto:${email.trim()}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url).catch((err) => {
          console.warn('[BusinessProfileScreen] Cannot open email client:', err);
          Alert.alert(
            'Unable to send email',
            `No email client available to email ${email}.`
          );
        });
      }
    } catch (error) {
      console.warn('[BusinessProfileScreen] Email client error:', error);
      Alert.alert(
        'Unable to send email',
        `An error occurred while trying to open email: ${error.message || error}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Screen Heading */}
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
        {/* 1. Business Header (Logo, Name, Category Badge, Verification Badge) */}
        <View style={styles.businessHeaderCard}>
          <View style={styles.businessLogoPlaceholder}>
            {resolvedBusiness?.imageUri || resolvedBusiness?.image ? (
              <Image
                source={{
                  uri: resolvedBusiness.imageUri || resolvedBusiness.image,
                }}
                style={styles.businessLogoImage}
              />
            ) : (
              <Ionicons
                name="storefront-outline"
                size={32}
                color={colors.primary}
              />
            )}
          </View>
          <View style={styles.businessHeaderInfo}>
            <Text style={styles.businessNameText}>
              {businessName}
            </Text>

            <View style={styles.headerBadgesRow}>
              {/* 2. Business Category Badge */}
              {Boolean(category) && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {category}
                  </Text>
                </View>
              )}

              {/* 3. Business Verification Badge */}
              <View
                style={[
                  styles.verificationBadge,
                  isVerified
                    ? styles.verificationBadgeVerified
                    : styles.verificationBadgeUnverified,
                ]}
              >
                <Ionicons
                  name={isVerified ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={13}
                  color={isVerified ? colors.success : colors.textSecondary}
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

        {/* 4. About Business Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>About Business</Text>
          </View>
          <Text style={styles.aboutText}>
            {description}
          </Text>
        </View>

        {/* 5. Owner Information Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Owner Information</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons
                name="person-circle-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Business Owner</Text>
              <Text style={styles.infoValue}>
                {ownerName || 'Not specified'}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Contact Information Section (Clickable Phone & Email) */}
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

          <View style={styles.contactList}>
            {/* Phone Number (tel: interaction) */}
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handlePhonePress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Call ${contactNumber || 'business'}`}
            >
              <View style={styles.contactIconBox}>
                <Ionicons name="call" size={17} color={colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={styles.contactLinkText}>
                  {contactNumber || 'Not available'}
                </Text>
              </View>
              <Ionicons
                name="open-outline"
                size={16}
                color={colors.primaryLight}
              />
            </TouchableOpacity>

            {/* Email Address (mailto: interaction) */}
            <TouchableOpacity
              style={[styles.contactItem, styles.contactItemLast]}
              onPress={handleEmailPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Email ${email || 'business'}`}
            >
              <View style={styles.contactIconBox}>
                <Ionicons name="mail" size={17} color={colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.contactLinkText}>
                  {email || 'Not available'}
                </Text>
              </View>
              <Ionicons
                name="open-outline"
                size={16}
                color={colors.primaryLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Business Address and Location Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Business Address & Location</Text>
          </View>

          <View style={styles.addressList}>
            {/* Location (City, State) */}
            <View style={styles.addressItem}>
              <View style={styles.infoIconBox}>
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {location || 'Location not specified'}
                </Text>
              </View>
            </View>

            {/* Complete Address */}
            <View style={[styles.addressItem, styles.addressItemLast]}>
              <View style={styles.infoIconBox}>
                <Ionicons
                  name="location"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Business Address</Text>
                <Text style={styles.addressText}>
                  {address || 'Address not specified'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 8. Business Specialties Section */}
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

          {specialtiesList.length > 0 ? (
            <View style={styles.specialtiesWrapper}>
              {specialtiesList.map((specialty, index) => (
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
          ) : (
            <Text style={styles.emptySpecialtiesText}>
              No specialties listed for this business.
            </Text>
          )}
        </View>

        {/* 9. Business Products Section */}
        <View style={[styles.card, businessProducts.length > 0 && styles.productsCard]}>
          <View style={[styles.sectionHeaderRow, businessProducts.length > 0 && styles.productsSectionHeader]}>
            <Ionicons
              name="cube-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Products</Text>
            {businessProducts.length > 0 && (
              <View style={styles.productCountBadge}>
                <Text style={styles.productCountText}>
                  {businessProducts.length}
                </Text>
              </View>
            )}
          </View>

          {businessProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {businessProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onPress={handleProductPress}
                  style={styles.productCardCol}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyProductsContainer}>
              <Ionicons
                name="cube-outline"
                size={40}
                color={colors.textMuted}
                style={styles.emptyProductsIcon}
              />
              <Text style={styles.emptyProductsTitle}>
                No products listed by this business yet.
              </Text>
            </View>
          )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
    overflow: 'hidden',
  },
  businessLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
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
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 1,
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
  aboutText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  contactList: {
    gap: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactItemLast: {
    // handled by gap or margin
  },
  contactIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactContent: {
    flex: 1,
  },
  contactLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  addressList: {
    gap: spacing.sm,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressItemLast: {
    // handled by gap
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  specialtiesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  emptySpecialtiesText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  productsCard: {
    paddingHorizontal: spacing.sm,
  },
  productsSectionHeader: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productCardCol: {
    width: '50%',
  },
  productCountBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.xs,
  },
  productCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyProductsIcon: {
    marginBottom: spacing.xs + 2,
  },
  emptyProductsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
