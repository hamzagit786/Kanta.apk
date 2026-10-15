import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, testFirestoreConnection } from '../lib/firebase';
import { mapAuthError } from '../lib/authErrors';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  firestoreConnected: boolean;
  shopName: string;
  ownerName: string;
  needsProfileSetup: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, ownerName: string, shopName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  saveUserProfile: (ownerName: string, shopName: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SHOP_NAME = 'Hamza Computerized Kanta';
const DEFAULT_OWNER_NAME = 'Hamza Siddique';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [shopName, setShopName] = useState<string>(DEFAULT_SHOP_NAME);
  const [ownerName, setOwnerName] = useState<string>(DEFAULT_OWNER_NAME);
  const [needsProfileSetup, setNeedsProfileSetup] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (currentUser) {
        testFirestoreConnection().then((connected) => {
          setFirestoreConnected(connected);
        });

        // Load cached profile immediately for fast render
        const localShop = localStorage.getItem(`shop_name_${currentUser.uid}`);
        const localOwner = localStorage.getItem(`owner_name_${currentUser.uid}`);
        if (localShop) {
          setShopName(localShop);
        } else {
          setShopName(DEFAULT_SHOP_NAME);
        }
        if (localOwner) {
          setOwnerName(localOwner);
        } else {
          setOwnerName(currentUser.displayName || DEFAULT_OWNER_NAME);
        }

        // Fetch user profile from Firestore to keep personalized names in sync
        try {
          const profileRef = doc(db, 'users', currentUser.uid, 'personal_data', 'profile');
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            const savedShop = data.shopName || data.kantaName || DEFAULT_SHOP_NAME;
            const savedOwner = data.ownerName || currentUser.displayName || DEFAULT_OWNER_NAME;

            setShopName(savedShop);
            setOwnerName(savedOwner);
            setNeedsProfileSetup(false);

            localStorage.setItem(`shop_name_${currentUser.uid}`, savedShop);
            localStorage.setItem(`owner_name_${currentUser.uid}`, savedOwner);
          } else {
            // New user account (e.g. from Google login) - initialize their profile
            const initialOwner = currentUser.displayName || DEFAULT_OWNER_NAME;
            const initialShop = DEFAULT_SHOP_NAME;
            setShopName(initialShop);
            setOwnerName(initialOwner);
            setNeedsProfileSetup(false);

            localStorage.setItem(`shop_name_${currentUser.uid}`, initialShop);
            localStorage.setItem(`owner_name_${currentUser.uid}`, initialOwner);

            // Save initialized document so future visits find it
            try {
              await setDoc(profileRef, {
                ownerName: initialOwner,
                shopName: initialShop,
                kantaName: initialShop,
                phone: '03257833708',
                notes: '100-Ton Computerized Scale',
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            } catch (saveErr) {
              console.warn('Could not initialize profile document in Firestore:', saveErr);
            }
          }
        } catch (err) {
          console.warn('Error reading user profile from Firestore, using cached profile:', err);
        }
      } else {
        // User logged out
        setFirestoreConnected(false);
        setNeedsProfileSetup(false);
        setShopName(DEFAULT_SHOP_NAME);
        setOwnerName(DEFAULT_OWNER_NAME);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveUserProfile = async (newOwnerName: string, newShopName: string) => {
    if (!user) return;
    const trimmedShop = newShopName.trim() || DEFAULT_SHOP_NAME;
    const trimmedOwner = newOwnerName.trim() || DEFAULT_OWNER_NAME;

    setShopName(trimmedShop);
    setOwnerName(trimmedOwner);
    setNeedsProfileSetup(false);

    localStorage.setItem(`shop_name_${user.uid}`, trimmedShop);
    localStorage.setItem(`owner_name_${user.uid}`, trimmedOwner);

    try {
      await updateProfile(user, {
        displayName: trimmedOwner,
      });
    } catch {
      // Non-critical
    }

    try {
      const profileRef = doc(db, 'users', user.uid, 'personal_data', 'profile');
      await setDoc(profileRef, {
        ownerName: trimmedOwner,
        shopName: trimmedShop,
        kantaName: trimmedShop,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Error saving profile to Firestore:', err);
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: unknown) {
      console.error('Email Sign In Error:', err);
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    owner: string, 
    shop: string
  ) => {
    setAuthError(null);
    const trimmedOwner = owner.trim() || DEFAULT_OWNER_NAME;
    const trimmedShop = shop.trim() || DEFAULT_SHOP_NAME;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const newUser = cred.user;

      try {
        await updateProfile(newUser, { displayName: trimmedOwner });
      } catch {
        // Continue
      }

      try {
        await sendEmailVerification(newUser);
      } catch {
        // Optional
      }

      // Save initial profile in Firestore
      const profileRef = doc(db, 'users', newUser.uid, 'personal_data', 'profile');
      await setDoc(profileRef, {
        ownerName: trimmedOwner,
        shopName: trimmedShop,
        kantaName: trimmedShop,
        phone: '03257833708',
        notes: '100-Ton Computerized Scale',
        updatedAt: new Date().toISOString(),
      });

      setShopName(trimmedShop);
      setOwnerName(trimmedOwner);
      setNeedsProfileSetup(false);
      localStorage.setItem(`shop_name_${newUser.uid}`, trimmedShop);
      localStorage.setItem(`owner_name_${newUser.uid}`, trimmedOwner);
    } catch (err: unknown) {
      console.error('Registration Error:', err);
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      console.error('Password Reset Error:', err);
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err: unknown) {
      console.error('Sign Out Error:', err);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        firestoreConnected,
        shopName,
        ownerName,
        needsProfileSetup,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        saveUserProfile,
        logout,
        authError,
        clearAuthError,
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
