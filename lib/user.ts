import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function getUserDisplayName(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return "Utilisateur";
  if (user.displayName) return user.displayName;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const name = snap.data().displayName;
      if (name) return name;
    }
  } catch {}
  return user.email?.split("@")[0] || "Utilisateur";
}
