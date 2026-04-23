import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { colors } from "../../constants/color";
import * as ImagePicker from "expo-image-picker";
import { uploadProfilePicture } from "../../lib/storage";
import { Ionicons } from "@expo/vector-icons";

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
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
          setPhotoURL(d.photoURL ?? user.photoURL ?? null);
        }
      } catch (e: any) {
        setErr(e.message ?? "Impossible de charger le profil");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // transformer le texte "ciné, foot, bars" en tableau ["ciné", "foot", "bars"]
  const interestsArray = interestsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.length > 20 ? t.slice(0, 20) : t))
    .slice(0, 10);

  const pickImage = async () => {
    // demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusee", "On a besoin de la permission pour acceder a la galerie");
      return;
    }

    // ouvrir la galerie
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        // upload vers firebase storage
        const downloadUrl = await uploadProfilePicture(result.assets[0].uri);
        setPhotoURL(downloadUrl);
        Alert.alert("Photo mise a jour", "Pense a enregistrer ton profil");
      } catch (error: any) {
        Alert.alert("Erreur", error.message || "Impossible d uploader la photo");
      } finally {
        setUploading(false);
      }
    }
  };

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
      
      // Mettre à jour Firebase Auth
      await updateProfile(user, {
        displayName: dn,
        photoURL: photoURL || undefined,
      });
      
      // Mettre à jour Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: dn,
        program: pr,
        year,
        interests: interestsArray,
        bio: bi,
        photoURL: photoURL || null,
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

      {/* Photo de profil */}
      <View style={s.photoSection}>
        <View style={s.photoContainer}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={s.photo} />
          ) : (
            <View style={s.photoPlaceholder}>
              <Ionicons name="person" size={50} color={colors.muted} />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[s.photoBtn, uploading && { opacity: 0.6 }]}
          onPress={pickImage}
          disabled={uploading}
        >
          <Ionicons name="camera" size={20} color={colors.text} />
          <Text style={s.photoBtnText}>
            {uploading ? "Upload..." : "Changer la photo"}
          </Text>
        </TouchableOpacity>
      </View>

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
  photoSection: { alignItems: "center", marginVertical: 20 },
  photoContainer: { marginBottom: 16 },
  photo: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: colors.primary },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#111827", borderWidth: 2, borderColor: colors.border, justifyContent: "center", alignItems: "center" },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#111827", borderWidth: 1, borderColor: colors.border },
  photoBtnText: { color: colors.text, fontWeight: "700" },
});
