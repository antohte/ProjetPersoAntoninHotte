// app main activity details
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
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
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { colors } from "../../constants/color";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

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

export default function ActivityDetailsScreen() {
  const params = useLocalSearchParams();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draftComment, setDraftComment] = useState("");
  const [loading, setLoading] = useState(true);
  
  // animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const user = auth.currentUser;

  // animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // recuperer activite
  useEffect(() => {
    if (!activityId) return;

    const docRef = doc(db, "activities", activityId);
    
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setActivity({
            id: docSnap.id,
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
          });
        }
        setLoading(false);
      },
      (err) => {
        console.log("Erreur chargement activité :", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activityId]);

  // recuperer commentaires
  useEffect(() => {
    if (!activityId) return;

    const q = query(
      collection(db, "activities", activityId, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
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
        setComments(list);
      },
      (err) => {
        console.log("Erreur commentaires :", err);
      }
    );

    return () => unsub();
  }, [activityId]);

  const toggleParticipation = async () => {
    if (!user || !activity) return;
    const ref = doc(db, "activities", activityId);
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

  const handleSendComment = async () => {
    const txt = draftComment.trim();
    if (!txt || !user) return;

    try {
      // recuperer displayname depuis firestore si disponible
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

      setDraftComment("");
    } catch (e) {
      console.log("Erreur ajout commentaire :", e);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "activities", activityId, "comments", commentId));
    } catch (e) {
      console.log("Erreur suppression commentaire :", e);
    }
  };

  const handleDeleteActivity = async () => {
    if (!user || !activity) return;

    Alert.alert(
      "Supprimer l'activité",
      "Es-tu sûr de vouloir supprimer cette activité ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "activities", activityId));
              Alert.alert("Activité supprimée");
              router.back();
            } catch (e) {
              console.log("Erreur suppression activité :", e);
              Alert.alert("Erreur", "Impossible de supprimer l'activité");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={s.errorContainer}>
        <Text style={s.errorText}>Activité introuvable</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const jsDate = activity.date.toDate();
  const isPast = jsDate.getTime() < Date.now();
  const dateLabel = format(jsDate, "EEEE dd MMMM yyyy 'à' HH:mm", {
    locale: fr,
  });
  const displayName = activity.creatorName || "Utilisateur";
  const initial = displayName.trim()[0]?.toUpperCase() ?? "U";
  const isParticipant = !!user && activity.participants.includes(user.uid);
  const isOwner = !!user && activity.ownerId === user.uid;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={s.headerBackText}>Retour</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Détails</Text>
        {isOwner && (
          <TouchableOpacity 
            style={s.headerDeleteBtn}
            onPress={handleDeleteActivity}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentContainer}>
        <Animated.View 
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* En-tête avec créateur */}
          <View style={s.creatorSection}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.creatorName}>{displayName}</Text>
              <Badge variant="default">Organisateur</Badge>
            </View>
          </View>

          {/* Titre et description */}
          <View style={s.mainSection}>
            <Text style={s.title}>{activity.title}</Text>
            {activity.description ? (
              <Text style={s.description}>{activity.description}</Text>
            ) : (
              <Text style={s.noDescription}>Aucune description</Text>
            )}
          </View>

          {/* Informations de l'activité */}
          <View style={s.infoSection}>
            <Text style={s.sectionTitle}>Informations</Text>
            
            <View style={s.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.infoLabel}>Date et heure</Text>
                <Text style={s.infoValue}>{dateLabel}</Text>
              </View>
            </View>

            {activity.place ? (
              <View style={s.infoRow}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.infoLabel}>Lieu</Text>
                  <Text style={s.infoValue}>{activity.place}</Text>
                </View>
              </View>
            ) : null}

            <View style={s.infoRow}>
              <Ionicons 
                name={isPast ? "checkmark-circle-outline" : "time-outline"} 
                size={20} 
                color={isPast ? "#16a34a" : colors.primary} 
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.infoLabel}>Statut</Text>
                <Text style={s.infoValue}>
                  {isPast ? "Activité terminée" : "À venir"}
                </Text>
              </View>
            </View>
          </View>

          {/* Liste des participants */}
          <View style={s.participantsSection}>
            <View style={s.sectionHeader}>
              <Ionicons name="people-outline" size={20} color={colors.text} />
              <Text style={s.sectionTitle}>
                Participants ({activity.participants.length})
              </Text>
            </View>
            {activity.participants.length === 0 ? (
              <Text style={s.noParticipants}>
                Aucun participant pour le moment
              </Text>
            ) : (
              <View style={s.participantsList}>
                {activity.participants.map((participantId, index) => (
                <View key={participantId} style={s.participantItem}>
                  <View style={s.participantAvatar}>
                    <Text style={s.participantAvatarText}>
                      {String.fromCharCode(65 + (index % 26))}
                    </Text>
                  </View>
                  <Text style={s.participantName}>
                    {participantId === user?.uid ? "Vous" : `Participant ${index + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

          {/* Bouton de participation */}
          <Button
            variant={isPast ? "ghost" : isParticipant ? "success" : "primary"}
            disabled={isPast}
            onPress={toggleParticipation}
          >
            {isPast
              ? "Activité terminée"
              : isParticipant
              ? "Je participe"
              : "Participer à cette activité"}
          </Button>

          {/* Section commentaires */}
          <View style={s.commentsSection}>
            <View style={s.sectionHeader}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
              <Text style={s.sectionTitle}>
                Commentaires ({comments.length})
              </Text>
            </View>

            {comments.length === 0 ? (
              <Text style={s.noComments}>
                Aucun commentaire. Soyez le premier à commenter !
              </Text>
            ) : (
              <View style={s.commentsList}>
                {comments.map((comment) => {
                const isOwnComment = user && comment.userId === user.uid;
                return (
                  <View key={comment.id} style={s.commentItem}>
                    <View style={s.commentContent}>
                      <View style={s.commentHeader}>
                        <View style={s.commentAuthorBlock}>
                          <Text style={s.commentAuthor}>
                            {comment.userName || "Anonyme"}
                          </Text>
                          {isOwnComment && (
                            <Badge variant="primary">Vous</Badge>
                          )}
                          {comment.createdAt && (
                            <Text style={s.commentDate}>
                              · {format(comment.createdAt.toDate(), "dd MMM à HH:mm", { locale: fr })}
                            </Text>
                          )}
                        </View>
                        {isOwnComment && (
                          <TouchableOpacity
                            style={s.deleteBtn}
                            onPress={() => handleDeleteComment(comment.id)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={s.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Input pour ajouter un commentaire */}
          <View style={s.commentInputSection}>
            <TextInput
              style={s.commentInput}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor={colors.muted}
              value={draftComment}
              onChangeText={setDraftComment}
              multiline
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                !draftComment.trim() && s.sendBtnDisabled,
              ]}
              onPress={handleSendComment}
              disabled={!draftComment.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={!draftComment.trim() ? colors.muted : "#0b111f"} 
              />
            </TouchableOpacity>
          </View>
        </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: 20,
  },
  errorText: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backBtnText: {
    color: "#0b111f",
    fontWeight: "700",
  },
  header: {
    backgroundColor: "#020617",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackBtn: {
    marginBottom: 8,
  },
  headerBackText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerDeleteBtn: {
    padding: 8,
  },
  headerDeleteText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  creatorSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 20,
  },
  creatorName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  creatorLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  mainSection: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 16,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  description: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  noDescription: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: "italic",
  },
  infoSection: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  participantsSection: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  noParticipants: {
    color: colors.muted,
    fontSize: 15,
    fontStyle: "italic",
  },
  participantsList: {
    gap: 12,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#0f172a",
    borderRadius: 14,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  participantAvatarText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  participantName: {
    color: colors.text,
    fontSize: 14,
  },
  participateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 18,
    marginBottom: 20,
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
    fontSize: 16,
  },
  participateTextPast: {
    color: "#fecaca",
  },
  commentsSection: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
  },
  noComments: {
    color: colors.muted,
    fontSize: 15,
    fontStyle: "italic",
    marginBottom: 20,
  },
  commentsList: {
    gap: 16,
    marginBottom: 20,
  },
  commentItem: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  commentAuthorBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  commentAuthor: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  commentDate: {
    color: colors.muted,
    fontSize: 12,
  },
  commentText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "600",
  },
  commentInputSection: {
    gap: 12,
  },
  commentInput: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    color: colors.text,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  sendBtnDisabled: {
    backgroundColor: "#4b5563",
    opacity: 0.5,
  },
  sendBtnText: {
    color: "#0b111f",
    fontWeight: "700",
    fontSize: 15,
  },
});
