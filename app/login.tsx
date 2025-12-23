import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, Link } from "expo-router";
import { colors } from "../constants/color";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const onLogin = async () => {
    setErr(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      
      // Synchroniser le displayName depuis Firestore si nécessaire
      if (!cred.user.displayName) {
        try {
          const userDoc = await getDoc(doc(db, "users", cred.user.uid));
          if (userDoc.exists()) {
            const displayName = userDoc.data().displayName;
            if (displayName) {
              await updateProfile(cred.user, { displayName });
            }
          }
        } catch (e) {
          console.log("Erreur sync displayName:", e);
        }
      }
      
      router.replace("/(main)/feed"); 
    } catch (e: any) {
      setErr(e.message ?? "Connexion impossible");
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Connexion</Text>
      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder="Mot de passe"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={pwd}
        onChangeText={setPwd}
      />
      {err ? <Text style={s.error}>{err}</Text> : null}
      <TouchableOpacity style={s.btn} onPress={onLogin}>
        <Text style={s.btnText}>Se connecter</Text>
      </TouchableOpacity>
      <Text style={s.linkRow}>
        Pas de compte ? <Link href="/register">Créer un compte</Link>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 16 },
  input: {
    backgroundColor: "#111827", color: colors.text, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: "center", marginTop: 4 },
  btnText: { color: "#0b111f", fontWeight: "800" },
  error: { color: "#fca5a5", marginTop: 4, marginBottom: 8 },
  linkRow: { color: colors.text, marginTop: 12 },
});
