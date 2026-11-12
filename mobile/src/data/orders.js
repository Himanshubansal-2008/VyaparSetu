import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = AsyncStorage.default || AsyncStorage;

export const STORAGE_KEY_ADDRESS = '@vyaparsetu_delivery_address';

let inMemoryAddress = null;

export const loadPersistedAddress = async () => {
  try {
    const raw = await storage.getItem(STORAGE_KEY_ADDRESS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryAddress = parsed;
        return inMemoryAddress;
      }
    }
  } catch (error) {
    console.warn('[orders] Failed to load saved address:', error);
  }
  return inMemoryAddress;
};

export const getSavedAddress = () => {
  return inMemoryAddress;
};

export const saveDeliveryAddress = async (addressData) => {
  if (!addressData || typeof addressData !== 'object') return null;

  inMemoryAddress = {
    ...addressData,
    updatedAt: new Date().toISOString(),
  };

  try {
    await storage.setItem(
      STORAGE_KEY_ADDRESS,
      JSON.stringify(inMemoryAddress)
    );
  } catch (error) {
    console.warn('[orders] Failed to persist delivery address:', error);
  }

  return inMemoryAddress;
};

export default {
  STORAGE_KEY_ADDRESS,
  loadPersistedAddress,
  getSavedAddress,
  saveDeliveryAddress,
};
