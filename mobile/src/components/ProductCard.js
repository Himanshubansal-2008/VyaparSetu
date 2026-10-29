import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function ProductCard({
  product,
  name = product?.name,
  price = product?.price,
  originalPrice = product?.originalPrice,
  category = product?.categoryName || product?.category,
  sellerName = product?.sellerName,
  location = product?.location,
  image = product?.image,
  unit = product?.unit || 'piece',
  moq = product?.moq,
  rating = product?.rating,
  totalReviews = product?.totalReviews,
  isSurplus = product?.isSurplus,
  onPress,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const discountPercent =
    originalPrice && price && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }, style]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={() => onPress?.(product || { name, price, category, sellerName })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.imageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
            </View>
          )}

          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          )}

          {isSurplus && (
            <View style={styles.surplusBadge}>
              <Ionicons name="flash" size={10} color={colors.textInverse} />
              <Text style={styles.surplusText}>Surplus</Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          {category ? (
            <Text style={styles.category} numberOfLines={1}>
              {category}
            </Text>
          ) : null}

          <Text style={styles.name} numberOfLines={2}>
            {name || 'Unnamed Product'}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{price ?? 0}</Text>
            {unit ? <Text style={styles.unit}>/{unit}</Text> : null}
            {originalPrice && originalPrice > price ? (
              <Text style={styles.originalPrice}>₹{originalPrice}</Text>
            ) : null}
          </View>

          {moq ? (
            <Text style={styles.moq}>
              MOQ: {moq} {unit}
              {moq > 1 ? 's' : ''}
            </Text>
          ) : null}

          {(rating || location) && (
            <View style={styles.metaRow}>
              {rating ? (
                <View style={styles.ratingChip}>
                  <Ionicons name="star" size={11} color={colors.accent} />
                  <Text style={styles.ratingText}>{rating}</Text>
                  {totalReviews !== undefined && (
                    <Text style={styles.reviewCount}>({totalReviews})</Text>
                  )}
                </View>
              ) : (
                <View />
              )}

              {location ? (
                <View style={styles.locationChip}>
                  <Ionicons
                    name="location-outline"
                    size={11}
                    color={colors.textMuted}
                  />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {sellerName ? (
            <View style={styles.sellerRow}>
              <Ionicons
                name="storefront-outline"
                size={12}
                color={colors.success}
              />
              <Text style={styles.sellerName} numberOfLines={1}>
                {sellerName}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    maxWidth: '50%',
    padding: spacing.xs + 2,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
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
  surplusBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surplus,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  surplusText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
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
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.xs + 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
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
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: spacing.xs + 2,
  },
  moq: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs + 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
  reviewCount: {
    fontSize: 10,
    color: colors.textMuted,
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
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sellerName: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
    flexShrink: 1,
  },
});
