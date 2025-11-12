import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHfNPqOsA7HpTqmFVlsEnCFItRwUpmWf4",
  authDomain: "projetperso-antoninhotte-v2.firebaseapp.com",
  projectId: "projetperso-antoninhotte-v2",
  storageBucket: "projetperso-antoninhotte-v2.firebasestorage.app",
  messagingSenderId: "831578027107",
  appId: "1:831578027107:web:a9ee017e5291009009f456"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app); 
export const db = getFirestore(app);
export { app };
