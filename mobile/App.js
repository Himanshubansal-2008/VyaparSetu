import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { CartProvider } from './src/context/CartContext';
import { ModeProvider } from './src/context/ModeContext';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ModeProvider>
        <CartProvider>
          <AppNavigator />
        </CartProvider>
      </ModeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
