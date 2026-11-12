import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getQuotationsForSeller,
  subscribeQuotations,
  loadPersistedQuotations,
  getQuotationStatusColor,
} from '../data/quotations';
import {
  getSessionBusinessProfile,
  getBusinessById,
  businesses,
} from '../data/businessProfileData';
import { products as defaultProducts } from '../data/products';
import EmptyState from '../components/EmptyState';

const FILTER_TABS = [
  { key: 'All', label: 'All Requests' },
  { key: 'Pending', label: 'Needs Action' },
  { key: 'Quoted', label: 'Quoted' },
  { key: 'Accepted', label: 'Accepted' },
  { key: 'Declined', label: 'Declined' },
];

export default function SellerQuotationsScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToSellerQuotationDetails,
  onNavigateToBusinessProfile,
}) {
  const sessionProfile = getSessionBusinessProfile();

  // Resolve target seller/business identity
  const businessId = useMemo(() => {
    return (
      route?.params?.businessId ||
      route?.params?.sellerId ||
      route?.params?.business?.id ||
      route?.params?.business?.sellerId ||
      sessionProfile?.id ||
      sessionProfile?.sellerId ||
      'biz-sharma-handicrafts'
    );
  }, [route?.params, sessionProfile]);

  const business = useMemo(() => {
    return (
      route?.params?.business ||
      sessionProfile ||
      getBusinessById(businessId) ||
      businesses[0]
    );
  }, [route?.params, sessionProfile, businessId]);

  const [rawQuotations, setRawQuotations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load and subscribe to quotations for this seller
  const reloadSellerQuotes = useCallback(() => {
    const list = getQuotationsForSeller(businessId, defaultProducts);
    setRawQuotations(list);
  }, [businessId]);

  useEffect(() => {
    reloadSellerQuotes();
    return subscribeQuotations(() => {
      reloadSellerQuotes();
    });
  }, [reloadSellerQuotes]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadPersistedQuotations();
      reloadSellerQuotes();
    } catch (e) {
      console.warn('Failed to refresh seller quotations:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [reloadSellerQuotes]);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (onNavigateToBusinessProfile) {
      onNavigateToBusinessProfile({ businessId, business });
    }
  }, [onBackPress, navigation, onNavigateToBusinessProfile, businessId, business]);

  const handleQuotationPress = useCallback(
    (quote) => {
      if (!quote) return;
      if (onNavigateToSellerQuotationDetails) {
        onNavigateToSellerQuotationDetails({
          quotation: quote,
          quotationId: quote.id,
          businessId,
          business,
        });
      } else if (navigation?.navigate) {
        navigation.navigate('SellerQuotationDetails', {
          quotation: quote,
          quotationId: quote.id,
          businessId,
          business,
        });
      }
    },
    [onNavigateToSellerQuotationDetails, navigation, businessId, business]
  );

  // Counts for tabs and KPIs
  const counts = useMemo(() => {
    let pending = 0;
    let quoted = 0;
    let accepted = 0;
    let declined = 0;

    rawQuotations.forEach((q) => {
      const st = String(q.status || '').toLowerCase();
      if (st === 'submitted' || st === 'pending') {
        pending += 1;
      } else if (st.includes('provided') || st.includes('counter')) {
        quoted += 1;
      } else if (st === 'accepted' || st === 'ordered') {
        accepted += 1;
      } else if (st.includes('reject') || st.includes('decline')) {
        declined += 1;
      }
    });

    return {
      all: rawQuotations.length,
      pending,
      quoted,
      accepted,
      declined,
    };
  }, [rawQuotations]);

  // Filtered & Searched RFQs
  const filteredQuotations = useMemo(() => {
    let list = rawQuotations;

    if (activeFilter === 'Pending') {
      list = list.filter((q) => {
        const st = String(q.status || '').toLowerCase();
        return st === 'submitted' || st === 'pending';
      });
    } else if (activeFilter === 'Quoted') {
      list = list.filter((q) => {
        const st = String(q.status || '').toLowerCase();
        return st.includes('provided') || st.includes('counter');
      });
    } else if (activeFilter === 'Accepted') {
      list = list.filter((q) => {
        const st = String(q.status || '').toLowerCase();
        return st === 'accepted' || st === 'ordered';
      });
    } else if (activeFilter === 'Declined') {
      list = list.filter((q) => {
        const st = String(q.status || '').toLowerCase();
        return st.includes('reject') || st.includes('decline');
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const idMatch = String(item.id || item.quotationNumber || '').toLowerCase().includes(q);
        const buyerMatch = String(item.buyerInfo?.businessName || item.buyerInfo?.fullName || '').toLowerCase().includes(q);
        const prodMatch = String(item.product?.title || item.product?.name || '').toLowerCase().includes(q);
        return idMatch || buyerMatch || prodMatch;
      });
    }

    return list;
  }, [rawQuotations, activeFilter, searchQuery]);

  const renderQuotationItem = ({ item }) => {
    const statusCfg = getQuotationStatusColor(item.status);
    const prod = item.product || {};
    const buyer = item.buyerInfo || item.deliveryAddress || {};
    const imageUri = prod.image || (Array.isArray(prod.images) ? prod.images[0] : null);

    const isPending =
      item.status === 'Submitted' || item.status === 'Pending';
    const hasResponse =
      item.quotedUnitPrice !== undefined && item.quotedUnitPrice !== null;
    const isCounterOffer = Boolean(item.isCounterOffer);

    return (
      <TouchableOpacity
        style={styles.quotationCard}
        activeOpacity={0.85}
        onPress={() => handleQuotationPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`RFQ ${item.id}, Status ${item.status}`}
      >
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.idGroup}>
            <Ionicons name="document-text-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.quotationIdText}>{item.id || item.quotationNumber}</Text>
              <Text style={styles.dateText}>
                Received {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <Ionicons name={statusCfg.icon} size={13} color={statusCfg.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Buyer Strip */}
        <View style={styles.buyerStrip}>
          <Ionicons name="business-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.buyerName} numberOfLines={1}>
            {buyer.businessName || buyer.fullName || 'Wholesale Buyer'}
          </Text>
          {buyer.city ? <Text style={styles.buyerLocation}> • {buyer.city}</Text> : null}
        </View>

        <View style={styles.divider} />

        {/* Product Preview */}
        <View style={styles.productRow}>
          <View style={styles.thumbnailContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {prod.title || prod.name || 'Wholesale Product'}
            </Text>

            <View style={styles.volumeRow}>
              <View style={styles.volumeBadge}>
                <Text style={styles.volumeBadgeText}>
                  Requested: {item.requestedQuantity} {prod.unit || 'units'}
                </Text>
              </View>
              {item.buyerTargetPrice ? (
                <Text style={styles.targetPriceText}>
                  Target: ₹{item.buyerTargetPrice}/{prod.unit || 'unit'}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Commercial Status Footer */}
        <View style={styles.cardFooter}>
          {hasResponse ? (
            <View style={styles.responseSummary}>
              <Text style={styles.quotedPriceLabel}>
                {isCounterOffer ? 'Suggested Price:' : 'Quoted Price:'}
              </Text>
              <Text style={styles.quotedPriceValue}>
                ₹{item.quotedUnitPrice}/{prod.unit || 'unit'}
              </Text>
              <Text style={styles.quotedTotalText}>
                ({item.quotedQuantity} units = ₹{(Number(item.quotedTotalAmount) || item.quotedUnitPrice * item.quotedQuantity).toLocaleString('en-IN')})
              </Text>
            </View>
          ) : (
            <View style={styles.actionNeededBox}>
              <Ionicons name="alert-circle" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.actionNeededText}>Action Required: Respond to Price Request</Text>
            </View>
          )}

          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>
              {isPending ? 'Respond' : 'Manage'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Customer Price Requests</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {business?.businessName || 'Sharma Handicrafts'}
          </Text>
        </View>

        <View style={styles.sellerBadge}>
          <Ionicons name="shield-checkmark" size={13} color={colors.success} style={{ marginRight: 3 }} />
          <Text style={styles.sellerBadgeText}>Customer Price Requests</Text>
        </View>
      </View>

      {/* KPI Overview Row */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{counts.all}</Text>
          <Text style={styles.kpiLabel}>Total</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.warning }]}>{counts.pending}</Text>
          <Text style={styles.kpiLabel}>Needs Quote</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.primary }]}>{counts.quoted}</Text>
          <Text style={styles.kpiLabel}>Quoted</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.success }]}>{counts.accepted}</Text>
          <Text style={styles.kpiLabel}>Won / Accepted</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search request ID, buyer business, or item..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          let count = counts.all;
          if (tab.key === 'Pending') count = counts.pending;
          if (tab.key === 'Quoted') count = counts.quoted;
          if (tab.key === 'Accepted') count = counts.accepted;
          if (tab.key === 'Declined') count = counts.declined;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quotation List */}
      <FlatList
        data={filteredQuotations}
        keyExtractor={(item) => String(item.id || item.quotationNumber)}
        renderItem={renderQuotationItem}
        contentContainerStyle={[
          styles.listContent,
          filteredQuotations.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="document-text-outline"
              iconSize={54}
              iconColor={colors.primary}
              title={
                searchQuery
                  ? 'No Matching Price Requests'
                  : activeFilter !== 'All'
                  ? `No ${activeFilter} Price Requests`
                  : 'No Price Requests'
              }
              description={
                searchQuery
                  ? `No price requests matched "${searchQuery}".`
                  : 'You have not received any custom price requests for your products yet. When buyers submit a price request, it will appear here for you to respond.'
              }
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sellerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  kpiContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  searchSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeActive: {
    backgroundColor: colors.textInverse + '30',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  quotationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs + 2,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  quotationIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dateText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buyerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  buyerName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  buyerLocation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs + 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  volumeBadge: {
    backgroundColor: colors.primaryLight + '15',
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  volumeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  targetPriceText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseSummary: {
    flex: 1,
  },
  quotedPriceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  quotedPriceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  quotedTotalText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  actionNeededBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionNeededText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyContainer: {
    padding: spacing.lg,
  },
});

