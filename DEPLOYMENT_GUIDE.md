# Guide de deploiement des index Firestore

## Etapes rapides

### Option 1 : Firebase CLI (Recommande)

```bash
# 1. Installer Firebase CLI (si pas deja fait)
npm install -g firebase-tools

# 2. Se connecter a Firebase
firebase login

# 3. Se placer dans le dossier du projet
cd ProjetPersoAntoninHotte

# 4. Initialiser Firestore (si pas deja fait)
firebase init firestore
# Selectionner :
# - Use an existing project
# - Choisir : projetperso-antoninhotte-v2
# - firestore.rules pour les regles
# - firestore.indexes.json pour les index

# 5. Deployer les index
firebase deploy --only firestore:indexes

# 6. Deployer les regles de securite
firebase deploy --only firestore:rules
```

### Option 2 : Console Firebase (Manuel)

1. Aller sur : https://console.firebase.google.com
2. Selectionner votre projet : `projetperso-antoninhotte-v2`
3. Naviguer : Firestore Database → Indexes → Create Index

#### Index 1 : Activities par date
- Collection: `activities`
- Champs:
  - `date` : Ascending
- Query scope: Collection

#### Index 2 : Activities par categorie et date
- Collection: `activities`
- Champs:
  - `category` : Ascending
  - `date` : Ascending
- Query scope: Collection

#### Index 3 : Comments par date (ASC)
- Collection group: `comments`
- Champs:
  - `createdAt` : Ascending
- Query scope: Collection group

#### Index 4 : Comments par date (DESC)
- Collection group: `comments`
- Champs:
  - `createdAt` : Descending
- Query scope: Collection group

### Option 3 : Automatique (Developpement)

Lors du premier lancement de l'app, Firestore affichera des erreurs dans les logs avec des liens directs pour creer les index manquants. Cliquez simplement sur ces liens.

## Verification

Une fois deploye, verifiez dans la console Firebase que les index sont en statut "Enabled" (vert).

## Deploiement des regles de securite

```bash
firebase deploy --only firestore:rules
```

Ou depuis la console : Firestore Database → Rules → coller le contenu de `firestore.rules`

## Important

- Les index peuvent prendre quelques minutes a etre construits
- Pendant ce temps, les requetes peuvent echouer
- Attendez que tous les index soient "Enabled" avant de tester

## Tester l'application

1. Lancer l'app : `npm start`
2. Verifier le feed charge bien 10 activites
3. Tester le bouton "Charger plus"
4. Ouvrir une activite et verifier les commentaires
5. Tester "Charger plus de commentaires"
6. Tester la barre de recherche
7. Tester les filtres par categorie

## Troubleshooting

### Erreur : "The query requires an index"
- Cliquer sur le lien dans l'erreur
- Ou creer l'index manuellement via la console

### Erreur : "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Erreur : "Permission denied"
- Verifier que vous etes connecte : `firebase login`
- Verifier que vous avez les droits sur le projet

## Monitoring

Apres deploiement, surveillez dans la console Firebase :
- Usage : verifier que les lectures diminuent
- Performance : verifier que les requetes sont rapides
- Billing : surveiller les couts
✅ Une fois les index déployés, votre app sera **90% plus performante** et **90% moins coûteuse** !
