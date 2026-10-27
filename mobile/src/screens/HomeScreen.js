import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const quickSearches = [
    'Cotton Kurtis',
    'Silk Sarees',
    'Brass Handicrafts',
    'Spices & Tea',
    'Mobile Accessories',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface}
      />

      {/* 1. Header + Search Bar */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        onSubmitSearch={() => {
          // Trigger search action
          console.log('Searching for:', searchQuery);
        }}
        onNotificationPress={() => console.log('Notifications opened')}
        onCartPress={() => console.log('Cart opened')}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.trim().length > 0 ? (
          <View style={styles.searchActiveCard}>
            <View style={styles.searchResultHeader}>
              <Ionicons name="search" size={18} color={colors.primary} />
              <Text style={styles.searchResultTitle}>
                Searching for: "{searchQuery}"
              </Text>
            </View>
            <Text style={styles.searchResultSub}>
              Showing matching wholesale products and verified suppliers...
            </Text>
          </View>
        ) : (
          <View style={styles.quickSearchSection}>
            <Text style={styles.quickSearchLabel}>Popular B2B Searches</Text>
            <View style={styles.tagsWrapper}>
              {quickSearches.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tagChip}
                  onPress={() => setSearchQuery(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="trending-up"
                    size={13}
                    color={colors.primary}
                    style={styles.tagIcon}
                  />
                  <Text style={styles.tagText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  quickSearchSection: {
    marginTop: spacing.sm,
  },
  quickSearchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagIcon: {
    marginRight: spacing.xs,
  },
  tagText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  searchActiveCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  searchResultSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
