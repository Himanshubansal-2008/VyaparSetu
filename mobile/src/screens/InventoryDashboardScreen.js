
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { getProducts } from '../services/productService';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

const getStockStatus = (stock) => {
  if (stock === 0) {
    return {
      label: 'Out of Stock',
      color: colors.error,
      bg: colors.errorLight,
    };
  }

  if (stock <= 20) {
    return {
      label: 'Low Stock',
      color: colors.warning,
      bg: colors.warningLight,
    };
  }

  return {
    label: 'In Stock',
    color: colors.success,
    bg: colors.successLight,
  };
};

export default function InventoryDashboardScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Dashboard API Error:', err);
      setError('Unable to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + (Number(product.stock) || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.stock) > 0 &&
      Number(product.stock) <= 20
  );

  const outOfStockProducts = products.filter(
    (product) => Number(product.stock) === 0
  );

  const surplusProducts = products.filter(
    (product) => product.isSurplus
  );

  const totalInventoryValue = products.reduce(
    (total, product) =>
      total +
      (Number(product.stock) || 0) *
        (Number(product.price) || 0),
    0
  );

  // Stock Distribution
const inStockProducts = products.filter(
  (product) => Number(product.stock) > 20
);

const stockDistribution = [
  {
    label: 'In Stock',
    count: inStockProducts.length,
    color: colors.success,
  },
  {
    label: 'Low Stock',
    count: lowStockProducts.length,
    color: colors.warning,
  },
  {
    label: 'Out of Stock',
    count: outOfStockProducts.length,
    color: colors.error,
  },
];

// Category-wise Inventory
const categorySummary = Object.values(
  products.reduce((summary, product) => {
    const categoryName = product.category?.name || 'Uncategorized';

    if (!summary[categoryName]) {
      summary[categoryName] = {
        name: categoryName,
        productCount: 0,
        totalStock: 0,
      };
    }

    summary[categoryName].productCount += 1;
    summary[categoryName].totalStock += Number(product.stock) || 0;

    return summary;
  }, {})
);

  const summaryCards = [
    {
      title: 'Total Products',
      value: totalProducts,
      color: colors.primary,
    },
    {
      title: 'Total Stock',
      value: totalStock.toLocaleString('en-IN'),
      color: colors.success,
    },
    {
      title: 'Low Stock',
      value: lowStockProducts.length,
      color: colors.warning,
    },
    {
      title: 'Out of Stock',
      value: outOfStockProducts.length,
      color: colors.error,
    },
    {
      title: 'Surplus Items',
      value: surplusProducts.length,
      color: colors.surplus,
    },
    {
      title: 'Inventory Value',
      value: `₹${totalInventoryValue.toLocaleString('en-IN')}`,
      color: colors.primary,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>
          Inventory Dashboard
        </Text>
        <Text style={styles.subtitle}>
          Monitor your products and stock levels
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>
            Loading inventory data...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProducts}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <View key={card.title} style={styles.summaryCard}>
                <Text style={styles.cardLabel}>
                  {card.title}
                </Text>
                <Text
                  style={[
                    styles.cardValue,
                    { color: card.color },
                  ]}
                >
                  {card.value}
                </Text>
              </View>
            ))}
          </View>


{/* Stock Distribution */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Stock Distribution</Text>

  {stockDistribution.map((item) => {
    const percentage =
      totalProducts > 0
        ? (item.count / totalProducts) * 100
        : 0;

    return (
      <View key={item.label} style={styles.chartItem}>
        <View style={styles.chartLabelRow}>
          <Text style={styles.chartLabel}>{item.label}</Text>
          <Text style={styles.chartCount}>
            {item.count} ({percentage.toFixed(1)}%)
          </Text>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: item.color,
              },
            ]}
          />
        </View>
      </View>
    );
  })}
</View>

{/* Category-wise Inventory */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>
    Category-wise Inventory
  </Text>

  {categorySummary.map((category) => {
    const maxStock = Math.max(
      ...categorySummary.map((item) => item.totalStock),
      1
    );

    const percentage = (category.totalStock / maxStock) * 100;

    return (
      <View key={category.name} style={styles.categoryCard}>
        <View style={styles.chartLabelRow}>
          <Text style={styles.categoryName}>
            {category.name}
          </Text>
          <Text style={styles.chartCount}>
            {category.productCount} products
          </Text>
        </View>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <Text style={styles.categoryStock}>
          Total Stock: {category.totalStock.toLocaleString('en-IN')}
        </Text>
      </View>
    );
  })}
</View>


          {(lowStockProducts.length > 0 ||
            outOfStockProducts.length > 0) && (
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>
                ⚠ Inventory Alerts
              </Text>
              <Text style={styles.alertText}>
                {lowStockProducts.length} low-stock products and{' '}
                {outOfStockProducts.length} out-of-stock products.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Product Inventory
            </Text>

            {products.map((product) => {
              const stock = Number(product.stock) || 0;
              const status = getStockStatus(stock);

              return (
                <View
                  key={product.id}
                  style={styles.productCard}
                >
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>
                      {product.name || 'Unnamed Product'}
                    </Text>
                    <Text style={styles.stockText}>
                      Available stock: {stock.toLocaleString('en-IN')}{' '}
                      {product.unit || 'units'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: status.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: status.color },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Surplus Inventory
            </Text>
            <Text style={styles.subtitle}>
              Products marked as surplus: {surplusProducts.length}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  heading: {
    fontSize: 25,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardValue: {
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  alertCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.warningLight,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  alertText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stockText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerBox: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.textInverse,
    fontWeight: '700',
  },

  chartItem: {
    marginBottom: spacing.md,
  },
  chartLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chartLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chartCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressBackground: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  categoryStock: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
