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
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { colors } from "../../constants/color";

export default function CreateActivityScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
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
      const creatorName =
        user.displayName || user.email || "Etudiant anonyme";

      await addDoc(collection(db, "activities"), {
        title: title.trim(),
        description: description.trim(),
        place: place.trim(),
        date: Timestamp.fromDate(when),
        ownerId: user.uid,
        creatorName,
        participants: [] as string[],
        createdAt: Timestamp.now(),
      });

      Alert.alert("Activité créée !", "Ta sortie a bien été enregistrée.");
      //reset formulaire
      setTitle("");
      setDescription("");
      setPlace("");
      setWhen(new Date());

      //back au feed
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
});
