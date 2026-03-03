import { Link, useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "../constants/color";
import { auth, db } from "../lib/firebase";

export default function Register() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const onRegister = async () => {
  setErr(null);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pwd);

    const pseudo = email.split("@")[0]; 
    
    // Mettre à jour le profil Firebase Auth
    await updateProfile(cred.user, {
      displayName: pseudo,
    });
    
    // Enregistrer dans Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      email: email.trim(),
      createdAt: serverTimestamp(),
      displayName: pseudo,
      program: "",
      year: "",
      interests: [],
      bio: "",
      role: "user",
      updatedAt: serverTimestamp(),
    });

    router.replace("/(main)/profile"); 
  } catch (e: any) {
    setErr(e.message ?? "Inscription impossible");
  }
};

  return (
    <View style={s.container}>
      <Text style={s.title}>Créer un compte</Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.muted}
        autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Mot de passe" placeholderTextColor={colors.muted}
        secureTextEntry value={pwd} onChangeText={setPwd} />
      {err ? <Text style={s.error}>{err}</Text> : null}
      <TouchableOpacity style={s.btn} onPress={onRegister}>
        <Text style={s.btnText}>S’inscrire</Text>
      </TouchableOpacity>
      <Text style={s.linkRow}>
        Déjà un compte ? <Link href="/login">Se connecter</Link>
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
