import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from './ProductCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function FeaturedProducts({
  products,
  onProductPress,
  onViewAllPress,
}) {
  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="flame" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Featured Products</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onViewAllPress}
          accessibilityRole="button"
          accessibilityLabel="View all featured products"
        >
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

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
  cardWrapper: {
    width: CARD_WIDTH,
    maxWidth: CARD_WIDTH,
    flex: 0,
    padding: 0,
  },
});
