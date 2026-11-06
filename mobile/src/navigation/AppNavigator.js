import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, BackHandler, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ProductListingScreen from '../screens/ProductListingScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import CreateBusinessProfileScreen from '../screens/CreateBusinessProfileScreen';
import AddProductScreen from '../screens/AddProductScreen';

const VALID_ROUTES = [
  'Home',
  'ProductListing',
  'ProductDetails',
  'BusinessProfile',
  'CreateBusinessProfile',
  'AddProduct',
];

export default function AppNavigator({ initialRouteName = 'Home' }) {
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
        navigate('AddProduct', {
          business: itemOrParams,
          businessId: itemOrParams.id,
          sellerId: itemOrParams.sellerId || itemOrParams.id,
        });
      } else if (typeof itemOrParams === 'string') {
        navigate('AddProduct', { businessId: itemOrParams });
      } else {
        navigate('AddProduct', {});
      }
    },
    [navigate]
  );

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
          />
        </View>
      )}

      {/* Create Business Profile Screen */}
      {currentRoute.name === 'CreateBusinessProfile' && (
        <View style={styles.screen}>
          <CreateBusinessProfileScreen
            key={currentRoute.params?.business?.id || 'create'}
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
            navigation={navigation}
            route={currentRoute}
            onBackPress={goBack}
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

