import React, { useRef } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import CategoryCard from './CategoryCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function CategoryList({
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
}) {
  const scrollViewRef = useRef(null);

  const handlePress = (category) => {
    onSelectCategory?.(category);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Categories</Text>
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
});
