import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from './api';

const API_BASE = API_URL;

interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setTokenFromCallback: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'origins-auth-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetchUser(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid, remove it
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        console.error('Failed to get auth URL:', data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Signup failed' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const setTokenFromCallback = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    fetchUser(token);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      loginWithEmail,
      signup,
      logout,
      setTokenFromCallback,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to get auth header for API calls
export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}
