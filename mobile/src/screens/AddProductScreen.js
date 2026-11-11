
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import {
  getCategories,
  getBusinesses,
  createProduct,
} from '../services/productService';

export default function AddProductScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '0',
    unit: 'piece',
    categoryId: '',
    businessId: '',
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
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Please enter product name.');
      return;
    }

    if (!form.price.trim() || !Number.isFinite(price) || price <= 0) {
      Alert.alert('Validation Error', 'Enter a valid price greater than zero.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      Alert.alert('Validation Error', 'Stock must be a non-negative whole number.');
      return;
    }

    if (!form.categoryId || !form.businessId) {
      Alert.alert('Missing Information', 'Please select a category and business.');
      return;
    }

    try {
      setSaving(true);

      await createProduct({
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
      Alert.alert('Error', err.message || 'Could not add product.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 55 }}>🎉</Text>

      <Text style={styles.successTitle}>
        Product Added Successfully!
      </Text>

      <Text style={styles.successMessage}>
        Your new product has been saved to the inventory.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>
          Back to Inventory
        </Text>
      </TouchableOpacity>
    </View>
  );
}

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.muted}>Loading categories and businesses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadFormData}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={navigation.goBack}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={navigation.goBack}>
        <Text style={styles.backText}>← Back to Inventory</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Add New Product</Text>
      <Text style={styles.subtitle}>
        Enter product details to add it to your inventory.
      </Text>

      <Text style={styles.label}>Product Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter product name"
        value={form.name}
        onChangeText={(value) => updateField('name', value)}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Enter product description"
        value={form.description}
        onChangeText={(value) => updateField('description', value)}
        multiline
      />

      <Text style={styles.label}>Price (₹) *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter price"
        value={form.price}
        onChangeText={(value) => updateField('price', value)}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Stock Quantity</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter stock quantity"
        value={form.stock}
        onChangeText={(value) => updateField('stock', value)}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Unit</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. piece, kg, litre"
        value={form.unit}
        onChangeText={(value) => updateField('unit', value)}
      />

      <Text style={styles.label}>Category *</Text>
      {categories.length === 0 ? (
        <Text style={styles.error}>No categories available. Add a category first.</Text>
      ) : (
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
      )}

      <Text style={styles.label}>Business *</Text>
      {businesses.length === 0 ? (
        <Text style={styles.error}>No businesses available. Add a business first.</Text>
      ) : (
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
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (saving || categories.length === 0 || businesses.length === 0) &&
            styles.disabledButton,
        ]}
        onPress={handleSave}
        disabled={saving || categories.length === 0 || businesses.length === 0}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Save Product</Text>
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
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 16,
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
    minHeight: 90,
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
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  backText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 8,
  },
  muted: {
    color: '#64748B',
    marginTop: 12,
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  successTitle: {
  fontSize: 23,
  fontWeight: '700',
  color: '#16A34A',
  textAlign: 'center',
  marginTop: 16,
},

successMessage: {
  fontSize: 15,
  color: '#64748B',
  textAlign: 'center',
  marginTop: 10,
  marginBottom: 20,
},
});
