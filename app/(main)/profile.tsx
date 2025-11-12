import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { colors } from "../../constants/color";

type Activity = { id: string; title?: string; type?: string; when?: any };

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActs, setRecentActs] = useState<Activity[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { router.replace("/login"); return; }

        const uref = doc(db, "users", user.uid);
        const usnap = await getDoc(uref);
        if (usnap.exists()) setUserData(usnap.data());

        
        const actsQ = query(
          collection(db, "activities"),
          where("ownerId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const aSnap = await getDocs(actsQ);
        setRecentActs(aSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!userData) {
    return (
      <View style={s.center}>
        <Text style={{ color: colors.text }}>Aucune donnée utilisateur trouvée.</Text>
      </View>
    );
  }

  const headerLine = [userData.program, userData.year].filter(Boolean).join(" • ");

  return (
    <ScrollView style={s.container}>
      {/* entete */}
      <View style={s.header}>
        <Text style={s.name}>{userData.displayName || "Nom non renseigné"}</Text>
        {headerLine ? <Text style={s.program}>{headerLine}</Text> : null}
      </View>

      {/* bio */}
      <View style={s.section}>
        <Text style={s.bio}>{userData.bio || "Aucune biographi pour le moment."}</Text>
      </View>

      {/* interet */}
      {Array.isArray(userData.interests) && userData.interests.length > 0 && (
        <View style={s.tags}>
          {userData.interests.map((tag: string, i: number) => (
            <View style={s.tag} key={i}><Text style={s.tagText}>#{tag}</Text></View>
          ))}
        </View>
      )}

      {/* activités récentes */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Activités récentes</Text>
        {recentActs.length === 0 ? (
          <Text style={s.placeholder}>Aucune activité publiée pour le moment.</Text>
        ) : (
          recentActs.map((a) => (
            <View key={a.id} style={s.card}>
              <Text style={s.cardTitle}>{a.title || a.type || "Activité"}</Text>
              <Text style={s.cardMeta}>
                {a.when?.toDate ? a.when.toDate().toLocaleString() : ""}
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={s.btn} onPress={() => router.push("/(main)/profile-edit")}>
        <Text style={s.btnText}>Modifier mon profil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 60 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 20 },
  name: { color: colors.text, fontSize: 26, fontWeight: "800" },
  program: { color: colors.muted, fontSize: 14 },
  bio: { color: colors.text, fontSize: 15, textAlign: "center", marginBottom: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 24 },
  tag: { backgroundColor: "#1f2937", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, margin: 4 },
  tagText: { color: colors.text, fontSize: 13 },
  section: { marginBottom: 24 },
  sectionTitle: { color: colors.text, fontWeight: "700", marginBottom: 8, fontSize: 16 },
  placeholder: { color: colors.muted, fontSize: 14 },
  card: { backgroundColor: "#111827", borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontWeight: "700" },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  btn: { backgroundColor: colors.primary, alignItems: "center", paddingVertical: 14, borderRadius: 12, marginBottom: 40 },
  btnText: { color: "#0b111f", fontWeight: "800" },
});
