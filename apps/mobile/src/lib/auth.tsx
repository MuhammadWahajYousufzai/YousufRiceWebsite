import type { Models } from "react-native-appwrite";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { account, ID } from "@/lib/appwrite";

type AppwriteUser = Models.User<Models.Preferences>;

interface AuthContextValue {
  error: string | null;
  ensureGuestSession: () => Promise<AppwriteUser>;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  refreshUser: () => Promise<AppwriteUser | null>;
  requestPasswordReset: (email: string) => Promise<void>;
  register: (data: { email: string; name: string; password: string }) => Promise<void>;
  signIn: (data: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  user: AppwriteUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppwriteUser | null>(null);

  const isGuest = Boolean(user && !user.email);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    refreshUser()
      .catch(() => null)
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setLoading(true);
      setError(null);

      try {
        const currentUser = await refreshUser();
        if (currentUser && !currentUser.email) {
          await account.deleteSession({ sessionId: "current" }).catch(() => undefined);
        }

        await account.createEmailPasswordSession({
          email: email.trim().toLowerCase(),
          password,
        });
        await refreshUser();
      } catch (caughtError) {
        const message = errorMessage(caughtError);
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [refreshUser],
  );

  const register = useCallback(
    async ({ email, name, password }: { email: string; name: string; password: string }) => {
      setLoading(true);
      setError(null);

      try {
        const normalizedEmail = email.trim().toLowerCase();
        const currentUser = await refreshUser();
        if (currentUser && !currentUser.email) {
          await account.deleteSession({ sessionId: "current" }).catch(() => undefined);
        }

        await account.create({
          userId: ID.unique(),
          email: normalizedEmail,
          password,
          name: name.trim(),
        });
        await account.createEmailPasswordSession({
          email: normalizedEmail,
          password,
        });
        await refreshUser();
      } catch (caughtError) {
        const message = errorMessage(caughtError);
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [refreshUser],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await account.createRecovery({
        email: email.trim().toLowerCase(),
        url: "https://yousufrice.com/auth/reset-password",
      });
    } catch (caughtError) {
      const message = errorMessage(caughtError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const ensureGuestSession = useCallback(async () => {
    const currentUser = await refreshUser();
    if (currentUser) return currentUser;

    await account.createAnonymousSession();
    const guestUser = await account.get();
    setUser(guestUser);
    setError(null);
    return guestUser;
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // The user may already be signed out on this device.
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      error,
      ensureGuestSession,
      isAuthenticated: Boolean(user?.email),
      isGuest,
      loading,
      refreshUser,
      register,
      requestPasswordReset,
      signIn,
      signOut,
      user,
    }),
    [ensureGuestSession, error, isGuest, loading, refreshUser, register, requestPasswordReset, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
