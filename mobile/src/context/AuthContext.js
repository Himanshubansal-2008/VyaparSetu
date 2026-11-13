import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  storeAuthToken,
  getStoredAuthToken,
  deleteStoredAuthToken,
  storeStoredUser,
  getStoredUser,
  deleteStoredUser,
} from '../utils/secureStorage';
import {
  setAuthToken,
  setUnauthorizedHandler,
  setClientUserId,
  setClientBusinessId,
} from '../services/apiClient';
import { fetchUserProfile } from '../services/authService';

export const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  initializeAuth: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = useMemo(() => Boolean(token && user), [token, user]);

  const logout = useCallback(async () => {
    try {
      setAuthToken(null);
      setClientUserId(null);
      setClientBusinessId(null);
      await Promise.all([
        deleteStoredAuthToken(),
        deleteStoredUser(),
      ]);
    } catch (err) {
      console.error('[AuthContext] Error during logout:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const login = useCallback(async ({ token: receivedToken, user: receivedUser }) => {
    if (!receivedToken) {
      throw new Error('Cannot login without a valid authentication token');
    }

    try {
      // 1. Store token in SecureStore
      await storeAuthToken(receivedToken);

      // 2. Configure API client in-memory token and identities
      setAuthToken(receivedToken);
      if (receivedUser?.id) {
        setClientUserId(receivedUser.id);
      }
      if (receivedUser?.business?.id) {
        setClientBusinessId(receivedUser.business.id);
      }

      // 3. Store minimal safe user profile
      if (receivedUser) {
        await storeStoredUser(receivedUser);
      }

      // 4. Update centralized auth state
      setToken(receivedToken);
      setUser(receivedUser || null);
    } catch (err) {
      console.error('[AuthContext] Error storing login credentials:', err);
      // Clean up on storage failure to avoid partial state
      await deleteStoredAuthToken().catch(() => {});
      await deleteStoredUser().catch(() => {});
      setAuthToken(null);
      setClientUserId(null);
      setClientBusinessId(null);
      setToken(null);
      setUser(null);
      throw err;
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Retrieve token from SecureStore
      const storedToken = await getStoredAuthToken();

      if (!storedToken) {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        return;
      }

      // Temporarily set token in API client
      setAuthToken(storedToken);

      // 2. Validate token and retrieve fresh user information from backend
      try {
        const profileResponse = await fetchUserProfile(storedToken);
        const fetchedUser = profileResponse.user;

        if (fetchedUser) {
          await storeStoredUser(fetchedUser);
          if (fetchedUser.id) setClientUserId(fetchedUser.id);
          if (fetchedUser.business?.id) setClientBusinessId(fetchedUser.business.id);
          setToken(storedToken);
          setUser(fetchedUser);
          return;
        }
      } catch (profileErr) {
        // If HTTP 401 Unauthorized: token is invalid or expired -> clear session
        if (profileErr?.statusCode === 401) {
          console.warn('[AuthContext] Stored session is invalid or expired. Clearing credentials.');
          await deleteStoredAuthToken();
          await deleteStoredUser();
          setAuthToken(null);
          setToken(null);
          setUser(null);
          return;
        }

        // For ordinary network failure (statusCode 0) or HTTP 500, preserve session with cached user
        console.warn(
          '[AuthContext] Network/server error validating token, checking cached user profile:',
          profileErr.message
        );
        const cachedUser = await getStoredUser();
        if (cachedUser) {
          if (cachedUser.id) setClientUserId(cachedUser.id);
          if (cachedUser.business?.id) setClientBusinessId(cachedUser.business.id);
          setToken(storedToken);
          setUser(cachedUser);
          return;
        }

        // If no cached user is available and verification failed, clean up safely
        await deleteStoredAuthToken();
        await deleteStoredUser();
        setAuthToken(null);
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error during initializeAuth:', err);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Register unauthorized (401) callback to trigger automatic logout on expired tokens
  useEffect(() => {
    setUnauthorizedHandler((err) => {
      console.warn('[AuthContext] 401 Unauthorized received on protected request. Logging out.');
      logout();
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      logout,
      initializeAuth,
    }),
    [user, token, isAuthenticated, isLoading, login, logout, initializeAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

