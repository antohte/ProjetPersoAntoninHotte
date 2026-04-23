import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../constants/color";
import { useAdmin } from "../../hooks/use-admin";
import { auth, db } from "../../lib/firebase";

export default function ProfileScreen() {
  const router = useRouter();
  const { isAdmin } = useAdmin();

  // infos du profil utilisateur
  const [userProfile, setUserProfile] = useState<any>(null);

  // 3 dernières activités créées par l'utilisateur
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // pendant le chargement initial
  const [loading, setLoading] = useState(true);

  // statistiques : combien d'activités créées, combien de participations
  const [nbActivitesCreees, setNbActivitesCreees] = useState(0);
  const [nbParticipations, setNbParticipations] = useState(0);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // charger le profil de l'utilisateur une seule fois
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
      setLoading(false);
    });

    // écouter en temps réel les 3 dernières activités créées
    const stopEcouteRecentes = onSnapshot(
      query(
        collection(db, "activities"),
        where("ownerId", "==", user.uid),
        orderBy("date", "desc"),
        limit(3)
      ),
      (snap) => {
        const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRecentActivities(liste);
      }
    );

    // écouter en temps réel le nombre d'activités créées
    const stopEcouteCreees = onSnapshot(
      query(collection(db, "activities"), where("ownerId", "==", user.uid)),
      (snap) => setNbActivitesCreees(snap.size)
    );

    // écouter en temps réel le nombre de participations
    const stopEcouteParticipations = onSnapshot(
      query(collection(db, "activities"), where("participants", "array-contains", user.uid)),
      (snap) => setNbParticipations(snap.size)
    );

    // arrêter d'écouter quand on quitte la page
    return () => {
      stopEcouteRecentes();
      stopEcouteCreees();
      stopEcouteParticipations();
    };
  }, []);

  // première lettre du nom ou de l'email pour l'avatar
  const initiales =
    userProfile?.displayName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "?";

  // afficher un écran vide pendant le chargement
  if (loading) {
    return (
      <ScrollView style={styles.ecran} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.blocChargement}>
          <Text style={styles.texteChargement}>Chargement du profil...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* carte du haut : avatar + nom + bouton modifier */}
      <View style={styles.carteEntete}>
        {userProfile?.photoURL ? (
          <Image source={{ uri: userProfile.photoURL }} style={styles.avatarPhoto} />
        ) : (
          <View style={styles.avatarTexte}>
            <Text style={styles.avatarLettre}>{initiales}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>Mon profil</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.boutonModifier}
          onPress={() => router.push("/(main)/profile-edit")}
          activeOpacity={0.9}
        >
          <Ionicons name="create-outline" size={20} color="#0b111f" />
        </TouchableOpacity>
      </View>

      {/* statistiques */}
      <View style={styles.carte}>
        <View style={styles.carteTitreLigne}>
          <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
          <Text style={styles.carteTitre}>Statistiques</Text>
        </View>
        <View style={styles.ligneStats}>
          <View style={styles.statBloc}>
            <Text style={styles.statChiffre}>{nbActivitesCreees}</Text>
            <Text style={styles.statLabel}>Activités créées</Text>
          </View>
          <View style={styles.statSeparateur} />
          <View style={styles.statBloc}>
            <Text style={styles.statChiffre}>{nbParticipations}</Text>
            <Text style={styles.statLabel}>Participations</Text>
          </View>
        </View>
      </View>

      {/* infos étudiantes */}
      <View style={styles.carte}>
        <View style={styles.carteTitreLigne}>
          <Ionicons name="school-outline" size={22} color={colors.primary} />
          <Text style={styles.carteTitre}>Infos étudiantes</Text>
        </View>

        <View style={styles.ligneInfo}>
          <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          <Text style={styles.labelInfo}>Année :</Text>
          <Text style={styles.valeurInfo}>{userProfile?.year || "Non renseigné"}</Text>
        </View>

        <View style={styles.ligneInfo}>
          <Ionicons name="book-outline" size={18} color={colors.muted} />
          <Text style={styles.labelInfo}>Formation :</Text>
          <Text style={styles.valeurInfo}>{userProfile?.program || "Non renseigné"}</Text>
        </View>

        <View style={styles.ligneInfo}>
          <Ionicons name="heart-outline" size={18} color={colors.muted} />
          <Text style={styles.labelInfo}>Centres d'intérêt :</Text>
          <Text style={styles.valeurInfo}>
            {userProfile?.interests?.join(" · ") || "Non renseigné"}
          </Text>
        </View>

        <View style={styles.ligneInfo}>
          <Ionicons name="person-outline" size={18} color={colors.muted} />
          <Text style={styles.labelInfo}>Bio :</Text>
          <Text style={styles.valeurInfo}>{userProfile?.bio || "Non renseigné"}</Text>
        </View>
      </View>

      {/* activités récentes créées */}
      <View style={styles.carte}>
        <View style={styles.carteTitreLigne}>
          <Ionicons name="time-outline" size={22} color={colors.primary} />
          <Text style={styles.carteTitre}>Activités récentes</Text>
        </View>

        {recentActivities.length === 0 ? (
          <Text style={styles.texteVide}>Tu n'as pas encore créé d'activité.</Text>
        ) : (
          recentActivities.map((activite) => (
            <TouchableOpacity
              key={activite.id}
              style={styles.ligneActivite}
              onPress={() => router.push(`/(main)/activity-details?id=${activite.id}` as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="flash-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.titreActivite}>{activite.title}</Text>
                {activite.location ? (
                  <Text style={styles.metaActivite}>{activite.location}</Text>
                ) : null}
                <Text style={styles.metaActivite}>
                  {format(activite.date.toDate(), "eee dd MMM. 'à' HH:mm", { locale: fr })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* bouton panel admin (visible seulement si l'utilisateur est admin) */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.boutonAdmin}
          onPress={() => router.push("./admin-panel")}
          activeOpacity={0.9}
        >
          <View style={styles.boutonAdminGauche}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={styles.boutonAdminTexte}>Accéder au panel de modération</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
  },

  // pendant le chargement
  blocChargement: {
    padding: 40,
    alignItems: "center",
  },
  texteChargement: {
    color: colors.muted,
    fontSize: 16,
  },

  // carte en-tête (avatar + nom)
  carteEntete: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  avatarTexte: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarLettre: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  avatarPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  titre: {
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
  boutonModifier: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
  },

  // carte générique
  carte: {
    backgroundColor: "#020617",
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  carteTitreLigne: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  carteTitre: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // infos étudiantes
  ligneInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
  },
  labelInfo: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  valeurInfo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 2,
  },

  // statistiques
  ligneStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 8,
  },
  statBloc: {
    alignItems: "center",
    flex: 1,
  },
  statChiffre: {
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
  statSeparateur: {
    width: 1,
    height: 40,
    backgroundColor: "#0f172a",
  },

  // activités récentes
  texteVide: {
    color: colors.muted,
    fontSize: 14,
  },
  ligneActivite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  titreActivite: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  metaActivite: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },

  // bouton admin
  boutonAdmin: {
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
  boutonAdminGauche: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  boutonAdminTexte: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
