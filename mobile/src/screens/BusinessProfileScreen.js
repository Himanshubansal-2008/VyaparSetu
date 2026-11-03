import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function BusinessProfileScreen({
  navigation,
  route,
  onBackPress,
}) {
  const canGoBack = Boolean(
    onBackPress || (navigation && typeof navigation.goBack === 'function')
  );

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* A. Screen Heading */}
      <View style={[styles.header, !canGoBack && styles.headerCentered]}>
        {canGoBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Business Profile</Text>
        {canGoBack && <View style={styles.headerRightSpacer} />}
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* B. Business Logo Placeholder */}
        <View style={styles.logoCard}>
          <View style={styles.logoPlaceholder}>
            <Ionicons
              name="business-outline"
              size={34}
              color={colors.textMuted}
              style={styles.logoIcon}
            />
            <Text style={styles.logoPlaceholderText}>Business Logo</Text>
          </View>
        </View>

        {/* C. Business Name Placeholder */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Business Name</Text>
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>Your Business Name</Text>
          </View>
        </View>

        {/* D. Business Information Placeholder */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Business Information</Text>
          </View>

          <View style={styles.fieldList}>
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Business Description</Text>
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>
                  Add business description
                </Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Business Category</Text>
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>
                  Add business category
                </Text>
              </View>
            </View>

            <View style={styles.fieldItemLast}>
              <Text style={styles.fieldLabel}>Owner Name</Text>
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>Add owner name</Text>
              </View>
            </View>
          </View>
        </View>

        {/* E. Contact Information Placeholder */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="call-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          <View style={styles.fieldList}>
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Contact Number</Text>
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>Add contact number</Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>Add email address</Text>
              </View>
            </View>

            <View style={styles.fieldItemLast}>
              <Text style={styles.fieldLabel}>Business Address</Text>
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>Add business address</Text>
              </View>
            </View>
          </View>
        </View>

        {/* F. Products Placeholder */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="cube-outline"
              size={18}
              color={colors.primary}
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionTitle}>Products</Text>
          </View>

          <View style={styles.emptyProductsArea}>
            <Ionicons
              name="cube-outline"
              size={36}
              color={colors.textMuted}
              style={styles.emptyProductsIcon}
            />
            <Text style={styles.emptyProductsText}>
              Your products will appear here
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerCentered: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRightSpacer: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  logoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  logoPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  logoIcon: {
    marginBottom: spacing.xs / 2,
  },
  logoPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
  },
  sectionHeaderIcon: {
    marginRight: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldList: {
    marginTop: spacing.xs,
  },
  fieldItem: {
    marginBottom: spacing.md,
  },
  fieldItemLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs + 2,
  },
  placeholderBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  emptyProductsArea: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyProductsIcon: {
    marginBottom: spacing.xs + 2,
  },
  emptyProductsText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
});

