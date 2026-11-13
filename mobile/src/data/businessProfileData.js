import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Mock data for Business Profile Screen
 * Represents sample business profile information for VyaparSetu sellers.
 */

export const businesses = [
  {
    id: 'biz-sharma-handicrafts',
    sellerId: 'biz-sharma-handicrafts',
    businessName: 'Sharma Handicrafts',
    sellerName: 'Sharma Handicrafts',
    ownerName: 'Rahul Sharma',
    category: 'Handicrafts and Home Decor',
    description:
      'Sharma Handicrafts is a small business specializing in handcrafted decorative products and traditional Indian handicrafts. The business focuses on creating quality handmade products that showcase traditional craftsmanship.',
    contactNumber: '+91 9876543210',
    email: 'sharmahandicrafts@example.com',
    address: 'Shop No. 12, Main Market, Bhopal, Madhya Pradesh, India',
    location: 'Bhopal, Madhya Pradesh',
    isVerified: true,
    verificationStatus: 'Verified',
    specialties: [
      'Handmade Wooden Decor',
      'Traditional Indian Handicrafts',
      'Decorative Wall Hangings',
      'Handcrafted Home Accessories',
    ],
  },
  {
    id: 'biz-001',
    sellerId: 'biz-001',
    businessName: 'Shree Handloom Works',
    sellerName: 'Shree Handloom Works',
    ownerName: 'Mukesh Patel',
    category: 'Clothing & Textiles',
    description:
      'Shree Handloom Works is a certified weaver collective creating sustainable khadi and handloom cotton textiles, bags, and apparel for bulk and wholesale buyers across India.',
    contactNumber: '+91 9829012345',
    email: 'contact@shreehandlooms.in',
    address: 'Plot 44, Sitapura Industrial Area, Jaipur, Rajasthan 302022, India',
    location: 'Jaipur, Rajasthan',
    isVerified: true,
    verificationStatus: 'Verified',
    specialties: [
      'Khadi Cotton Textiles',
      'Handwoven Tote Bags',
      'Natural Dye Fabrics',
      'Eco-Friendly Apparel',
    ],
  },
  {
    id: 'biz-002',
    sellerId: 'biz-002',
    businessName: 'TechSource Distributors',
    sellerName: 'TechSource Distributors',
    ownerName: 'Amit Verma',
    category: 'Electronics',
    description:
      'TechSource Distributors supplies tested consumer electronics, audio gear, and commercial lighting fixtures to retailers and bulk distributors across North India.',
    contactNumber: '+91 9811054321',
    email: 'orders@techsourcedistributors.com',
    address: 'Shop 18, Nehru Place Market, New Delhi, Delhi 110019, India',
    location: 'Delhi, India',
    isVerified: true,
    verificationStatus: 'Verified',
    specialties: [
      'Bluetooth Audio Accessories',
      'LED Desk Lamps',
      'Wholesale Consumer Electronics',
      'Warranty Support',
    ],
  },
  {
    id: 'biz-003',
    sellerId: 'biz-003',
    businessName: 'Rang Artisan Collective',
    sellerName: 'Rang Artisan Collective',
    ownerName: 'Pooja Rathore',
    category: 'Handicrafts and Home Decor',
    description:
      'Rang Artisan Collective brings together traditional Rajasthani potters and woodworkers to craft heritage blue pottery vases, hand-painted wooden coasters, and architectural artifacts.',
    contactNumber: '+91 9414087654',
    email: 'sales@rangartisans.org',
    address: 'Artisan Village, Amber Road, Jaipur, Rajasthan 302002, India',
    location: 'Jaipur, Rajasthan',
    isVerified: true,
    verificationStatus: 'Verified',
    specialties: [
      'Jaipur Blue Pottery',
      'Hand-painted Wooden Coasters',
      'Terracotta Planters',
      'Custom Corporate Souvenirs',
    ],
  },
  {
    id: 'biz-004',
    sellerId: 'biz-004',
    businessName: 'PureHarvest Foods',
    sellerName: 'PureHarvest Foods',
    ownerName: 'Suresh Patil',
    category: 'Food Products',
    description:
      'PureHarvest Foods is an agricultural producer company processing organically farmed spices, turmeric powder, and roasted savory snacks for retail and distribution partners.',
    contactNumber: '+91 9822033445',
    email: 'info@pureharvestfoods.in',
    address: 'MIDC Agro Zone, Sangli, Maharashtra 416416, India',
    location: 'Sangli, Maharashtra',
    isVerified: true,
    verificationStatus: 'Verified',
    specialties: [
      'Organic Turmeric Powder',
      'Roasted Peanut Packs',
      'Wholesale Bulk Spices',
      'FSSAI Certified Processing',
    ],
  },
  {
    id: 'biz-005',
    sellerId: 'biz-005',
    businessName: 'EarthNest Ceramics',
    sellerName: 'EarthNest Ceramics',
    ownerName: 'Deepak Kulkarni',
    category: 'Home Decor',
    description:
      'EarthNest Ceramics manufactures ceramic planters, artisanal tableware, and stone garden decor designed for plant nurseries, lifestyle stores, and interior landscapers.',
    contactNumber: '+91 9850123789',
    email: 'connect@earthnestceramics.com',
    address: 'Wakad Ceramic Park, Pune, Maharashtra 411057, India',
    location: 'Pune, Maharashtra',
    isVerified: true,
    verificationStatus: 'Verified',
    specialties: [
      'Handcrafted Ceramic Planters',
      'Indoor Decor Pottery',
      'Glazed Garden Planters',
      'B2B Wholesale Packaging',
    ],
  },
  {
    id: 'biz-006',
    sellerId: 'biz-006',
    businessName: 'Maharashtra Textile House',
    sellerName: 'Maharashtra Textile House',
    ownerName: 'Ganesh Jadhav',
    category: 'Clothing',
    description:
      'Maharashtra Textile House produces handloom fabrics, cotton kurta bolts, and traditional woven textiles directly for garment manufacturers and fashion boutiques.',
    contactNumber: '+91 9765412390',
    email: 'sales@maharashtratextiles.co.in',
    address: 'Industrial Estate, Ichalkaranji, Maharashtra 416115, India',
    location: 'Ichalkaranji, Maharashtra',
    isVerified: true,
    verificationStatus: 'Verified',
    specialties: [
      '100% Pure Cotton Fabric',
      'Kurta & Shirting Rolls',
      'Custom Mill Dyeing',
      'Wholesale Fabric Bundles',
    ],
  },
  {
    id: 'biz-007',
    sellerId: 'biz-007',
    businessName: 'EcoCraft Industries',
    sellerName: 'EcoCraft Industries',
    ownerName: 'Sunita Deshmukh',
    category: 'Handicrafts',
    description:
      'EcoCraft Industries is a women-led enterprise creating sustainable jute packaging, clearance eco-bags, and natural fiber lifestyle accessories.',
    contactNumber: '+91 9923087654',
    email: 'ecocraft.industries@example.com',
    address: 'Ambad MIDC, Nashik, Maharashtra 422010, India',
    location: 'Nashik, Maharashtra',
    isVerified: false,
    verificationStatus: 'Unverified',
    specialties: [
      'Laminated Jute Bags',
      'Eco-friendly Return Gifts',
      'Biodegradable Packaging',
      'Custom Print Bags',
    ],
  },
];

export const getBusinessById = (id) => {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim().toLowerCase();
  return (
    businesses.find(
      (b) =>
        (b.id && b.id.toLowerCase() === cleanId) ||
        (b.sellerId && b.sellerId.toLowerCase() === cleanId)
    ) || null
  );
};

export const getBusinessByName = (name) => {
  if (!name || typeof name !== 'string') return null;
  const cleanName = name.trim().toLowerCase();
  return (
    businesses.find(
      (b) =>
        (b.businessName && b.businessName.toLowerCase() === cleanName) ||
        (b.sellerName && b.sellerName.toLowerCase() === cleanName)
    ) || null
  );
};

export const businessProfileData = businesses[0];

export const STORAGE_KEY_SESSION_PROFILE = '@vyaparsetu_business_profile';
export const STORAGE_KEY_CUSTOM_BUSINESSES = '@vyaparsetu_custom_businesses';
export const STORAGE_KEY_ACTIVE_MODE = '@vyaparsetu_active_mode';

export const MODES = {
  BUYER: 'buyer',
  SELLER: 'seller',
};

let sessionBusinessProfile = null;
const profileListeners = new Set();

/**
 * Check whether a business profile object represents a valid user-created business profile.
 * Rejects null, undefined, invalid objects, and the mock Sharma Handicrafts business profile.
 */
export const isUserCreatedProfile = (profile) => {
  if (!profile || typeof profile !== 'object') return false;

  const id = String(profile.id || profile.sellerId || '').trim().toLowerCase();
  // Must NOT be the mock Sharma Handicrafts profile or empty ID
  if (!id || id === 'biz-sharma-handicrafts') {
    return false;
  }

  const name = String(profile.businessName || profile.sellerName || '').trim();
  // Must have a non-empty business name
  if (!name) {
    return false;
  }

  return true;
};

/**
 * Returns true if a valid user-created business profile exists in the current session.
 */
export const hasUserBusinessProfile = () => {
  return isUserCreatedProfile(sessionBusinessProfile);
};

/**
 * Checks whether a given product belongs to the currently active seller/business profile.
 * Compares business profile id / sellerId / businessName against product sellerId / businessId / sellerName.
 *
 * @param {Object} productOrItem - Product object or cart/order item containing a product
 * @param {Object} [customProfile] - Optional explicit business profile to compare against (defaults to getSessionBusinessProfile())
 * @returns {boolean} True if the product belongs to the current seller
 */
export const isProductOwnedByCurrentSeller = (productOrItem, customProfile) => {
  if (!productOrItem) return false;
  const product = productOrItem.product || productOrItem;
  if (!product || typeof product !== 'object') return false;

  const profile = customProfile !== undefined ? customProfile : getSessionBusinessProfile();
  if (!profile || typeof profile !== 'object') return false;

  const profileId = String(profile.id || '').trim().toLowerCase();
  const profileSellerId = String(profile.sellerId || '').trim().toLowerCase();
  const profileName = String(profile.businessName || profile.sellerName || '').trim().toLowerCase();

  const prodSellerId = String(product.sellerId || '').trim().toLowerCase();
  const prodBizId = String(product.businessId || '').trim().toLowerCase();
  const prodSellerName = String(product.sellerName || '').trim().toLowerCase();

  // 1. Direct ID / sellerId match
  if (profileId && (profileId === prodSellerId || profileId === prodBizId)) {
    return true;
  }
  if (profileSellerId && (profileSellerId === prodSellerId || profileSellerId === prodBizId)) {
    return true;
  }

  // 2. Exact Business / Seller Name match if non-empty
  if (profileName && prodSellerName && profileName === prodSellerName) {
    return true;
  }

  return false;
};

export const subscribeBusinessProfile = (listener) => {
  if (typeof listener !== 'function') return () => {};
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
};

const notifyProfileListeners = () => {
  profileListeners.forEach((listener) => {
    try {
      listener(sessionBusinessProfile);
    } catch (e) {
      console.warn('[businessProfileData] Listener error:', e);
    }
  });
};

/**
 * Load persisted business profile and custom businesses from AsyncStorage into memory.
 * Call this during app startup before screens render.
 */
export const loadPersistedBusinessProfile = async () => {
  try {
    const [profileJson, businessesJson] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_SESSION_PROFILE),
      AsyncStorage.getItem(STORAGE_KEY_CUSTOM_BUSINESSES),
    ]);

    if (profileJson) {
      sessionBusinessProfile = JSON.parse(profileJson);
      if (sessionBusinessProfile) {
        const targetId =
          sessionBusinessProfile.id || sessionBusinessProfile.sellerId;
        if (targetId) {
          const cleanId = String(targetId).trim().toLowerCase();
          const index = businesses.findIndex(
            (b) =>
              (b.id && b.id.toLowerCase() === cleanId) ||
              (b.sellerId && b.sellerId.toLowerCase() === cleanId)
          );
          if (index !== -1) {
            businesses[index] = {
              ...businesses[index],
              ...sessionBusinessProfile,
            };
          } else {
            businesses.push(sessionBusinessProfile);
          }
        }
      }
    }

    if (businessesJson) {
      const customBusinesses = JSON.parse(businessesJson);
      if (Array.isArray(customBusinesses)) {
        customBusinesses.forEach((cb) => {
          if (!cb) return;
          const targetId = cb.id || cb.sellerId;
          if (targetId) {
            const cleanId = String(targetId).trim().toLowerCase();
            const index = businesses.findIndex(
              (b) =>
                (b.id && b.id.toLowerCase() === cleanId) ||
                (b.sellerId && b.sellerId.toLowerCase() === cleanId)
            );
            if (index !== -1) {
              businesses[index] = { ...businesses[index], ...cb };
            } else {
              businesses.push(cb);
            }
          }
        });
      }
    }
  } catch (error) {
    console.warn(
      '[businessProfileData] Failed to load persisted business profile:',
      error
    );
  }
  notifyProfileListeners();
  return sessionBusinessProfile;
};

/**
 * Loads the persisted mode from AsyncStorage.
 * Returns 'seller' if saved and user has a valid user-created business profile.
 * Otherwise returns 'buyer' (the default mode).
 */
export const loadPersistedMode = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_MODE);
    if (saved === MODES.SELLER) {
      if (isUserCreatedProfile(sessionBusinessProfile)) {
        return MODES.SELLER;
      }
      // Invalid seller mode: fall back to buyer and persist
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_MODE, MODES.BUYER);
      return MODES.BUYER;
    }
    return MODES.BUYER;
  } catch (error) {
    console.warn('[businessProfileData] Failed to load persisted mode:', error);
    return MODES.BUYER;
  }
};

/**
 * Saves the active mode to AsyncStorage.
 */
export const savePersistedMode = async (mode) => {
  try {
    const target = mode === MODES.SELLER ? MODES.SELLER : MODES.BUYER;
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_MODE, target);
    return target;
  } catch (error) {
    console.warn('[businessProfileData] Failed to save persisted mode:', error);
    return MODES.BUYER;
  }
};

const persistData = async () => {
  try {
    const promises = [];
    if (sessionBusinessProfile) {
      promises.push(
        AsyncStorage.setItem(
          STORAGE_KEY_SESSION_PROFILE,
          JSON.stringify(sessionBusinessProfile)
        )
      );
    } else {
      promises.push(AsyncStorage.removeItem(STORAGE_KEY_SESSION_PROFILE));
    }

    // Persist all submitted or updated custom businesses
    const customBusinesses = businesses.filter(
      (b) =>
        b &&
        (b.isSubmitted ||
          (b.id && b.id.startsWith('biz-submitted-')) ||
          (sessionBusinessProfile &&
            (b.id === sessionBusinessProfile.id ||
              b.sellerId === sessionBusinessProfile.sellerId)))
    );

    if (customBusinesses.length > 0) {
      promises.push(
        AsyncStorage.setItem(
          STORAGE_KEY_CUSTOM_BUSINESSES,
          JSON.stringify(customBusinesses)
        )
      );
    }
    await Promise.all(promises);
  } catch (error) {
    console.warn('[businessProfileData] Failed to persist data:', error);
  }
};

export const setSessionBusinessProfile = (profile) => {
  sessionBusinessProfile = profile;
  if (profile) {
    const targetId = profile.id || profile.sellerId;
    if (targetId) {
      const cleanId = String(targetId).trim().toLowerCase();
      const index = businesses.findIndex(
        (b) =>
          (b.id && b.id.toLowerCase() === cleanId) ||
          (b.sellerId && b.sellerId.toLowerCase() === cleanId)
      );
      if (index !== -1) {
        businesses[index] = { ...businesses[index], ...profile };
      } else {
        businesses.push(profile);
      }
    }
    notifyProfileListeners();
    return persistData();
  }
  notifyProfileListeners();
  return persistData();
};

export const getSessionBusinessProfile = () => {
  return sessionBusinessProfile;
};

export const updateBusinessProfile = (updatedProfile) => {
  if (!updatedProfile) return Promise.resolve();
  sessionBusinessProfile = updatedProfile;

  const targetId = updatedProfile.id || updatedProfile.sellerId;
  if (targetId) {
    const cleanId = String(targetId).trim().toLowerCase();
    const index = businesses.findIndex(
      (b) =>
        (b.id && b.id.toLowerCase() === cleanId) ||
        (b.sellerId && b.sellerId.toLowerCase() === cleanId)
    );
    if (index !== -1) {
      businesses[index] = { ...businesses[index], ...updatedProfile };
    } else {
      businesses.push(updatedProfile);
    }
  }
  notifyProfileListeners();
  return persistData();
};

export default businessProfileData;
