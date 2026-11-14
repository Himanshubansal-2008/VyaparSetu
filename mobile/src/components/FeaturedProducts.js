import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from './ProductCard';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function FeaturedProducts({
  products = [],
  onProductPress,
  onViewAllPress,
  loading = false,
  error = null,
  onRetry,
}) {
  const hasProducts = Array.isArray(products) && products.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="flame" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Featured Products</Text>
        </View>
        {onViewAllPress && !loading && !error && hasProducts ? (
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.7}
            onPress={onViewAllPress}
            accessibilityRole="button"
            accessibilityLabel="View all featured products"
          >
            <Text style={styles.viewAll}>View All</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primaryLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerBox} testID="featured-loading">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading featured products...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox} testID="featured-error">
          <Ionicons name="alert-circle-outline" size={22} color={colors.error || '#EF4444'} />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Retry loading featured products"
            >
              <Ionicons name="refresh" size={13} color={colors.surface} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : !hasProducts ? (
        <View style={styles.emptyBox} testID="featured-empty">
          <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>No featured products available right now.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={onProductPress}
              style={styles.cardWrapper}
            />
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const CARD_WIDTH = 200;

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm + 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    maxWidth: CARD_WIDTH,
    flex: 0,
    padding: 0,
  },
  centerBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 13,
    color: colors.error || '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.surface,
  },
  emptyBox: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
