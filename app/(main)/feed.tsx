// app/(main)/feed.tsx
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
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { colors } from "../../constants/color";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

//post general

type ActivityCardProps = {
  activity: Activity;
  isParticipant: boolean;
  onToggleParticipation: () => void;
  comments: Comment[];
  draftComment: string;
  onChangeDraft: (text: string) => void;
  onSendComment: () => void;
};

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  isParticipant,
  onToggleParticipation,
  comments,
  draftComment,
  onChangeDraft,
  onSendComment,
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
          <Text style={s.description}>{activity.description}</Text>
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
        {previewComments.map((c) => (
          <Text key={c.id} style={s.commentLine}>
            <Text style={s.commentAuthor}>{c.userName || "Anon"} </Text>
            {c.text}
          </Text>
        ))}

        {moreCount > 0 && (
          <Text style={s.moreComments}>
            Voir {moreCount} autre(s) commentaire(s)…
          </Text>
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

//ecran feed

export default function FeedScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsByActivity, setCommentsByActivity] = useState<
    Record<string, Comment[]>
  >({});
  const [draftComments, setDraftComments] = useState<Record<string, string>>(
    {}
  );

  const user = auth.currentUser;

  //recup des activités triee
  useEffect(() => {
  const q = query(
    collection(db, "activities"),
    orderBy("date", "asc")   // ⬅ seulement ça
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
    },
    (err) => {
      console.log("Erreur chargement activités :", err);
    }
  );

  return () => unsub();
}, []);


  //abonnements commentaires
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

  //participation
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

  //envoi d’un commentaire
  const handleSendComment = async (activityId: string) => {
    const txt = draftComments[activityId]?.trim();
    if (!txt || !user) return;

    try {
      await addDoc(collection(db, "activities", activityId, "comments"), {
        text: txt,
        userId: user.uid,
        userName: user.displayName || user.email || "Profil",
        createdAt: Timestamp.now(),
      });

      setDraftComments((prev) => ({ ...prev, [activityId]: "" }));
    } catch (e) {
      console.log("Erreur ajout commentaire :", e);
    }
  };

  //separation a venir / terminées
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

      {/*a venir */}
      <Text style={s.sectionTitle}>Activités à venir</Text>
      {upcomingActivities.length === 0 ? (
        <Text style={s.emptyText}>
          Aucune activité à venir pour le moment.
        </Text>
      ) : (
        upcomingActivities.map((act) => {
          const isParticipant =
            !!user && act.participants.includes(user.uid);
          const comments = commentsByActivity[act.id] ?? [];
          const draft = draftComments[act.id] ?? "";

          return (
            <ActivityCard
              key={act.id}
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
            />
          );
        })
      )}

      {/*terminee */}
      <Text style={s.sectionTitle}>Activités terminées</Text>
      {pastActivities.length === 0 ? (
        <Text style={s.emptyText}>Pas encore d’activité passée.</Text>
      ) : (
        pastActivities.map((act) => {
          const isParticipant =
            !!user && act.participants.includes(user.uid);
          const comments = commentsByActivity[act.id] ?? [];
          const draft = draftComments[act.id] ?? "";

          return (
            <ActivityCard
              key={act.id}
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
            />
          );
        })
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
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.muted,
    marginBottom: 12,
  },

  // card
  card: {
    backgroundColor: "#020617",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: "#020617",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#111827",
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
  },
  participantsText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  participateBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 10,
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
    borderTopColor: "#111827",
    paddingTop: 8,
    marginTop: 4,
  },
  commentLine: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 2,
  },
  commentAuthor: {
    fontWeight: "700",
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
    marginTop: 4,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#020617",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#111827",
    color: colors.text,
    fontSize: 13,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: {
    color: "#0b111f",
    fontWeight: "800",
  },
});
