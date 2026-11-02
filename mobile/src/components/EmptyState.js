import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function EmptyState({
  icon = 'cube-outline',
  iconSize = 44,
  iconColor = colors.textMuted,
  title = 'No items found',
  description,
  message,
  actionText,
  onActionPress,
  actionIcon,
  secondaryActionText,
  onSecondaryActionPress,
  secondaryActionIcon,
  style,
}) {
  const subtitleText = description || message;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconBox}>
        {typeof icon === 'string' ? (
          <Ionicons name={icon} size={iconSize} color={iconColor} />
        ) : (
          icon
        )}
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}

      {subtitleText ? (
        <Text style={styles.description}>{subtitleText}</Text>
      ) : null}

      {(onActionPress || onSecondaryActionPress) && (
        <View style={styles.actionRow}>
          {onActionPress && actionText ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onActionPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={actionText}
            >
              {actionIcon ? (
                <Ionicons
                  name={actionIcon}
                  size={15}
                  color={colors.textInverse}
                  style={styles.actionIcon}
                />
              ) : null}
              <Text style={styles.primaryButtonText}>{actionText}</Text>
            </TouchableOpacity>
          ) : null}

          {onSecondaryActionPress && secondaryActionText ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSecondaryActionPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={secondaryActionText}
            >
              {secondaryActionIcon ? (
                <Ionicons
                  name={secondaryActionIcon}
                  size={15}
                  color={colors.primary}
                  style={styles.actionIcon}
                />
              ) : null}
              <Text style={styles.secondaryButtonText}>
                {secondaryActionText}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 1.5,
    paddingHorizontal: spacing.xl,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 19,
    maxWidth: 320,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionIcon: {
    marginRight: spacing.xs,
  },
});

