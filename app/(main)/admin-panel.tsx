import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../constants/color";
import { useAdmin } from "../../hooks/use-admin";
import { auth, db } from "../../lib/firebase";

type Report = {
  id: string;
  activityId: string;
  reason: string;
  reportedBy: string;
  reportedAt: Timestamp;
  activityTitle?: string;
};

type AdminUser = {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  status?: "active" | "banned";
  warningsCount?: number;
};

type ModeratedActivity = {
  id: string;
  title?: string;
  ownerId?: string;
  date?: Timestamp;
};

type ModeratedComment = {
  id: string;
  activityId: string;
  text?: string;
  userName?: string;
  createdAt?: Timestamp;
};

export default function AdminPanel() {
  const { isAdmin, loading: adminLoading } = useAdmin();

  // reports
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");

  // activities
  const [activities, setActivities] = useState<ModeratedActivity[]>([]);
  const [activitySearch, setActivitySearch] = useState("");

  // comments
  const [comments, setComments] = useState<ModeratedComment[]>([]);
  const [commentSearch, setCommentSearch] = useState("");

  const [deleting, setDeleting] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // reduire si pas admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.replace("/(main)/feed");
    }
  }, [isAdmin, adminLoading]);

  // charger les signalements
  useEffect(() => {
    if (!isAdmin) return;

    setLoadingReports(true);
    setError(null);
    const q = query(collection(db, "reports"));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const reportsList: Report[] = [];

        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const report: Report = {
            id: docSnap.id,
            activityId: data.activityId,
            reason: data.reason,
            reportedBy: data.reportedBy,
            reportedAt: data.reportedAt,
          };

          // recuperer le titre de lactivite
          try {
            const actDoc = await getDoc(doc(db, "activities", data.activityId));
            if (actDoc.exists()) {
              report.activityTitle = actDoc.data().title;
            }
          } catch (e) {
            console.log("erreur titre activite:", e);
          }

          reportsList.push(report);
        }

        setReports(reportsList);
        setLoadingReports(false);
      },
      (err) => {
        console.log("erreur lecture reports:", err);
        setError("Accès refusé au panel admin. Vérifie role=admin et les règles Firestore déployées.");
        setLoadingReports(false);
      }
    );

    return unsub;
  }, [isAdmin]);

  // charger users pour recherche/modération
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "users"), limit(300));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AdminUser[] = snap.docs.map((userDoc) => {
          const data = userDoc.data() as any;
          return {
            id: userDoc.id,
            displayName: data.displayName,
            email: data.email,
            role: data.role,
            status: data.status || "active",
            warningsCount: data.warningsCount || 0,
          };
        });
        setUsers(list);
      },
      (err) => {
        console.log("erreur lecture users:", err);
      }
    );

    return unsub;
  }, [isAdmin]);

  // charger activités pour suppression admin
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "activities"), orderBy("date", "desc"), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ModeratedActivity[] = snap.docs.map((activityDoc) => {
          const data = activityDoc.data() as any;
          return {
            id: activityDoc.id,
            title: data.title,
            ownerId: data.ownerId,
            date: data.date,
          };
        });
        setActivities(list);
      },
      (err) => {
        console.log("erreur lecture activities:", err);
      }
    );

    return unsub;
  }, [isAdmin]);

  // charger commentaires pour suppression admin
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collectionGroup(db, "comments"), orderBy("createdAt", "desc"), limit(120));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ModeratedComment[] = snap.docs.map((commentDoc) => {
          const data = commentDoc.data() as any;
          const activityId = commentDoc.ref.parent.parent?.id || "";
          return {
            id: commentDoc.id,
            activityId,
            text: data.text,
            userName: data.userName,
            createdAt: data.createdAt,
          };
        });
        setComments(list.filter((c) => !!c.activityId));
      },
      (err) => {
        console.log("erreur lecture comments:", err);
      }
    );

    return unsub;
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return [];
    return users.filter((user) => {
      const name = (user.displayName || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [users, userSearch]);

  const filteredActivities = useMemo(() => {
    const term = activitySearch.trim().toLowerCase();
    if (!term) return [];
    return activities.filter((activity) =>
      (activity.title || "").toLowerCase().includes(term)
    );
  }, [activities, activitySearch]);

  const filteredComments = useMemo(() => {
    const term = commentSearch.trim().toLowerCase();
    if (!term) return [];
    return comments.filter((comment) => {
      const txt = (comment.text || "").toLowerCase();
      const user = (comment.userName || "").toLowerCase();
      const activityId = (comment.activityId || "").toLowerCase();
      return txt.includes(term) || user.includes(term) || activityId.includes(term);
    });
  }, [comments, commentSearch]);

  const handleWarnUser = async (targetUser: AdminUser) => {
    setProcessingUserId(targetUser.id);
    try {
      await updateDoc(doc(db, "users", targetUser.id), {
        warningsCount: increment(1),
        lastWarningReason: "Avertissement admin",
        lastWarningAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Avertissement envoyé", `Utilisateur ${targetUser.displayName || targetUser.email || targetUser.id} averti.`);
    } catch (err) {
      console.log("erreur avertissement user:", err);
      Alert.alert("Erreur", "Impossible d'envoyer un avertissement.");
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleToggleBanUser = async (targetUser: AdminUser) => {
    const currentStatus = targetUser.status || "active";
    const nextStatus = currentStatus === "banned" ? "active" : "banned";

    setProcessingUserId(targetUser.id);
    try {
      await updateDoc(doc(db, "users", targetUser.id), {
        status: nextStatus,
        bannedAt: nextStatus === "banned" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
      Alert.alert(
        nextStatus === "banned" ? "Utilisateur banni" : "Utilisateur débanni",
        `${targetUser.displayName || targetUser.email || targetUser.id}`
      );
    } catch (err) {
      console.log("erreur ban user:", err);
      Alert.alert("Erreur", "Impossible de modifier le statut de l'utilisateur.");
    } finally {
      setProcessingUserId(null);
    }
  };

  // supprimer lactivite et le signalement
  const handleDeleteActivity = async (report: Report) => {
    if (!auth.currentUser) return;

    setDeleting(report.id);
    try {
      // supprimer lactivite
      await deleteDoc(doc(db, "activities", report.activityId));

      // supprimer le signalement
      await deleteDoc(doc(db, "reports", report.id));

      alert("Activité et rapport supprimés");
    } catch (e) {
      console.log("erreur suppression:", e);
      alert("Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteActivityById = async (activityId: string) => {
    setDeleting(activityId);
    try {
      await deleteDoc(doc(db, "activities", activityId));
      Alert.alert("Activité supprimée", "L'activité a été supprimée.");
    } catch (e) {
      console.log("erreur suppression activité admin:", e);
      Alert.alert("Erreur", "Impossible de supprimer l'activité.");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteComment = async (activityId: string, commentId: string) => {
    setDeleting(commentId);
    try {
      await deleteDoc(doc(db, "activities", activityId, "comments", commentId));
      Alert.alert("Commentaire supprimé", "Le commentaire a été supprimé.");
    } catch (e) {
      console.log("erreur suppression commentaire admin:", e);
      Alert.alert("Erreur", "Impossible de supprimer le commentaire.");
    } finally {
      setDeleting(null);
    }
  };

  // ignorer le signalement
  const handleIgnore = async (reportId: string) => {
    setDeleting(reportId);
    try {
      await deleteDoc(doc(db, "reports", reportId));
    } catch (e) {
      console.log("erreur suppression rapport:", e);
    } finally {
      setDeleting(null);
    }
  };

  if (adminLoading) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      <View style={s.content}>
        <View style={s.header}>
          <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          <Text style={s.title}>Modération</Text>
        </View>

        {loadingReports ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : error ? (
          <View style={s.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color="#f97316" />
            <Text style={s.emptyTitle}>Accès impossible</Text>
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.muted} />
            <Text style={s.emptyTitle}>Aucun signalement</Text>
            <Text style={s.emptyText}>Tout est en ordre</Text>
          </View>
        ) : (
          <View>
            <Text style={s.countText}>{reports.length} signalement(s)</Text>
            {reports.map((report) => (
              <View key={report.id} style={s.reportCard}>
                <View style={s.reportHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reportTitle}>{report.activityTitle || "Activité supprimée"}</Text>
                    <Text style={s.reportReason}>Raison : {report.reason}</Text>
                  </View>
                  <View style={s.reportBadge}>
                    <Ionicons name="flag-outline" size={16} color="#f97316" />
                  </View>
                </View>

                <Text style={s.reportMeta}>
                  Signalée par {(report.reportedBy || "inconnu").substring(0, 8)}... le{" "}
                  {format(report.reportedAt.toDate(), "dd MMM à HH:mm", { locale: fr })}
                </Text>

                <View style={s.actionsRow}>
                  <TouchableOpacity
                    style={[s.btn, s.deleteBtn]}
                    onPress={() => handleDeleteActivity(report)}
                    disabled={deleting === report.id}
                  >
                    {deleting === report.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={s.deleteBtnText}>Supprimer</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btn, s.ignoreBtn]}
                    onPress={() => handleIgnore(report.id)}
                    disabled={deleting === report.id}
                  >
                    {deleting === report.id ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <>
                        <Ionicons name="close-outline" size={16} color={colors.text} />
                        <Text style={s.ignoreBtnText}>Ignorer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={s.sectionTitle}>Utilisateurs</Text>
          </View>
          <TextInput
            style={s.searchInput}
            placeholder="Chercher par nom ou email"
            placeholderTextColor={colors.muted}
            value={userSearch}
            onChangeText={setUserSearch}
          />

          {filteredUsers.slice(0, 60).map((user) => {
            const isBanned = (user.status || "active") === "banned";
            const isCurrentUser = auth.currentUser?.uid === user.id;
            const statusLabel = isBanned ? "banni" : "actif";
            return (
              <View key={user.id} style={s.userCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{user.displayName || "Sans nom"}</Text>
                  <Text style={s.userMeta}>{user.email || user.id}</Text>
                  <Text style={s.userMeta}>
                    rôle: {user.role || "user"} · statut: {statusLabel} · avertissements: {user.warningsCount || 0}
                  </Text>
                </View>
                <View style={s.smallActionsRow}>
                  <TouchableOpacity
                    style={[s.smallBtn, s.warnBtn]}
                    onPress={() => handleWarnUser(user)}
                    disabled={processingUserId === user.id || isCurrentUser}
                  >
                    <Text style={s.smallBtnText}>Avertir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.smallBtn, isBanned ? s.unbanBtn : s.banBtn]}
                    onPress={() => handleToggleBanUser(user)}
                    disabled={processingUserId === user.id || isCurrentUser}
                  >
                    <Text style={s.smallBtnText}>{isBanned ? "Débannir" : "Bannir"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={s.sectionTitle}>Activités</Text>
          </View>
          <TextInput
            style={s.searchInput}
            placeholder="Chercher une activité par titre"
            placeholderTextColor={colors.muted}
            value={activitySearch}
            onChangeText={setActivitySearch}
          />
          {filteredActivities.slice(0, 50).map((activity) => (
            <View key={activity.id} style={s.userCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{activity.title || "Activité sans titre"}</Text>
                <Text style={s.userMeta}>propriétaire: {activity.ownerId || "inconnu"}</Text>
                <Text style={s.userMeta}>
                  {activity.date?.toDate
                    ? format(activity.date.toDate(), "dd MMM à HH:mm", { locale: fr })
                    : "date inconnue"}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.smallBtn, s.deleteBtn]}
                onPress={() => handleDeleteActivityById(activity.id)}
                disabled={deleting === activity.id}
              >
                <Text style={s.smallBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            <Text style={s.sectionTitle}>Commentaires</Text>
          </View>

          <TextInput
            style={s.searchInput}
            placeholder="Chercher un commentaire, un auteur ou un id activité"
            placeholderTextColor={colors.muted}
            value={commentSearch}
            onChangeText={setCommentSearch}
          />

          {filteredComments.slice(0, 80).map((comment) => (
            <View key={`${comment.activityId}-${comment.id}`} style={s.userCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{comment.userName || "Utilisateur"}</Text>
                <Text style={s.userMeta}>{comment.text || "(commentaire vide)"}</Text>
                <Text style={s.userMeta}>activité: {comment.activityId}</Text>
              </View>
              <TouchableOpacity
                style={[s.smallBtn, s.deleteBtn]}
                onPress={() => handleDeleteComment(comment.activityId, comment.id)}
                disabled={deleting === comment.id}
              >
                <Text style={s.smallBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  countText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  reportCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  reportReason: {
    fontSize: 13,
    color: colors.muted,
  },
  reportBadge: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 8,
  },
  reportMeta: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  deleteBtn: {
    backgroundColor: "#ef4444",
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  ignoreBtn: {
    backgroundColor: "#1e293b",
  },
  ignoreBtnText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  sectionCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  searchInput: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#020617",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 12,
    marginBottom: 8,
  },
  userName: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 2,
  },
  userMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  smallActionsRow: {
    gap: 6,
  },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  warnBtn: {
    backgroundColor: "#f59e0b",
  },
  banBtn: {
    backgroundColor: "#ef4444",
  },
  unbanBtn: {
    backgroundColor: "#10b981",
  },
});
