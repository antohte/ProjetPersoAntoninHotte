import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { colors } from "../../constants/color";

const YEAR_OPTIONS = ["L1", "L2", "L3", "M1", "M2"];

export default function ProfileEditScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace("/login");
          return;
        }
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data() as any;
          setDisplayName(d.displayName ?? "");
          setProgram(d.program ?? "");
          setYear(d.year ?? "");
          setBio(d.bio ?? "");
          setInterestsInput(Array.isArray(d.interests) ? d.interests.join(", ") : "");
        }
      } catch (e: any) {
        setErr(e.message ?? "Impossible de charger le profil");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const interestsArray = useMemo(
    () =>
      interestsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.length > 20 ? t.slice(0, 20) : t))
        .slice(0, 10),
    [interestsInput]
  );

  const onSave = async () => {
    setErr(null);
    const dn = displayName.trim();
    const pr = program.trim();
    const bi = bio.trim();

    if (dn.length < 2 || dn.length > 30) return setErr("Le nom doit faire entre 2 et 30 caracteres.");
    if (pr.length > 40) return setErr("Le champ 'formation' est trop long (max 40).");
    if (bi.length > 200) return setErr("La bio est trop longue (max 200).");

    const user = auth.currentUser;
    if (!user) return setErr("Session expirée. Merci de vous reconnecter.");

    try {
      setSaving(true);
      await updateDoc(doc(db, "users", user.uid), {
        displayName: dn,
        program: pr,
        year,
        interests: interestsArray,
        bio: bi,
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Profil mis à jour !");
      router.replace("/(main)/profile");
    } catch (e: any) {
      setErr(e.message ?? "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>Modifier mon profil</Text>

      <Text style={s.label}>Nom affiché</Text>
      <TextInput style={s.input} placeholder="Ex. Antonin" placeholderTextColor={colors.muted}
        value={displayName} onChangeText={setDisplayName} />

      <Text style={s.label}>Formation</Text>
      <TextInput style={s.input} placeholder="Ex. Licence Économie" placeholderTextColor={colors.muted}
        value={program} onChangeText={setProgram} />

      <Text style={s.label}>Année</Text>
      <View style={s.yearRow}>
        {YEAR_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt} onPress={() => setYear(opt)}
            style={[s.yearPill, year === opt && s.yearPillActive]}>
            <Text style={[s.yearText, year === opt && s.yearTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Centres d’intérêt (séparés par des virgules)</Text>
      <TextInput style={s.input} placeholder="ciné, foot, bars, révisions" placeholderTextColor={colors.muted}
        value={interestsInput} onChangeText={setInterestsInput} />
      <Text style={s.helper}>{interestsArray.length} tag(s) — max 10, 20 caractères/tag</Text>

      <Text style={s.label}>Bio</Text>
      <TextInput style={[s.input, s.textarea]} placeholder="Quelques mots (max 200)"
        placeholderTextColor={colors.muted} value={bio} onChangeText={setBio} multiline numberOfLines={4} maxLength={200} />
      <Text style={s.helper}>{bio.length}/200</Text>

      {err ? <Text style={s.error}>{err}</Text> : null}

      <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        <Text style={s.btnText}>{saving ? "Enregistrement..." : "Enregistrer"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnGhost} onPress={() => router.back()}>
        <Text style={s.btnGhostText}>Annuler</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 60 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 16 },
  label: { color: colors.text, marginTop: 10, marginBottom: 6, fontWeight: "700" },
  input: { backgroundColor: "#111827", color: colors.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  textarea: { textAlignVertical: "top", minHeight: 100 },
  helper: { color: colors.muted, fontSize: 12, marginTop: 4 },
  error: { color: "#fca5a5", marginTop: 10 },
  btn: { backgroundColor: colors.primary, alignItems: "center", paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  btnText: { color: "#0b111f", fontWeight: "800" },
  btnGhost: { borderWidth: 1, borderColor: colors.border, alignItems: "center", paddingVertical: 12, borderRadius: 12, marginTop: 10 },
  btnGhostText: { color: colors.text, fontWeight: "700" },
  yearRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  yearPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: "#111827" },
  yearPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  yearText: { color: colors.text, fontWeight: "700" },
  yearTextActive: { color: "#0b111f" },
});
