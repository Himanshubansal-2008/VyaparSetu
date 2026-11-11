import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function ProductListingScreen({
  navigation,
  route,
  products: propProducts,
  categories: propCategories,
  onBackPress,
  onNavigateToProductDetails,
  onNotificationPress,
  onCartPress,
}) {
  // Navigation / Route Parameters
  const initialCategory =
    route?.params?.selectedCategory ||
    route?.params?.categoryId ||
    'all';
  const initialSearch = route?.params?.searchQuery || '';

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());

  // Sorting State: null (Default) | 'price_asc' | 'price_desc'
  const [sortOption, setSortOption] = useState(null);

  // Categories API State
  const [apiCategories, setApiCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(
    propCategories === undefined && route?.params?.categories === undefined
  );

  // Products API State
  const [products, setProducts] = useState(propProducts || []);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(
    propProducts === undefined && route?.params?.products === undefined
  );
  const [error, setError] = useState(null);

  // Active request tracker to prevent stale responses
  const activeRequestIdRef = useRef(0);

  // Synchronize route param changes (e.g., navigating with new category from Home)
  useEffect(() => {
    const nextCategory =
      route?.params?.selectedCategory || route?.params?.categoryId;
    if (nextCategory !== undefined && nextCategory !== null) {
      setSelectedCategory(nextCategory || 'all');
    }
  }, [route?.params?.selectedCategory, route?.params?.categoryId]);

  useEffect(() => {
    if (route?.params?.searchQuery !== undefined) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route?.params?.searchQuery]);

  // Debounce search query input (350ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setDebouncedSearch('');
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Categories from Backend API
  const fetchCategoriesList = useCallback(async () => {
    if (propCategories !== undefined || route?.params?.categories !== undefined) {
      setIsLoadingCategories(false);
      return;
    }

    setIsLoadingCategories(true);
    try {
      const response = await getCategories();
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.categories)
        ? response.categories
        : [];

      const activeList = rawList.filter((cat) => cat && cat.isActive !== false);
      setApiCategories(activeList);
    } catch (err) {
      console.error('[ProductListingScreen] Error fetching categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [propCategories, route?.params?.categories]);

  useEffect(() => {
    fetchCategoriesList();
  }, [fetchCategoriesList]);

  // Memoized categories list with 'All' at the start
  const categoriesList = useMemo(() => {
    const baseList =
      propCategories !== undefined
        ? propCategories
        : route?.params?.categories !== undefined
        ? route.params.categories
        : apiCategories;

    const hasAll = baseList.some((c) => c.id === 'all');
    if (!hasAll) {
      return [{ id: 'all', name: 'All' }, ...baseList];
    }
    return baseList;
  }, [propCategories, route?.params?.categories, apiCategories]);

  // Fetch Products from Backend API with Combined Search, Category, and Sorting
  const fetchProductsList = useCallback(async () => {
    if (propProducts !== undefined || route?.params?.products !== undefined) {
      setIsLoading(false);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: 1,
        limit: 20,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (selectedCategory && selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }

      if (sortOption === 'price_asc') {
        params.sortBy = 'price';
        params.sortOrder = 'asc';
      } else if (sortOption === 'price_desc') {
        params.sortBy = 'price';
        params.sortOrder = 'desc';
      }

      const response = await getProducts(params);

      // Only apply state if this request is still the active one
      if (requestId === activeRequestIdRef.current) {
        const items = Array.isArray(response?.products)
          ? response.products
          : Array.isArray(response?.data?.products)
          ? response.data.products
          : Array.isArray(response)
          ? response
          : [];
        setProducts(items);
        setPagination(response?.pagination || null);
      }
    } catch (err) {
      if (requestId === activeRequestIdRef.current) {
        console.error('[ProductListingScreen] Error fetching products:', err);
        setError(err?.message || 'Failed to load products. Please check your connection.');
        setProducts([]);
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, selectedCategory, sortOption, propProducts, route?.params?.products]);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  // Navigation handlers
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
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

  const hasSearch = debouncedSearch.length > 0;
  const hasCategory = selectedCategory !== 'all';

  const categoryName = useMemo(() => {
    if (selectedCategory === 'all') return 'All Categories';
    const found = categoriesList.find((c) => c.id === selectedCategory);
    return found ? found.name : 'this category';
  }, [selectedCategory, categoriesList]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface}
      />

      {/* Shared Header Component */}
      <Header
        showBack={Boolean(
          onBackPress || navigation?.canGoBack?.() || navigation?.goBack
        )}
        onBackPress={handleBack}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        onSubmitSearch={() => Keyboard.dismiss()}
        onNotificationPress={onNotificationPress}
        onCartPress={onCartPress}
      />

      {/* Product Grid List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={handleProductPress}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>Explore Products</Text>
            <Text style={styles.pageSubtitle}>
              Discover wholesale products from verified businesses across India.
            </Text>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScrollWrapper}
              contentContainerStyle={styles.categoryScroll}
            >
              {categoriesList.map((category) => {
                const isSelected = selectedCategory === category.id;
                const label = category.id === 'all' ? 'All' : category.name;

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.chip,
                      isSelected ? styles.chipSelected : styles.chipUnselected,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${label}`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected
                          ? styles.chipTextSelected
                          : styles.chipTextUnselected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Price Sorting Options */}
            <View style={styles.sortSection}>
              <View style={styles.sortHeader}>
                <Ionicons name="swap-vertical" size={13} color={colors.textSecondary} />
                <Text style={styles.sortLabel}>Sort:</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sortScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.sortChip,
                    sortOption === null ? styles.sortChipSelected : styles.sortChipUnselected,
                  ]}
                  onPress={() => setSortOption(null)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Default sorting"
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      sortOption === null ? styles.sortChipTextSelected : styles.sortChipTextUnselected,
                    ]}
                  >
                    Default
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortChip,
                    sortOption === 'price_asc' ? styles.sortChipSelected : styles.sortChipUnselected,
                  ]}
                  onPress={() => setSortOption('price_asc')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Sort by Price: Low to High"
                >
                  <Ionicons
                    name="arrow-up"
                    size={11}
                    color={sortOption === 'price_asc' ? colors.textInverse : colors.primary}
                    style={{ marginRight: 2 }}
                  />
                  <Text
                    style={[
                      styles.sortChipText,
                      sortOption === 'price_asc' ? styles.sortChipTextSelected : styles.sortChipTextUnselected,
                    ]}
                  >
                    Price: Low to High
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortChip,
                    sortOption === 'price_desc' ? styles.sortChipSelected : styles.sortChipUnselected,
                  ]}
                  onPress={() => setSortOption('price_desc')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Sort by Price: High to Low"
                >
                  <Ionicons
                    name="arrow-down"
                    size={11}
                    color={sortOption === 'price_desc' ? colors.textInverse : colors.primary}
                    style={{ marginRight: 2 }}
                  />
                  <Text
                    style={[
                      styles.sortChipText,
                      sortOption === 'price_desc' ? styles.sortChipTextSelected : styles.sortChipTextUnselected,
                    ]}
                  >
                    Price: High to Low
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Results count & active filter summary */}
            <View style={styles.metaRow}>
              <Text style={styles.resultsCount}>
                {isLoading
                  ? 'Loading products...'
                  : `${products.length} product${products.length !== 1 ? 's' : ''} available`}
              </Text>
              <View style={styles.activeFiltersRow}>
                {selectedCategory !== 'all' && (
                  <TouchableOpacity
                    style={styles.resetCategoryChip}
                    onPress={() => setSelectedCategory('all')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetCategoryText}>Clear Category</Text>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </TouchableOpacity>
                )}
                {sortOption !== null && (
                  <TouchableOpacity
                    style={styles.resetCategoryChip}
                    onPress={() => setSortOption(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetCategoryText}>Reset Sort</Text>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerContainer} testID="products-loading">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching products...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer} testID="products-error">
              <Ionicons name="alert-circle-outline" size={32} color={colors.error || '#EF4444'} />
              <Text style={styles.errorTitle}>Failed to load products</Text>
              <Text style={styles.errorSubtitle}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchProductsList}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Retry fetching products"
              >
                <Ionicons name="refresh" size={14} color={colors.textInverse} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState
              icon="search-outline"
              title="No products found"
              description={
                hasSearch && hasCategory
                  ? `No products in ${categoryName} match "${debouncedSearch}". Try clearing your search or category filter.`
                  : hasSearch
                  ? `No products found matching "${debouncedSearch}". Try searching with another term.`
                  : hasCategory
                  ? `There are currently no products in ${categoryName}. Try exploring other categories.`
                  : 'Wholesale listings will appear here once suppliers add their products.'
              }
              actionText={hasSearch ? 'Clear Search' : hasCategory ? 'All Categories' : undefined}
              onActionPress={
                hasSearch
                  ? () => setSearchQuery('')
                  : hasCategory
                  ? () => setSelectedCategory('all')
                  : undefined
              }
              secondaryActionText={hasSearch && hasCategory ? 'Clear All Filters' : undefined}
              onSecondaryActionPress={
                hasSearch && hasCategory
                  ? () => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSortOption(null);
                    }
                  : undefined
              }
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
  listContainer: {
    paddingHorizontal: spacing.sm + 2,
    paddingBottom: spacing.xxxl,
  },
  headerSection: {
    paddingHorizontal: spacing.xs + 2,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: '400',
  },
  categoryScrollWrapper: {
    marginTop: spacing.md,
    marginHorizontal: -(spacing.xs + 2),
  },
  categoryScroll: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: colors.textSecondary,
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
    marginHorizontal: -(spacing.xs + 2),
  },
  sortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xs + 2,
    paddingRight: spacing.xs,
    gap: 3,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortScroll: {
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs + 2,
  },
  sortChipSelected: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sortChipUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  sortChipTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  sortChipTextUnselected: {
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resetCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  resetCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  centerContainer: {
    paddingVertical: spacing.xxxl * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    marginVertical: spacing.xxxl,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: spacing.xs + 2,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error || '#DC2626',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
});
