import { FlatList, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../constants/color";
import { useRouter } from "expo-router";

const ACTIVITIES: Array<{id:string; title:string; author:string; when:string}> = [

];

export default function Feed() {
  const router = useRouter();
  const hasActivities = ACTIVITIES.length > 0;

  return (
    <View style={s.container}>
      {hasActivities ? (
        <FlatList
          data={ACTIVITIES}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.meta}>par {item.author} — {item.when}</Text>
            </View>
          )}
          ListHeaderComponent={
            <Text style={s.section}>Activités des personnes suivies</Text>
          }
          ListFooterComponent={
            <Text style={s.subtle}>Suggestions de suivi (bientôt)</Text>
          }
        />
      ) : (
        <View style={s.empty}>
          <Text style={s.emptyText}>Aucune activité pour le moment</Text>
          <View style={{ height: 12 }} />
          <TouchableOpacity
            style={s.cta}
            onPress={() => router.push("/(main)/create-activity")}
          >
            <Text style={s.ctaText}>Créer une activité</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { color: colors.text, fontWeight: "800", fontSize: 16, paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  subtle: { color: colors.muted, fontSize: 12, paddingHorizontal: 16, paddingVertical: 16 },
  card: { backgroundColor: "#111827", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontWeight: "700" },
  meta: { color: colors.muted, marginTop: 4 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { color: colors.text, fontSize: 16 },
  cta: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12 },
  ctaText: { color: "#0b111f", fontWeight: "800" },
});
