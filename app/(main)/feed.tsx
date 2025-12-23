// app main feed
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { colors } from "../../constants/color";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import { AnimatedCard } from "../../components/ui/animated-card";
import { SkeletonActivityCard } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { Ionicons } from "@expo/vector-icons";

type Activity = {
  id: string;
  title: string;
  description: string;
  place: string;
  date: Timestamp;
  ownerId: string;
  creatorName?: string;
  participants: string[];
};

type Comment = {
  id: string;
  text: string;
  userId: string;
  userName?: string;
  createdAt?: Timestamp;
};

// post general

type ActivityCardProps = {
  activity: Activity;
  isParticipant: boolean;
  onToggleParticipation: () => void;
  comments: Comment[];
  draftComment: string;
  onChangeDraft: (text: string) => void;
  onSendComment: () => void;
  onCardPress: () => void;
  onDeleteComment: (commentId: string) => void;
};

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  isParticipant,
  onToggleParticipation,
  comments,
  draftComment,
  onChangeDraft,
  onSendComment,
  onCardPress,
  onDeleteComment,
}) => {
  const jsDate = activity.date.toDate();
  const isPast = jsDate.getTime() < Date.now();

  const dateLabel = format(jsDate, "EEE dd MMM. 'à' HH:mm", { locale: fr });

  const displayName = activity.creatorName || "Utilisateur";
  const initial = displayName.trim()[0]?.toUpperCase() ?? "U";

  const previewComments = comments.slice(0, 3);
  const moreCount = comments.length - previewComments.length;

  return (
    <View style={s.card}>
      {/*style story/post insta */}
      <TouchableOpacity onPress={onCardPress} activeOpacity={0.9}>
        <View style={s.cardHeader}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.creatorName}>{displayName}</Text>
          </View>
        </View>

        {/* post */}
        <View style={s.cardBody}>
          <Text style={s.title}>{activity.title}</Text>
          {activity.description ? (
            <Text style={s.description} numberOfLines={2}>
              {activity.description}
            </Text>
          ) : null}

          <View style={s.chipsRow}>
            <View style={s.chip}>
              <Text style={s.chipText}>{dateLabel}</Text>
            </View>
            {activity.place ? (
              <View style={s.chip}>
                <Text style={s.chipText}>{activity.place}</Text>
              </View>
            ) : null}
          </View>

          <Text style={s.participantsText}>
            {activity.participants.length} participant(s)
          </Text>
        </View>
      </TouchableOpacity>

      {/*like/comment */}
      <View style={s.actionsRow}>
        <TouchableOpacity
          style={[
            s.participateBtn,
            isPast && s.participateBtnPast,
            isParticipant && !isPast && s.participateBtnActive,
          ]}
          disabled={isPast}
          onPress={onToggleParticipation}
        >
          <Text
            style={[
              s.participateText,
              isPast && s.participateTextPast,
            ]}
          >
            {isPast
              ? "Terminée"
              : isParticipant
              ? "Tu participes"
              : "Participer"}
          </Text>
        </TouchableOpacity>

        <View style={s.commentLabelWrapper}>
          <Text style={s.commentLabel}>Commenter</Text>
        </View>
      </View>

      {/*commentaires */}
      <View style={s.commentsBlock}>
        {previewComments.map((c) => {
          const isOwnComment = auth.currentUser && c.userId === auth.currentUser.uid;
          return (
            <View key={c.id} style={s.commentLineContainer}>
              <View style={{ flex: 1 }}>
                <Text style={s.commentLine}>
                  <Text style={s.commentAuthor}>
                    {c.userName || "Anon"}
                    {isOwnComment && <Text style={s.youBadgeInline}> (Vous)</Text>}
                  </Text>
                  {" "}{c.text}
                </Text>
                {c.createdAt && (
                  <Text style={s.commentTimestamp}>
                    {format(c.createdAt.toDate(), "dd MMM à HH:mm", { locale: fr })}
                  </Text>
                )}
              </View>
              {isOwnComment && (
                <TouchableOpacity
                  style={s.deleteCommentBtn}
                  onPress={() => onDeleteComment(c.id)}
                >
                  <Text style={s.deleteCommentText}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {moreCount > 0 && (
          <TouchableOpacity onPress={onCardPress}>
            <Text style={s.moreComments}>
              Voir {moreCount} autre(s) commentaire(s)…
            </Text>
          </TouchableOpacity>
        )}

        <View style={s.commentInputRow}>
          <TextInput
            style={s.commentInput}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor={colors.muted}
            value={draftComment}
            onChangeText={onChangeDraft}
          />
          <TouchableOpacity style={s.sendBtn} onPress={onSendComment}>
            <Text style={s.sendBtnText}>{">"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ecran feed

export default function FeedScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentsByActivity, setCommentsByActivity] = useState<
    Record<string, Comment[]>
  >({});
  const [draftComments, setDraftComments] = useState<Record<string, string>>(
    {}
  );

  const user = auth.currentUser;

  // recup des activites triees
  useEffect(() => {
  const q = query(
    collection(db, "activities"),
    orderBy("date", "asc")
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const list: Activity[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.title,
          description: data.description ?? "",
          place: data.place ?? "",
          date: data.date,
          ownerId: data.ownerId,
          creatorName:
            data.creatorName ??
            data.ownerDisplayName ??
            data.ownerEmail ??
            "Utilisateur",
          participants: data.participants ?? [],
        };
      });
      setActivities(list);
      setLoading(false);
    },
    (err) => {
      console.log("Erreur chargement activités :", err);
      setLoading(false);
    }
  );

  return () => unsub();
}, []);


  // abonnements commentaires
  useEffect(() => {
    const ids = activities.map((a) => a.id);
    if (ids.length === 0) return;

    const unsubscribers = ids.map((id) => {
      const q = query(
        collection(db, "activities", id, "comments"),
        orderBy("createdAt", "asc")
      );

      return onSnapshot(
        q,
        (snap) => {
          const list: Comment[] = snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              text: data.text,
              userId: data.userId,
              userName: data.userName,
              createdAt: data.createdAt,
            };
          });
          setCommentsByActivity((prev) => ({ ...prev, [id]: list }));
        },
        (err) => {
          console.log("Erreur commentaires :", err);
        }
      );
    });

    return () => {
      unsubscribers.forEach((u) => u && u());
    };
  }, [JSON.stringify(activities.map((a) => a.id))]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  // participation
  const toggleParticipation = async (activity: Activity) => {
    if (!user) return;
    const ref = doc(db, "activities", activity.id);
    const isParticipant = activity.participants.includes(user.uid);

    try {
      await updateDoc(ref, {
        participants: isParticipant
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid),
      });
    } catch (e) {
      console.log("Erreur participation :", e);
    }
  };

  // envoi commentaire
  const handleSendComment = async (activityId: string) => {
    const txt = draftComments[activityId]?.trim();
    if (!txt || !user) return;

    try {
      // recuperer le displayname depuis firestore si disponible
      let userName = user.displayName || "";
      
      if (!userName) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            userName = userDoc.data().displayName || "";
          }
        } catch (e) {
          console.log("Erreur récupération displayName:", e);
        }
      }
      
      // fallback sur email uniquement en dernier recours
      if (!userName) {
        userName = user.email?.split("@")[0] || "Utilisateur";
      }

      await addDoc(collection(db, "activities", activityId, "comments"), {
        text: txt,
        userId: user.uid,
        userName,
        createdAt: Timestamp.now(),
      });

      setDraftComments((prev) => ({ ...prev, [activityId]: "" }));
    } catch (e) {
      console.log("Erreur ajout commentaire :", e);
    }
  };
  // suppression commentaire
  const handleDeleteComment = async (activityId: string, commentId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "activities", activityId, "comments", commentId));
    } catch (e) {
      console.log("Erreur suppression commentaire :", e);
    }
  };
  // separation a venir terminees
  const { upcomingActivities, pastActivities } = useMemo(() => {
    const now = Date.now();

    const upcoming = activities.filter(
      (a) => a.date.toDate().getTime() >= now
    );
    const past = activities.filter((a) => a.date.toDate().getTime() < now);

    past.sort(
      (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
    );

    return { upcomingActivities: upcoming, pastActivities: past };
  }, [activities]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={s.pageTitle}>Activités</Text>

      {loading ? (
        <>
          <SkeletonActivityCard />
          <SkeletonActivityCard />
          <SkeletonActivityCard />
        </>
      ) : (
        <>
          {/*a venir */}
          <Text style={s.sectionTitle}>Activités à venir</Text>
      {upcomingActivities.length === 0 ? (
        <Text style={s.emptyText}>
          Aucune activité à venir pour le moment.
        </Text>
      ) : (
        upcomingActivities.map((act, index) => {
          const isParticipant =
            !!user && act.participants.includes(user.uid);
          const comments = commentsByActivity[act.id] ?? [];
          const draft = draftComments[act.id] ?? "";

          return (
            <AnimatedCard key={act.id} delay={index * 100}>
              <ActivityCard
              activity={act}
              isParticipant={isParticipant}
              onToggleParticipation={() => toggleParticipation(act)}
              comments={comments}
              draftComment={draft}
              onChangeDraft={(text) =>
                setDraftComments((prev) => ({
                  ...prev,
                  [act.id]: text,
                }))
              }
              onSendComment={() => handleSendComment(act.id)}
              onCardPress={() => router.push(`/(main)/activity-details?id=${act.id}` as any)}
              onDeleteComment={(commentId) => handleDeleteComment(act.id, commentId)}
            />
            </AnimatedCard>
          );
        })
      )}

          {/*terminee */}
      <Text style={s.sectionTitle}>Activités terminées</Text>
      {pastActivities.length === 0 ? (
        <Text style={s.emptyText}>Pas encore d’activité passée.</Text>
      ) : (
        pastActivities.map((act, index) => {
          const isParticipant =
            !!user && act.participants.includes(user.uid);
          const comments = commentsByActivity[act.id] ?? [];
          const draft = draftComments[act.id] ?? "";

          return (
            <AnimatedCard key={act.id} delay={index * 100}>
              <ActivityCard
              activity={act}
              isParticipant={isParticipant}
              onToggleParticipation={() => toggleParticipation(act)}
              comments={comments}
              draftComment={draft}
              onChangeDraft={(text) =>
                setDraftComments((prev) => ({
                  ...prev,
                  [act.id]: text,
                }))
              }
              onSendComment={() => handleSendComment(act.id)}
              onCardPress={() => router.push(`/(main)/activity-details?id=${act.id}` as any)}
              onDeleteComment={(commentId) => handleDeleteComment(act.id, commentId)}
            />
            </AnimatedCard>
          );
        })
      )}
        </>
      )}
    </ScrollView>
  );
}


const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emptyText: {
    color: colors.muted,
    marginBottom: 12,
  },

  // card
  card: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: colors.text,
    fontWeight: "700",
  },
  creatorName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  cardBody: {
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 22,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
  participantsText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  participateBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  participateBtnActive: {
    backgroundColor: "#16a34a",
  },
  participateBtnPast: {
    backgroundColor: "#4b5563",
  },
  participateText: {
    color: "#0b111f",
    fontWeight: "700",
  },
  participateTextPast: {
    color: "#fecaca",
  },
  commentLabelWrapper: {
    paddingHorizontal: 8,
  },
  commentLabel: {
    color: colors.muted,
    fontSize: 14,
  },

  commentsBlock: {
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 16,
    marginTop: 8,
  },
  commentLineContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
    padding: 12,
    backgroundColor: "#0f172a",
    borderRadius: 12,
  },
  commentLine: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 2,
  },
  commentAuthor: {
    fontWeight: "700",
  },
  youBadgeInline: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 11,
  },
  commentTimestamp: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  deleteCommentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteCommentText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  moreComments: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    color: colors.text,
    fontSize: 14,
  },
  sendBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: {
    color: "#0b111f",
    fontWeight: "800",
  },
});
