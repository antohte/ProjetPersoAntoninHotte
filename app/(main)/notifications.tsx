import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../constants/color";
import { auth, db } from "../../lib/firebase";
import { deleteNotification, markNotificationAsRead } from "../../lib/notifications";

export default function NotificationsScreen() {
  // liste de toutes les notifications de l'utilisateur
  const [notifications, setNotifications] = useState<any[]>([]);

  // true pendant le premier chargement
  const [loading, setLoading] = useState(true);

  // true pendant le pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.currentUser;

  // écouter en temps réel les notifications de l'utilisateur
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const stopEcoute = onSnapshot(q, (snap) => {
      const liste = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          title: data.title,
          message: data.message,
          activityId: data.activityId,
          activityTitle: data.activityTitle,
          fromUserId: data.fromUserId,
          fromUserName: data.fromUserName,
          read: data.read || false,
          createdAt: data.createdAt,
        };
      });

      setNotifications(liste);
      setLoading(false);
    });

    return () => stopEcoute();
  }, [user]);

  // quand on appuie sur une notification
  const onPressNotification = async (notif: any) => {
    // la marquer comme lue si elle ne l'est pas encore
    if (!notif.read && user) {
      await markNotificationAsRead(user.uid, notif.id);
    }

    // aller vers l'activité concernée
    if (notif.activityId) {
      router.push(`/(main)/activity-details?id=${notif.activityId}` as any);
    }
  };

  // supprimer une notification
  const onSupprimerNotification = async (notif: any) => {
    if (user) {
      await deleteNotification(user.uid, notif.id);
    }
  };

  // rafraîchir (pull-to-refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    // les données arrivent via onSnapshot donc pas besoin de refetch,
    // on attend juste un peu pour montrer l'animation
    setTimeout(() => setRefreshing(false), 500);
  };

  // choisir l'icone selon le type de notification
  const getIcone = (type: string) => {
    if (type === "participation") return "person-add";
    if (type === "comment") return "chatbubble";
    if (type === "reminder") return "alarm";
    return "notifications";
  };

  // compter les non lues pour le badge
  const nbNonLues = notifications.filter((n) => !n.read).length;

  // affichage d'une notification dans la liste
  const afficherNotification = ({ item }: { item: any }) => {
    const estNonLue = !item.read;
    const dateFormatee = item.createdAt?.toDate
      ? format(item.createdAt.toDate(), "dd MMM à HH:mm", { locale: fr })
      : "";

    return (
      <TouchableOpacity
        style={[styles.carteNotif, estNonLue && styles.carteNotifNonLue]}
        onPress={() => onPressNotification(item)}
        activeOpacity={0.7}
      >
        {/* icone de la notification */}
        <View style={styles.iconeNotif}>
          <Ionicons
            name={getIcone(item.type) as any}
            size={24}
            color={estNonLue ? colors.primary : colors.muted}
          />
        </View>

        {/* contenu texte */}
        <View style={styles.contenuNotif}>
          <Text style={[styles.titreNotif, estNonLue && styles.titreNotifNonLu]}>
            {item.title}
          </Text>
          <Text style={styles.messageNotif}>{item.message}</Text>
          {item.activityTitle ? (
            <Text style={styles.activiteNotif}>📍 {item.activityTitle}</Text>
          ) : null}
          {dateFormatee ? (
            <Text style={styles.dateNotif}>{dateFormatee}</Text>
          ) : null}
        </View>

        {/* bouton supprimer */}
        <TouchableOpacity
          style={styles.boutonSupprimer}
          onPress={() => onSupprimerNotification(item)}
        >
          <Ionicons name="close" size={20} color={colors.muted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.ecran}>

      {/* en-tête avec titre et badge non lues */}
      <View style={styles.entete}>
        <Text style={styles.titreEntete}>Notifications</Text>
        {nbNonLues > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeTexte}>{nbNonLues}</Text>
          </View>
        )}
      </View>

      {/* pendant le chargement */}
      {loading ? (
        <View style={styles.blocChargement}>
          <Text style={styles.texteChargement}>Chargement des notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        /* aucune notification */
        <View style={styles.blocVide}>
          <Ionicons name="notifications-off-outline" size={60} color={colors.muted} />
          <Text style={styles.titreVide}>Aucune notification</Text>
          <Text style={styles.descriptionVide}>
            Tu seras notifié quand quelqu'un interagit avec tes activités
          </Text>
        </View>
      ) : (
        /* liste des notifications */
        <FlatList
          data={notifications}
          renderItem={afficherNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // en-tête
  entete: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#020617",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  titreEntete: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  badgeTexte: {
    color: "#0b111f",
    fontSize: 12,
    fontWeight: "700",
  },

  // état chargement
  blocChargement: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  texteChargement: {
    color: colors.muted,
    fontSize: 16,
  },

  // état vide (aucune notification)
  blocVide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  titreVide: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  descriptionVide: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },

  // liste
  liste: {
    padding: 20,
  },

  // carte notification
  carteNotif: {
    flexDirection: "row",
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#111827",
  },
  carteNotifNonLue: {
    borderColor: colors.primary,
    backgroundColor: "#0f172a",
  },
  iconeNotif: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contenuNotif: {
    flex: 1,
  },
  titreNotif: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  titreNotifNonLu: {
    fontWeight: "700",
  },
  messageNotif: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  activiteNotif: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: 4,
  },
  dateNotif: {
    color: colors.muted,
    fontSize: 12,
  },
  boutonSupprimer: {
    padding: 4,
  },
});
