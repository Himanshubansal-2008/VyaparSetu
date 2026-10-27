import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function SearchBar({
  value = '',
  onChangeText,
  onClear,
  onSubmitEditing,
  placeholder = 'Search products by name...',
  onFilterPress,
  showFilter = true,
  style,
  autoFocus = false,
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChangeText) {
      onChangeText('');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.primary}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          clearButtonMode="never"
        />
        {value?.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearButton}
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {showFilter && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          activeOpacity={0.8}
          accessibilityLabel="Filter options"
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
