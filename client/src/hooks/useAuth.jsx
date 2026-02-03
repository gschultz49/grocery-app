import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, isEmailAllowed } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Check if user email is allowed
        if (isEmailAllowed(session.user.email)) {
          setUser(session.user);
          setError(null);
        } else {
          // Sign out unauthorized user
          supabase.auth.signOut();
          setUser(null);
          setError('Access denied. Your email is not authorized to use this app.');
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if user email is allowed
          if (isEmailAllowed(session.user.email)) {
            setUser(session.user);
            setError(null);
          } else {
            // Sign out unauthorized user
            await supabase.auth.signOut();
            setUser(null);
            setError('Access denied. Your email is not authorized to use this app.');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
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
