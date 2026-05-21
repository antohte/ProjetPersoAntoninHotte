import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { CATEGORIES } from "../../constants/categories";
import { colors } from "../../constants/color";
import { auth, db } from "../../lib/firebase";
import { getUserDisplayName } from "../../lib/user";

export default function CreateActivityScreen() {
  const router = useRouter();

  // les champs du formulaire
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [lieu, setLieu] = useState("");
  const [categorie, setCategorie] = useState("autre");
  const [date, setDate] = useState(new Date());

  // afficher ou cacher le sélecteur de date
  const [showPicker, setShowPicker] = useState(false);

  // true pendant l'enregistrement
  const [saving, setSaving] = useState(false);

  // message d'erreur à afficher
  const [erreur, setErreur] = useState("");

  // formater la date en français pour l'afficher dans le bouton
  const formaterDate = (d: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  // quand l'utilisateur choisit une date dans le picker
  const onChangerDate = (event: any, nouvelleDate?: Date) => {
    setShowPicker(false);
    if (event.type !== "dismissed" && nouvelleDate) {
      setDate(nouvelleDate);
    }
  };

  // enregistrer l'activité dans Firebase
  const enregistrer = async () => {
    setErreur("");

    // vérifications de base
    if (!titre.trim()) {
      setErreur("Merci d'indiquer un titre d'activité.");
      return;
    }
    if (!lieu.trim()) {
      setErreur("Merci d'indiquer un lieu.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return;
    }

    setSaving(true);

    try {
      // récupérer le nom affiché de l'utilisateur
      const creatorName = await getUserDisplayName();

      // ajouter le document dans Firestore
      await addDoc(collection(db, "activities"), {
        title: titre.trim(),
        description: description.trim(),
        place: lieu.trim(),
        date: Timestamp.fromDate(date),
        ownerId: user.uid,
        creatorName,
        category: categorie,
        participants: [],
        createdAt: Timestamp.now(),
      });

      Alert.alert("Activité créée !", "Ta sortie a bien été enregistrée.");

      // remettre le formulaire à zéro
      setTitre("");
      setDescription("");
      setLieu("");
      setCategorie("autre");
      setDate(new Date());

      router.back();
    } catch (e: any) {
      console.log("Erreur création activité :", e);
      setErreur(e.message || "Impossible de créer l'activité.");
    }

    setSaving(false);
  };

  return (
    <ScrollView
      style={styles.ecran}
      contentContainerStyle={styles.contenu}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titre}>Nouvelle activité</Text>
      <Text style={styles.sousTitre}>
        Propose une sortie à tes camarades (soirée, révisions, sport…)
      </Text>

      {/* champ titre */}
      <Text style={styles.label}>Titre</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex : Sortie en boîte, Révisions de maths…"
        placeholderTextColor={colors.muted}
        value={titre}
        onChangeText={setTitre}
      />

      {/* champ description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Explique rapidement ce que tu proposes."
        placeholderTextColor={colors.muted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {/* champ lieu */}
      <Text style={styles.label}>Lieu</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex : La Box, Université, Bar du centre…"
        placeholderTextColor={colors.muted}
        value={lieu}
        onChangeText={setLieu}
      />

      {/* sélection catégorie */}
      <Text style={styles.label}>Catégorie</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollCategories}
        contentContainerStyle={styles.contenuScrollCategories}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chipCategorie,
              categorie === cat.id && styles.chipCategorieActif,
            ]}
            onPress={() => setCategorie(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={18}
              color={categorie === cat.id ? "#0b111f" : colors.text}
            />
            <Text
              style={[
                styles.chipCategorieTexte,
                categorie === cat.id && styles.chipCategorieTexteActif,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* sélection date et heure */}
      <Text style={styles.label}>Date et heure</Text>

      {Platform.OS === "web" ? (
        // sur le web, on utilise un input HTML natif car DateTimePicker ne marche pas sur web
        <input
          type="datetime-local"
          min={new Date().toISOString().slice(0, 16)}
          value={date.toISOString().slice(0, 16)}
          onChange={(e: any) => {
            if (e.target.value) setDate(new Date(e.target.value));
          }}
          style={{
            backgroundColor: "#020617",
            color: colors.text,
            border: "1px solid #111827",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            width: "100%",
            boxSizing: "border-box",
            colorScheme: "dark",
          } as any}
        />
      ) : (
        // sur mobile, on utilise le DateTimePicker natif
        <>
          <TouchableOpacity
            style={styles.input}
            activeOpacity={0.8}
            onPress={() => setShowPicker(true)}
          >
            <Text style={{ color: colors.text }}>{formaterDate(date)}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              mode="datetime"
              value={date}
              minimumDate={new Date()}
              onChange={onChangerDate}
            />
          )}
        </>
      )}

      {/* message d'erreur */}
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      {/* bouton créer */}
      <TouchableOpacity
        style={[styles.bouton, saving && styles.boutonDesactive]}
        onPress={enregistrer}
        disabled={saving}
        activeOpacity={0.9}
      >
        <Text style={styles.boutonTexte}>
          {saving ? "Enregistrement..." : "Créer l'activité"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contenu: {
    padding: 20,
    gap: 12,
  },
  titre: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  sousTitre: {
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
  erreur: {
    marginTop: 6,
    color: "#fca5a5",
  },
  bouton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  boutonDesactive: {
    opacity: 0.7,
  },
  boutonTexte: {
    color: "#0b111f",
    fontWeight: "800",
    fontSize: 16,
  },

  // catégories
  scrollCategories: {
    marginVertical: 8,
  },
  contenuScrollCategories: {
    gap: 8,
  },
  chipCategorie: {
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
  chipCategorieActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipCategorieTexte: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  chipCategorieTexteActif: {
    color: "#0b111f",
  },
});
