import React, { useState, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import {
  products as defaultProducts,
  categories as defaultCategories,
  isProductActive,
} from '../data/products';
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

  const initialCategory =
    route?.params?.selectedCategory ||
    route?.params?.categoryId ||
    'all';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(
    route?.params?.searchQuery || ''
  );

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

  const trimmedQuery = searchQuery.trim();
  const searchTokens = useMemo(() => {
    return trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  }, [trimmedQuery]);

  const hasSearch = searchTokens.length > 0;
  const hasCategory = selectedCategory !== 'all';
  const categoryName =
    allCategories.find((c) => c.id === selectedCategory)?.name || 'this category';

  // Filter products matching BOTH search query (multi-token, case-insensitive, whitespace-safe) and selected category
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      if (!product || !isProductActive(product)) return false;

      const matchesCategory =
        selectedCategory === 'all' ||
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
  }, [allProducts, selectedCategory, hasSearch, searchTokens]);

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
        data={filteredProducts}
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
              Discover products from businesses across India.
            </Text>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScrollWrapper}
              contentContainerStyle={styles.categoryScroll}
            >
              {allCategories.map((category) => {
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

            {/* Results count & active filter summary */}
            <View style={styles.metaRow}>
              <Text style={styles.resultsCount}>
                {filteredProducts.length} product
                {filteredProducts.length !== 1 ? 's' : ''} available
              </Text>
              {selectedCategory !== 'all' && (
                <TouchableOpacity
                  style={styles.resetCategoryChip}
                  onPress={() => setSelectedCategory('all')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetCategoryText}>Clear Category</Text>
                  <Ionicons name="close" size={13} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          !allProducts || allProducts.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No products available yet"
              description="Wholesale listings will appear here once suppliers list their products."
            />
          ) : hasSearch && hasCategory ? (
            <EmptyState
              icon="search-outline"
              title="No products found in this category"
              description={`No products in ${categoryName} match "${trimmedQuery}". Try clearing your search or filters.`}
              actionText="Clear Search"
              onActionPress={() => setSearchQuery('')}
              secondaryActionText="Clear Filters"
              onSecondaryActionPress={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
            />
          ) : hasSearch ? (
            <EmptyState
              icon="search-outline"
              title="No products found"
              description={`No products found matching "${trimmedQuery}". Try searching with a different term.`}
              actionText="Clear Search"
              onActionPress={() => setSearchQuery('')}
            />
          ) : hasCategory ? (
            <EmptyState
              icon="file-tray-outline"
              title="No products available in this category"
              description={`There are currently no products in ${categoryName}. Try exploring other categories or view all products.`}
              actionText="All Categories"
              onActionPress={() => setSelectedCategory('all')}
            />
          ) : (
            <EmptyState
              icon="cube-outline"
              title="No products available yet"
              description="Wholesale listings will appear here once suppliers list their products."
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  resetButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  resetButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
});
