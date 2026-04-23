# Application d'événements étudiants

Application mobile React Native qui permet aux étudiants de créer, rejoindre et commenter des activités (sorties, révisions, soirées, etc.), avec un système de profil, de notifications push et de modération.

---

## Concept

Chaque étudiant crée un compte, remplit son profil (formation, année, centres d'intérêt, photo), puis peut :
- **Publier** une activité (titre, lieu, date, catégorie, description)
- **Rejoindre** l'activité d'un autre étudiant
- **Commenter** une activité
- **Signaler** un contenu inapproprié
- **Recevoir des notifications** push quand quelqu'un rejoint ou commente son activité
- **Gérer son profil** avec photo de profil

Les administrateurs ont accès à un panel de modération pour bannir des utilisateurs et supprimer des activités ou commentaires signalés.

---

## Technologies utilisées

| Technologie | Rôle |
|---|---|
| **React Native** | Framework UI mobile (iOS + Android) |
| **Expo SDK 54** | Toolchain, build, APIs natives |
| **Expo Router** | Navigation basée sur les fichiers (file-based routing) |
| **TypeScript** | Typage statique |
| **Firebase Auth** | Authentification email/mot de passe |
| **Cloud Firestore** | Base de données temps réel (NoSQL) |
| **Firebase Storage** | Stockage des photos de profil |
| **Firebase Cloud Functions** | Logique serveur (envoi de notifications push) |
| **Expo Notifications** | Réception des notifications push sur l'appareil |
| **Expo Image Picker** | Sélection de photo depuis la galerie |

---

## Architecture du projet

```
ProjetPersoAntoninHotte/
├── app/                        # Écrans (Expo Router)
│   ├── _layout.tsx             # Layout racine — configure la Stack de navigation
│   ├── index.tsx               # Écran de démarrage (redirige vers login ou feed)
│   ├── login.tsx               # Connexion email/mot de passe
│   ├── register.tsx            # Création de compte
│   └── (main)/                 # Écrans protégés (utilisateur connecté)
│       ├── _layout.tsx         # Layout drawer (menu latéral)
│       ├── feed.tsx            # Liste des activités + recherche + filtres
│       ├── create-activity.tsx # Formulaire de création d'activité
│       ├── activity-details.tsx# Détails d'une activité + participants + commentaires
│       ├── profile.tsx         # Profil de l'utilisateur connecté
│       ├── profile-edit.tsx    # Modifier son profil
│       ├── notifications.tsx   # Liste des notifications reçues
│       └── admin-panel.tsx     # Panel admin (signalements, bannissement)
│
├── components/
│   ├── user-avatar.tsx         # Avatar circulaire avec initiales ou photo
│   └── use-admin.ts            # Hook — vérifie si l'utilisateur est admin
│
├── lib/
│   ├── firebase.ts             # Initialisation Firebase (Auth, Firestore, Storage)
│   └── storage.ts              # Fonction upload de photo de profil
│
├── constants/
│   ├── color.ts                # Palette de couleurs (thème sombre)
│   └── categories.ts           # Liste des catégories d'activités
│
├── functions/                  # Firebase Cloud Functions (Node.js)
│   └── src/index.ts            # onParticipationAdded, onCommentAdded, sendActivityReminders
│
├── firestore.rules             # Règles de sécurité Firestore
├── firestore.indexes.json      # Index composites Firestore
└── firebase.json               # Configuration Firebase CLI
```

---

## Ce qui utilise quoi

### Navigation
- **Expo Router** lit la structure du dossier `app/` et génère la navigation automatiquement
- `app/_layout.tsx` → Stack racine avec 4 écrans : index, login, register, (main)
- `app/(main)/_layout.tsx` → Drawer (menu latéral glissant) avec les écrans principaux

### Authentification
- `login.tsx` et `register.tsx` → `firebase/auth` : `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`
- Après inscription, un document est créé dans Firestore `/users/{uid}` avec le profil de base
- `index.tsx` → `onAuthStateChanged` pour rediriger vers le feed si déjà connecté

### Firestore — structure des collections

```
/users/{uid}
  displayName, email, role, status, photoURL, program, year, bio, interests[]
  /pushTokens/{tokenId}     → tokens Expo pour les notifications
  /notifications/{notifId}  → notifications reçues par l'utilisateur

/activities/{activityId}
  title, description, category, location, date, ownerId, participants[]
  /comments/{commentId}     → commentaires sur l'activité

/reports/{reportId}
  activityId, reason, reportedBy, reportedAt
```

### Feed et activités
- `feed.tsx` → `onSnapshot` sur `/activities` avec filtre catégorie + recherche locale
- Pagination : `limit(10)` + `startAfter(dernierDocument)` avec bouton "Charger plus"
- `create-activity.tsx` → `addDoc` sur `/activities`
- `activity-details.tsx` → `onSnapshot` pour les commentaires en temps réel, `updateDoc` pour les participants

### Profil et photo
- `profile.tsx` → `onSnapshot` sur `/users/{uid}` + comptage des activités/participations
- `profile-edit.tsx` → `updateDoc` Firestore + `updateProfile` Firebase Auth
- `lib/storage.ts` → `uploadBytes` vers Firebase Storage dans `profilePictures/{uid}.jpg`, retourne l'URL de téléchargement
- `components/user-avatar.tsx` → affiche la photo ou les initiales en fallback

### Notifications push
- À la connexion, l'app enregistre le token Expo dans `/users/{uid}/pushTokens/`
- **Cloud Functions** écoutent les events Firestore :
  - `onParticipationAdded` → déclenché quand `participants[]` change sur une activité → notifie le créateur
  - `onCommentAdded` → déclenché à la création d'un commentaire → notifie le créateur de l'activité
  - `sendActivityReminders` → Cron job (toutes les heures) → notifie les participants des activités dans les 24h
- Les notifications sont envoyées via l'**API Expo Push** (`https://exp.host/--/api/v2/push/send`)
- Les notifications reçues sont stockées dans `/users/{uid}/notifications/` pour l'historique in-app

### Modération (admin)
- `admin-panel.tsx` → lit `/reports`, `/users`, `/activities` en temps réel
- Actions : bannir un utilisateur (`status: 'banned'`), supprimer activité/commentaire
- `components/use-admin.ts` → vérifie `users/{uid}.role == 'admin'`
- Les règles Firestore bloquent les actions des utilisateurs bannis

---

## Règles de sécurité Firestore

Fichier `firestore.rules` — règles principales :

- **`/users`** : lecture par tout utilisateur connecté, écriture par soi-même (sauf champ `role`) ou admin
- **`/activities`** : lecture publique, création par tout utilisateur non banni, mise à jour du champ `participants` par n'importe qui, suppression par le créateur ou admin
- **`/activities/comments`** : création par tout utilisateur non banni, suppression par l'auteur ou admin, pas de modification
- **`/reports`** : création par tout utilisateur non banni, lecture/suppression admin seulement

Les fonctions helper `isAdmin()` et `isBanned()` utilisent `userData.get('field', default)` pour éviter les erreurs si le champ n'existe pas dans le document.

---

## Index Firestore

Index composite dans `firestore.indexes.json` pour la requête du feed (tri par date + filtre catégorie) :

```json
{
  "collectionGroup": "activities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

---

## Lancer le projet

### Prérequis
- Node.js 18+
- Expo CLI : `npm install -g expo-cli` (ou utiliser `npx expo`)
- Application **Expo Go** sur votre téléphone (iOS ou Android)
- Compte Firebase avec un projet configuré

### Installation

```bash
# Cloner et installer les dépendances
cd ProjetPersoAntoninHotte
npm install
```

### Configuration Firebase

1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activer : Authentication (email/mot de passe), Firestore, Storage
3. Copier la config Firebase dans `lib/firebase.ts`

### Démarrer l'app

```bash
# Réseau local (téléphone sur le même Wi-Fi)
npx expo start --clear

# Avec tunnel Ngrok (téléphone sur n'importe quel réseau)
npx expo start --tunnel --clear
```

Scanner le QR code avec Expo Go sur votre téléphone.

> Si le port 8081 est occupé, Expo proposera le port 8082 — accepter avec `y`.

### Déployer les règles et fonctions Firebase

```bash
# Règles Firestore uniquement
firebase deploy --only firestore:rules

# Index Firestore uniquement
firebase deploy --only firestore:indexes

# Cloud Functions uniquement
cd functions && npm install
firebase deploy --only functions

# Tout déployer
firebase deploy
```

### Créer un admin

Dans la console Firebase → Firestore → collection `users` → document `{uid}` → ajouter le champ `role: "admin"`.

---

## Variables d'environnement

Toute la configuration Firebase est dans `lib/firebase.ts` directement (clés d'API publiques côté client — normal pour Firebase Web SDK).

Pour les Cloud Functions, si vous utilisez des clés secrètes (ex. clé serveur FCM), les stocker avec :

```bash
firebase functions:config:set somekey.value="VALUE"
```
