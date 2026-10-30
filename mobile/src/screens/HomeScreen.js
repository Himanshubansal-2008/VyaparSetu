import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import CategoryList from '../components/CategoryList';
import FeaturedProducts from '../components/FeaturedProducts';
import ProductCard from '../components/ProductCard';
import {
  products,
  categories,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
} from '../data/products';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function HomeScreen({
  navigation,
  route,
  onNavigateToProductListing,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  selectedCategory: propSelectedCategory,
  onSelectCategory: propOnSelectCategory,
}) {
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
  };

  const handleClearFilters = () => {
    handleSearchChange('');
    handleSelectCategory('all');
  };

  const handleNavigateToProductListing = (params = {}) => {
    if (onNavigateToProductListing) {
      onNavigateToProductListing(params);
    } else if (navigation?.navigate) {
      navigation.navigate('ProductListing', params);
    }
  };

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const hasSearch = trimmedQuery.length > 0;
  const hasCategory = selectedCategory !== 'all';
  const categoryName =
    categories.find((c) => c.id === selectedCategory)?.name || 'All Products';

  // Filter products matching BOTH search query and selected category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        !hasCategory ||
        product.categoryId === selectedCategory ||
        product.category === selectedCategory;

      const matchesSearch =
        !hasSearch ||
        product.name?.toLowerCase().includes(trimmedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [hasCategory, selectedCategory, hasSearch, trimmedQuery]);

  const featuredProducts = useMemo(() => getFeaturedProducts(), []);

  const quickSearches = [
    'Cotton Kurtis',
    'Silk Sarees',
    'Brass Handicrafts',
    'Spices & Tea',
    'Mobile Accessories',
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
          // Trigger search action
          console.log('Searching for:', searchQuery);
        }}
        onNotificationPress={() => console.log('Notifications opened')}
        onCartPress={() => console.log('Cart opened')}
      />

      {/* 2. Product Categories — horizontal scroll strip */}
      <CategoryList
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* 3. Featured Products — horizontal carousel */}
      <FeaturedProducts
        products={featuredProducts}
        onProductPress={(p) => console.log('Featured tapped:', p.name)}
        onViewAllPress={() => handleNavigateToProductListing()}
      />

      {/* 4. Product Grid — filtered by search query */}
      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={(p) => console.log('Product tapped:', p.name)}
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
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {hasSearch && hasCategory
                ? 'No products found in this category'
                : hasSearch
                  ? 'No products found'
                  : 'No products available in this category'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasSearch && hasCategory
                ? `No products in ${categoryName} match "${trimmedQuery}". Try another search or clear your filters.`
                : hasSearch
                  ? `No products match "${trimmedQuery}". Try a different search term.`
                  : 'Try exploring other categories or view all products.'}
            </Text>
            {hasSearch && hasCategory ? (
              <View style={styles.emptyActionRow}>
                <TouchableOpacity
                  style={[styles.clearSearchButton, { marginTop: 0 }]}
                  onPress={() => handleSearchChange('')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Clear Search"
                >
                  <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.clearSearchButton,
                    styles.clearFiltersButton,
                    { marginTop: 0 },
                  ]}
                  onPress={handleClearFilters}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Clear Filters"
                >
                  <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : hasSearch ? (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => handleSearchChange('')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear Search"
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            ) : hasCategory ? (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => handleSelectCategory('all')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View All Products"
              >
                <Text style={styles.clearSearchButtonText}>View All Products</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
    padding: spacing.lg,
  },
  quickSearchSection: {
    marginTop: spacing.sm,
  },
  quickSearchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
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
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  productCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  footerActionContainer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
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
});
