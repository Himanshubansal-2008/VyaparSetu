import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, BackHandler, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ProductListingScreen from '../screens/ProductListingScreen';

export default function AppNavigator() {
  const [currentRoute, setCurrentRoute] = useState({
    name: 'Home',
    params: {},
  });
  const [history, setHistory] = useState([]);

  const navigate = useCallback((name, params = {}) => {
    setCurrentRoute((prevRoute) => {
      setHistory((prevHistory) => [...prevHistory, prevRoute]);
      return { name, params };
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const nextHistory = [...prevHistory];
      const previousRoute = nextHistory.pop();
      setCurrentRoute(previousRoute);
      return nextHistory;
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
        />
      </View>

      {/* Product Listing Screen */}
      {currentRoute.name === 'ProductListing' && (
        <View style={styles.screen}>
          <ProductListingScreen
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

