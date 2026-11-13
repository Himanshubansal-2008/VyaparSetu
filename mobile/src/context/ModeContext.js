import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSessionBusinessProfile,
  subscribeBusinessProfile,
  isUserCreatedProfile,
  STORAGE_KEY_ACTIVE_MODE,
  MODES,
  setActiveMode,
} from '../data/businessProfileData';

export { MODES, STORAGE_KEY_ACTIVE_MODE };

const ModeContext = createContext({
  mode: MODES.BUYER,
  isSellerMode: false,
  isBuyerMode: true,
  canSwitchToSeller: false,
  setMode: () => Promise.resolve({ success: false }),
  switchToBuyer: () => Promise.resolve({ success: true, mode: MODES.BUYER }),
  switchToSeller: () => Promise.resolve({ success: false }),
  activeBusinessProfile: null,
  isInitialized: true,
});

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(MODES.BUYER);
  const [sessionProfile, setSessionProfile] = useState(getSessionBusinessProfile);
  const [isInitialized, setIsInitialized] = useState(false);

  // Subscribe to business profile updates to keep eligibility and data in sync
  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => {
    setSessionProfile(getSessionBusinessProfile());
    return subscribeBusinessProfile((updated) => {
      setSessionProfile(updated);
    });
  }, []);

  const canSwitchToSeller = isUserCreatedProfile(sessionProfile);

  // Restore persisted mode on app startup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_MODE);
        const currentProfile = getSessionBusinessProfile();
        const hasValidProfile = isUserCreatedProfile(currentProfile);

        if (savedMode === MODES.SELLER && hasValidProfile) {
          if (isMounted) setModeState(MODES.SELLER);
        } else {
          // Default to buyer mode
          if (isMounted) setModeState(MODES.BUYER);
          // If stored mode was seller but profile is missing/invalid, reset storage to buyer
          if (savedMode === MODES.SELLER && !hasValidProfile) {
            await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_MODE, MODES.BUYER);
          }
        }
      } catch (e) {
        console.warn('[ModeContext] Failed to load saved mode:', e);
        if (isMounted) setModeState(MODES.BUYER);
      } finally {
        if (isMounted) setIsInitialized(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Safety watch: If user is currently in seller mode and their profile becomes invalid or deleted,
  // automatically fall back to buyer mode
  useEffect(() => {
    if (mode === MODES.SELLER && !canSwitchToSeller && isInitialized) {
      setModeState(MODES.BUYER);
      AsyncStorage.setItem(STORAGE_KEY_ACTIVE_MODE, MODES.BUYER).catch((e) =>
        console.warn('[ModeContext] Error persisting fallback to buyer mode:', e)
      );
    }
  }, [canSwitchToSeller, mode, isInitialized]);

  const setMode = useCallback(
    async (targetMode) => {
      if (targetMode === MODES.SELLER) {
        const currentProfile = getSessionBusinessProfile() || sessionProfile;
        if (!isUserCreatedProfile(currentProfile)) {
          return {
            success: false,
            reason: 'business_profile_required',
            message: 'A Business Profile is required to switch to Seller Mode.',
          };
        }
        setModeState(MODES.SELLER);
        try {
          await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_MODE, MODES.SELLER);
        } catch (e) {
          console.warn('[ModeContext] Error saving seller mode:', e);
        }
        return { success: true, mode: MODES.SELLER };
      }

      // Default: Buyer Mode
      setModeState(MODES.BUYER);
      try {
        await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_MODE, MODES.BUYER);
      } catch (e) {
        console.warn('[ModeContext] Error saving buyer mode:', e);
      }
      return { success: true, mode: MODES.BUYER };
    },
    [sessionProfile]
  );

  const switchToBuyer = useCallback(() => setMode(MODES.BUYER), [setMode]);
  const switchToSeller = useCallback(() => setMode(MODES.SELLER), [setMode]);

  const value = {
    mode,
    isSellerMode: mode === MODES.SELLER,
    isBuyerMode: mode === MODES.BUYER,
    canSwitchToSeller,
    setMode,
    switchToBuyer,
    switchToSeller,
    activeBusinessProfile: canSwitchToSeller ? sessionProfile : null,
    isInitialized,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    return {
      mode: MODES.BUYER,
      isSellerMode: false,
      isBuyerMode: true,
      canSwitchToSeller: false,
      setMode: () => Promise.resolve({ success: false }),
      switchToBuyer: () => Promise.resolve({ success: true, mode: MODES.BUYER }),
      switchToSeller: () => Promise.resolve({ success: false }),
      activeBusinessProfile: null,
      isInitialized: true,
    };
  }
  return context;
}

export default ModeContext;

