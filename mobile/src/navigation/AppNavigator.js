import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, BackHandler, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ProductListingScreen from '../screens/ProductListingScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import CreateBusinessProfileScreen from '../screens/CreateBusinessProfileScreen';
import AddProductScreen from '../screens/AddProductScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import SellerOrdersScreen from '../screens/SellerOrdersScreen';
import SellerOrderDetailsScreen from '../screens/SellerOrderDetailsScreen';
import RequestQuotationScreen from '../screens/RequestQuotationScreen';
import BuyerQuotationsScreen from '../screens/BuyerQuotationsScreen';
import BuyerQuotationDetailsScreen from '../screens/BuyerQuotationDetailsScreen';
import SellerQuotationsScreen from '../screens/SellerQuotationsScreen';
import SellerQuotationDetailsScreen from '../screens/SellerQuotationDetailsScreen';
import {
  loadPersistedBusinessProfile,
  loadPersistedMode,
  getSessionBusinessProfile,
} from '../data/businessProfileData';
import { loadPersistedProducts } from '../data/products';
import {
  loadPersistedOrders,
  loadPersistedAddress,
} from '../data/orders';
import { loadPersistedQuotations } from '../data/quotations';
import { initUserSession } from '../services/userService';
import { migrateLegacyBusinessProfileIfNeeded } from '../services/businessMigrationService';
import { migrateLocalProductsToBackendIfNeeded } from '../services/productMigrationService';

const VALID_ROUTES = [
  'Home',
  'ProductListing',
  'ProductDetails',
  'BusinessProfile',
  'CreateBusinessProfile',
  'EditBusinessProfile',
  'AddProduct',
  'EditProduct',
  'Cart',
  'Checkout',
  'OrderConfirmation',
  'OrderHistory',
  'Orders',
  'OrderDetails',
  'SellerOrders',
  'SellerOrderDetails',
  'RequestQuotation',
  'BuyerQuotations',
  'BuyerQuotationDetails',
  'SellerQuotations',
  'SellerQuotationDetails',
];

export default function AppNavigator({ initialRouteName = 'Home' }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [navState, setNavState] = useState({
    currentRoute: {
      name: VALID_ROUTES.includes(initialRouteName) ? initialRouteName : 'Home',
      params: {},
    },
    history: [],
  });

  const { currentRoute, history } = navState;

  const navigate = useCallback((name, params = {}) => {
    if (!name || typeof name !== 'string' || !VALID_ROUTES.includes(name)) {
      console.warn(
        `[AppNavigator] Invalid or missing navigation target: "${name}". Valid routes are: ${VALID_ROUTES.join(
          ', '
        )}`
      );
      return;
    }

    setNavState((prevState) => {
      const { currentRoute: prevRoute, history: prevHistory } = prevState;

      // Prevent duplicate navigation actions or unintended multiple screen instances
      if (prevRoute.name === name) {
        const isParamsEqual =
          JSON.stringify(prevRoute.params || {}) ===
          JSON.stringify(params || {});
        if (isParamsEqual) {
          return prevState;
        }
        return {
          ...prevState,
          currentRoute: {
            name,
            params: { ...(prevRoute.params || {}), ...params },
          },
        };
      }

      return {
        currentRoute: { name, params },
        history: [...prevHistory, prevRoute],
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setNavState((prevState) => {
      const { history: prevHistory } = prevState;
      if (prevHistory.length === 0) return prevState;
      const nextHistory = [...prevHistory];
      const previousRoute = nextHistory.pop();
      return {
        currentRoute: previousRoute,
        history: nextHistory,
      };
    });
  }, []);

  const canGoBack = useCallback(() => history.length > 0, [history.length]);

  const navigation = useMemo(
    () => ({
      navigate,
      goBack,
      canGoBack,
    }),
    [navigate, goBack, canGoBack]
  );

  // Handle Android hardware back press
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (history.length > 0) {
        goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandler.remove();
  }, [history.length, goBack]);

  // Load user session, persisted business profile, mode, products, orders, and address on app launch
  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Initialize user session first
        await initUserSession().catch((e) =>
          console.warn('[AppNavigator] User session init error:', e)
        );

        // 2. Load persisted local data
        await Promise.all([
          loadPersistedBusinessProfile(),
          loadPersistedProducts(),
          loadPersistedOrders(),
          loadPersistedAddress(),
          loadPersistedQuotations(),
        ]);

        // 3. Perform seamless one-time migration for legacy business profile if present
        await migrateLegacyBusinessProfileIfNeeded().catch((e) =>
          console.warn('[AppNavigator] Business migration skipped/deferred:', e)
        );

        // 4. Load persisted mode after migration so seller mode checks the migrated UUID
        await loadPersistedMode();

        // 5. Migrate eligible local custom products to PostgreSQL
        await migrateLocalProductsToBackendIfNeeded().catch((e) =>
          console.warn('[AppNavigator] Product migration skipped/deferred:', e)
        );
      } catch (err) {
        console.warn('[AppNavigator] App initialization error:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    initApp();
  }, []);

  const homeRoute = useMemo(
    () => (currentRoute.name === 'Home' ? currentRoute : { name: 'Home', params: {} }),
    [currentRoute]
  );

  // Preserve ProductListingScreen while active or in history when navigating to ProductDetails
  const listingRoute = useMemo(() => {
    if (currentRoute.name === 'ProductListing') {
      return currentRoute;
    }
    const foundInHistory = history
      .slice()
      .reverse()
      .find((r) => r.name === 'ProductListing');
    return foundInHistory || null;
  }, [currentRoute, history]);

  // Preserve ProductDetailsScreen while active or in history when navigating to BusinessProfile
  const detailsRoute = useMemo(() => {
    if (currentRoute.name === 'ProductDetails') {
      return currentRoute;
    }
    const foundInHistory = history
      .slice()
      .reverse()
      .find((r) => r.name === 'ProductDetails');
    return foundInHistory || null;
  }, [currentRoute, history]);

  // Preserve BusinessProfileScreen while active or in history when navigating to AddProduct
  const profileRoute = useMemo(() => {
    if (currentRoute.name === 'BusinessProfile') {
      return currentRoute;
    }
    const foundInHistory = history
      .slice()
      .reverse()
      .find((r) => r.name === 'BusinessProfile');
    return foundInHistory || null;
  }, [currentRoute, history]);

  const handleNavigateToProductDetails = useCallback(
    (itemOrParams) => {
      if (
        itemOrParams &&
        (itemOrParams.productId !== undefined ||
          (itemOrParams.product !== undefined && itemOrParams.id === undefined))
      ) {
        navigate('ProductDetails', itemOrParams);
      } else if (itemOrParams) {
        navigate('ProductDetails', {
          productId: itemOrParams.id,
          product: itemOrParams,
        });
      } else {
        navigate('ProductDetails', {});
      }
    },
    [navigate]
  );

  const handleNavigateToBusinessProfile = useCallback(
    (itemOrParams) => {
      if (typeof itemOrParams === 'string') {
        navigate('BusinessProfile', { businessId: itemOrParams });
      } else if (itemOrParams && typeof itemOrParams === 'object') {
        navigate('BusinessProfile', itemOrParams);
      } else {
        navigate('BusinessProfile', {});
      }
    },
    [navigate]
  );

  const handleNavigateToAddProduct = useCallback(
    (itemOrParams) => {
      if (itemOrParams && typeof itemOrParams === 'object') {
        const businessObj = itemOrParams.business || itemOrParams;
        const bId = itemOrParams.businessId || itemOrParams.id || businessObj?.id;
        const sId = itemOrParams.sellerId || businessObj?.sellerId || bId;
        navigate('AddProduct', {
          business: businessObj,
          businessId: bId,
          sellerId: sId,
        });
      } else if (typeof itemOrParams === 'string') {
        navigate('AddProduct', { businessId: itemOrParams });
      } else {
        navigate('AddProduct', {});
      }
    },
    [navigate]
  );

  const handleNavigateToEditProduct = useCallback(
    (itemOrParams) => {
      if (itemOrParams && typeof itemOrParams === 'object') {
        navigate('EditProduct', {
          ...itemOrParams,
          product: itemOrParams.product || itemOrParams,
          productId:
            itemOrParams.productId ||
            itemOrParams.id ||
            itemOrParams.product?.id,
          isEdit: true,
        });
      } else if (typeof itemOrParams === 'string') {
        navigate('EditProduct', { productId: itemOrParams, isEdit: true });
      } else {
        navigate('EditProduct', { isEdit: true });
      }
    },
    [navigate]
  );

  const handleNavigateToCart = useCallback(() => {
    navigate('Cart');
  }, [navigate]);

  const handleNavigateToCheckout = useCallback(() => {
    navigate('Checkout');
  }, [navigate]);

  const handleNavigateToConfirmation = useCallback(
    (order) => {
      navigate('OrderConfirmation', {
        order,
        orderId: order?.id || order?.orderNumber,
      });
    },
    [navigate]
  );

  const handleNavigateToOrderHistory = useCallback(() => {
    navigate('OrderHistory');
  }, [navigate]);

  const handleNavigateToOrderDetails = useCallback(
    (orderOrParams) => {
      if (orderOrParams && typeof orderOrParams === 'object') {
        const orderObj = orderOrParams.order || orderOrParams;
        const ordId =
          orderOrParams.orderId ||
          orderOrParams.id ||
          orderObj?.id ||
          orderObj?.orderNumber;
        navigate('OrderDetails', {
          order: orderObj,
          orderId: ordId,
        });
      } else if (typeof orderOrParams === 'string') {
        navigate('OrderDetails', { orderId: orderOrParams });
      } else {
        navigate('OrderDetails', {});
      }
    },
    [navigate]
  );

  const handleNavigateToSellerOrders = useCallback(
    (paramsOrBusinessId) => {
      if (typeof paramsOrBusinessId === 'string') {
        navigate('SellerOrders', {
          businessId: paramsOrBusinessId,
          sellerId: paramsOrBusinessId,
        });
      } else if (paramsOrBusinessId && typeof paramsOrBusinessId === 'object') {
        const bId =
          paramsOrBusinessId.businessId ||
          paramsOrBusinessId.sellerId ||
          paramsOrBusinessId.business?.id ||
          paramsOrBusinessId.business?.sellerId;
        navigate('SellerOrders', {
          ...paramsOrBusinessId,
          businessId: bId,
          sellerId: bId,
        });
      } else {
        navigate('SellerOrders', {});
      }
    },
    [navigate]
  );

  const handleNavigateToSellerOrderDetails = useCallback(
    (orderOrParams) => {
      if (orderOrParams && typeof orderOrParams === 'object') {
        const orderObj = orderOrParams.order || orderOrParams;
        const ordId =
          orderOrParams.orderId ||
          orderOrParams.id ||
          orderObj?.id ||
          orderObj?.orderNumber;
        navigate('SellerOrderDetails', {
          ...orderOrParams,
          order: orderObj,
          orderId: ordId,
        });
      } else if (typeof orderOrParams === 'string') {
        navigate('SellerOrderDetails', { orderId: orderOrParams });
      } else {
        navigate('SellerOrderDetails', {});
      }
    },
    [navigate]
  );

  const handleNavigateToRequestQuotation = useCallback(
    (productOrParams) => {
      if (productOrParams && typeof productOrParams === 'object') {
        const prod = productOrParams.product || productOrParams;
        navigate('RequestQuotation', {
          ...productOrParams,
          product: prod,
          productId: prod?.id,
        });
      } else if (typeof productOrParams === 'string') {
        navigate('RequestQuotation', { productId: productOrParams });
      } else {
        navigate('RequestQuotation', {});
      }
    },
    [navigate]
  );

  const handleNavigateToBuyerQuotations = useCallback(() => {
    navigate('BuyerQuotations');
  }, [navigate]);

  const handleNavigateToBuyerQuotationDetails = useCallback(
    (quoteOrParams) => {
      if (quoteOrParams && typeof quoteOrParams === 'object') {
        const quoteObj = quoteOrParams.quotation || quoteOrParams;
        const qId = quoteOrParams.quotationId || quoteOrParams.id || quoteObj?.id;
        navigate('BuyerQuotationDetails', {
          ...quoteOrParams,
          quotation: quoteObj,
          quotationId: qId,
        });
      } else if (typeof quoteOrParams === 'string') {
        navigate('BuyerQuotationDetails', { quotationId: quoteOrParams });
      } else {
        navigate('BuyerQuotationDetails', {});
      }
    },
    [navigate]
  );

  const handleNavigateToSellerQuotations = useCallback(
    (paramsOrBusinessId) => {
      if (typeof paramsOrBusinessId === 'string') {
        navigate('SellerQuotations', {
          businessId: paramsOrBusinessId,
          sellerId: paramsOrBusinessId,
        });
      } else if (paramsOrBusinessId && typeof paramsOrBusinessId === 'object') {
        const bId =
          paramsOrBusinessId.businessId ||
          paramsOrBusinessId.sellerId ||
          paramsOrBusinessId.business?.id ||
          paramsOrBusinessId.business?.sellerId;
        navigate('SellerQuotations', {
          ...paramsOrBusinessId,
          businessId: bId,
          sellerId: bId,
        });
      } else {
        navigate('SellerQuotations', {});
      }
    },
    [navigate]
  );

  const handleNavigateToSellerQuotationDetails = useCallback(
    (quoteOrParams) => {
      if (quoteOrParams && typeof quoteOrParams === 'object') {
        const quoteObj = quoteOrParams.quotation || quoteOrParams;
        const qId = quoteOrParams.quotationId || quoteOrParams.id || quoteObj?.id;
        navigate('SellerQuotationDetails', {
          ...quoteOrParams,
          quotation: quoteObj,
          quotationId: qId,
        });
      } else if (typeof quoteOrParams === 'string') {
        navigate('SellerQuotationDetails', { quotationId: quoteOrParams });
      } else {
        navigate('SellerQuotationDetails', {});
      }
    },
    [navigate]
  );

  if (!isLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* Home Screen is kept mounted to preserve scroll position and filters */}
      <View
        style={[
          styles.screen,
          currentRoute.name !== 'Home' && styles.screenHidden,
        ]}
      >
        <HomeScreen
          navigation={navigation}
          route={homeRoute}
          onNavigateToProductListing={(params) =>
            navigate('ProductListing', params)
          }
          onNavigateToProductDetails={handleNavigateToProductDetails}
          onNavigateToAddProduct={handleNavigateToAddProduct}
          onNavigateToEditProduct={handleNavigateToEditProduct}
          onCartPress={handleNavigateToCart}
          onNavigateToOrderHistory={handleNavigateToOrderHistory}
          onOrdersPress={handleNavigateToOrderHistory}
          onNavigateToSellerOrders={handleNavigateToSellerOrders}
          onNavigateToBuyerQuotations={handleNavigateToBuyerQuotations}
          onNavigateToSellerQuotations={handleNavigateToSellerQuotations}
          onNavigateToRequestQuotation={handleNavigateToRequestQuotation}
        />
      </View>

      {/* Product Listing Screen is kept mounted while in history to preserve filters and scroll */}
      {listingRoute && (
        <View
          style={[
            styles.screen,
            currentRoute.name !== 'ProductListing' && styles.screenHidden,
          ]}
        >
          <ProductListingScreen
            navigation={navigation}
            route={listingRoute}
            onBackPress={goBack}
            onNavigateToProductDetails={handleNavigateToProductDetails}
            onCartPress={handleNavigateToCart}
          />
        </View>
      )}

      {/* Product Details Screen is kept mounted while active or in history to preserve state and scroll */}
      {detailsRoute && (
        <View
          style={[
            styles.screen,
            currentRoute.name !== 'ProductDetails' && styles.screenHidden,
          ]}
        >
          <ProductDetailsScreen
            key={
              detailsRoute.params?.productId ||
              detailsRoute.params?.id ||
              'details'
            }
            navigation={navigation}
            route={detailsRoute}
            onBackPress={goBack}
            onNavigateToBusinessProfile={handleNavigateToBusinessProfile}
            onNavigateToEditProduct={handleNavigateToEditProduct}
            onNavigateToRequestQuotation={handleNavigateToRequestQuotation}
            onNavigateToBuyerQuotations={handleNavigateToBuyerQuotations}
            onCartPress={handleNavigateToCart}
          />
        </View>
      )}

      {/* Business Profile Screen is kept mounted while in history to preserve state and scroll */}
      {profileRoute && (
        <View
          style={[
            styles.screen,
            currentRoute.name !== 'BusinessProfile' && styles.screenHidden,
          ]}
        >
          <BusinessProfileScreen
            key={
              profileRoute.params?.business?.updatedAt ||
              profileRoute.params?.businessId ||
              profileRoute.params?.id ||
              profileRoute.params?.business?.id ||
              'profile'
            }
            navigation={navigation}
            route={profileRoute}
            onBackPress={goBack}
            onNavigateToProductDetails={handleNavigateToProductDetails}
            onNavigateToAddProduct={handleNavigateToAddProduct}
            onNavigateToEditProduct={handleNavigateToEditProduct}
            onNavigateToSellerOrders={handleNavigateToSellerOrders}
            onNavigateToSellerQuotations={handleNavigateToSellerQuotations}
          />
        </View>
      )}

      {/* Create / Edit Business Profile Screen */}
      {(currentRoute.name === 'CreateBusinessProfile' ||
        currentRoute.name === 'EditBusinessProfile') && (
        <View style={styles.screen}>
          <CreateBusinessProfileScreen
            key={
              currentRoute.params?.business?.id ||
              getSessionBusinessProfile()?.id ||
              'create'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
          />
        </View>
      )}

      {/* Add / Edit Product Screen */}
      {(currentRoute.name === 'AddProduct' ||
        currentRoute.name === 'EditProduct') && (
        <View style={styles.screen}>
          <AddProductScreen
            key={
              currentRoute.params?.product?.id ||
              currentRoute.params?.productId ||
              currentRoute.name
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
          />
        </View>
      )}

      {/* Wholesale Cart Screen */}
      {currentRoute.name === 'Cart' && (
        <View style={styles.screen}>
          <CartScreen
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToProductDetails={handleNavigateToProductDetails}
            onNavigateToHome={() => navigate('Home')}
            onNavigateToCheckout={handleNavigateToCheckout}
            onNavigateToRequestQuotation={handleNavigateToRequestQuotation}
            onNavigateToBuyerQuotations={handleNavigateToBuyerQuotations}
          />
        </View>
      )}

      {/* Checkout Screen */}
      {currentRoute.name === 'Checkout' && (
        <View style={styles.screen}>
          <CheckoutScreen
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToConfirmation={handleNavigateToConfirmation}
            onNavigateToHome={() => navigate('Home')}
          />
        </View>
      )}

      {/* Order Confirmation Screen */}
      {currentRoute.name === 'OrderConfirmation' && (
        <View style={styles.screen}>
          <OrderConfirmationScreen
            navigation={navigation}
            route={currentRoute}
            onNavigateToHome={() => navigate('Home')}
            onNavigateToCatalog={() => navigate('ProductListing')}
            onNavigateToOrderDetails={handleNavigateToOrderDetails}
            onNavigateToOrders={handleNavigateToOrderHistory}
            onNavigateToOrderHistory={handleNavigateToOrderHistory}
          />
        </View>
      )}

      {/* Order History Screen */}
      {(currentRoute.name === 'OrderHistory' ||
        currentRoute.name === 'Orders') && (
        <View style={styles.screen}>
          <OrderHistoryScreen
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToOrderDetails={handleNavigateToOrderDetails}
            onNavigateToCatalog={() => navigate('ProductListing')}
            onNavigateToHome={() => navigate('Home')}
            onCartPress={handleNavigateToCart}
            onNavigateToBuyerQuotations={handleNavigateToBuyerQuotations}
          />
        </View>
      )}

      {/* Order Details Screen */}
      {currentRoute.name === 'OrderDetails' && (
        <View style={styles.screen}>
          <OrderDetailsScreen
            key={
              currentRoute.params?.orderId ||
              currentRoute.params?.order?.id ||
              'order_details'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToProductDetails={handleNavigateToProductDetails}
            onNavigateToOrderHistory={handleNavigateToOrderHistory}
            onNavigateToHome={() => navigate('Home')}
            onNavigateToCart={handleNavigateToCart}
          />
        </View>
      )}

      {/* Seller Orders Screen */}
      {currentRoute.name === 'SellerOrders' && (
        <View style={styles.screen}>
          <SellerOrdersScreen
            key={
              currentRoute.params?.businessId ||
              currentRoute.params?.sellerId ||
              'seller_orders'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToSellerOrderDetails={handleNavigateToSellerOrderDetails}
            onNavigateToBusinessProfile={handleNavigateToBusinessProfile}
            onNavigateToSellerQuotations={handleNavigateToSellerQuotations}
          />
        </View>
      )}

      {/* Seller Order Details Screen */}
      {currentRoute.name === 'SellerOrderDetails' && (
        <View style={styles.screen}>
          <SellerOrderDetailsScreen
            key={
              currentRoute.params?.orderId ||
              currentRoute.params?.order?.id ||
              'seller_order_details'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToSellerOrders={handleNavigateToSellerOrders}
            onNavigateToProductDetails={handleNavigateToProductDetails}
            onNavigateToBusinessProfile={handleNavigateToBusinessProfile}
          />
        </View>
      )}

      {/* Request Quotation Screen */}
      {currentRoute.name === 'RequestQuotation' && (
        <View style={styles.screen}>
          <RequestQuotationScreen
            key={
              currentRoute.params?.product?.id ||
              currentRoute.params?.productId ||
              'request_quote'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToBuyerQuotations={handleNavigateToBuyerQuotations}
            onNavigateToCatalog={() => navigate('ProductListing')}
            onNavigateToHome={() => navigate('Home')}
          />
        </View>
      )}

      {/* Buyer Quotations Listing Screen */}
      {currentRoute.name === 'BuyerQuotations' && (
        <View style={styles.screen}>
          <BuyerQuotationsScreen
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToBuyerQuotationDetails={handleNavigateToBuyerQuotationDetails}
            onNavigateToCatalog={() => navigate('ProductListing')}
            onNavigateToCart={handleNavigateToCart}
            onNavigateToOrders={handleNavigateToOrderHistory}
          />
        </View>
      )}

      {/* Buyer Quotation Details Screen */}
      {currentRoute.name === 'BuyerQuotationDetails' && (
        <View style={styles.screen}>
          <BuyerQuotationDetailsScreen
            key={
              currentRoute.params?.quotationId ||
              currentRoute.params?.quotation?.id ||
              'buyer_quote_details'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToCart={handleNavigateToCart}
            onNavigateToCheckout={handleNavigateToCheckout}
            onNavigateToProductDetails={handleNavigateToProductDetails}
            onNavigateToOrderDetails={handleNavigateToOrderDetails}
          />
        </View>
      )}

      {/* Seller Quotations Listing Screen */}
      {currentRoute.name === 'SellerQuotations' && (
        <View style={styles.screen}>
          <SellerQuotationsScreen
            key={
              currentRoute.params?.businessId ||
              currentRoute.params?.sellerId ||
              'seller_quotes'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToSellerQuotationDetails={handleNavigateToSellerQuotationDetails}
            onNavigateToBusinessProfile={handleNavigateToBusinessProfile}
          />
        </View>
      )}

      {/* Seller Quotation Details Screen */}
      {currentRoute.name === 'SellerQuotationDetails' && (
        <View style={styles.screen}>
          <SellerQuotationDetailsScreen
            key={
              currentRoute.params?.quotationId ||
              currentRoute.params?.quotation?.id ||
              'seller_quote_details'
            }
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToSellerQuotations={handleNavigateToSellerQuotations}
            onNavigateToProductDetails={handleNavigateToProductDetails}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  screenHidden: {
    display: 'none',
  },
});

