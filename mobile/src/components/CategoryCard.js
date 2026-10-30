import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

/**
 * CategoryCard — a single category pill rendered inside a horizontal list.
 *
 * Props:
 *   category   – { id, name, icon, image }  (from mock data)
 *   isSelected – boolean
 *   onPress    – (category) => void
 */
export default function CategoryCard({ category, isSelected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => onPress(category)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={category.name}
        accessibilityState={{ selected: isSelected }}
      >
        <View
          style={[
            styles.iconContainer,
            isSelected && styles.iconContainerSelected,
          ]}
        >
          {category.image ? (
            <Image
              source={{ uri: category.image }}
              style={styles.categoryImage}
            />
          ) : (
            <Ionicons
              name={category.icon || 'grid-outline'}
              size={20}
              color={isSelected ? colors.textInverse : colors.primary}
            />
          )}
        </View>
        <Text
          style={[styles.label, isSelected && styles.labelSelected]}
          numberOfLines={1}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const CARD_WIDTH = 88;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm + 2,
  },
  cardSelected: {
    backgroundColor: colors.primaryLight + '12', // 7% opacity tint
    borderColor: colors.primaryLight,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary,
  },
  categoryImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});
