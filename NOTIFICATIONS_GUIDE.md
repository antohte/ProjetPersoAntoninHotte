# guide des notifications

## architecture

### composants

1. **client side expo notifications**
   - demande les permissions
   - recupere le expo push token
   - stocke le token dans firestore users/{uid}/pushTokens/{token}
   - ecoute les notifications entrantes
   - gere l affichage des notifications in app

2. **firestore**
   - users/{uid}/pushTokens/{token} pour stocker les tokens des appareils
   - users/{uid}/notifications/{notifId} pour les notifications in app
   - activities/{activityId} pour les activites avec champs reminder24hSent et reminder1hSent

3. **cloud functions**
   - onParticipationAdded quand quelqu un rejoint une activite
   - onCommentAdded quand quelqu un commente
   - sendActivityReminders fonction planifiee toutes les 15 minutes pour les rappels

4. **expo push api**
   - envoie les notifications push via les cloud functions
   - gere les chunks de messages
   - retourne les tickets de confirmation

## types de notifications

### 1. participation
- declenchee quand participants change dans une activite
- notifie le createur de l activite
- ne notifie pas si le createur se rajoute lui meme
- push notification et notification in app

### 2. commentaire
- declenchee quand un nouveau commentaire est cree
- notifie le createur de l activite
- ne notifie pas si le createur commente sa propre activite
- push notification et notification in app

### 3. rappels
- fonction planifiee toutes les 15 minutes
- envoie un rappel 24h avant l activite
- envoie un rappel 1h avant l activite
- notifie tous les participants
- marque les rappels comme envoyes avec reminder24hSent et reminder1hSent

## structure des donnees

### pushTokens
```
users/{uid}/pushTokens/{token}
{
  createdAt: timestamp
  deviceInfo: string (optionnel)
}
```

### notifications
```
users/{uid}/notifications/{notifId}
{
  type: "participation" | "comment" | "reminder"
  title: string
  message: string
  activityId: string (optionnel)
  activityTitle: string (optionnel)
  fromUserId: string (optionnel)
  fromUserName: string (optionnel)
  read: boolean
  createdAt: timestamp
}
```

## deploiement

### 1. installer les dependances des cloud functions

```bash
cd functions
npm install
```

### 2. compiler les functions

```bash
npm run build
```

### 3. deployer les regles firestore

```bash
firebase deploy --only firestore:rules
```

### 4. deployer les indexes firestore

```bash
firebase deploy --only firestore:indexes
```

### 5. deployer les cloud functions

```bash
firebase deploy --only functions
```

ou pour deployer une seule fonction

```bash
firebase deploy --only functions:onParticipationAdded
firebase deploy --only functions:onCommentAdded
firebase deploy --only functions:sendActivityReminders
```

### 6. verifier le deploiement

dans la console firebase aller dans functions pour voir les logs et l etat des fonctions

## tests

### tester les notifications push

1. creer une activite
2. participer avec un autre compte
3. verifier que le createur recoit une notification

### tester les commentaires

1. commenter une activite
2. verifier que le createur recoit une notification

### tester les rappels

1. creer une activite dans les prochaines 24h
2. attendre le prochain run de la fonction planifiee (max 15 min)
3. verifier que les participants recoivent un rappel

## gestion des erreurs

### tokens invalides

les tokens expo peuvent devenir invalides si
- l utilisateur desinstalle l app
- l utilisateur desactive les notifications
- le token expire

les cloud functions detectent automatiquement les tokens invalides et les suppriment

### spam prevention

actuellement aucune limite de frequence n est implementee
pour ajouter une limite on peut stocker un timestamp de derniere notification envoyee et verifier avant d envoyer

### notifications multiples

si un utilisateur a plusieurs appareils il recevra une notification sur chaque appareil
les tokens sont stockes separement dans pushTokens/{token}

## optimisations

### batch writes

actuellement les notifications sont ecrites une par une
pour de meilleures performances on peut utiliser batch writes

### notification grouping

pour eviter de spammer les utilisateurs on peut grouper les notifications similaires
par exemple 5 personnes ont participe au lieu de 5 notifications separees

### selective notifications

ajouter des preferences utilisateur pour choisir quels types de notifications recevoir

## debug

### voir les logs des functions

```bash
firebase functions:log
```

### tester localement avec emulateurs

```bash
cd functions
npm run serve
```

puis configurer l app pour pointer vers les emulateurs

### verifier les tokens dans firestore

dans la console firebase aller dans firestore et verifier users/{uid}/pushTokens

## securite

### regles firestore

les regles firestore assurent que
- seul le proprietaire peut lire et ecrire ses tokens
- seul le proprietaire peut lire et ecrire ses notifications
- les tokens sont stockes avec l uid de l utilisateur comme parent

### permissions cloud functions

les cloud functions ont acces admin a firestore pour creer les notifications
elles ne sont executees que sur le serveur donc securisees

## monitoring

### metriques a surveiller

- nombre de notifications envoyees par jour
- taux d echec des notifications
- temps de traitement des fonctions
- cout des operations firestore

dans la console firebase aller dans functions puis metrics pour voir les stats
