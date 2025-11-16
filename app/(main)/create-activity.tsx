import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { colors } from "../../constants/color";

export default function CreateActivityScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCreate = async () => {
    setErr(null);

    const user = auth.currentUser;
    if (!user) {
      setErr("Tu dois être connecté pour créer une activité.");
      return;
    }

    if (!title.trim() || !dateStr.trim() || !location.trim()) {
      setErr("Merci de remplir au moins titre, date et lieu.");
      return;
    }

    //gestion date
    const normalized = dateStr.trim().replace("T", " ");
    const parts = normalized.split(" ");
    const dPart = parts[0];          // 2025-11-21
    const tPart = parts[1] ?? "20:00"; //heure par defaut

    const [year, month, day] = dPart.split("-").map(Number);
    const [hour, minute] = tPart.split(":").map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 20, minute ?? 0);

    if (isNaN(date.getTime())) {
      setErr("Format de date invalide. Ex : 2025-11-21 ou 2025-11-21 20:30");
      return;
    }

    setLoading(true);
    try {
      //cherche pseudo ds /users/{uid}
      let creatorName = user.email ?? "Etudiant";
      try {
        const uref = doc(db, "users", user.uid);
        const usnap = await getDoc(uref);
        if (usnap.exists()) {
          const udata = usnap.data() as any;
          if (udata.displayName && String(udata.displayName).trim().length > 0) {
            creatorName = udata.displayName;
          }
        }
      } catch {
      
      }

      await addDoc(collection(db, "activities"), {
        title: title.trim(),
        description: desc.trim(),
        creatorId: user.uid,
        creatorName,
        createdAt: serverTimestamp(),
        date: Timestamp.fromDate(date),
        location: location.trim(),
        participants: [],
        status: "upcoming",
      });

      Alert.alert("Activité créée", "Ton activité a bien été publiée !");
      router.replace("/(main)/feed");
    } catch (e: any) {
      console.error(e);
      setErr(e.message ?? "Création impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={s.title}>Créer une activité</Text>

      <TextInput
        style={s.input}
        placeholder="Titre de l’activité"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[s.input, { height: 90 }]}
        placeholder="Description (optionnel)"
        placeholderTextColor={colors.muted}
        value={desc}
        onChangeText={setDesc}
        multiline
      />

      <TextInput
        style={s.input}
        placeholder="Date (AAAA-MM-JJ ou AAAA-MM-JJ HH:MM)"
        placeholderTextColor={colors.muted}
        value={dateStr}
        onChangeText={setDateStr}
      />

      <TextInput
        style={s.input}
        placeholder="Lieu (ex : Box, Bar X, Campus Y...)"
        placeholderTextColor={colors.muted}
        value={location}
        onChangeText={setLocation}
      />

      {err ? <Text style={s.error}>{err}</Text> : null}

      <TouchableOpacity
        style={[s.btn, loading && { opacity: 0.7 }]}
        onPress={onCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0b111f" />
        ) : (
          <Text style={s.btnText}>Publier l’activité</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#111827",
    color: colors.text,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#0b111f",
    fontWeight: "800",
  },
  error: {
    color: "#fca5a5",
    marginBottom: 8,
  },
});
