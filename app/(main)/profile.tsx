import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { colors } from "../../constants/color";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type UserProfile = {
  email: string;
  displayName?: string;
  program?: string;
  year?: string;
  interests?: string[];
  bio?: string;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  //recup l'uid et  email
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUserEmail(null);
        setUserProfile(null);
        setRecentActivities([]);
        return;
      }
      setUserEmail(u.email ?? null);

      //profil Firestore
      const ref = doc(db, "users", u.uid);
      getDoc(ref).then((snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      });

      //activites recentes
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
      {/* Header / avatar */}
      <View style={s.headerCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Mon profil</Text>
          <Text style={s.email}>{userEmail}</Text>
        </View>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => router.push("/(main)/profile-edit")}
          activeOpacity={0.9}
        >
          <Text style={s.editBtnText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      {/* Infos étudiantes */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Infos étudiantes</Text>

        <View style={s.row}>
          <Text style={s.label}>Année :</Text>
          <Text style={s.value}>{userProfile?.year ?? "Non renseigné"}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Formation :</Text>
          <Text style={s.value}>{userProfile?.program ?? "Non renseigné"}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Centres d’intérêt :</Text>
          <Text style={s.value}>
            {userProfile?.interests && userProfile.interests.length > 0
              ? userProfile.interests.join(" · ")
              : "Non renseigné"}
          </Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Bio :</Text>
          <Text style={s.value}>{userProfile?.bio ?? "Non renseigné"}</Text>
        </View>
      </View>

      {/* Activités récentes */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Activités récentes</Text>

        {recentActivities.length === 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={s.emptyLine}>
              Tu n’as pas encore créé d’activité.
            </Text>
            <Text style={s.emptyLine}>
              Crée ta première sortie depuis l’onglet Activités.
            </Text>
          </View>
        ) : (
          recentActivities.map((act) => (
            <View key={act.id} style={s.activityRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.activityTitle}>{act.title}</Text>
                {act.location ? (
                  <Text style={s.activityLocation}>{act.location}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.activityDate}>
                  {formatDateFR(act.date)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  email: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBtnText: {
    color: colors.primary,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    color: colors.muted,
    width: 120,
  },
  value: {
    color: colors.text,
    flex: 1,
  },
  emptyLine: {
    color: colors.muted,
    fontSize: 14,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#0b1220",
    marginTop: 4,
  },
  activityTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  activityLocation: {
    color: colors.muted,
    fontSize: 13,
  },
  activityDate: {
    color: colors.muted,
    fontSize: 12,
  },
});
