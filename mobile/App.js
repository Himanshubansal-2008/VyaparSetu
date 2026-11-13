import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ModeProvider } from './src/context/ModeContext';
import { CartProvider } from './src/context/CartContext';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <AuthProvider>
        <ModeProvider>
          <CartProvider>
            <AppNavigator />
          </CartProvider>
        </ModeProvider>
      </AuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
