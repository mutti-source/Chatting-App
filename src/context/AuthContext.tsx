import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);

        profileUnsub = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            const fallbackProfile: Record<string, any> = {
              uid: currentUser.uid,
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              email: currentUser.email || '',
              role: 'user',
              createdAt: serverTimestamp(),
            };
            if (currentUser.photoURL) {
              fallbackProfile.photoUrl = currentUser.photoURL;
            }
            if (currentUser.phoneNumber) {
              fallbackProfile.phone = currentUser.phoneNumber;
            }

            try {
              await setDoc(userRef, fallbackProfile);
              setUserProfile({ ...fallbackProfile, createdAt: Timestamp.now() } as UserProfile);
            } catch (err) {
              console.error('[AuthContext] Error creating fallback profile:', err);
            }
          }
          setLoading(false);
        }, (err) => {
          console.error('[AuthContext] Snapshot listener error:', err);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (profileUnsub) profileUnsub();
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);