
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { updateProductStock } from '../services/productService';

export default function UpdateStockScreen({ navigation, route }) {
  const product = route?.params?.product;

  const currentStock = Number(product?.stock) || 0;

  const [stock, setStock] = useState(String(currentStock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    const newStock = Number(stock);

    if (!Number.isInteger(newStock) || newStock < 0) {
      setError('Please enter a valid non-negative whole number.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await updateProductStock(product.id, newStock);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to update stock.');
    } finally {
      setSaving(false);
    }
  };

  if (!product?.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Product information is missing.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 55 }}>📦</Text>
        <Text style={styles.successTitle}>Stock Updated!</Text>
        <Text style={styles.subtitle}>
          {product.name} now has {stock} {product.unit || 'units'} in stock.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Back to Inventory</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to Inventory</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Update Stock</Text>
      <Text style={styles.subtitle}>
        Manage stock quantity for {product.name}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Current Stock</Text>
        <Text style={styles.currentStock}>
          {currentStock} {product.unit || 'units'}
        </Text>

        <Text style={styles.label}>New Stock Quantity</Text>
        <TextInput
          style={styles.input}
          value={stock}
          onChangeText={(value) => {
            setStock(value);
            setError('');
          }}
          keyboardType="number-pad"
          placeholder="Enter new quantity"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, saving && { opacity: 0.6 }]}
          onPress={handleUpdate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save Stock</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 22,
  },
  subtitle: {
    color: '#64748B',
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 15,
  },
  label: {
    color: '#475569',
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 12,
  },
  currentStock: {
    fontSize: 27,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    color: '#0F172A',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  backText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  error: {
    color: '#DC2626',
    marginTop: 12,
  },
  successTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 16,
  },
});
