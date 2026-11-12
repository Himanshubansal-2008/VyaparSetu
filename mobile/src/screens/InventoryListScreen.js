import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { getProducts } from '../services/productService';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

const STOCK_FILTERS = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

const getStockStatus = (stock) => {
  if (stock === 0) {
    return { label: 'Out of Stock', color: colors.error, background: colors.errorLight };
  }

  if (stock <= 20) {
    return { label: 'Low Stock', color: colors.warning, background: colors.warningLight };
  }

  return { label: 'In Stock', color: colors.success, background: colors.successLight };
};

export default function InventoryListScreen({ navigation }) {
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

const [search, setSearch] = useState('');
const [stockFilter, setStockFilter] = useState('All');
const [categoryFilter, setCategoryFilter] = useState('all');

const loadProducts = async () => {
  try {
    setLoading(true);
    setError('');

    const data = await getProducts();
    setProducts(data);
  } catch (err) {
    setError('Unable to load products. Please try again.');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadProducts();
}, []);

const categories = useMemo(() => {
  const uniqueCategories = new Map();

  products.forEach((product) => {
    if (product.category) {
      uniqueCategories.set(product.category.id, product.category);
    }
  });

  return Array.from(uniqueCategories.values());
}, [products]);


const filteredProducts = useMemo(() => {
  return products.filter((product) => {
    const stock = Number(product.stock) || 0;

    const matchesSearch = [
      product.name,
      product.category?.name,
      product.business?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesStock =
      stockFilter === 'All' ||
      (stockFilter === 'In Stock' && stock > 20) ||
      (stockFilter === 'Low Stock' && stock > 0 && stock <= 20) ||
      (stockFilter === 'Out of Stock' && stock === 0);

    const matchesCategory =
      categoryFilter === 'all' ||
      product.category?.id === categoryFilter;

    return matchesSearch && matchesStock && matchesCategory;
  });
}, [products, search, stockFilter, categoryFilter]);


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

<View style={styles.header}>
  <TouchableOpacity onPress={() => navigation?.goBack?.()}>
    <Text style={styles.backText}>← Back to Home</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => navigation?.navigate('InventoryDashboard')}
    style={styles.dashboardButton}
  >
    <Text style={styles.dashboardButtonText}>
      View Inventory Dashboard →
    </Text>
  </TouchableOpacity>

  <Text style={styles.heading}>Inventory Management</Text>
  <Text style={styles.subtitle}>
    Search, filter and monitor your products
  </Text>
</View>

<TouchableOpacity
  style={styles.addProductButton}
  onPress={() => navigation.navigate('AddProduct')}
>
  <Text style={styles.addProductButtonText}>
    + Add Product
  </Text>
</TouchableOpacity>


      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, brands or sellers..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <Text style={styles.filterTitle}>Stock Status</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {STOCK_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setStockFilter(filter)}
              style={[
                styles.filterChip,
                stockFilter === filter && styles.activeFilterChip,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  stockFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>


      <Text style={styles.filterTitle}>Product Category</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {/* All Categories */}
          <TouchableOpacity
            onPress={() => setCategoryFilter('all')}
            style={[
              styles.filterChip,
              categoryFilter === 'all' && styles.activeFilterChip,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                categoryFilter === 'all' && styles.activeFilterText,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {/* Dynamic Categories from API */}
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setCategoryFilter(category.id)}
              style={[
                styles.filterChip,
                categoryFilter === category.id && styles.activeFilterChip,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  categoryFilter === category.id && styles.activeFilterText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>


      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>Products</Text>
        <Text style={styles.resultCount}>
          {filteredProducts.length} of {products.length} products
        </Text>
      </View>

      
{loading ? (
  <Text style={styles.emptyText}>Loading products...</Text>
) : error ? (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyTitle}>Something went wrong</Text>
    <Text style={styles.emptyText}>{error}</Text>

    <TouchableOpacity onPress={loadProducts}>
      <Text style={styles.resetText}>Try Again</Text>
    </TouchableOpacity>
  </View>
) : filteredProducts.length === 0 ? (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyTitle}>No products found</Text>
    <Text style={styles.emptyText}>
      Try changing your search or filters.
    </Text>

    <TouchableOpacity
      onPress={() => {
        setSearch('');
        setStockFilter('All');
        setCategoryFilter('all');
      }}
    >
      <Text style={styles.resetText}>Clear all filters</Text>
    </TouchableOpacity>
  </View>
) : (
  filteredProducts.map((product) => {
    const stock = Number(product.stock) || 0;
    const status = getStockStatus(stock);

    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productTop}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>
              {product.category?.name || 'Uncategorized'}
            </Text>
            <Text style={styles.sellerName}>
              {product.business?.name || 'Unknown Seller'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.productBottom}>
          <View>
            <Text style={styles.stockLabel}>Available Stock</Text>
            <Text style={styles.stockValue}>
              {stock.toLocaleString()} {product.unit || 'units'}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.stockLabel}>Price</Text>
            <Text style={styles.priceValue}>
              ₹{Number(product.price).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {product.isSurplus && (
          <View style={styles.surplusTag}>
            <Text style={styles.surplusText}>♻ Surplus Product</Text>
          </View>
        )}
        <View style={styles.actionRow}>
            <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProduct', { product })}
            >
                <Text style={styles.editButtonText}>✏ Edit Product</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  })
)}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 25,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    fontSize: 24,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    outlineStyle: 'none',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeFilterText: {
    color: colors.textInverse,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  productCategory: {
    fontSize: 12,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  sellerName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  stockLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  surplusTag: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surplusLight,
    borderRadius: borderRadius.full,
  },
  surplusText: {
    color: colors.surplus,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  resetText: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.md,
  },

  dashboardButton: {
  alignSelf: 'flex-start',
  backgroundColor: colors.primary,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: borderRadius.md,
  marginBottom: spacing.md,
},

dashboardButtonText: {
  color: colors.textInverse,
  fontSize: 13,
  fontWeight: '700',
},
addProductButton: {
  backgroundColor: colors.primary,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: borderRadius.md,
  alignItems: 'center',
  marginTop: spacing.md,
},

addProductButtonText: {
  color: colors.textInverse,
  fontSize: 15,
  fontWeight: '700',
},
actionRow: {
  flexDirection: 'row',
  marginTop: spacing.md,
},

editButton: {
  flex: 1,
  backgroundColor: colors.primary,
  paddingVertical: spacing.sm,
  borderRadius: borderRadius.md,
  alignItems: 'center',
},

editButtonText: {
  color: colors.textInverse,
  fontWeight: '700',
  fontSize: 13,
},
});
