import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { colors } from "../../constants/color";

type ActivityItem = {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorName?: string;
  createdAt?: Timestamp;
  date?: Timestamp;
  location?: string;
  participants?: string[];
  status?: string;
};

export default function FeedScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const currentUid = auth.currentUser?.uid ?? null;

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "activities"),
      orderBy("date", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ActivityItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setActivities(list);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setErr("Impossible de charger les activités.");
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  const formatEventDate = (ts?: Timestamp) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.toLocaleString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleParticipation = async (activity: ActivityItem) => {
    if (!currentUid) return;

    const ref = doc(db, "activities", activity.id);
    const alreadyIn = activity.participants?.includes(currentUid);

    try {
      await updateDoc(ref, {
        participants: alreadyIn
          ? arrayRemove(currentUid)
          : arrayUnion(currentUid),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.muted}>Chargement des activités...</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={s.center}>
        <Text style={s.error}>{err}</Text>
      </View>
    );
  }

  const hasActivities = activities.length > 0;

  return (
    <View style={s.container}>
      {!hasActivities ? (
        <View style={s.emptyContainer}>
          <Text style={s.title}>Aucune activité pour le moment</Text>
          <Text style={s.muted}>
            Sois le premier à proposer une sortie ou un événement !
          </Text>

          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => router.push("/(main)/create-activity")}
          >
            <Text style={s.btnPrimaryText}>Créer une activité</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.headerRow}>
            <Text style={s.title}>Activités à venir</Text>
            <TouchableOpacity
              onPress={() => router.push("/(main)/create-activity")}
            >
              <Text style={s.link}>+ Nouvelle activité</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const isParticipant = !!currentUid && item.participants?.includes(currentUid);
              const initials =
                (item.creatorName?.[0] ??
                  item.creatorName?.charAt(0) ??
                  "?").toUpperCase();

              return (
                <View style={s.card}>
                  {/*header "créé par"*/}
                  <View style={s.cardHeader}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.creatorName}>
                        {item.creatorName ?? "Un étudiant"}
                      </Text>
                      <Text style={s.cardMeta}>
                        Créé par {item.creatorName ?? "un étudiant"}
                      </Text>
                    </View>
                  </View>

                  {/* contenu titre + desc*/}
                  <Text style={s.cardTitle}>{item.title}</Text>

                  {item.description ? (
                    <Text style={s.cardDesc} numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/*date + lieu*/}
                  <View style={s.infoRow}>
                    {item.date && (
                      <View style={s.pill}>
                        <Text style={s.pillText}>{formatEventDate(item.date)}</Text>
                      </View>
                    )}
                    {item.location && (
                      <View style={s.pill}>
                        <Text style={s.pillText}>{item.location}</Text>
                      </View>
                    )}
                  </View>

                  {/*footer */}
                  <View style={s.cardFooter}>
                    <Text style={s.cardParticipants}>
                      {item.participants?.length ?? 0} participant(s)
                    </Text>

                    <TouchableOpacity
                      style={[
                        s.btnSmall,
                        isParticipant && s.btnSmallActive,
                      ]}
                      onPress={() => toggleParticipation(item)}
                    >
                      <Text
                        style={[
                          s.btnSmallText,
                          isParticipant && s.btnSmallTextActive,
                        ]}
                      >
                        {isParticipant ? "Tu participes" : "Participer"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  error: {
    color: "#fca5a5",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  btnPrimary: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  btnPrimaryText: {
    color: "#0b111f",
    fontWeight: "700",
    fontSize: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.text,
    fontWeight: "800",
  },
  creatorName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardDesc: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#1f2937",
  },
  pillText: {
    color: colors.text,
    fontSize: 12,
  },
  cardFooter: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardParticipants: {
    color: colors.muted,
    fontSize: 12,
  },
  btnSmall: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  btnSmallActive: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSmallText: {
    color: "#0b111f",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSmallTextActive: {
    color: colors.text,
  },
});
