import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, BackHandler, Platform, Alert, ActivityIndicator } from 'react-native';
import { useMode } from '../context/ModeContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import ProductListingScreen from '../screens/ProductListingScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import InventoryDashboardScreen from '../screens/InventoryDashboardScreen';
import InventoryListScreen from '../screens/InventoryListScreen';
import EditProductScreen from '../screens/EditProductScreen';
import UpdateStockScreen from '../screens/UpdateStockScreen';

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
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';

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
import { migrateLocalCartToBackendIfNeeded } from '../services/cartMigrationService';

const VALID_ROUTES = [
  'Home',
  'ProductListing',
  'ProductDetails',

  // Inventory
  'InventoryDashboard',
  'InventoryList',
  'AddProduct',
  'EditProduct',
  'UpdateStock',

  // Business
  'BusinessProfile',
  'CreateBusinessProfile',
  'EditBusinessProfile',

  // Buyer
  'Cart',
  'Checkout',
  'OrderConfirmation',
  'OrderHistory',
  'Orders',
  'OrderDetails',

  // Seller
  'SellerOrders',
  'SellerOrderDetails',

  // Quotations
  'RequestQuotation',
  'BuyerQuotations',
  'BuyerQuotationDetails',
  'SellerQuotations',
  'SellerQuotationDetails',

  // Authentication
  'Signup',
  'Login',
];

const AUTH_ROUTES = ['Login', 'Signup'];

export default function AppNavigator({ initialRouteName = null }) {
  let authContext = null;
  try {
    authContext = useAuth();
  } catch (e) {
    // Graceful fallback for environments/tests rendered without AuthProvider
  }

  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const isAuthLoading = authContext?.isLoading ?? false;
  const logout = authContext?.logout;

  const [isLoaded, setIsLoaded] = useState(false);
  const { isSellerMode } = useMode();

  // Compute resolved initial route:
  // - If explicit initialRouteName is provided (e.g. testing), respect it.
  // - Otherwise, default to 'Home' if authenticated, or 'Login' if unauthenticated.
  const resolvedInitialRoute = useMemo(() => {
    if (initialRouteName && VALID_ROUTES.includes(initialRouteName)) {
      return initialRouteName;
    }
    return isAuthenticated ? 'Home' : 'Login';
  }, [initialRouteName, isAuthenticated]);
  const [navState, setNavState] = useState({
    currentRoute: {
      name: resolvedInitialRoute,
      params: {},
    },
    history: [],
  });

  const { currentRoute, history } = navState;

  // If user switches to Seller Mode while on buyer purchasing screens, redirect safely to Home
  useEffect(() => {
    if (isSellerMode && ['Cart', 'Checkout', 'OrderConfirmation'].includes(currentRoute.name)) {
      setNavState((prevState) => ({
        currentRoute: { name: 'Home', params: {} },
        history: prevState.history.filter(
          (r) => !['Cart', 'Checkout', 'OrderConfirmation'].includes(r.name)
        ),
      }));
    }
  }, [isSellerMode, currentRoute.name]);

  // Protected navigation sync: automatically redirect when authentication state changes
  useEffect(() => {
    if (isAuthLoading || !isLoaded) return;

    if (!isAuthenticated) {
      // Unauthenticated: only Login or Signup permitted
      if (!AUTH_ROUTES.includes(currentRoute.name)) {
        setNavState({
          currentRoute: { name: 'Login', params: {} },
          history: [],
        });
      }
    } else {
      // Authenticated: Login and Signup are blocked
      if (AUTH_ROUTES.includes(currentRoute.name)) {
        setNavState({
          currentRoute: { name: 'Home', params: {} },
          history: [],
        });
      }
    }
  }, [isAuthenticated, isAuthLoading, isLoaded, currentRoute.name]);

  const navigate = useCallback((name, params = {}) => {
    if (!name || typeof name !== 'string' || !VALID_ROUTES.includes(name)) {
      console.warn(
        `[AppNavigator] Invalid or missing navigation target: "${name}". Valid routes are: ${VALID_ROUTES.join(
          ', '
        )}`
      );
      return;
    }

    // Guard: Prevent unauthenticated users from entering protected screens
    if (!isAuthenticated && !AUTH_ROUTES.includes(name)) {
      console.warn(`[AppNavigator] Access to protected route "${name}" blocked while unauthenticated. Redirecting to Login.`);
      navigate('Login');
      return;
    }

    // Guard: Prevent authenticated users from entering Login or Signup unless explicitly logging out
    if (isAuthenticated && AUTH_ROUTES.includes(name)) {
      console.warn(`[AppNavigator] Access to auth route "${name}" blocked while authenticated. Redirecting to Home.`);
      navigate('Home');
      return;
    }

    // Guard: Prevent purchasing and cart access in Seller Mode
    if (isSellerMode && (name === 'Cart' || name === 'Checkout' || name === 'OrderConfirmation')) {
      Alert.alert(
        'Seller Mode Active',
        'Purchasing and cart access are disabled in Seller Mode. Switch to Buyer Mode to make purchases.'
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
  }, [isAuthenticated, isSellerMode]);

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
      logout,
    }),
    [navigate, goBack, canGoBack, logout]
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

        // 6. Migrate eligible local cart items to PostgreSQL
        await migrateLocalCartToBackendIfNeeded().catch((e) =>
          console.warn('[AppNavigator] Cart migration skipped/deferred:', e)
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
    if (isSellerMode) {
      Alert.alert(
        'Seller Mode Active',
        'Cart is not accessible while in Seller Mode. Switch to Buyer Mode to access your cart.'
      );
      return;
    }
    navigate('Cart');
  }, [navigate, isSellerMode]);

  const handleNavigateToCheckout = useCallback(() => {
    if (isSellerMode) {
      Alert.alert(
        'Seller Mode Active',
        'Checkout is not accessible while in Seller Mode. Switch to Buyer Mode to checkout.'
      );
      return;
    }
    navigate('Checkout');
  }, [navigate, isSellerMode]);

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

  const handleNavigateToHome = useCallback(() => {
    navigate('Home');
  }, [navigate]);

  const handleNavigateToSignup = useCallback(() => {
    const isSignupInHistory = history.some((r) => r.name === 'Signup');
    if (isSignupInHistory) {
      goBack();
    } else {
      navigate('Signup');
    }
  }, [history, goBack, navigate]);

  const handleNavigateToLogin = useCallback(() => {
    const isLoginInHistory = history.some((r) => r.name === 'Login');
    if (isLoginInHistory) {
      goBack();
    } else {
      navigate('Login');
    }
  }, [history, goBack, navigate]);

  if (isAuthLoading || !isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Home Screen is kept mounted to preserve scroll position and filters */}
      {/* Inventory Dashboard Screen */}
      {currentRoute.name === 'InventoryDashboard' && (
        <View style={styles.screen}>
          <InventoryDashboardScreen navigation={navigation} />
        </View>
      )}
      
      {currentRoute.name === 'InventoryList' && (
        <View style={styles.screen}>
          <InventoryListScreen navigation={navigation} />
        </View>
      )}

      {currentRoute.name === 'EditProduct' && (
        <View style={styles.screen}>
          <EditProductScreen
            navigation={navigation}
            route={currentRoute}
          />
        </View>
      )}

      {currentRoute.name === 'UpdateStock' && (
        <View style={styles.screen}>
          <UpdateStockScreen
            navigation={navigation}
            route={currentRoute}
          />
        </View>
      )}

      <View
        style={[
          styles.screen,
          currentRoute.name !== 'Home' && styles.screenHidden,
        ]}
      >
        <HomeScreen
          isActive={currentRoute.name === 'Home'}
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
          onNavigateToSignup={handleNavigateToSignup}
          onNavigateToLogin={handleNavigateToLogin}
          onLogoutPress={logout}
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

      {/* Add Product Screen */}
{currentRoute.name === 'AddProduct' && (
  <View style={styles.screen}>
    <AddProductScreen
      key={currentRoute.name}
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

      {/* Signup Screen */}
      {currentRoute.name === 'Signup' && (
        <View style={styles.screen}>
          <SignupScreen
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToHome={handleNavigateToHome}
          />
        </View>
      )}

      {/* Login Screen */}
      {currentRoute.name === 'Login' && (
        <View style={styles.screen}>
          <LoginScreen
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToHome={handleNavigateToHome}
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
    pointerEvents: 'none',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});

