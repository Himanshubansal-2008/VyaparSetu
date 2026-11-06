import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import CategoryList from '../components/CategoryList';
import FeaturedProducts from '../components/FeaturedProducts';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import {
  products as defaultProducts,
  categories as defaultCategories,
} from '../data/products';
import {
  getSessionBusinessProfile,
  setSessionBusinessProfile,
  subscribeBusinessProfile,
  isUserCreatedProfile,
  STORAGE_KEY_SESSION_PROFILE,
} from '../data/businessProfileData';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function HomeScreen({
  navigation,
  route,
  products: propProducts,
  categories: propCategories,
  onNavigateToProductListing,
  onNavigateToProductDetails,
  onNavigateToAddProduct,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  selectedCategory: propSelectedCategory,
  onSelectCategory: propOnSelectCategory,
  onNotificationPress,
  onCartPress,
}) {
  const allProducts =
    propProducts !== undefined
      ? propProducts
      : route?.params?.products !== undefined
      ? route.params.products
      : defaultProducts;

  const allCategories =
    propCategories !== undefined
      ? propCategories
      : route?.params?.categories !== undefined
      ? route.params.categories
      : defaultCategories;

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery =
    propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;
  const handleSearchChange = propOnSearchChange || setInternalSearchQuery;

  // Track saved business profile to dynamically update the Business Profile card
  const [savedProfile, setSavedProfile] = useState(getSessionBusinessProfile);
  const [isProfileRequiredModalVisible, setIsProfileRequiredModalVisible] =
    useState(false);

  useEffect(() => {
    setSavedProfile(getSessionBusinessProfile());
    return subscribeBusinessProfile((updated) => {
      setSavedProfile(updated);
    });
  }, []);

  const hasSavedProfile = isUserCreatedProfile(savedProfile);

  // Selected category state with 'all' as default option
  const [internalSelectedCategory, setInternalSelectedCategory] =
    useState('all');
  const selectedCategory =
    propSelectedCategory !== undefined
      ? propSelectedCategory
      : internalSelectedCategory;

  const handleSelectCategory = (cat) => {
    const catId = typeof cat === 'string' ? cat : cat?.id || 'all';
    if (propOnSelectCategory) {
      propOnSelectCategory(catId);
    } else {
      setInternalSelectedCategory(catId);
    }
  };

  const handleClearFilters = () => {
    handleSearchChange('');
    handleSelectCategory('all');
  };

  const handleNavigateToProductListing = (params = {}) => {
    const listingParams = {
      selectedCategory:
        selectedCategory !== 'all' ? selectedCategory : 'all',
      searchQuery: searchQuery || '',
      ...params,
    };
    if (onNavigateToProductListing) {
      onNavigateToProductListing(listingParams);
    } else if (navigation?.navigate) {
      navigation.navigate('ProductListing', listingParams);
    }
  };

  const handleProductPress = (product) => {
    const productId =
      product?.id || (typeof product === 'string' ? product : undefined);
    const productParams = {
      productId,
      product: typeof product === 'object' ? product : undefined,
    };
    if (onNavigateToProductDetails) {
      onNavigateToProductDetails(productParams);
    } else if (navigation?.navigate) {
      navigation.navigate('ProductDetails', productParams);
    }
  };

  const handleBusinessCardPress = () => {
    if (hasSavedProfile) {
      const profile = getSessionBusinessProfile();
      navigation?.navigate('BusinessProfile', {
        business: profile,
        businessId: profile?.id,
      });
    } else {
      navigation?.navigate('CreateBusinessProfile');
    }
  };

  const handleAddProductPress = async () => {
    try {
      // 1. Check in-memory shared profile first
      let currentProfile = getSessionBusinessProfile() || savedProfile;

      // 2. If not found in memory, perform a safe disk read from AsyncStorage as fallback
      if (!isUserCreatedProfile(currentProfile)) {
        const storedJson = await AsyncStorage.getItem(
          STORAGE_KEY_SESSION_PROFILE
        );
        if (storedJson) {
          const parsed = JSON.parse(storedJson);
          if (isUserCreatedProfile(parsed)) {
            currentProfile = parsed;
            setSessionBusinessProfile(parsed);
          }
        }
      }

      // 3. Evaluate if valid user-created business profile exists
      if (isUserCreatedProfile(currentProfile)) {
        const params = {
          business: currentProfile,
          businessId: currentProfile.id,
          sellerId: currentProfile.sellerId || currentProfile.id,
        };

        if (onNavigateToAddProduct) {
          onNavigateToAddProduct(params);
        } else if (navigation?.navigate) {
          navigation.navigate('AddProduct', params);
        }
      } else {
        // Business profile does not exist: display the requirement message modal
        setIsProfileRequiredModalVisible(true);
      }
    } catch (error) {
      console.warn('[HomeScreen] Failed to verify business profile:', error);
      Alert.alert(
        'Verification Error',
        'Unable to verify your business profile at this time. Please try again.'
      );
    }
  };

  const trimmedQuery = searchQuery.trim();
  const searchTokens = useMemo(() => {
    return trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  }, [trimmedQuery]);

  const hasSearch = searchTokens.length > 0;
  const hasCategory = selectedCategory !== 'all';
  const categoryName =
    allCategories.find((c) => c.id === selectedCategory)?.name || 'All Products';

  // Filter products matching BOTH search query (case-insensitive, multi-token, whitespace-safe) and selected category
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      if (!product) return false;

      const matchesCategory =
        !hasCategory ||
        product.categoryId === selectedCategory ||
        product.category === selectedCategory;

      if (!matchesCategory) return false;

      if (hasSearch) {
        const searchableText = [
          product.name,
          product.categoryName,
          product.category,
          product.brand,
          product.manufacturer,
          product.sellerName,
          product.location,
          ...(Array.isArray(product.tags) ? product.tags : []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const allTokensMatch = searchTokens.every((token) =>
          searchableText.includes(token)
        );
        if (!allTokensMatch) return false;
      }

      return true;
    });
  }, [allProducts, hasCategory, selectedCategory, hasSearch, searchTokens]);

  const featuredProducts = useMemo(
    () => allProducts.filter((product) => product.isFeatured),
    [allProducts]
  );

  const quickSearches = [
    'Cotton Bags',
    'Bluetooth Earphones',
    'Blue Pottery',
    'Organic Spices',
    'Ceramic Planters',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface}
      />

      {/* 1. Header + Create Business Profile Card + Search Bar */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={() => handleSearchChange('')}
        onSubmitSearch={() => {
          if (searchQuery.trim()) {
            handleNavigateToProductListing({
              searchQuery: searchQuery.trim(),
            });
          }
        }}
        onNotificationPress={onNotificationPress}
        onCartPress={onCartPress}
      >
        {/* Create Business Profile Card: positioned directly below header top row and above search bar */}
        <TouchableOpacity
          style={styles.createBusinessCard}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            hasSavedProfile
              ? 'My Business Profile - Start selling on VyaparSetu'
              : 'Create Business Profile - Start selling on VyaparSetu'
          }
          onPress={handleBusinessCardPress}
        >
          <View style={styles.createBusinessIconBox}>
            <Ionicons
              name="storefront-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.createBusinessTextCol}>
            <Text style={styles.createBusinessHeading}>
              {hasSavedProfile
                ? 'My Business Profile'
                : 'Create Business Profile'}
            </Text>
            <Text style={styles.createBusinessSubtitle} numberOfLines={1}>
              Start selling on VyaparSetu
            </Text>
          </View>
          <View style={styles.createBusinessArrowBox}>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.primary}
            />
          </View>
        </TouchableOpacity>

        {/* Add Product Card: positioned directly below Business Profile card and above search bar */}
        <TouchableOpacity
          style={styles.addProductCard}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add Product - List a new product on VyaparSetu"
          onPress={handleAddProductPress}
        >
          <View style={styles.addProductIconBox}>
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={colors.success}
            />
          </View>
          <View style={styles.addProductTextCol}>
            <Text style={styles.addProductHeading}>Add Product</Text>
            <Text style={styles.addProductSubtitle} numberOfLines={1}>
              List a new product on VyaparSetu
            </Text>
          </View>
          <View style={styles.addProductArrowBox}>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.primary}
            />
          </View>
        </TouchableOpacity>
      </Header>

      {/* 2. Product Categories — horizontal scroll strip */}
      <CategoryList
        categories={allCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* 3. Featured Products — horizontal carousel */}
      <FeaturedProducts
        products={featuredProducts}
        onProductPress={handleProductPress}
        onViewAllPress={() => handleNavigateToProductListing()}
      />

      {/* 4. Product Grid — filtered by search query */}
      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={handleProductPress}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.contentContainer}>
            {hasSearch ? (
              <View style={styles.searchActiveCard}>
                <View style={styles.searchResultHeader}>
                  <Ionicons name="search" size={18} color={colors.primary} />
                  <Text style={styles.searchResultTitle}>
                    Searching for: "{trimmedQuery}"
                  </Text>
                </View>
                <Text style={styles.searchResultSub}>
                  {filteredProducts.length} product
                  {filteredProducts.length !== 1 ? 's' : ''} found
                  {hasCategory ? ` in ${categoryName}` : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.quickSearchSection}>
                <Text style={styles.quickSearchLabel}>Popular B2B Searches</Text>
                <View style={styles.tagsWrapper}>
                  {quickSearches.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.tagChip}
                      onPress={() => handleSearchChange(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trending-up"
                        size={13}
                        color={colors.primary}
                        style={styles.tagIcon}
                      />
                      <Text style={styles.tagText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {hasSearch && hasCategory
                    ? `${categoryName} Results`
                    : hasSearch
                      ? 'Search Results'
                      : !hasCategory
                        ? 'All Products'
                        : categoryName}
                </Text>
                <Text style={styles.productCount}>
                  {filteredProducts.length} item
                  {filteredProducts.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() =>
                  handleNavigateToProductListing({
                    selectedCategory:
                      selectedCategory !== 'all' ? selectedCategory : 'all',
                  })
                }
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View All Products"
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={colors.primaryLight}
                />
              </TouchableOpacity>
            </View>
          </View>
        }
        ListFooterComponent={
          filteredProducts.length > 0 ? (
            <View style={styles.footerActionContainer}>
              <TouchableOpacity
                style={styles.viewAllProductsButton}
                onPress={() =>
                  handleNavigateToProductListing({
                    selectedCategory:
                      selectedCategory !== 'all' ? selectedCategory : 'all',
                  })
                }
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="View All Products"
              >
                <Text style={styles.viewAllProductsText}>View All Products</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.textInverse}
                  style={styles.viewAllIcon}
                />
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !allProducts || allProducts.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No products available right now"
              description="Check back soon as sellers add new wholesale products to the marketplace."
            />
          ) : hasSearch && hasCategory ? (
            <EmptyState
              icon="search-outline"
              title="No products found in this category"
              description={`No products in ${categoryName} match "${trimmedQuery}". Try another search or clear your filters.`}
              actionText="Clear Search"
              onActionPress={() => handleSearchChange('')}
              secondaryActionText="Clear Filters"
              onSecondaryActionPress={handleClearFilters}
            />
          ) : hasSearch ? (
            <EmptyState
              icon="search-outline"
              title="No products found"
              description={`No products match "${trimmedQuery}". Try a different search term.`}
              actionText="Clear Search"
              onActionPress={() => handleSearchChange('')}
            />
          ) : hasCategory ? (
            <EmptyState
              icon="file-tray-outline"
              title="No products available in this category"
              description={`There are currently no products in ${categoryName}. Try exploring other categories or view all products.`}
              actionText="All Categories"
              onActionPress={() => handleSelectCategory('all')}
            />
          ) : (
            <EmptyState
              icon="cube-outline"
              title="No products available right now"
              description="Check back soon as sellers add new wholesale products to the marketplace."
            />
          )
        }
      />

      {/* Business Profile Required Modal */}
      <Modal
        visible={isProfileRequiredModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileRequiredModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsProfileRequiredModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.modalIconBox}>
              <Ionicons
                name="storefront-outline"
                size={32}
                color={colors.primary}
              />
            </View>

            <Text style={styles.modalHeading}>Business Profile Required</Text>
            <Text style={styles.modalMessage}>
              You need to create a business profile before adding products. Create
              your business profile to start listing products on VyaparSetu.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                setIsProfileRequiredModalVisible(false);
                navigation?.navigate('CreateBusinessProfile');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create Business Profile"
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.textInverse}
              />
              <Text style={styles.modalPrimaryButtonText}>
                Create Business Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setIsProfileRequiredModalVisible(false)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
  contentContainer: {
    paddingHorizontal: spacing.xs + 2,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  quickSearchSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  quickSearchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tagIcon: {
    marginRight: spacing.xs,
  },
  tagText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  searchActiveCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  searchResultSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  gridContainer: {
    paddingHorizontal: spacing.sm + 2,
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  productCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: 3,
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  footerActionContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  viewAllProductsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
    marginRight: spacing.xs,
  },
  viewAllIcon: {
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  clearSearchButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  clearSearchButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  clearFiltersButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearFiltersButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  createBusinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  createBusinessIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.infoLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  createBusinessTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  createBusinessHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  createBusinessSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  createBusinessArrowBox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs + 2,
  },
  addProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm + 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  addProductIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  addProductTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  addProductHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  addProductSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  addProductArrowBox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs + 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.infoLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  modalPrimaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    gap: spacing.xs + 2,
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  modalCancelButton: {
    width: '100%',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
