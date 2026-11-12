import React, { useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function ProductCard({
  product,
  id = product?.id,
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
  isFeatured = product?.isFeatured,
  onPress,
  onEditPress,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imageError, setImageError] = useState(false);

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

  const formattedPrice =
    typeof price === 'number'
      ? price.toLocaleString('en-IN')
      : price !== undefined && price !== null
      ? String(price)
      : '0';

  const formattedOriginalPrice =
    typeof originalPrice === 'number'
      ? originalPrice.toLocaleString('en-IN')
      : originalPrice !== undefined && originalPrice !== null
      ? String(originalPrice)
      : null;

  const moqUnitLabel = useMemo(() => {
    if (!unit) return moq === 1 ? 'unit' : 'units';
    const u = String(unit).trim().toLowerCase();
    if (moq <= 1) {
      if (u === 'pieces') return 'piece';
      if (u === 'pairs') return 'pair';
      if (u === 'packs') return 'pack';
      if (u === 'sets') return 'set';
      if (u === 'boxes') return 'box';
      if (u === 'meters' || u === 'metres') return 'meter';
      return unit;
    }
    if (u === 'piece' || u === 'pieces') return 'pieces';
    if (u === 'pair' || u === 'pairs') return 'pairs';
    if (u === 'pack' || u === 'packs') return 'packs';
    if (u === 'set' || u === 'sets') return 'sets';
    if (u === 'box' || u === 'boxes') return 'boxes';
    if (u === 'meter' || u === 'metre' || u === 'meters' || u === 'metres')
      return 'meters';
    if (u === 'kg' || u === 'kgs') return 'kg';
    if (u.endsWith('s')) return unit;
    return `${unit}s`;
  }, [unit, moq]);

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }, style]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={
          (product?.name || name)
            ? `View details for ${product?.name || name}`
            : 'View product details'
        }
        onPress={() =>
          onPress?.(
            product || {
              id,
              name,
              price,
              originalPrice,
              category,
              sellerName,
              location,
              image,
              unit,
              moq,
              rating,
              totalReviews,
              isSurplus,
              isFeatured,
            }
          )
        }
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.imageContainer}>
          {image && !imageError ? (
            <Image
              source={{ uri: image }}
              style={styles.image}
              onError={() => setImageError(true)}
            />
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

          {isFeatured && !isSurplus && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color={colors.accent} />
              <Text style={styles.featuredText}>Featured</Text>
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
            <Text style={styles.price}>₹{formattedPrice}</Text>
            {unit ? <Text style={styles.unit}>/{unit}</Text> : null}
            {formattedOriginalPrice && originalPrice > price ? (
              <Text style={styles.originalPrice}>₹{formattedOriginalPrice}</Text>
            ) : null}
          </View>

          {moq ? (
            <Text style={styles.moq}>
              MOQ: {moq} {moqUnitLabel}
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

          {onEditPress && (
            <TouchableOpacity
              style={styles.editCardButton}
              onPress={(e) => {
                e?.stopPropagation?.();
                onEditPress(
                  product || {
                    id,
                    name,
                    price,
                    originalPrice,
                    category,
                    sellerName,
                    location,
                    image,
                    unit,
                    moq,
                    rating,
                    totalReviews,
                    isSurplus,
                    isFeatured,
                  }
                );
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${product?.name || name || 'product'}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="create-outline" size={13} color={colors.primary} />
              <Text style={styles.editCardButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 132,
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
    flex: 1,
    justifyContent: 'space-between',
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
    minHeight: 36,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  unit: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  originalPrice: {
    fontSize: 11.5,
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
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.xs + 1,
    paddingVertical: 1.5,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reviewCount: {
    fontSize: 10,
    color: colors.textSecondary,
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
  editCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    marginTop: spacing.xs + 2,
    gap: 4,
  },
  editCardButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
