import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    limit,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { AnimatedCard } from "../../components/ui/animated-card";
import { SkeletonProfileCard } from "../../components/ui/skeleton";
import { colors } from "../../constants/color";
import { useAdmin } from "../../hooks/use-admin";
import { auth, db } from "../../lib/firebase";

type UserProfile = {
  email: string;
  displayName?: string;
  program?: string;
  year?: string;
  interests?: string[];
  bio?: string;
  photoURL?: string;
};

type Activity = {
  id: string;
  title: string;
  description?: string;
  date: Timestamp;
  location?: string;
};

function formatDateFR(ts: Timestamp) {
  const d = ts.toDate();
  return format(d, "eee dd MMM. 'à' HH:mm", { locale: fr });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ created: 0, participated: 0 });

  // recup uid et email
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUserEmail(null);
        setUserProfile(null);
        setRecentActivities([]);
        setLoading(false);
        return;
      }
      setUserEmail(u.email ?? null);

      // profil firestore
      const ref = doc(db, "users", u.uid);
      getDoc(ref).then((snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
        setLoading(false);
      });

      // activites recentes
      const q = query(
        collection(db, "activities"),
        where("ownerId", "==", u.uid),
        orderBy("date", "desc"),
        limit(3)
      );

      const unsubActivities = onSnapshot(q, (snap) => {
        const list: Activity[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setRecentActivities(list);
      });

      // compter les activites creees
      const qCreated = query(
        collection(db, "activities"),
        where("ownerId", "==", u.uid)
      );
      getDoc(doc(db, "activities", "count")).then(() => {
        onSnapshot(qCreated, (snap) => {
          setStats((prev) => ({ ...prev, created: snap.size }));
        });
      });

      // compter les participations
      const qAll = query(collection(db, "activities"));
      onSnapshot(qAll, (snap) => {
        let count = 0;
        snap.docs.forEach((d) => {
          const participants = d.data().participants || [];
          if (participants.includes(u.uid)) count++;
        });
        setStats((prev) => ({ ...prev, participated: count }));
      });

      return () => {
        unsubActivities();
      };
    });

    return () => unsub();
  }, []);

  const initials =
    userProfile?.displayName?.[0] ??
    userEmail?.[0]?.toUpperCase() ??
    "?";

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {loading ? (
        <>
          <SkeletonProfileCard />
          <SkeletonProfileCard />
        </>
      ) : (
        <>
          {/* Header / avatar */}
          <AnimatedCard delay={0}>
            <View style={s.headerCard}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={s.avatarImage} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.title}>Mon profil</Text>
                <Text style={s.email}>{userEmail}</Text>
              </View>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => router.push("/(main)/profile-edit")}
                activeOpacity={0.9}
              >
                <Ionicons name="create-outline" size={20} color="#0b111f" />
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* Stats */}
          <AnimatedCard delay={50}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
                <Text style={s.cardTitle}>Statistiques</Text>
              </View>
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{stats.created}</Text>
                  <Text style={s.statLabel}>Activites creees</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{stats.participated}</Text>
                  <Text style={s.statLabel}>Participations</Text>
                </View>
              </View>
            </View>
          </AnimatedCard>

          {/* Infos étudiantes */}
          <AnimatedCard delay={100}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Ionicons name="school-outline" size={22} color={colors.primary} />
                <Text style={s.cardTitle}>Infos étudiantes</Text>
              </View>

              <View style={s.row}>
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                <Text style={s.label}>Année :</Text>
                <Text style={s.value}>{userProfile?.year ?? "Non renseigné"}</Text>
              </View>

              <View style={s.row}>
                <Ionicons name="book-outline" size={18} color={colors.muted} />
                <Text style={s.label}>Formation :</Text>
                <Text style={s.value}>{userProfile?.program ?? "Non renseigné"}</Text>
              </View>

              <View style={s.row}>
                <Ionicons name="heart-outline" size={18} color={colors.muted} />
                <Text style={s.label}>Centres d&apos;int&eacute;r&ecirc;t :</Text>
                <Text style={s.value}>
                  {userProfile?.interests && userProfile.interests.length > 0
                    ? userProfile.interests.join(" · ")
                    : "Non renseigné"}
                </Text>
              </View>

              <View style={s.row}>
                <Ionicons name="person-outline" size={18} color={colors.muted} />
                <Text style={s.label}>Bio :</Text>
                <Text style={s.value}>{userProfile?.bio ?? "Non renseigné"}</Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Activités récentes */}
          <AnimatedCard delay={200}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Ionicons name="time-outline" size={22} color={colors.primary} />
                <Text style={s.cardTitle}>Activités récentes</Text>
              </View>

              {recentActivities.length === 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={s.emptyLine}>
                    Tu n&apos;as pas encore cr&eacute;&eacute; d&apos;activit&eacute;.
                  </Text>
                  <Text style={s.emptyLine}>
                    Cr&eacute;&eacute; ta premi&egrave;re sortie depuis l&apos;onglet Activit&eacute;s.
                  </Text>
                </View>
              ) : (
                recentActivities.map((act) => (
                  <TouchableOpacity 
                    key={act.id} 
                    style={s.activityRow}
                    onPress={() => router.push(`/(main)/activity-details?id=${act.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityTitle}>{act.title}</Text>
                      {act.location ? (
                        <Text style={s.activityLocation}>{act.location}</Text>
                      ) : null}
                      <Text style={s.activityDate}>
                        {formatDateFR(act.date)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </AnimatedCard>

          {/* bouton admin */}
          {isAdmin && (
            <AnimatedCard delay={150}>
              <TouchableOpacity
                style={s.adminBtn}
                onPress={() => router.push("./admin-panel")}
                activeOpacity={0.9}
              >
                <View style={s.adminBtnContent}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
                  <Text style={s.adminBtnText}>Accéder au panel de modération</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            </AnimatedCard>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  email: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
  },
  card: {
    backgroundColor: "#020617",
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 2,
  },
  emptyLine: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 6,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  activityLocation: {
    color: colors.muted,
    fontSize: 13,
  },
  activityDate: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#0f172a",
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  adminBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  adminBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
