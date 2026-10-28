import React, { useRef } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import CategoryCard from './CategoryCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';


export default function CategoryList({
  categories,
  selectedCategory,
  onSelectCategory,
}) {
  const flatListRef = useRef(null);

  const handlePress = (category) => {
    onSelectCategory(category);

    const index = categories.findIndex((c) => c.id === category.id);
    if (index >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.35, // roughly centre-left
      });
    }
  };

  const renderItem = ({ item }) => (
    <CategoryCard
      category={item}
      isSelected={selectedCategory === item.id}
      onPress={handlePress}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <FlatList
        ref={flatListRef}
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={() => {}}
      />
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
