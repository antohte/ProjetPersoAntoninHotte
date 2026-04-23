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
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
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

export default function AdminPanel() {
  const { isAdmin, loading: adminLoading } = useAdmin();

  // liste des signalements
  const [signalements, setSignalements] = useState<any[]>([]);
  const [loadingSignalements, setLoadingSignalements] = useState(true);
  const [erreur, setErreur] = useState("");

  // liste de tous les utilisateurs (pour la recherche)
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [rechercheUser, setRechercheUser] = useState("");

  // liste de toutes les activités (pour la modération)
  const [activites, setActivites] = useState<any[]>([]);
  const [rechercheActivite, setRechercheActivite] = useState("");

  // liste de tous les commentaires (pour la modération)
  const [commentaires, setCommentaires] = useState<any[]>([]);
  const [rechercheCommentaire, setRechercheCommentaire] = useState("");

  // id de l'élément en cours de suppression ou traitement
  const [supprimantId, setSupprimantId] = useState("");
  const [traitantUserId, setTraitantUserId] = useState("");

  // rediriger si pas admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.replace("/(main)/feed");
    }
  }, [isAdmin, adminLoading]);

  // charger les signalements en temps réel
  useEffect(() => {
    if (!isAdmin) return;

    setLoadingSignalements(true);
    setErreur("");

    const q = query(collection(db, "reports"));

    const stopEcoute = onSnapshot(
      q,
      async (snap) => {
        const liste: any[] = [];

        // pour chaque signalement, on va chercher le titre de l'activité signalée
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const signalement: any = {
            id: docSnap.id,
            activityId: data.activityId,
            reason: data.reason,
            reportedBy: data.reportedBy,
            reportedAt: data.reportedAt,
          };

          try {
            const actDoc = await getDoc(doc(db, "activities", data.activityId));
            if (actDoc.exists()) {
              signalement.activityTitle = actDoc.data().title;
            }
          } catch (e) {
            console.log("Erreur récupération titre activité :", e);
          }

          liste.push(signalement);
        }

        setSignalements(liste);
        setLoadingSignalements(false);
      },
      (err) => {
        console.log("Erreur lecture signalements :", err);
        setErreur("Accès refusé au panel admin. Vérifie role=admin et les règles Firestore déployées.");
        setLoadingSignalements(false);
      }
    );

    return stopEcoute;
  }, [isAdmin]);

  // charger les utilisateurs en temps réel
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "users"), limit(300));

    const stopEcoute = onSnapshot(
      q,
      (snap) => {
        const liste = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            displayName: data.displayName,
            email: data.email,
            role: data.role,
            status: data.status || "active",
            warningsCount: data.warningsCount || 0,
          };
        });
        setUtilisateurs(liste);
      },
      (err) => console.log("Erreur lecture utilisateurs :", err)
    );

    return stopEcoute;
  }, [isAdmin]);

  // charger les activités en temps réel
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "activities"), orderBy("date", "desc"), limit(100));

    const stopEcoute = onSnapshot(
      q,
      (snap) => {
        const liste = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title,
            ownerId: data.ownerId,
            date: data.date,
          };
        });
        setActivites(liste);
      },
      (err) => console.log("Erreur lecture activités :", err)
    );

    return stopEcoute;
  }, [isAdmin]);

  // charger les commentaires en temps réel
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collectionGroup(db, "comments"), orderBy("createdAt", "desc"), limit(120));

    const stopEcoute = onSnapshot(
      q,
      (snap) => {
        const liste = snap.docs
          .map((d) => {
            const data = d.data() as any;
            const activityId = d.ref.parent.parent?.id || "";
            return {
              id: d.id,
              activityId,
              text: data.text,
              userName: data.userName,
              createdAt: data.createdAt,
            };
          })
          .filter((c) => !!c.activityId);
        setCommentaires(liste);
      },
      (err) => console.log("Erreur lecture commentaires :", err)
    );

    return stopEcoute;
  }, [isAdmin]);

  // filtrer les utilisateurs selon la recherche
  const utilisateursFiltres = utilisateurs.filter((u) => {
    const terme = rechercheUser.trim().toLowerCase();
    if (!terme) return false;
    return (
      (u.displayName || "").toLowerCase().includes(terme) ||
      (u.email || "").toLowerCase().includes(terme)
    );
  });

  // filtrer les activités selon la recherche
  const activitesFiltrees = activites.filter((a) => {
    const terme = rechercheActivite.trim().toLowerCase();
    if (!terme) return false;
    return (a.title || "").toLowerCase().includes(terme);
  });

  // filtrer les commentaires selon la recherche
  const commentairesFiltres = commentaires.filter((c) => {
    const terme = rechercheCommentaire.trim().toLowerCase();
    if (!terme) return false;
    return (
      (c.text || "").toLowerCase().includes(terme) ||
      (c.userName || "").toLowerCase().includes(terme) ||
      (c.activityId || "").toLowerCase().includes(terme)
    );
  });

  // envoyer un avertissement à un utilisateur
  const avertirUtilisateur = async (utilisateur: any) => {
    setTraitantUserId(utilisateur.id);
    try {
      await updateDoc(doc(db, "users", utilisateur.id), {
        warningsCount: increment(1),
        lastWarningReason: "Avertissement admin",
        lastWarningAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert(
        "Avertissement envoyé",
        `Utilisateur ${utilisateur.displayName || utilisateur.email || utilisateur.id} averti.`
      );
    } catch (err) {
      console.log("Erreur avertissement utilisateur :", err);
      Alert.alert("Erreur", "Impossible d'envoyer un avertissement.");
    }
    setTraitantUserId("");
  };

  // bannir ou débannir un utilisateur
  const toggleBanUtilisateur = async (utilisateur: any) => {
    const statutActuel = utilisateur.status || "active";
    const nouveauStatut = statutActuel === "banned" ? "active" : "banned";

    setTraitantUserId(utilisateur.id);
    try {
      await updateDoc(doc(db, "users", utilisateur.id), {
        status: nouveauStatut,
        bannedAt: nouveauStatut === "banned" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
      Alert.alert(
        nouveauStatut === "banned" ? "Utilisateur banni" : "Utilisateur débanni",
        utilisateur.displayName || utilisateur.email || utilisateur.id
      );
    } catch (err) {
      console.log("Erreur ban utilisateur :", err);
      Alert.alert("Erreur", "Impossible de modifier le statut de l'utilisateur.");
    }
    setTraitantUserId("");
  };

  // supprimer l'activité signalée + le signalement
  const supprimerActiviteSignalee = async (signalement: any) => {
    if (!auth.currentUser) return;

    setSupprimantId(signalement.id);
    try {
      await deleteDoc(doc(db, "activities", signalement.activityId));
      await deleteDoc(doc(db, "reports", signalement.id));
      alert("Activité et signalement supprimés");
    } catch (e) {
      console.log("Erreur suppression :", e);
      alert("Erreur lors de la suppression");
    }
    setSupprimantId("");
  };

  // ignorer un signalement (le supprimer sans supprimer l'activité)
  const ignorerSignalement = async (signalementId: string) => {
    setSupprimantId(signalementId);
    try {
      await deleteDoc(doc(db, "reports", signalementId));
    } catch (e) {
      console.log("Erreur suppression signalement :", e);
    }
    setSupprimantId("");
  };

  // supprimer une activité directement (depuis la section activités)
  const supprimerActivite = async (activityId: string) => {
    setSupprimantId(activityId);
    try {
      await deleteDoc(doc(db, "activities", activityId));
      Alert.alert("Activité supprimée", "L'activité a été supprimée.");
    } catch (e) {
      console.log("Erreur suppression activité :", e);
      Alert.alert("Erreur", "Impossible de supprimer l'activité.");
    }
    setSupprimantId("");
  };

  // supprimer un commentaire
  const supprimerCommentaire = async (activityId: string, commentId: string) => {
    setSupprimantId(commentId);
    try {
      await deleteDoc(doc(db, "activities", activityId, "comments", commentId));
      Alert.alert("Commentaire supprimé", "Le commentaire a été supprimé.");
    } catch (e) {
      console.log("Erreur suppression commentaire :", e);
      Alert.alert("Erreur", "Impossible de supprimer le commentaire.");
    }
    setSupprimantId("");
  };

  // --- pendant le chargement admin ---
  if (adminLoading) {
    return (
      <View style={styles.ecran}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.ecran}>
      <View style={styles.contenu}>

        {/* titre de la page */}
        <View style={styles.entete}>
          <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          <Text style={styles.titrePage}>Modération</Text>
        </View>

        {/* section signalements */}
        {loadingSignalements ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : erreur ? (
          <View style={styles.blocVide}>
            <Ionicons name="alert-circle-outline" size={48} color="#f97316" />
            <Text style={styles.titreVide}>Accès impossible</Text>
            <Text style={styles.texteVide}>{erreur}</Text>
          </View>
        ) : signalements.length === 0 ? (
          <View style={styles.blocVide}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.muted} />
            <Text style={styles.titreVide}>Aucun signalement</Text>
            <Text style={styles.texteVide}>Tout est en ordre</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.nbSignalements}>{signalements.length} signalement(s)</Text>

            {signalements.map((signalement) => (
              <View key={signalement.id} style={styles.carteSignalement}>

                {/* titre et raison */}
                <View style={styles.enteteSignalement}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.titreSignalement}>
                      {signalement.activityTitle || "Activité supprimée"}
                    </Text>
                    <Text style={styles.raisonSignalement}>
                      Raison : {signalement.reason}
                    </Text>
                  </View>
                  <View style={styles.iconeSignalement}>
                    <Ionicons name="flag-outline" size={16} color="#f97316" />
                  </View>
                </View>

                {/* méta : qui a signalé et quand */}
                <Text style={styles.metaSignalement}>
                  Signalée par {(signalement.reportedBy || "inconnu").substring(0, 8)}... le{" "}
                  {format(signalement.reportedAt.toDate(), "dd MMM à HH:mm", { locale: fr })}
                </Text>

                {/* actions : supprimer ou ignorer */}
                <View style={styles.ligneActions}>
                  <TouchableOpacity
                    style={[styles.bouton, styles.boutonSupprimer]}
                    onPress={() => supprimerActiviteSignalee(signalement)}
                    disabled={supprimantId === signalement.id}
                  >
                    {supprimantId === signalement.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={styles.boutonSupprimerTexte}>Supprimer</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.bouton, styles.boutonIgnorer]}
                    onPress={() => ignorerSignalement(signalement.id)}
                    disabled={supprimantId === signalement.id}
                  >
                    {supprimantId === signalement.id ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <>
                        <Ionicons name="close-outline" size={16} color={colors.text} />
                        <Text style={styles.boutonIgnorerTexte}>Ignorer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* section utilisateurs */}
        <View style={styles.sectionCarte}>
          <View style={styles.sectionEntete}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitre}>Utilisateurs</Text>
          </View>

          <TextInput
            style={styles.champRecherche}
            placeholder="Chercher par nom ou email"
            placeholderTextColor={colors.muted}
            value={rechercheUser}
            onChangeText={setRechercheUser}
          />

          {utilisateursFiltres.slice(0, 60).map((utilisateur) => {
            const estBanni = utilisateur.status === "banned";
            const estMoi = auth.currentUser?.uid === utilisateur.id;

            return (
              <View key={utilisateur.id} style={styles.ligneItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nomItem}>{utilisateur.displayName || "Sans nom"}</Text>
                  <Text style={styles.metaItem}>{utilisateur.email || utilisateur.id}</Text>
                  <Text style={styles.metaItem}>
                    rôle: {utilisateur.role || "user"} · statut: {estBanni ? "banni" : "actif"} · avertissements: {utilisateur.warningsCount || 0}
                  </Text>
                </View>

                <View style={{ gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.petitBouton, styles.petitBoutonAvertir]}
                    onPress={() => avertirUtilisateur(utilisateur)}
                    disabled={traitantUserId === utilisateur.id || estMoi}
                  >
                    <Text style={styles.petitBoutonTexte}>Avertir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.petitBouton, estBanni ? styles.petitBoutonDebannir : styles.petitBoutonBannir]}
                    onPress={() => toggleBanUtilisateur(utilisateur)}
                    disabled={traitantUserId === utilisateur.id || estMoi}
                  >
                    <Text style={styles.petitBoutonTexte}>
                      {estBanni ? "Débannir" : "Bannir"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* section activités */}
        <View style={styles.sectionCarte}>
          <View style={styles.sectionEntete}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitre}>Activités</Text>
          </View>

          <TextInput
            style={styles.champRecherche}
            placeholder="Chercher une activité par titre"
            placeholderTextColor={colors.muted}
            value={rechercheActivite}
            onChangeText={setRechercheActivite}
          />

          {activitesFiltrees.slice(0, 50).map((activite) => (
            <View key={activite.id} style={styles.ligneItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomItem}>{activite.title || "Activité sans titre"}</Text>
                <Text style={styles.metaItem}>propriétaire: {activite.ownerId || "inconnu"}</Text>
                <Text style={styles.metaItem}>
                  {activite.date?.toDate
                    ? format(activite.date.toDate(), "dd MMM à HH:mm", { locale: fr })
                    : "date inconnue"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.petitBouton, styles.boutonSupprimer]}
                onPress={() => supprimerActivite(activite.id)}
                disabled={supprimantId === activite.id}
              >
                <Text style={styles.petitBoutonTexte}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* section commentaires */}
        <View style={styles.sectionCarte}>
          <View style={styles.sectionEntete}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitre}>Commentaires</Text>
          </View>

          <TextInput
            style={styles.champRecherche}
            placeholder="Chercher un commentaire, un auteur ou un id activité"
            placeholderTextColor={colors.muted}
            value={rechercheCommentaire}
            onChangeText={setRechercheCommentaire}
          />

          {commentairesFiltres.slice(0, 80).map((commentaire) => (
            <View key={`${commentaire.activityId}-${commentaire.id}`} style={styles.ligneItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomItem}>{commentaire.userName || "Utilisateur"}</Text>
                <Text style={styles.metaItem}>{commentaire.text || "(commentaire vide)"}</Text>
                <Text style={styles.metaItem}>activité: {commentaire.activityId}</Text>
              </View>
              <TouchableOpacity
                style={[styles.petitBouton, styles.boutonSupprimer]}
                onPress={() => supprimerCommentaire(commentaire.activityId, commentaire.id)}
                disabled={supprimantId === commentaire.id}
              >
                <Text style={styles.petitBoutonTexte}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

      </View>
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
    paddingBottom: 40,
  },

  // en-tête de page
  entete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  titrePage: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },

  // états vides
  blocVide: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  titreVide: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
  },
  texteVide: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },

  // signalements
  nbSignalements: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
    fontWeight: "600",
  },
  carteSignalement: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
  },
  enteteSignalement: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  titreSignalement: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  raisonSignalement: {
    fontSize: 13,
    color: colors.muted,
  },
  iconeSignalement: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 8,
  },
  metaSignalement: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 12,
  },
  ligneActions: {
    flexDirection: "row",
    gap: 8,
  },
  bouton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  boutonSupprimer: {
    backgroundColor: "#ef4444",
  },
  boutonSupprimerTexte: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  boutonIgnorer: {
    backgroundColor: "#1e293b",
  },
  boutonIgnorerTexte: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },

  // sections (utilisateurs, activités, commentaires)
  sectionCarte: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
  },
  sectionEntete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitre: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  champRecherche: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  // ligne d'un item (utilisateur, activité ou commentaire)
  ligneItem: {
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
  nomItem: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 2,
  },
  metaItem: {
    color: colors.muted,
    fontSize: 12,
  },

  // petits boutons d'action
  petitBouton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  petitBoutonTexte: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  petitBoutonAvertir: {
    backgroundColor: "#f59e0b",
  },
  petitBoutonBannir: {
    backgroundColor: "#ef4444",
  },
  petitBoutonDebannir: {
    backgroundColor: "#10b981",
  },
});
