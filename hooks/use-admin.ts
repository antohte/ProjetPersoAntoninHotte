import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";

// hook pour verifier si user est admin
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // pas de user connecte
    if (!auth.currentUser) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // ecouter les changements du doc user
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const userData = snapshot.data();
            setIsAdmin(userData?.role === "admin");
          } else {
            setIsAdmin(false);
          }
          setLoading(false);
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { isAdmin, loading, error };
}
