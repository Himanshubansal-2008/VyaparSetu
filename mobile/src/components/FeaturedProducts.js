import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

function FeaturedCard({ product, onPress }) {
  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => onPress?.(product)}
    >
      <Image source={{ uri: product.image }} style={styles.image} />

      {/* Gradient-like overlay at bottom of image */}
      <View style={styles.imageOverlay} />

      {/* Discount badge */}
      {discountPercent > 0 && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{discountPercent}% OFF</Text>
        </View>
      )}

      {/* Featured star */}
      <View style={styles.featuredBadge}>
        <Ionicons name="star" size={10} color={colors.accent} />
        <Text style={styles.featuredText}>Featured</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.category}>{product.categoryName}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{product.price}</Text>
          <Text style={styles.unit}>/{product.unit}</Text>
          {product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.ratingChip}>
            <Ionicons name="star" size={10} color={colors.accent} />
            <Text style={styles.ratingText}>{product.rating}</Text>
          </View>

          <View style={styles.locationChip}>
            <Ionicons
              name="location-outline"
              size={10}
              color={colors.textMuted}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {product.location}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeaturedProducts({ products, onProductPress }) {
  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="flame" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Featured Products</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={({ item }) => (
          <FeaturedCard product={item} onPress={onProductPress} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
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
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '800',
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  details: {
    padding: spacing.sm + 2,
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs + 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  unit: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 1,
  },
  originalPrice: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: spacing.xs + 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  locationText: {
    fontSize: 10,
    color: colors.textMuted,
    flexShrink: 1,
  },
});
