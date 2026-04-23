import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useState, useEffect } from "react";
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { UserAvatar } from "../../components/UserAvatar";
import { colors } from "../../constants/color";
import { auth, db } from "../../lib/firebase";
import { getUserDisplayName } from "../../lib/user";

// liste des catégories disponibles
const CATEGORIES = [
  { id: "all", label: "Tout", icon: "apps" },
  { id: "bar", label: "Bar", icon: "beer" },
  { id: "sport", label: "Sport", icon: "football" },
  { id: "revision", label: "Révision", icon: "book" },
  { id: "culture", label: "Culture", icon: "color-palette" },
  { id: "soiree", label: "Soirée", icon: "musical-notes" },
  { id: "autre", label: "Autre", icon: "ellipsis-horizontal" },
];

// raisons disponibles pour signaler une activité
const RAISONS_SIGNALEMENT = ["Contenu inapproprié", "Spam", "Arnaque", "Autre"];

// nombre d'activités chargées par page
const NB_PAR_PAGE = 10;

// ---- Carte d'une activité ----
function ActivityCard({ activity, isParticipant, onToggleParticipation, comments, draftComment, onChangeDraft, onSendComment, onCardPress, onDeleteComment, onReport }: any) {
  const [showModalSignalement, setShowModalSignalement] = useState(false);

  const date = activity.date.toDate();
  const estTerminee = date.getTime() < Date.now();
  const dateFormatee = format(date, "EEE dd MMM. 'à' HH:mm", { locale: fr });
  const nomCreateur = activity.creatorName || "Utilisateur";

  // trouver la catégorie pour afficher l'icone et le label
  const categorieInfo = CATEGORIES.find((c) => c.id === activity.category);
  const categorieLabel = categorieInfo?.label || "Autre";
  const categorieIcone = (categorieInfo?.icon || "ellipsis-horizontal") as any;

  // on affiche seulement les 3 derniers commentaires dans le feed
  const commentairesAffiches = comments.slice(0, 3);
  const nbCommentairesRestants = comments.length - commentairesAffiches.length;

  return (
    <View style={styles.card}>

      {/* en-tête : avatar + nom + catégorie */}
      <TouchableOpacity onPress={onCardPress} activeOpacity={0.9}>
        <View style={styles.cardEnTete}>
          <UserAvatar userId={activity.ownerId} size={40} userName={nomCreateur} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nomCreateur}>{nomCreateur}</Text>
          </View>
          {activity.category && (
            <View style={styles.badgeCategorie}>
              <Ionicons name={categorieIcone} size={12} color={colors.primary} />
              <Text style={styles.badgeCategorieTexte}>{categorieLabel}</Text>
            </View>
          )}
        </View>

        {/* corps : titre, description, date, lieu, participants */}
        <View style={styles.cardCorps}>
          <Text style={styles.titre}>{activity.title}</Text>
          {activity.description ? (
            <Text style={styles.description} numberOfLines={2}>{activity.description}</Text>
          ) : null}
          <View style={styles.ligneInfos}>
            <View style={styles.puce}><Text style={styles.puceTexte}>{dateFormatee}</Text></View>
            {activity.place ? (
              <View style={styles.puce}><Text style={styles.puceTexte}>{activity.place}</Text></View>
            ) : null}
          </View>
          <Text style={styles.nbParticipants}>{activity.participants.length} participant(s)</Text>
        </View>
      </TouchableOpacity>

      {/* boutons d'action : participer, commenter, signaler */}
      <View style={styles.ligneActions}>
        <TouchableOpacity
          style={[
            styles.boutonParticiper,
            estTerminee && styles.boutonParticiperTerminee,
            isParticipant && !estTerminee && styles.boutonParticiperActif,
          ]}
          disabled={estTerminee}
          onPress={onToggleParticipation}
        >
          <Text style={[styles.texteParticiper, estTerminee && styles.texteParticiperTerminee]}>
            {estTerminee ? "Terminée" : isParticipant ? "Tu participes" : "Participer"}
          </Text>
        </TouchableOpacity>

        <View style={styles.wrapperCommenter}>
          <Text style={styles.texteCommenter}>Commenter</Text>
        </View>

        <TouchableOpacity style={styles.boutonSignaler} onPress={() => setShowModalSignalement(true)}>
          <Ionicons name="flag-outline" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* liste des commentaires (max 3) */}
      <View style={styles.blocCommentaires}>
        {commentairesAffiches.map((c: any) => {
          const estMonCommentaire = auth.currentUser && c.userId === auth.currentUser.uid;
          return (
            <View key={c.id} style={styles.ligneCommentaire}>
              <UserAvatar userId={c.userId} size={28} userName={c.userName} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.texteCommentaire}>
                  <Text style={styles.auteurCommentaire}>
                    {c.userName || "Anon"}
                    {estMonCommentaire && <Text style={styles.badgeMoi}> (Vous)</Text>}
                  </Text>
                  {" "}{c.text}
                </Text>
                {c.createdAt && (
                  <Text style={styles.dateCommentaire}>
                    {format(c.createdAt.toDate(), "dd MMM à HH:mm", { locale: fr })}
                  </Text>
                )}
              </View>
              {estMonCommentaire && (
                <TouchableOpacity style={styles.boutonSupprimerComm} onPress={() => onDeleteComment(c.id)}>
                  <Text style={styles.texteSupprimerComm}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* lien pour voir les commentaires suivants */}
        {nbCommentairesRestants > 0 && (
          <TouchableOpacity onPress={onCardPress}>
            <Text style={styles.voirPlusCommentaires}>
              Voir {nbCommentairesRestants} autre(s) commentaire(s)…
            </Text>
          </TouchableOpacity>
        )}

        {/* champ pour écrire un commentaire */}
        <View style={styles.ligneEcrireCommentaire}>
          <TextInput
            style={styles.champCommentaire}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor={colors.muted}
            value={draftComment}
            onChangeText={onChangeDraft}
          />
          <TouchableOpacity style={styles.boutonEnvoyer} onPress={onSendComment}>
            <Text style={styles.boutonEnvoyerTexte}>{">"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* modal de signalement */}
      <Modal
        visible={showModalSignalement}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModalSignalement(false)}
      >
        <View style={styles.modalFond}>
          <View style={styles.modalContenu}>
            <Text style={styles.modalTitre}>Signaler cette activité</Text>
            <Text style={styles.modalSousTitre}>Sélectionner une raison</Text>

            {RAISONS_SIGNALEMENT.map((raison) => (
              <TouchableOpacity
                key={raison}
                style={styles.modalOption}
                onPress={() => {
                  onReport(activity.id, raison);
                  setShowModalSignalement(false);
                }}
              >
                <Text style={styles.modalOptionTexte}>{raison}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalAnnuler} onPress={() => setShowModalSignalement(false)}>
              <Text style={styles.modalAnnulerTexte}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---- Écran principal du feed ----
export default function FeedScreen() {
  // liste des activités chargées
  const [activities, setActivities] = useState<any[]>([]);

  // états de chargement
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // commentaires et brouillons par activité
  const [commentsByActivity, setCommentsByActivity] = useState<any>({});
  const [draftComments, setDraftComments] = useState<any>({});

  // filtres et recherche
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const user = auth.currentUser;

  // charger les activités depuis Firebase
  const loadActivities = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // construire la requête avec ou sans filtre catégorie
      const conditions: any[] = [];
      if (selectedCategory !== "all") {
        conditions.push(where("category", "==", selectedCategory));
      }
      conditions.push(orderBy("date", "asc"));
      conditions.push(limit(NB_PAR_PAGE));

      let q = query(collection(db, "activities"), ...conditions);

      // si on charge la suite, on commence après le dernier doc
      if (loadMore && lastDoc) {
        q = query(
          collection(db, "activities"),
          ...conditions.slice(0, -1),
          startAfter(lastDoc),
          limit(NB_PAR_PAGE)
        );
      }

      const resultat = await getDocs(q);

      if (resultat.empty) {
        setHasMore(false);
        setLoadingMore(false);
        setLoading(false);
        return;
      }

      // transformer les docs Firebase en objets JS simples
      let liste = resultat.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description || "",
          place: data.place || "",
          date: data.date,
          ownerId: data.ownerId,
          creatorName: data.creatorName || data.ownerDisplayName || "Utilisateur",
          participants: data.participants || [],
          category: data.category || "autre",
        };
      });

      // filtrer par recherche texte (côté client)
      if (searchText.trim() !== "") {
        const recherche = searchText.toLowerCase();
        liste = liste.filter((a) =>
          a.title.toLowerCase().includes(recherche) ||
          a.description.toLowerCase().includes(recherche) ||
          a.place.toLowerCase().includes(recherche)
        );
      }

      // ajouter à la liste ou remplacer selon si on charge la suite
      if (loadMore) {
        setActivities((prev) => [...prev, ...liste]);
      } else {
        setActivities(liste);
      }

      setLastDoc(resultat.docs[resultat.docs.length - 1]);
      setHasMore(resultat.docs.length === NB_PAR_PAGE);
    } catch (err) {
      console.log("Erreur chargement activités :", err);
    }

    setLoadingMore(false);
    setLoading(false);
  };

  // recharger quand la catégorie ou la recherche change
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    loadActivities();
  }, [selectedCategory, searchText]);

  // charger les 3 derniers commentaires de chaque activité
  useEffect(() => {
    if (activities.length === 0) return;

    const chargerCommentaires = async () => {
      const resultat: any = {};

      for (const activite of activities) {
        const q = query(
          collection(db, "activities", activite.id, "comments"),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const snap = await getDocs(q);
        const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
        resultat[activite.id] = liste;
      }

      setCommentsByActivity(resultat);
    };

    chargerCommentaires().catch((err) => console.log("Erreur commentaires :", err));
  }, [activities.map((a) => a.id).join(",")]);

  // rafraîchir la liste (pull to refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    setLastDoc(null);
    setHasMore(true);
    await loadActivities(false);
    setRefreshing(false);
  };

  // rejoindre ou quitter une activité
  const toggleParticipation = async (activity: any) => {
    if (!user) return;
    const dejaDedans = activity.participants.includes(user.uid);
    try {
      await updateDoc(doc(db, "activities", activity.id), {
        participants: dejaDedans ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (e) {
      console.log("Erreur participation :", e);
    }
  };

  // envoyer un commentaire
  const envoyerCommentaire = async (activityId: string) => {
    const texte = draftComments[activityId]?.trim();
    if (!texte || !user) return;

    try {
      const userName = await getUserDisplayName();
      await addDoc(collection(db, "activities", activityId, "comments"), {
        text: texte,
        userId: user.uid,
        userName,
        createdAt: Timestamp.now(),
      });
      // vider le champ après envoi
      setDraftComments((prev: any) => ({ ...prev, [activityId]: "" }));
    } catch (e) {
      console.log("Erreur ajout commentaire :", e);
    }
  };

  // supprimer un commentaire
  const supprimerCommentaire = async (activityId: string, commentId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "activities", activityId, "comments", commentId));
    } catch (e) {
      console.log("Erreur suppression commentaire :", e);
    }
  };

  // signaler une activité
  const signalerActivite = async (activityId: string, raison: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "reports"), {
        activityId,
        reason: raison,
        reportedBy: user.uid,
        reportedAt: Timestamp.now(),
      });
      alert("Merci d'avoir signalé ce contenu");
    } catch (e) {
      console.log("Erreur signalement :", e);
      alert("Erreur lors du signalement");
    }
  };

  // séparer les activités à venir et les terminées
  const maintenant = Date.now();
  const activitesAVenir = activities.filter((a) => a.date.toDate().getTime() >= maintenant);
  const activitesTerminees = activities
    .filter((a) => a.date.toDate().getTime() < maintenant)
    .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());

  return (
    <ScrollView
      style={styles.ecran}
      contentContainerStyle={styles.contenu}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={styles.titrePage}>Activités</Text>

      {/* barre de recherche */}
      <View style={styles.ligneRecherche}>
        <View style={styles.barreRecherche}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.champRecherche}
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
        <TouchableOpacity style={styles.boutonFiltres} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* filtres par catégorie */}
      {showFilters && (
        <View style={styles.zoneFiltres}>
          <Text style={styles.labelFiltres}>Catégories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chipCategorie, selectedCategory === cat.id && styles.chipCategorieActif]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={16}
                  color={selectedCategory === cat.id ? "#0b111f" : colors.text}
                />
                <Text style={[styles.chipCategorieTexte, selectedCategory === cat.id && styles.chipCategorieTexteActif]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* affichage pendant le chargement */}
      {loading ? (
        <View style={styles.blocChargement}>
          <Text style={styles.texteChargement}>Chargement des activités...</Text>
        </View>
      ) : (
        <>
          {/* activités à venir */}
          <Text style={styles.titreSecteur}>Activités à venir</Text>
          {activitesAVenir.length === 0 ? (
            <View style={styles.blocVide}>
              <Text style={styles.titreVide}>Aucune activité à venir</Text>
              <Text style={styles.descriptionVide}>Crée une nouvelle activité pour commencer</Text>
            </View>
          ) : (
            activitesAVenir.map((activite) => (
              <ActivityCard
                key={activite.id}
                activity={activite}
                isParticipant={!!user && activite.participants.includes(user.uid)}
                onToggleParticipation={() => toggleParticipation(activite)}
                comments={commentsByActivity[activite.id] || []}
                draftComment={draftComments[activite.id] || ""}
                onChangeDraft={(texte: string) =>
                  setDraftComments((prev: any) => ({ ...prev, [activite.id]: texte }))
                }
                onSendComment={() => envoyerCommentaire(activite.id)}
                onCardPress={() => router.push(`/(main)/activity-details?id=${activite.id}` as any)}
                onDeleteComment={(commentId: string) => supprimerCommentaire(activite.id, commentId)}
                onReport={signalerActivite}
              />
            ))
          )}

          {/* activités terminées */}
          <Text style={styles.titreSecteur}>Activités terminées</Text>
          {activitesTerminees.length === 0 ? (
            <View style={styles.blocVide}>
              <Text style={styles.titreVide}>Aucune activité terminée</Text>
              <Text style={styles.descriptionVide}>Les activités passées apparaîtront ici</Text>
            </View>
          ) : (
            activitesTerminees.map((activite) => (
              <ActivityCard
                key={activite.id}
                activity={activite}
                isParticipant={!!user && activite.participants.includes(user.uid)}
                onToggleParticipation={() => toggleParticipation(activite)}
                comments={commentsByActivity[activite.id] || []}
                draftComment={draftComments[activite.id] || ""}
                onChangeDraft={(texte: string) =>
                  setDraftComments((prev: any) => ({ ...prev, [activite.id]: texte }))
                }
                onSendComment={() => envoyerCommentaire(activite.id)}
                onCardPress={() => router.push(`/(main)/activity-details?id=${activite.id}` as any)}
                onDeleteComment={(commentId: string) => supprimerCommentaire(activite.id, commentId)}
                onReport={signalerActivite}
              />
            ))
          )}
        </>
      )}

      {/* bouton charger plus */}
      {!loading && hasMore && (
        <TouchableOpacity
          style={styles.boutonChargerPlus}
          onPress={() => loadActivities(true)}
          disabled={loadingMore}
        >
          <Text style={styles.boutonChargerPlusTexte}>
            {loadingMore ? "Chargement..." : "Charger plus d'activités"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contenu: {
    padding: 20,
    paddingBottom: 60,
  },
  titrePage: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  titreSecteur: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // carte activité
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
  cardEnTete: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  nomCreateur: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  badgeCategorie: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  badgeCategorieTexte: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  cardCorps: {
    marginBottom: 16,
  },
  titre: {
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
  ligneInfos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  puce: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  puceTexte: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
  nbParticipants: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },

  // actions
  ligneActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  boutonParticiper: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  boutonParticiperActif: {
    backgroundColor: "#16a34a",
  },
  boutonParticiperTerminee: {
    backgroundColor: "#4b5563",
  },
  texteParticiper: {
    color: "#0b111f",
    fontWeight: "700",
  },
  texteParticiperTerminee: {
    color: "#fecaca",
  },
  wrapperCommenter: {
    paddingHorizontal: 8,
  },
  texteCommenter: {
    color: colors.muted,
    fontSize: 14,
  },
  boutonSignaler: {
    padding: 8,
    marginLeft: "auto",
  },

  // commentaires
  blocCommentaires: {
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 16,
    marginTop: 8,
  },
  ligneCommentaire: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
    padding: 12,
    backgroundColor: "#0f172a",
    borderRadius: 12,
  },
  texteCommentaire: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 2,
  },
  auteurCommentaire: {
    fontWeight: "700",
  },
  badgeMoi: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 11,
  },
  dateCommentaire: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  boutonSupprimerComm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  texteSupprimerComm: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  voirPlusCommentaires: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  ligneEcrireCommentaire: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  champCommentaire: {
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
  boutonEnvoyer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  boutonEnvoyerTexte: {
    color: "#0b111f",
    fontWeight: "800",
  },

  // modal signalement
  modalFond: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContenu: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  modalTitre: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  modalSousTitre: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
  },
  modalOption: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  modalOptionTexte: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  modalAnnuler: {
    paddingVertical: 12,
    marginTop: 8,
  },
  modalAnnulerTexte: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // recherche et filtres
  ligneRecherche: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  barreRecherche: {
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
  champRecherche: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  boutonFiltres: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  zoneFiltres: {
    marginBottom: 20,
  },
  labelFiltres: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  chipCategorie: {
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
  chipCategorieActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipCategorieTexte: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  chipCategorieTexteActif: {
    color: "#0b111f",
  },

  // chargement et états vides
  blocChargement: {
    paddingVertical: 40,
    alignItems: "center",
  },
  texteChargement: {
    color: colors.muted,
    fontSize: 16,
  },
  blocVide: {
    paddingVertical: 30,
    alignItems: "center",
  },
  titreVide: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  descriptionVide: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },

  // bouton charger plus
  boutonChargerPlus: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  boutonChargerPlusTexte: {
    color: "#0b111f",
    fontWeight: "700",
    fontSize: 15,
  },
});
