
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { products } from '../data/products';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

const getStockStatus = (stock) => {
  if (stock === 0) {
    return { label: 'Out of Stock', color: colors.error, bg: colors.errorLight };
  }

  if (stock <= 20) {
    return { label: 'Low Stock', color: colors.warning, bg: colors.warningLight };
  }

  return { label: 'In Stock', color: colors.success, bg: colors.successLight };
};

export default function InventoryDashboardScreen({ navigation }) {
  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + (Number(product.stock) || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) => Number(product.stock) > 0 && Number(product.stock) <= 20
  );

  const outOfStockProducts = products.filter(
    (product) => Number(product.stock) === 0
  );

  const surplusProducts = products.filter(
    (product) => product.isSurplus
  );

  const summaryCards = [
    { title: 'Total Products', value: totalProducts, color: colors.primary },
    { title: 'Total Stock', value: totalStock.toLocaleString(), color: colors.success },
    { title: 'Low Stock', value: lowStockProducts.length, color: colors.warning },
    { title: 'Surplus Items', value: surplusProducts.length, color: colors.surplus },
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

        <Text style={styles.heading}>Inventory Dashboard</Text>
        <Text style={styles.subtitle}>
          Monitor your products and stock levels
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <View key={card.title} style={styles.summaryCard}>
            <Text style={styles.cardLabel}>{card.title}</Text>
            <Text style={[styles.cardValue, { color: card.color }]}>
              {card.value}
            </Text>
          </View>
        ))}
      </View>

      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠ Inventory Alerts</Text>
          <Text style={styles.alertText}>
            {lowStockProducts.length} low-stock {lowStockProducts.length === 1 ? 'product' : 'products'} and{' '}
            {outOfStockProducts.length} {outOfStockProducts.length === 1 ? 'product is' : 'products are'} out of stock.
        </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Inventory</Text>

        {products.map((product) => {
          const stock = Number(product.stock) || 0;
          const status = getStockStatus(stock);

          return (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {product.name || 'Unnamed Product'}
                </Text>
                <Text style={styles.stockText}>
                  Available stock: {stock}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Surplus Inventory</Text>
        <Text style={styles.subtitle}>
          Products marked as surplus: {surplusProducts.length}
        </Text>
      </View>
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
});
