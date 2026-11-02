import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, BackHandler, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ProductListingScreen from '../screens/ProductListingScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';

const VALID_ROUTES = ['Home', 'ProductListing', 'ProductDetails'];

export default function AppNavigator() {
  const [navState, setNavState] = useState({
    currentRoute: {
      name: 'Home',
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

      {/* Product Details Screen */}
      {currentRoute.name === 'ProductDetails' && (
        <View style={styles.screen}>
          <ProductDetailsScreen
            key={
              currentRoute.params?.productId ||
              currentRoute.params?.id ||
              'details'
            }
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

