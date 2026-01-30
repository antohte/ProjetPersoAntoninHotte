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
  getDocs,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  where,
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
import { UserAvatar } from "../../components/UserAvatar";
import { EmptyState } from "../../components/ui/empty-state";

type Activity = {
  id: string;
  title: string;
  description: string;
  place: string;
  date: Timestamp;
  ownerId: string;
  creatorName?: string;
  participants: string[];
  category?: string;
};

const CATEGORIES = [
  { id: "all", label: "Tout", icon: "apps" },
  { id: "bar", label: "Bar", icon: "beer" },
  { id: "sport", label: "Sport", icon: "football" },
  { id: "revision", label: "Révision", icon: "book" },
  { id: "culture", label: "Culture", icon: "color-palette" },
  { id: "soiree", label: "Soirée", icon: "musical-notes" },
  { id: "autre", label: "Autre", icon: "ellipsis-horizontal" },
] as const;

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
  
  const categoryData = CATEGORIES.find(c => c.id === activity.category);
  const categoryLabel = categoryData?.label || "Autre";
  const categoryIcon = categoryData?.icon || "ellipsis-horizontal";

  return (
    <View style={s.card}>
      {/*style story/post insta */}
      <TouchableOpacity onPress={onCardPress} activeOpacity={0.9}>
        <View style={s.cardHeader}>
          <UserAvatar userId={activity.ownerId} size={40} userName={displayName} />
          <View style={{ flex: 1 }}>
            <Text style={s.creatorName}>{displayName}</Text>
          </View>
          {activity.category && (
            <View style={s.categoryBadge}>
              <Ionicons name={categoryIcon as any} size={12} color={colors.primary} />
              <Text style={s.categoryBadgeText}>{categoryLabel}</Text>
            </View>
          )}
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
              <UserAvatar userId={c.userId} size={28} userName={c.userName} />
              <View style={{ flex: 1, marginLeft: 8 }}>
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

const ACTIVITIES_PER_PAGE = 10;

export default function FeedScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [commentsByActivity, setCommentsByActivity] = useState<
    Record<string, Comment[]>
  >({});
  const [draftComments, setDraftComments] = useState<Record<string, string>>(
    {}
  );
  
  // Filtres
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const user = auth.currentUser;

  // charger les activites initial ou plus
  const loadActivities = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // construire la requete de base
      const constraints: any[] = [];
      
      // filtre par categorie
      if (selectedCategory !== "all") {
        constraints.push(where("category", "==", selectedCategory));
      }
      
      // toujours trier par date
      constraints.push(orderBy("date", "asc"));
      constraints.push(limit(ACTIVITIES_PER_PAGE));

      let q = query(collection(db, "activities"), ...constraints);

      // si chargement de plus, utiliser startAfter
      if (isLoadMore && lastDoc) {
        const constraintsWithPagination = [...constraints.slice(0, -1), startAfter(lastDoc), limit(ACTIVITIES_PER_PAGE)];
        q = query(collection(db, "activities"), ...constraintsWithPagination);
      }

      const snap = await getDocs(q);
      
      if (snap.empty) {
        setHasMore(false);
        if (isLoadMore) setLoadingMore(false);
        else setLoading(false);
        return;
      }

      let list: Activity[] = snap.docs.map((d) => {
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
          category: data.category ?? "autre",
        };
      });

      // Filtrer côté client pour la recherche textuelle
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(search) ||
            a.description.toLowerCase().includes(search) ||
            a.place.toLowerCase().includes(search)
        );
      }

      if (isLoadMore) {
        setActivities((prev) => [...prev, ...list]);
      } else {
        setActivities(list);
      }

      // mettre a jour le dernier doc
      setLastDoc(snap.docs[snap.docs.length - 1]);
      
      // verifier sil y a plus de docs
      setHasMore(snap.docs.length === ACTIVITIES_PER_PAGE);

      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    } catch (err) {
      console.log("Erreur chargement activités :", err);
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  };

  // chargement initial et rechargement quand les filtres changent
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    loadActivities();
  }, [selectedCategory, searchText]);


  // charger commentaires pour les activites chargees (3 derniers seulement)
  useEffect(() => {
    const ids = activities.map((a) => a.id);
    if (ids.length === 0) return;

    // utiliser getDocs au lieu de onSnapshot pour eviter les couts
    const loadComments = async () => {
      const commentPromises = ids.map(async (id) => {
        const q = query(
          collection(db, "activities", id, "comments"),
          orderBy("createdAt", "desc"),
          limit(3)
        );

        const snap = await getDocs(q);
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
        
        // inverser pour afficher du plus ancien au plus recent
        return { id, comments: list.reverse() };
      });

      const results = await Promise.all(commentPromises);
      const commentsMap: Record<string, Comment[]> = {};
      results.forEach(({ id, comments }) => {
        commentsMap[id] = comments;
      });
      setCommentsByActivity(commentsMap);
    };

    loadComments().catch((err) => {
      console.log("Erreur commentaires :", err);
    });
  }, [JSON.stringify(activities.map((a) => a.id))]);

  const onRefresh = async () => {
    setRefreshing(true);
    setLastDoc(null);
    setHasMore(true);
    await loadActivities(false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadActivities(true);
    }
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
      // recuperer le displayname depuis firestore si dispo
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
      
      // fallback sur email en dernier recours
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

      {/* barre de recherche */}
      <View style={s.searchContainer}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher une activité..."
            placeholderTextColor={colors.muted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={s.filterToggleBtn}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* filtres par categorie */}
      {showFilters && (
        <View style={s.filtersContainer}>
          <Text style={s.filterLabel}>Catégories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  s.categoryChip,
                  selectedCategory === cat.id && s.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons 
                  name={cat.icon as any} 
                  size={16} 
                  color={selectedCategory === cat.id ? "#0b111f" : colors.text} 
                />
                <Text
                  style={[
                    s.categoryChipText,
                    selectedCategory === cat.id && s.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <>
          <SkeletonActivityCard />
          <SkeletonActivityCard />
          <SkeletonActivityCard />
        </>
      ) : (
        <>
          {/* a venir */}
          <Text style={s.sectionTitle}>Activités à venir</Text>
      {upcomingActivities.length === 0 ? (
        <EmptyState 
          icon="calendar-outline" 
          title="Aucune activité à venir" 
          description="Crée une nouvelle activité pour commencer"
        />
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

          {/* terminees */}
      <Text style={s.sectionTitle}>Activités terminées</Text>
      {pastActivities.length === 0 ? (
        <EmptyState 
          icon="checkmark-circle-outline" 
          title="Aucune activité terminée" 
          description="Les activités passées apparaîtront ici"
        />
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

      {/* bouton charger plus */}
      {!loading && hasMore && (
        <TouchableOpacity
          style={s.loadMoreBtn}
          onPress={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <Text style={s.loadMoreText}>Chargement...</Text>
          ) : (
            <Text style={s.loadMoreText}>Charger plus d'activités</Text>
          )}
        </TouchableOpacity>
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
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  categoryBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
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
  loadMoreBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  loadMoreText: {
    color: "#0b111f",
    fontWeight: "700",
    fontSize: 15,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  filterToggleBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#0b111f",
  },
});
