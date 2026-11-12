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
import {
  products as defaultProducts,
  categories as defaultCategories,
  isProductActive,
  filterActiveProducts,
} from '../data/products';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

const PAGE_LIMIT = 10;

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Categories API State
  const [apiCategories, setApiCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(
    propCategories === undefined && route?.params?.categories === undefined
  );

  // Products API State
  const [products, setProducts] = useState(() =>
    filterActiveProducts(propProducts || route?.params?.products || [])
  );
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
    if (nextCategory !== undefined && nextCategory !== null && nextCategory !== selectedCategory) {
      setSelectedCategory(nextCategory || 'all');
      setCurrentPage(1);
    }
  }, [route?.params?.selectedCategory, route?.params?.categoryId]);

  useEffect(() => {
    if (route?.params?.searchQuery !== undefined && route.params.searchQuery !== searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route?.params?.searchQuery]);

  // Debounce search query input (350ms) and reset page to 1
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setDebouncedSearch('');
      setCurrentPage(1);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setCurrentPage(1);
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
      setApiCategories(activeList.length > 0 ? activeList : defaultCategories);
    } catch (err) {
      console.warn('[ProductListingScreen] Error fetching categories, using local fallback:', err);
      setApiCategories(defaultCategories);
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

  // Filter change handlers that reset page to 1
  const handleCategoryPress = (catId) => {
    if (catId !== selectedCategory) {
      setSelectedCategory(catId);
      setCurrentPage(1);
    }
  };

  const handleSortPress = (newSort) => {
    if (newSort !== sortOption) {
      setSortOption(newSort);
      setCurrentPage(1);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setSortOption(null);
    setCurrentPage(1);
  };

  // Pagination navigation controls
  const handlePreviousPage = () => {
    if (currentPage > 1 && !isLoading) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  };

  const handleNextPage = () => {
    const totalPages = pagination?.totalPages || 1;
    if (currentPage < totalPages && !isLoading) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Fetch Products from Backend API with Combined Search, Category, Sorting, and Pagination
  const fetchProductsList = useCallback(async () => {
    if (propProducts !== undefined || route?.params?.products !== undefined) {
      const source = propProducts !== undefined ? propProducts : route.params.products;
      setProducts(filterActiveProducts(source || []));
      setIsLoading(false);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        limit: PAGE_LIMIT,
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
        setProducts(filterActiveProducts(items));

        // Normalize pagination data from backend response
        const rawPagination = response?.pagination || response?.data?.pagination || null;
        if (rawPagination) {
          const total = Number(rawPagination.total ?? rawPagination.totalProducts ?? 0);
          const limit = Number(rawPagination.limit) || PAGE_LIMIT;
          const totalPages = Number(rawPagination.totalPages) || (total === 0 ? 0 : Math.ceil(total / limit));
          const page = Number(rawPagination.page) || currentPage;

          setPagination({
            total,
            limit,
            page,
            totalPages,
            hasNextPage:
              rawPagination.hasNextPage !== undefined
                ? Boolean(rawPagination.hasNextPage)
                : page < totalPages,
            hasPrevPage:
              rawPagination.hasPrevPage !== undefined
                ? Boolean(rawPagination.hasPrevPage)
                : page > 1,
          });
        } else {
          setPagination(null);
        }
      }
    } catch (err) {
      if (requestId === activeRequestIdRef.current) {
        console.warn('[ProductListingScreen] API unavailable, attempting local fallback:', err?.message);
        try {
          const localActive = filterActiveProducts(defaultProducts);
          let filtered = localActive;
          if (selectedCategory && selectedCategory !== 'all') {
            filtered = filtered.filter(
              (p) => p.categoryId === selectedCategory || p.category === selectedCategory
            );
          }
          if (debouncedSearch) {
            const lower = debouncedSearch.toLowerCase();
            filtered = filtered.filter(
              (p) =>
                (p.name && p.name.toLowerCase().includes(lower)) ||
                (p.categoryName && p.categoryName.toLowerCase().includes(lower))
            );
          }
          if (sortOption === 'price_asc') {
            filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
          } else if (sortOption === 'price_desc') {
            filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
          }
          setProducts(filtered);
          setPagination({
            total: filtered.length,
            limit: PAGE_LIMIT,
            page: 1,
            totalPages: Math.ceil(filtered.length / PAGE_LIMIT) || 1,
            hasNextPage: false,
            hasPrevPage: false,
          });
        } catch (_localErr) {
          setError(err?.message || 'Failed to load products. Please check your connection.');
          setProducts([]);
          setPagination(null);
        }
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    currentPage,
    debouncedSearch,
    selectedCategory,
    sortOption,
    propProducts,
    route?.params?.products,
  ]);

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
                    onPress={() => handleCategoryPress(category.id)}
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
                  onPress={() => handleSortPress(null)}
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
                  onPress={() => handleSortPress('price_asc')}
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
                  onPress={() => handleSortPress('price_desc')}
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
                  : pagination?.total !== undefined
                  ? `${pagination.total} product${pagination.total !== 1 ? 's' : ''} available`
                  : `${products.length} product${products.length !== 1 ? 's' : ''} available`}
              </Text>
              <View style={styles.activeFiltersRow}>
                {selectedCategory !== 'all' && (
                  <TouchableOpacity
                    style={styles.resetCategoryChip}
                    onPress={() => handleCategoryPress('all')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetCategoryText}>Clear Category</Text>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </TouchableOpacity>
                )}
                {sortOption !== null && (
                  <TouchableOpacity
                    style={styles.resetCategoryChip}
                    onPress={() => handleSortPress(null)}
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
        ListFooterComponent={
          !isLoading && !error && products.length > 0 && pagination && pagination.total > 0 ? (
            <View style={styles.paginationContainer} testID="pagination-controls">
              {/* Page items summary */}
              <Text style={styles.paginationSummary}>
                Showing {Math.min((currentPage - 1) * PAGE_LIMIT + 1, pagination.total)}–
                {Math.min(currentPage * PAGE_LIMIT, pagination.total)} of {pagination.total} products
              </Text>

              {/* Previous and Next Controls */}
              <View style={styles.paginationControlsRow}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    (currentPage <= 1 || isLoading) && styles.paginationButtonDisabled,
                  ]}
                  onPress={handlePreviousPage}
                  disabled={currentPage <= 1 || isLoading}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Previous Page"
                  testID="pagination-prev"
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={currentPage <= 1 || isLoading ? colors.textMuted : colors.primary}
                  />
                  <Text
                    style={[
                      styles.paginationButtonText,
                      (currentPage <= 1 || isLoading) && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <View style={styles.pageBadge}>
                  <Text style={styles.pageBadgeText}>
                    Page {currentPage} of {Math.max(1, pagination.totalPages)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    (currentPage >= pagination.totalPages || isLoading) &&
                      styles.paginationButtonDisabled,
                  ]}
                  onPress={handleNextPage}
                  disabled={currentPage >= pagination.totalPages || isLoading}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Next Page"
                  testID="pagination-next"
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      (currentPage >= pagination.totalPages || isLoading) &&
                        styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={
                      currentPage >= pagination.totalPages || isLoading
                        ? colors.textMuted
                        : colors.primary
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : null
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
              icon={hasSearch ? 'search-outline' : hasCategory ? 'file-tray-outline' : 'cube-outline'}
              title={
                hasSearch && hasCategory
                  ? 'No products found'
                  : hasSearch
                  ? 'No products found matching your search'
                  : hasCategory
                  ? 'No products found in this category'
                  : currentPage > 1
                  ? 'No more products'
                  : 'No products available right now.'
              }
              description={
                hasSearch && hasCategory
                  ? `No products in ${categoryName} match "${debouncedSearch}". Try clearing your search or category filter.`
                  : hasSearch
                  ? `No products match "${debouncedSearch}". Try searching with another term or clear your search.`
                  : hasCategory
                  ? `There are currently no products in ${categoryName}. Try exploring other categories.`
                  : currentPage > 1
                  ? `Page ${currentPage} has no products. Return to page 1 to browse available items.`
                  : 'Wholesale listings will appear here once suppliers add their products.'
              }
              actionText={
                currentPage > 1
                  ? 'Back to First Page'
                  : hasSearch
                  ? 'Clear Search'
                  : hasCategory
                  ? 'All Categories'
                  : undefined
              }
              onActionPress={
                currentPage > 1
                  ? () => setCurrentPage(1)
                  : hasSearch
                  ? () => setSearchQuery('')
                  : hasCategory
                  ? () => handleCategoryPress('all')
                  : undefined
              }
              secondaryActionText={hasSearch && hasCategory ? 'Clear All Filters' : undefined}
              onSecondaryActionPress={hasSearch && hasCategory ? handleClearFilters : undefined}
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
  paginationContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.lg,
  },
  paginationSummary: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  paginationControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
    opacity: 0.6,
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  paginationButtonTextDisabled: {
    color: colors.textMuted,
  },
  pageBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pageBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
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
