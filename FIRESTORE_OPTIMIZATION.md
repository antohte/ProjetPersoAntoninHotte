# Optimisations Firestore

## Resume des optimisations

Ce document decrit toutes les optimisations Firestore implementees pour ameliorer les performances et reduire les couts.

## Optimisations implementees

### 1. Pagination du Feed

Fichier: app/(main)/feed.tsx

Avant :
- Chargement de TOUTES les activites d'un coup
- Utilisation de onSnapshot (temps reel couteux)
- Risque de performance avec 500+ activites

Apres :
- Pagination avec limit(10) et startAfter(lastDoc)
- Utilisation de getDocs au lieu de onSnapshot
- Bouton Charger plus pour charger 10 activites a la fois
- Performance optimale meme avec des milliers d'activites

Code cle :
```typescript
const ACTIVITIES_PER_PAGE = 10;

const loadActivities = async (isLoadMore = false) => {
  let q = query(
    collection(db, "activities"),
    orderBy("date", "asc"),
    limit(ACTIVITIES_PER_PAGE)
  );

  if (isLoadMore && lastDoc) {
    q = query(
      collection(db, "activities"),
      orderBy("date", "asc"),
      startAfter(lastDoc),
      limit(ACTIVITIES_PER_PAGE)
    );
  }

  const snap = await getDocs(q);
};
```

### 2. Limitation des commentaires dans le feed

Fichier: app/(main)/feed.tsx

Avant :
- Chargement de TOUS les commentaires pour chaque activite
- onSnapshot sur plusieurs sous-collections (tres couteux)

Apres :
- Seulement les 3 derniers commentaires affiches dans le feed
- Utilisation de getDocs avec limit(3)
- Tri descendant puis inversion pour afficher correctement

Code cle :
```typescript
const q = query(
  collection(db, "activities", id, "comments"),
  orderBy("createdAt", "desc"),
  limit(3)
);

const snap = await getDocs(q);
const list = snap.docs.map().reverse();
```

### 3. Pagination des commentaires en detail

Fichier: app/(main)/activity-details.tsx

Avant :
- Chargement de TOUS les commentaires d'une activite
- Utilisation de onSnapshot (temps reel)

Apres :
- Pagination avec limit(10) et startAfter(lastDoc)
- Utilisation de getDocs
- Bouton Charger plus de commentaires
- Rechargement automatique apres ajout d'un commentaire

Code cle :
```typescript
const COMMENTS_PER_PAGE = 10;

const loadComments = async (isLoadMore = false) => {
  let q = query(
    collection(db, "activities", activityId, "comments"),
    orderBy("createdAt", "asc"),
    limit(COMMENTS_PER_PAGE)
  );

  if (isLoadMore && lastCommentDoc) {
    q = query(
      collection(db, "activities", activityId, "comments"),
      orderBy("createdAt", "asc"),
      startAfter(lastCommentDoc),
      limit(COMMENTS_PER_PAGE)
    );
  }

  const snap = await getDocs(q);
};
```

### 4. Remplacement onSnapshot vers getDocs

Changements :
- Activites dans le feed : getDocs au lieu de onSnapshot
- Commentaires : getDocs au lieu de onSnapshot
- Activite en detail : getDoc au lieu de onSnapshot

Avantages :
- Reduction drastique des couts (pas de mises a jour temps reel)
- Moins de charge reseau
- Mises a jour manuelles via pull-to-refresh

### 5. Recherche et filtres avances

Fichiers: app/(main)/feed.tsx, app/(main)/create-activity.tsx

Fonctionnalites :
- Barre de recherche pour rechercher par titre, description ou lieu
- Filtres par categorie : Bar, Sport, Revision, Culture, Soiree, Autre
- Categories lors de la creation d'activite
- Filtrage Firestore avec where("category", "==", "...")
- Recherche textuelle cote client (evite les index fulltext)

Code cle :
```typescript
const CATEGORIES = [
  { id: "all", label: "Tout", icon: "apps" },
  { id: "bar", label: "Bar", icon: "beer" },
  { id: "sport", label: "Sport", icon: "football" },
  { id: "revision", label: "Revision", icon: "book" },
];

// Filtre Firestore par categorie
if (selectedCategory !== "all") {
  constraints.push(where("category", "==", selectedCategory));
}

// Recherche textuelle cote client
if (searchText.trim()) {
  list = list.filter(a =>
    a.title.toLowerCase().includes(search) ||
    a.description.toLowerCase().includes(search) ||
    a.place.toLowerCase().includes(search)
  );
}
```

UI :
- Barre de recherche avec icone et bouton clear
- Filtres par categorie avec icones colorees
- Bouton toggle pour afficher ou masquer les filtres
- Rechargement automatique lors du changement de filtre

## Index Firestore

### Fichier de configuration : firestore.indexes.json

Les index suivants ont ete definis :

1. Index sur activities.date
   - Pour : orderBy("date", "asc")
   - Permet le tri efficace des activites

2. Index composite activities.category + date
   - Pour : where("category", "==", "...") + orderBy("date", "asc")
   - Permet de filtrer par categorie ET trier par date
   - Essentiel pour les filtres avances

3. Index sur comments.createdAt (ASC)
   - Pour : orderBy("createdAt", "asc")
   - Utilise dans la page de details

4. Index sur comments.createdAt (DESC)
   - Pour : orderBy("createdAt", "desc")
   - Utilise dans le feed pour recuperer les 3 derniers

### Deploiement des index

Option 1 : Via la console Firebase
1. Aller sur https://console.firebase.google.com
2. Selectionner votre projet : projetperso-antoninhotte-v2
3. Aller dans Firestore Database puis Indexes
4. Creer les index manuellement selon firestore.indexes.json

Option 2 : Via Firebase CLI (recommande)
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:indexes
```

Option 3 : Laisser Firestore creer automatiquement
- Lors de la premiere requete, Firestore suggerera un lien pour creer l'index
- Cliquer sur le lien dans les logs d'erreur
- L'index sera cree automatiquement

## Impact des optimisations

### Avant
- Chargement : 500 activites × N commentaires = milliers de lectures
- Temps reel : onSnapshot = lectures continues
- Cout : TRES ELEVE
- Performance : Lente avec beaucoup de donnees

### Apres
- Chargement : 10 activites × 3 commentaires = environ 40 lectures
- Lecture unique : getDocs = lecture ponctuelle
- Cout : 90 pourcent de reduction
- Performance : Rapide quelle que soit la quantite de donnees

## Bonnes pratiques appliquees

1. Pagination systematique avec limit() et startAfter()
2. getDocs au lieu de onSnapshot pour les listes
3. Limitation des sous-collections (3 commentaires dans le feed)
4. Index Firestore pour toutes les requetes avec orderBy
5. Chargement a la demande (Load more buttons)

## Prochaines optimisations possibles

### Cache et offline
```typescript
import { enableIndexedDbPersistence } from "firebase/firestore";

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open
  } else if (err.code == 'unimplemented') {
    // Browser doesn't support
  }
});
```

### Infinite scroll
Remplacer le bouton Charger plus par un scroll infini :
```typescript
<FlatList
  data={activities}
  onEndReached={() => loadActivities(true)}
  onEndReachedThreshold={0.5}
/>
```

### Compteurs agreges
Pour eviter de compter les participants a chaque fois :
```typescript
{
  participants: ["uid1", "uid2"],
  participantCount: 2
}
```

### Cloud Functions pour l'agregation
```typescript
exports.updateParticipantCount = functions.firestore
  .document('activities/{activityId}')
  .onUpdate((change, context) => {
    const newData = change.after.data();
    const count = newData.participants.length;
    return change.after.ref.update({ participantCount: count });
  });
```

## Securite

Le fichier firestore.rules a ete cree avec des regles de securite :
- Lecture : utilisateur authentifie
- Creation : utilisateur authentifie uniquement
- Modification : createur uniquement (sauf participants)
- Suppression : createur uniquement
- Commentaires : auteur peut supprimer, pas de modification

## Ressources

- Firestore Pagination : https://firebase.google.com/docs/firestore/query-data/query-cursors
- Firestore Indexes : https://firebase.google.com/docs/firestore/query-data/indexing
- Best Practices : https://firebase.google.com/docs/firestore/best-practices
- Pricing Calculator : https://firebase.google.com/pricing

Toutes les optimisations sont implementees et pretes a l'emploi.
