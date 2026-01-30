import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { colors } from "../../constants/color";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIES = [
  { id: "bar", label: "Bar", icon: "beer" },
  { id: "sport", label: "Sport", icon: "football" },
  { id: "revision", label: "Révision", icon: "book" },
  { id: "culture", label: "Culture", icon: "color-palette" },
  { id: "soiree", label: "Soirée", icon: "musical-notes" },
  { id: "autre", label: "Autre", icon: "ellipsis-horizontal" },
] as const;

export default function CreateActivityScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("autre");
  const [when, setWhen] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const formatDateFR = (d: Date) =>
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

  const onChangeDate = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }
    if (date) {
      setWhen(date);
    }
    setShowPicker(false);
  };

  const onSave = async () => {
    setErr(null);

    if (!title.trim()) {
      setErr("Merci d’indiquer un titre d’activité.");
      return;
    }
    if (!place.trim()) {
      setErr("Merci d’indiquer un lieu.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    try {
      // recuperer displayname depuis firestore si dispo
      let creatorName = user.displayName || "";
      
      if (!creatorName) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            creatorName = userDoc.data().displayName || "";
          }
        } catch (e) {
          console.log("Erreur récupération displayName:", e);
        }
      }
      
      // fallback sur email en dernier recours
      if (!creatorName) {
        creatorName = user.email?.split("@")[0] || "Utilisateur";
      }

      await addDoc(collection(db, "activities"), {
        title: title.trim(),
        description: description.trim(),
        place: place.trim(),
        date: Timestamp.fromDate(when),
        ownerId: user.uid,
        creatorName,
        category,
        participants: [] as string[],
        createdAt: Timestamp.now(),
      });

      Alert.alert("Activité créée !", "Ta sortie a bien été enregistrée.");
      // reset formulaire
      setTitle("");
      setDescription("");
      setPlace("");
      setCategory("autre");
      setWhen(new Date());

      // back au feed
      router.back();
    } catch (e: any) {
      console.error("Erreur création activité:", e);
      setErr(e.message ?? "Impossible de créer l’activité.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Nouvelle activité</Text>
      <Text style={s.subtitle}>
        Propose une sortie à tes camarades (soirée, révisions, sport…)
      </Text>

      <Text style={s.label}>Titre</Text>
      <TextInput
        style={s.input}
        placeholder="Ex : Sortie en boîte, Révisions de maths…"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={s.label}>Description</Text>
      <TextInput
        style={[s.input, s.inputMultiline]}
        placeholder="Explique rapidement ce que tu proposes."
        placeholderTextColor={colors.muted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={s.label}>Lieu</Text>
      <TextInput
        style={s.input}
        placeholder="Ex : La Box, Université, Bar du centre…"
        placeholderTextColor={colors.muted}
        value={place}
        onChangeText={setPlace}
      />

      <Text style={s.label}>Catégorie</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={s.categoryScroll}
        contentContainerStyle={s.categoryScrollContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              s.categoryChip,
              category === cat.id && s.categoryChipActive,
            ]}
            onPress={() => setCategory(cat.id)}
          >
            <Ionicons 
              name={cat.icon as any} 
              size={18} 
              color={category === cat.id ? "#0b111f" : colors.text} 
            />
            <Text
              style={[
                s.categoryChipText,
                category === cat.id && s.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.label}>Date et heure</Text>
      <TouchableOpacity
        style={s.input}
        activeOpacity={0.8}
        onPress={() => setShowPicker(true)}
      >
        <Text style={{ color: colors.text }}>{formatDateFR(when)}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          mode="datetime"
          value={when}
          minimumDate={new Date()}
          onChange={onChangeDate}
        />
      )}

      {err ? <Text style={s.error}>{err}</Text> : null}

      <TouchableOpacity
        style={[s.btn, saving && s.btnDisabled]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.9}
      >
        <Text style={s.btnText}>
          {saving ? "Enregistrement..." : "Créer l’activité"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#020617",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#111827",
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    marginTop: 6,
    color: "#fca5a5",
  },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: "#0b111f",
    fontWeight: "800",
    fontSize: 16,
  },
  categoryScroll: {
    marginVertical: 8,
  },
  categoryScrollContent: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#111827",
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#0b111f",
  },
});
