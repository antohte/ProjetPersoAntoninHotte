import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, Timestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
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

export default function AdminPanel() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // reduire si pas admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.replace("/(main)/feed");
    }
  }, [isAdmin, adminLoading]);

  // charger les signalements
  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const q = query(collection(db, "reports"));
    const unsub = onSnapshot(q, async (snap) => {
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
      setLoading(false);
    });

    return unsub;
  }, [isAdmin]);

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

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
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
                  Signalée par {report.reportedBy.substring(0, 8)}... le{" "}
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
});
