import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CategoryCard from './CategoryCard';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function CategoryList({
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
  loading = false,
  error = null,
  onRetry,
}) {
  const scrollViewRef = useRef(null);

  const handlePress = (category) => {
    onSelectCategory?.(category);
  };

  const hasCategories = Array.isArray(categories) && categories.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Categories</Text>

      {loading ? (
        <View style={styles.centerBox} testID="categories-loading">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox} testID="categories-error">
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={colors.error || '#EF4444'}
          />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Retry loading categories"
            >
              <Ionicons name="refresh" size={13} color={colors.surface} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : !hasCategories ? (
        <View style={styles.emptyBox} testID="categories-empty">
          <Ionicons name="grid-outline" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>No categories available right now.</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={selectedCategory === category.id}
              onPress={handlePress}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  centerBox: {
    paddingVertical: spacing.lg,
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
