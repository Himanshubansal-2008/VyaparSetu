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
  categories,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
} from '../data/products';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProducts = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return searchProducts(searchQuery);
    }
    return getProductsByCategory(selectedCategory);
  }, [searchQuery, selectedCategory]);

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
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
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
        onSelectCategory={(cat) => setSelectedCategory(cat.id)}
      />

      {/* 3. Featured Products — horizontal carousel */}
      <FeaturedProducts
        products={featuredProducts}
        onProductPress={(p) => console.log('Featured tapped:', p.name)}
      />

      {/* 4. Product Grid — filtered by category or search */}
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
            {searchQuery.trim().length > 0 ? (
              <View style={styles.searchActiveCard}>
                <View style={styles.searchResultHeader}>
                  <Ionicons name="search" size={18} color={colors.primary} />
                  <Text style={styles.searchResultTitle}>
                    Searching for: "{searchQuery}"
                  </Text>
                </View>
                <Text style={styles.searchResultSub}>
                  {filteredProducts.length} product
                  {filteredProducts.length !== 1 ? 's' : ''} found
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
                      onPress={() => setSearchQuery(item)}
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
              <Text style={styles.sectionTitle}>
                {searchQuery.trim().length > 0
                  ? 'Search Results'
                  : selectedCategory === 'all'
                    ? 'All Products'
                    : categories.find((c) => c.id === selectedCategory)?.name}
              </Text>
              <Text style={styles.productCount}>
                {filteredProducts.length} item
                {filteredProducts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different category or search term
            </Text>
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
});
