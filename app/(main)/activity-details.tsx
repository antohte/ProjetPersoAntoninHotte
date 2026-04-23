import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLocalSearchParams, router } from "expo-router";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useState, useEffect } from "react";
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
import { UserAvatar } from "../../components/UserAvatar";
import { colors } from "../../constants/color";
import { auth, db } from "../../lib/firebase";
import { getUserDisplayName } from "../../lib/user";

// combien de commentaires on charge par page
const NB_COMMENTAIRES_PAR_PAGE = 10;

export default function ActivityDetailsScreen() {
  // on récupère l'id de l'activité depuis l'URL (on cast en string car useLocalSearchParams peut retourner string[])
  const params = useLocalSearchParams();
  const activityId = params.id as string;

  // toutes les infos de l'activité (null = pas encore chargé)
  const [activity, setActivity] = useState<any>(null);

  // liste des commentaires
  const [comments, setComments] = useState<any[]>([]);

  // texte en cours d'écriture dans le champ commentaire
  const [draftComment, setDraftComment] = useState("");

  // états de chargement
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // pagination des commentaires
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [lastCommentDoc, setLastCommentDoc] = useState<any>(null);

  const user = auth.currentUser;

  // charger l'activité depuis Firebase quand la page s'ouvre
  useEffect(() => {
    if (!activityId) return;

    getDoc(doc(db, "activities", activityId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setActivity({
            id: snap.id,
            title: data.title,
            description: data.description || "",
            place: data.place || "",
            date: data.date,
            ownerId: data.ownerId,
            creatorName: data.creatorName || data.ownerDisplayName || "Utilisateur",
            participants: data.participants || [],
            category: data.category,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activityId]);

  // charger les commentaires depuis Firebase
  const chargerCommentaires = async (chargerSuite = false) => {
    if (!activityId) return;

    if (chargerSuite) setLoadingComments(true);

    try {
      // requête de base : commentaires du plus ancien au plus récent
      let q = query(
        collection(db, "activities", activityId, "comments"),
        orderBy("createdAt", "asc"),
        limit(NB_COMMENTAIRES_PAR_PAGE)
      );

      // si on veut la page suivante, on commence après le dernier qu'on a
      if (chargerSuite && lastCommentDoc) {
        q = query(
          collection(db, "activities", activityId, "comments"),
          orderBy("createdAt", "asc"),
          startAfter(lastCommentDoc),
          limit(NB_COMMENTAIRES_PAR_PAGE)
        );
      }

      const snap = await getDocs(q);

      if (snap.empty) {
        setHasMoreComments(false);
        setLoadingComments(false);
        return;
      }

      // transformer les docs en objets simples
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ajouter à la liste ou remplacer selon si c'est la suite ou le début
      if (chargerSuite) {
        setComments((prev) => [...prev, ...liste]);
      } else {
        setComments(liste);
      }

      setLastCommentDoc(snap.docs[snap.docs.length - 1]);
      setHasMoreComments(snap.docs.length === NB_COMMENTAIRES_PAR_PAGE);
    } catch (err) {
      console.log("Erreur chargement commentaires :", err);
    }

    setLoadingComments(false);
  };

  // charger les commentaires quand la page s'ouvre
  useEffect(() => {
    if (activityId) chargerCommentaires();
  }, [activityId]);

  // rejoindre ou quitter l'activité
  const toggleParticipation = async () => {
    if (!user || !activity) return;

    const dejaDedans = activity.participants.includes(user.uid);

    try {
      await updateDoc(doc(db, "activities", activityId), {
        participants: dejaDedans ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      // mettre à jour l'état local aussi pour que l'écran se rafraîchisse
      if (dejaDedans) {
        setActivity({ ...activity, participants: activity.participants.filter((id: string) => id !== user.uid) });
      } else {
        setActivity({ ...activity, participants: [...activity.participants, user.uid] });
      }
    } catch (e) {
      console.log("Erreur participation :", e);
    }
  };

  // envoyer un commentaire
  const envoyerCommentaire = async () => {
    const texte = draftComment.trim();
    if (!texte || !user) return;

    setSendingComment(true);
    try {
      const userName = await getUserDisplayName();

      await addDoc(collection(db, "activities", activityId, "comments"), {
        text: texte,
        userId: user.uid,
        userName,
        createdAt: Timestamp.now(),
      });

      // vider le champ et recharger les commentaires
      setDraftComment("");
      setLastCommentDoc(null);
      setHasMoreComments(true);
      await chargerCommentaires(false);
    } catch (e) {
      console.log("Erreur envoi commentaire :", e);
      alert("Erreur lors de l'envoi du commentaire");
    }

    setSendingComment(false);
  };

  // supprimer un commentaire
  const supprimerCommentaire = async (commentId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "activities", activityId, "comments", commentId));
      // retirer le commentaire de la liste locale
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.log("Erreur suppression commentaire :", e);
    }
  };

  // supprimer l'activité (seulement si on en est le créateur)
  const supprimerActivite = async () => {
    if (!user || !activity) return;

    Alert.alert(
      "Supprimer l'activité",
      "Es-tu sûr ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "activities", activityId));
              alert("Activité supprimée !");
              router.back();
            } catch (e) {
              console.log("Erreur suppression activité :", e);
              alert("Impossible de supprimer l'activité");
            }
          },
        },
      ]
    );
  };

  // --- affichage pendant le chargement ---
  if (loading) {
    return (
      <View style={styles.centreEcran}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- activité introuvable ---
  if (!activity) {
    return (
      <View style={styles.centreEcran}>
        <Text style={styles.texteErreur}>Activité introuvable</Text>
        <TouchableOpacity style={styles.boutonRetour} onPress={() => router.back()}>
          <Text style={styles.boutonRetourTexte}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // préparer quelques infos utiles
  const dateJS = activity.date.toDate();
  const estTerminee = dateJS.getTime() < Date.now();
  const dateFormatee = format(dateJS, "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr });
  const isParticipant = !!user && activity.participants.includes(user.uid);
  const isCreateur = !!user && activity.ownerId === user.uid;

  return (
    <View style={styles.ecran}>

      {/* en-tête avec bouton retour et titre */}
      <View style={styles.entete}>
        <TouchableOpacity style={styles.boutonEnteteRetour} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.texteEnteteRetour}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.titreEntete}>Détails</Text>
        {isCreateur && (
          <TouchableOpacity style={styles.boutonSupprimerEntete} onPress={supprimerActivite}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContenu}>

        {/* qui a créé l'activité */}
        <View style={styles.bloc}>
          <UserAvatar userId={activity.ownerId} size={48} userName={activity.creatorName} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nomCreateur}>{activity.creatorName}</Text>
            <Text style={styles.badgeOrganisateur}>Organisateur</Text>
          </View>
        </View>

        {/* titre et description */}
        <View style={styles.bloc}>
          <Text style={styles.titre}>{activity.title}</Text>
          {activity.description ? (
            <Text style={styles.description}>{activity.description}</Text>
          ) : (
            <Text style={styles.pasDeDescription}>Aucune description</Text>
          )}
        </View>

        {/* date, lieu et statut */}
        <View style={styles.bloc}>
          <Text style={styles.titreSousPart}>Informations</Text>

          <View style={styles.ligneInfo}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.labelInfo}>Date et heure</Text>
              <Text style={styles.valeurInfo}>{dateFormatee}</Text>
            </View>
          </View>

          {activity.place ? (
            <View style={styles.ligneInfo}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.labelInfo}>Lieu</Text>
                <Text style={styles.valeurInfo}>{activity.place}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.ligneInfo}>
            <Ionicons
              name={estTerminee ? "checkmark-circle-outline" : "time-outline"}
              size={20}
              color={estTerminee ? "#16a34a" : colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.labelInfo}>Statut</Text>
              <Text style={styles.valeurInfo}>{estTerminee ? "Activité terminée" : "À venir"}</Text>
            </View>
          </View>
        </View>

        {/* liste des participants */}
        <View style={styles.bloc}>
          <Text style={styles.titreSousPart}>Participants ({activity.participants.length})</Text>

          {activity.participants.length === 0 ? (
            <Text style={styles.texteVide}>Aucun participant pour l'instant. Sois le premier !</Text>
          ) : (
            activity.participants.map((participantId: string, index: number) => (
              <View key={participantId} style={styles.ligneParticipant}>
                <View style={styles.avatarParticipant}>
                  <Text style={styles.avatarParticipantTexte}>
                    {String.fromCharCode(65 + (index % 26))}
                  </Text>
                </View>
                <Text style={styles.nomParticipant}>
                  {participantId === user?.uid ? "Vous" : `Participant ${index + 1}`}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* bouton participer / quitter */}
        {estTerminee ? (
          <View style={[styles.boutonParticiper, styles.boutonTerminee]}>
            <Text style={styles.texteParticiperTerminee}>Activité terminée</Text>
          </View>
        ) : isParticipant ? (
          <TouchableOpacity style={[styles.boutonParticiper, styles.boutonParticipeActif]} onPress={toggleParticipation}>
            <Text style={styles.texteParticiper}>Je participe — Quitter</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.boutonParticiper} onPress={toggleParticipation}>
            <Text style={styles.texteParticiper}>Participer à cette activité</Text>
          </TouchableOpacity>
        )}

        {/* section commentaires */}
        <View style={styles.bloc}>
          <Text style={styles.titreSousPart}>Commentaires ({comments.length})</Text>

          {comments.length === 0 ? (
            <Text style={styles.texteVide}>Aucun commentaire. Sois le premier à commenter !</Text>
          ) : (
            comments.map((commentaire) => {
              const estMonCommentaire = user && commentaire.userId === user.uid;
              return (
                <View key={commentaire.id} style={styles.blocCommentaire}>
                  <UserAvatar userId={commentaire.userId} size={32} userName={commentaire.userName || "Anonyme"} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.enteteCommentaire}>
                      <Text style={styles.auteurCommentaire}>
                        {commentaire.userName || "Anonyme"}
                        {estMonCommentaire ? <Text style={styles.badgeMoi}> (Vous)</Text> : null}
                      </Text>
                      {commentaire.createdAt && (
                        <Text style={styles.dateCommentaire}>
                          {format(commentaire.createdAt.toDate(), "dd MMM à HH:mm", { locale: fr })}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.texteCommentaire}>{commentaire.text}</Text>
                    {estMonCommentaire && (
                      <TouchableOpacity onPress={() => supprimerCommentaire(commentaire.id)}>
                        <Text style={styles.texteSupprimerComm}>Supprimer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* charger plus de commentaires */}
          {hasMoreComments && comments.length > 0 && (
            <TouchableOpacity
              style={styles.boutonChargerPlus}
              onPress={() => chargerCommentaires(true)}
              disabled={loadingComments}
            >
              <Text style={styles.boutonChargerPlusTexte}>
                {loadingComments ? "Chargement..." : "Charger plus de commentaires"}
              </Text>
            </TouchableOpacity>
          )}

          {/* champ pour écrire un commentaire */}
          <TextInput
            style={styles.champCommentaire}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor={colors.muted}
            value={draftComment}
            onChangeText={setDraftComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.boutonEnvoyer, (!draftComment.trim() || sendingComment) && styles.boutonEnvoyerDesactive]}
            onPress={envoyerCommentaire}
            disabled={!draftComment.trim() || sendingComment}
          >
            <Text style={styles.boutonEnvoyerTexte}>
              {sendingComment ? "Envoi..." : "Envoyer le commentaire"}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centreEcran: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: 20,
  },
  texteErreur: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 20,
  },
  boutonRetour: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  boutonRetourTexte: {
    color: "#0b111f",
    fontWeight: "700",
  },

  // en-tête
  entete: {
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
  boutonEnteteRetour: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  texteEnteteRetour: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  titreEntete: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  boutonSupprimerEntete: {
    padding: 8,
  },

  scroll: {
    flex: 1,
  },
  scrollContenu: {
    padding: 20,
    paddingBottom: 60,
  },

  // bloc générique (carte arrondie)
  bloc: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },

  // créateur
  nomCreateur: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  badgeOrganisateur: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  // titre et description de l'activité
  titre: {
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
  pasDeDescription: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: "italic",
  },

  // sous-titre de section
  titreSousPart: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // ligne d'info (date, lieu, statut)
  ligneInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
  },
  labelInfo: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valeurInfo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  // participants
  texteVide: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  ligneParticipant: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#0f172a",
    borderRadius: 14,
    marginBottom: 8,
  },
  avatarParticipant: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarParticipantTexte: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  nomParticipant: {
    color: colors.text,
    fontSize: 14,
  },

  // bouton participer
  boutonParticiper: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  boutonParticipeActif: {
    backgroundColor: "#16a34a",
  },
  boutonTerminee: {
    backgroundColor: "#4b5563",
  },
  texteParticiper: {
    color: "#0b111f",
    fontWeight: "700",
    fontSize: 16,
  },
  texteParticiperTerminee: {
    color: "#fecaca",
    fontWeight: "700",
    fontSize: 16,
  },

  // commentaires
  blocCommentaire: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  enteteCommentaire: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  auteurCommentaire: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  badgeMoi: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  dateCommentaire: {
    color: colors.muted,
    fontSize: 12,
  },
  texteCommentaire: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  texteSupprimerComm: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
  },

  // bouton charger plus de commentaires
  boutonChargerPlus: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  boutonChargerPlusTexte: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },

  // saisie et envoi commentaire
  champCommentaire: {
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
    marginTop: 16,
    marginBottom: 12,
  },
  boutonEnvoyer: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  boutonEnvoyerDesactive: {
    opacity: 0.5,
  },
  boutonEnvoyerTexte: {
    color: "#0b111f",
    fontWeight: "700",
    fontSize: 15,
  },
});
