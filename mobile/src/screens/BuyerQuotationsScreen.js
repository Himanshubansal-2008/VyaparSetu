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
  getQuotations,
  subscribeQuotations,
  loadPersistedQuotations,
  getQuotationStatusColor,
} from '../data/quotations';
import EmptyState from '../components/EmptyState';

const FILTER_TABS = [
  { key: 'All', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Received', label: 'Received' },
  { key: 'Accepted', label: 'Accepted' },
  { key: 'Declined', label: 'Declined' },
];

export default function BuyerQuotationsScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToBuyerQuotationDetails,
  onNavigateToCatalog,
  onNavigateToCart,
  onNavigateToOrders,
}) {
  const [quotations, setQuotations] = useState(getQuotations());
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setQuotations(getQuotations());
    return subscribeQuotations((updated) => {
      setQuotations([...updated]);
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await loadPersistedQuotations();
      setQuotations([...refreshed]);
    } catch (e) {
      console.warn('Failed to refresh quotations:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [onBackPress, navigation]);

  const handleQuotationPress = useCallback(
    (quote) => {
      if (!quote) return;
      if (onNavigateToBuyerQuotationDetails) {
        onNavigateToBuyerQuotationDetails({ quotation: quote, quotationId: quote.id });
      } else if (navigation?.navigate) {
        navigation.navigate('BuyerQuotationDetails', {
          quotation: quote,
          quotationId: quote.id,
        });
      }
    },
    [onNavigateToBuyerQuotationDetails, navigation]
  );

  const handleBrowseCatalog = useCallback(() => {
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    } else if (navigation?.navigate) {
      navigation.navigate('ProductListing');
    }
  }, [onNavigateToCatalog, navigation]);

  // Tab counts
  const counts = useMemo(() => {
    let pending = 0;
    let received = 0;
    let accepted = 0;
    let declined = 0;

    quotations.forEach((q) => {
      const st = String(q.status || '').toLowerCase();
      if (st === 'submitted' || st === 'pending') {
        pending += 1;
      } else if (st.includes('provided') || st.includes('counter')) {
        received += 1;
      } else if (st === 'accepted' || st === 'ordered') {
        accepted += 1;
      } else if (st.includes('reject') || st.includes('decline')) {
        declined += 1;
      }
    });

    return {
      all: quotations.length,
      pending,
      received,
      accepted,
      declined,
    };
  }, [quotations]);

  // Filter & Search
  const filteredQuotations = useMemo(() => {
    let list = quotations;

    if (activeFilter === 'Pending') {
      list = list.filter((q) => {
        const st = String(q.status || '').toLowerCase();
        return st === 'submitted' || st === 'pending';
      });
    } else if (activeFilter === 'Received') {
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
        const productMatch = String(item.product?.title || item.product?.name || '').toLowerCase().includes(q);
        const sellerMatch = String(item.sellerName || item.product?.sellerName || '').toLowerCase().includes(q);
        return idMatch || productMatch || sellerMatch;
      });
    }

    return list;
  }, [quotations, activeFilter, searchQuery]);

  const renderQuotationItem = ({ item }) => {
    const statusCfg = getQuotationStatusColor(item.status);
    const prod = item.product || {};
    const imageUri = prod.image || (Array.isArray(prod.images) ? prod.images[0] : null);

    const hasSellerResponse =
      item.quotedUnitPrice !== undefined && item.quotedUnitPrice !== null;
    const isCounterOffer = Boolean(item.isCounterOffer);
    const isAccepted = item.status === 'Accepted' || item.status === 'Ordered';

    const quotedUnitPrice = Number(item.quotedUnitPrice) || 0;
    const requestedQty = Number(item.quotedQuantity) || Number(item.requestedQuantity) || 1;
    const quotedTotal = Number(item.quotedTotalAmount) || quotedUnitPrice * requestedQty;

    const catalogPrice = Number(prod.price) || 0;
    const perUnitSavings = catalogPrice > quotedUnitPrice ? catalogPrice - quotedUnitPrice : 0;
    const percentSavings = catalogPrice > 0 ? Math.round((perUnitSavings / catalogPrice) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.quotationCard}
        activeOpacity={0.85}
        onPress={() => handleQuotationPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Quotation ${item.id}, Status ${item.status}`}
      >
        {/* Top Header: ID & Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.idGroup}>
            <Ionicons name="document-text-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.quotationIdText}>{item.id || item.quotationNumber}</Text>
              <Text style={styles.dateText}>
                Requested on {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <Ionicons name={statusCfg.icon} size={13} color={statusCfg.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Counter Offer Alert Banner */}
        {isCounterOffer && (
          <View style={styles.counterBanner}>
            <Ionicons name="swap-horizontal" size={14} color="#92400E" style={{ marginRight: 6 }} />
            <Text style={styles.counterBannerText}>
              Supplier made a Counter-Offer: {item.quotedQuantity} units @ ₹{item.quotedUnitPrice}/unit
            </Text>
          </View>
        )}

        {/* Product Details Row */}
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

            <View style={styles.supplierRow}>
              <Ionicons name="storefront-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.supplierText} numberOfLines={1}>
                {item.sellerName || prod.sellerName || 'Verified Supplier'}
              </Text>
            </View>

            <View style={styles.requestedVolumeRow}>
              <Text style={styles.requestedVolumeText}>
                Volume: <Text style={styles.boldText}>{requestedQty} {prod.unit || 'units'}</Text>
              </Text>
              {item.buyerTargetPrice ? (
                <Text style={styles.targetPriceText}>
                  · Target: ₹{item.buyerTargetPrice}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom Commercial Summary & Action Button */}
        <View style={styles.cardFooter}>
          {hasSellerResponse ? (
            <View style={styles.pricingColumn}>
              <View style={styles.quotedPriceRow}>
                <Text style={styles.quotedPriceLabel}>Quoted Unit Price:</Text>
                <Text style={styles.quotedPriceValue}>₹{quotedUnitPrice}</Text>
                {percentSavings > 0 && (
                  <View style={styles.savingsPill}>
                    <Text style={styles.savingsPillText}>{percentSavings}% Off List</Text>
                  </View>
                )}
              </View>
              <Text style={styles.quotedTotalText}>
                Consignment Total: ₹{quotedTotal.toLocaleString('en-IN')}
              </Text>
            </View>
          ) : (
            <View style={styles.waitingColumn}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.waitingText}>Awaiting supplier commercial response</Text>
            </View>
          )}

          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>
              {isAccepted ? 'View Terms' : hasSellerResponse ? 'Review & Accept' : 'View RFQ'}
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

      {/* Header Bar */}
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
          <Text style={styles.headerTitle}>My Quotations</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Wholesale RFQs & Negotiated Pricing
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newRfqButton}
          onPress={handleBrowseCatalog}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 2 }} />
          <Text style={styles.newRfqText}>Browse Catalog</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Overview Row */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{counts.all}</Text>
          <Text style={styles.kpiLabel}>Total RFQs</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: '#9333EA' }]}>{counts.pending}</Text>
          <Text style={styles.kpiLabel}>Pending</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.primary }]}>{counts.received}</Text>
          <Text style={styles.kpiLabel}>Quotes Ready</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.success }]}>{counts.accepted}</Text>
          <Text style={styles.kpiLabel}>Accepted</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quotations, products, or suppliers..."
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
          if (tab.key === 'Received') count = counts.received;
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

      {/* Quotations List */}
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
                  ? 'No Matching Quotations'
                  : activeFilter !== 'All'
                  ? `No ${activeFilter} Quotations`
                  : 'No Quotation Requests Yet'
              }
              description={
                searchQuery
                  ? `No quotation requests matched "${searchQuery}". Try searching by quotation ID or supplier name.`
                  : 'Request factory quotations directly from suppliers for customized bulk orders, negotiated prices, and volume discounts.'
              }
              actionText="Browse Wholesale Products"
              actionIcon="storefront-outline"
              onActionPress={handleBrowseCatalog}
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
  newRfqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  newRfqText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    fontSize: 12,
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
    marginBottom: spacing.sm,
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
  counterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: spacing.sm,
  },
  counterBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
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
    marginBottom: 2,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplierText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  requestedVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestedVolumeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  targetPriceText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingColumn: {
    flex: 1,
  },
  quotedPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  quotedPriceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  quotedPriceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  savingsPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  savingsPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  quotedTotalText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  waitingColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  waitingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
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

