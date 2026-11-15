
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {
  getCategories,
  getBusinesses,
  updateProduct,
} from '../services/productService';

export default function EditProductScreen({ navigation, route }) {
  const product = route?.params?.product;

  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: String(product?.price ?? ''),
    stock: String(product?.stock ?? 0),
    unit: product?.unit || 'piece',
    categoryId: product?.categoryId || product?.category?.id || '',
    businessId: product?.businessId || product?.business?.id || '',
  });

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      setLoading(true);
      setError('');

      const [categoryData, businessData] = await Promise.all([
        getCategories(),
        getBusinesses(),
      ]);

      setCategories(categoryData);
      setBusinesses(businessData);

      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || categoryData[0]?.id || '',
        businessId: prev.businessId || businessData[0]?.id || '',
      }));
    } catch (err) {
      setError(err.message || 'Unable to load form data');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!product?.id) {
      setError('Product ID is missing.');
      return;
    }

    if (!form.name.trim()) {
      setError('Please enter a product name.');
      return;
    }

    if (!form.price.trim() || !Number.isFinite(price) || price <= 0) {
      setError('Enter a valid price greater than zero.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a non-negative whole number.');
      return;
    }

    if (!form.categoryId || !form.businessId) {
      setError('Please select a category and business.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await updateProduct(product.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        stock,
        unit: form.unit.trim() || 'piece',
        categoryId: form.categoryId,
        businessId: form.businessId,
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 55 }}>✅</Text>
        <Text style={styles.successTitle}>Product Updated!</Text>
        <Text style={styles.subtitle}>
          Your product details have been saved successfully.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Back to Inventory</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.subtitle}>Loading product details...</Text>
      </View>
    );
  }

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to Inventory</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Edit Product</Text>
      <Text style={styles.subtitle}>
        Update the details of {product.name}.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Product Name *</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(v) => updateField('name', v)}
        placeholder="Product name"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={form.description}
        onChangeText={(v) => updateField('description', v)}
        placeholder="Product description"
        multiline
      />

      <Text style={styles.label}>Price (₹) *</Text>
      <TextInput
        style={styles.input}
        value={form.price}
        onChangeText={(v) => updateField('price', v)}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Stock Quantity</Text>
      <TextInput
        style={styles.input}
        value={form.stock}
        onChangeText={(v) => updateField('stock', v)}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Unit</Text>
      <TextInput
        style={styles.input}
        value={form.unit}
        onChangeText={(v) => updateField('unit', v)}
        placeholder="piece, kg, litre..."
      />

      <Text style={styles.label}>Category *</Text>
      <View style={styles.options}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.option,
              form.categoryId === category.id && styles.selectedOption,
            ]}
            onPress={() => updateField('categoryId', category.id)}
          >
            <Text
              style={[
                styles.optionText,
                form.categoryId === category.id && styles.selectedOptionText,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Business *</Text>
      <View style={styles.options}>
        {businesses.map((business) => (
          <TouchableOpacity
            key={business.id}
            style={[
              styles.option,
              form.businessId === business.id && styles.selectedOption,
            ]}
            onPress={() => updateField('businessId', business.id)}
          >
            <Text
              style={[
                styles.optionText,
                form.businessId === business.id && styles.selectedOptionText,
              ]}
            >
              {business.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
    marginTop: 18,
  },
  subtitle: {
    color: '#64748B',
    marginTop: 8,
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#0F172A',
  },
  multiline: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
  },
  selectedOption: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  optionText: {
    color: '#334155',
    fontSize: 13,
  },
  selectedOptionText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
