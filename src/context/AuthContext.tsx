import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logoutUser } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async currentUser => {
        setUser(currentUser);
        setLoading(false);

        if (currentUser) {
          // Sync user profile document in Firestore
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(
              userRef,
              {
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'Usuário',
                email: currentUser.email || '',
                photoURL: currentUser.photoURL || '',
                lastLoginAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (err: any) {
            console.error('Erro ao sincronizar perfil do usuário no Firestore:', err);
          }
        }
      },
      err => {
        console.error('Erro no listener de autenticação:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Falha ao autenticar com Google');
      }
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await logoutUser();
    } catch (err: any) {
      setError(err.message || 'Falha ao encerrar sessão');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
