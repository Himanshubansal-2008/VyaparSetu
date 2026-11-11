import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import CategoryList from '../components/CategoryList';
import FeaturedProducts from '../components/FeaturedProducts';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { getFeaturedProducts, getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function HomeScreen({
  navigation,
  route,
  products: propProducts,
  categories: propCategories,
  featuredProducts: propFeaturedProducts,
  onNavigateToProductListing,
  onNavigateToProductDetails,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  selectedCategory: propSelectedCategory,
  onSelectCategory: propOnSelectCategory,
  onNotificationPress,
  onCartPress,
}) {
  // --- Products State & Real API Integration ---
  const [apiProducts, setApiProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(
    propProducts === undefined && route?.params?.products === undefined
  );
  const [productsError, setProductsError] = useState(null);

  const fetchProductsList = useCallback(async () => {
    // If explicitly provided via props or route params, skip API call
    if (propProducts !== undefined || route?.params?.products !== undefined) {
      setIsLoadingProducts(false);
      return;
    }

    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      // Home screen product grid loads curated products using limit parameter
      const response = await getProducts({ limit: 12, page: 1 });
      const items = Array.isArray(response?.products)
        ? response.products
        : Array.isArray(response?.data?.products)
        ? response.data.products
        : Array.isArray(response)
        ? response
        : [];
      setApiProducts(items);
    } catch (err) {
      console.error('[HomeScreen] Error fetching products:', err);
      setProductsError(err?.message || 'Failed to load products.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [propProducts, route?.params?.products]);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  const allProducts = useMemo(() => {
    if (propProducts !== undefined) return propProducts;
    if (route?.params?.products !== undefined) return route.params.products;
    return apiProducts;
  }, [propProducts, route?.params?.products, apiProducts]);

  // --- Categories State & API Integration ---
  const [apiCategories, setApiCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(
    propCategories === undefined && route?.params?.categories === undefined
  );
  const [categoriesError, setCategoriesError] = useState(null);

  const fetchCategoriesList = useCallback(async () => {
    // If explicitly provided via props or route params, skip API call
    if (propCategories !== undefined || route?.params?.categories !== undefined) {
      setIsLoadingCategories(false);
      return;
    }

    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const response = await getCategories();
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.categories)
        ? response.categories
        : [];

      // Filter only active categories (isActive !== false)
      const activeList = rawList.filter((cat) => cat && cat.isActive !== false);
      setApiCategories(activeList);
    } catch (err) {
      console.error('[HomeScreen] Error fetching categories:', err);
      setCategoriesError(err?.message || 'Failed to load categories.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [propCategories, route?.params?.categories]);

  useEffect(() => {
    fetchCategoriesList();
  }, [fetchCategoriesList]);

  const allCategories = useMemo(() => {
    if (propCategories !== undefined) return propCategories;
    if (route?.params?.categories !== undefined) return route.params.categories;
    return apiCategories;
  }, [propCategories, route?.params?.categories, apiCategories]);

  // --- Featured Products State & API Integration ---
  const [apiFeaturedProducts, setApiFeaturedProducts] = useState([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(
    propFeaturedProducts === undefined && route?.params?.featuredProducts === undefined
  );
  const [featuredError, setFeaturedError] = useState(null);

  const fetchFeatured = useCallback(async () => {
    // If explicitly provided via props or route params, skip API call
    if (propFeaturedProducts !== undefined || route?.params?.featuredProducts !== undefined) {
      setIsLoadingFeatured(false);
      return;
    }

    setIsLoadingFeatured(true);
    setFeaturedError(null);
    try {
      const response = await getFeaturedProducts({ limit: 10 });
      const items = Array.isArray(response?.products)
        ? response.products
        : Array.isArray(response?.data?.products)
        ? response.data.products
        : Array.isArray(response)
        ? response
        : [];
      setApiFeaturedProducts(items);
    } catch (err) {
      console.error('[HomeScreen] Error fetching featured products:', err);
      setFeaturedError(err?.message || 'Failed to load featured products.');
    } finally {
      setIsLoadingFeatured(false);
    }
  }, [propFeaturedProducts, route?.params?.featuredProducts]);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  const featuredProducts = useMemo(() => {
    if (propFeaturedProducts !== undefined) return propFeaturedProducts;
    if (route?.params?.featuredProducts !== undefined) return route.params.featuredProducts;
    return apiFeaturedProducts;
  }, [propFeaturedProducts, route?.params?.featuredProducts, apiFeaturedProducts]);

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery =
    propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;
  const handleSearchChange = propOnSearchChange || setInternalSearchQuery;

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
    // Navigate to Product Listing screen passing categoryId
    handleNavigateToProductListing({
      selectedCategory: catId,
      categoryId: catId,
    });
  };

  const handleClearFilters = () => {
    handleSearchChange('');
    handleSelectCategory('all');
  };

  const handleNavigateToProductListing = (params = {}) => {
    const listingParams = {
      selectedCategory:
        selectedCategory !== 'all' ? selectedCategory : 'all',
      categoryId:
        selectedCategory !== 'all' ? selectedCategory : undefined,
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

      const categoryIdVal =
        product.categoryId ||
        (typeof product.category === 'object' ? product.category?.id : product.category);

      const matchesCategory =
        !hasCategory ||
        categoryIdVal === selectedCategory ||
        product.category === selectedCategory ||
        (typeof product.category === 'object' && product.category?.name === selectedCategory);

      if (!matchesCategory) return false;

      if (hasSearch) {
        const searchableText = [
          product.name,
          typeof product.category === 'object' ? product.category?.name : product.category,
          product.categoryName,
          product.brand,
          product.manufacturer,
          product.sellerName,
          product.business?.name,
          product.location,
          product.business?.city,
          product.business?.state,
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

      {/* 1. Header + Search Bar */}
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
      />

      {/* 2. Product Categories — horizontal scroll strip */}
      <CategoryList
        categories={allCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        loading={isLoadingCategories}
        error={categoriesError}
        onRetry={fetchCategoriesList}
      />

      {/* 3. Featured Products — horizontal carousel */}
      <FeaturedProducts
        products={featuredProducts}
        loading={isLoadingFeatured}
        error={featuredError}
        onRetry={fetchFeatured}
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
                  {isLoadingProducts
                    ? 'Loading...'
                    : `${filteredProducts.length} item${
                        filteredProducts.length !== 1 ? 's' : ''
                      }`}
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
          isLoadingProducts ? (
            <View style={styles.stateContainer} testID="home-products-loading">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.stateLoadingText}>Loading products...</Text>
            </View>
          ) : productsError ? (
            <View style={styles.stateErrorContainer} testID="home-products-error">
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={colors.error || '#EF4444'}
              />
              <Text style={styles.stateErrorTitle}>Failed to load products</Text>
              <Text style={styles.stateErrorSubtitle}>{productsError}</Text>
              <TouchableOpacity
                style={styles.stateRetryButton}
                onPress={fetchProductsList}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Retry loading products"
              >
                <Ionicons
                  name="refresh"
                  size={14}
                  color={colors.textInverse}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.stateRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !allProducts || allProducts.length === 0 ? (
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
  stateContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stateLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  stateErrorContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateErrorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  stateErrorSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.md,
  },
  stateRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  stateRetryText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
});
