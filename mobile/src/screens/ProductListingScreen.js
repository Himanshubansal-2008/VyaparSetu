import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function ProductListingScreen({
  onNotificationPress,
  onCartPress,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface}
      />

      {/* Shared Header Component */}
      <Header
        onNotificationPress={onNotificationPress}
        onCartPress={onCartPress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title & Subtitle */}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Explore Products</Text>
          <Text style={styles.pageSubtitle}>
            Discover products from businesses across India.
          </Text>
        </View>

        {/* Content Layout Container (Ready for product grid/filters in upcoming commits) */}
        <View style={styles.mainContent}>
          <View style={styles.placeholderContainer}>
            <View style={styles.placeholderLine} />
          </View>
        </View>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '400',
  },
  mainContent: {
    flex: 1,
  },
  placeholderContainer: {
    marginTop: spacing.sm,
  },
  placeholderLine: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
  },
});
