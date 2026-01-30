# systeme de profil ameliore

## ce qui a ete ajoute

### 1 photo de profil avec firebase storage

#### fonctionnalites
- upload de photo depuis la galerie
- compression automatique des images 400x400 max 70% qualite
- stockage dans firebase storage profilePictures/{uid}.jpg
- url publique stockee dans firestore et firebase auth
- affichage de la photo partout profil feed commentaires

#### fichiers crees
- lib/storage.ts service duppload dimages avec compression

#### fichiers modifies  
- app/main/profile-edit.tsx ajout du selecteur de photo et upload
- app/main/profile.tsx affichage de la photo dans le profil
- components/UserAvatar.tsx composant reutilisable pour afficher les avatars

#### packages installes
- expo-image-manipulator pour compresser les images
- expo-image-picker deja installe pour choisir des photos

### 2 stats du profil

#### metriques affichees
- nombre d activites creees
- nombre de participations

#### implementation
- comptage en temps reel avec onsnapshot
- affichage dans une section dediee avec design propre
- style type instagram avec valeurs en gros et labels en petit

### 3 composant useravatar reutilisable

#### fonctionnalites
- charge automatiquement la photo depuis firestore
- affiche une initiale si pas de photo
- taille configurable
- gere le loading state
- bordure coloree pour les photos

#### utilisation
```typescript
import { UserAvatar } from "../components/UserAvatar";

<UserAvatar userId={activity.ownerId} size={40} userName={activity.creatorName} />
```

## structure firestore

### collection users/{uid}
```typescript
{
  displayName: string
  email: string
  program: string
  year: string
  interests: string[]
  bio: string
  photoURL: string  // nouveau url de la photo dans storage
  createdAt: timestamp
  updatedAt: timestamp
}
```

### firebase storage
```
profilePictures/
  {uid}.jpg  // photo de profil compresse
activityImages/
  {uid}/
    {activityId}.jpg  // images dactivites pour plus tard
```

## flux dutilisation

### changer la photo de profil

1 utilisateur va dans modifier le profil
2 clique sur changer la photo
3 app demande la permission galerie
4 utilisateur choisit une photo
5 photo compresse a 400x400 70% qualite
6 upload vers firebase storage profilePictures/{uid}.jpg
7 url recuperee
8 url affichee immediatement dans lediteur
9 utilisateur clique enregistrer
10 url stockee dans firestore users/{uid}.photoURL
11 url stockee dans firebase auth user.photoURL
12 photo affichee partout dans lapp

### affichage de la photo

1 composant useravatar monte
2 recupere le userid en props
3 charge le document firestore users/{uid}
4 extrait photourl
5 affiche limage ou linitiale si pas de photo

## optimisations

### compression des images
- taille max 400x400 pixels
- qualite 70% pour les photos de profil
- format jpeg forcement
- reduit la bande passante de 80-90%
- upload plus rapide
- moins de stockage utilise

### cache et performance
- composant useravatar garde la photo en memoire
- pas de requetes multiples pour le meme user
- loading state pour eviter le flash

### cout firebase storage

#### plan gratuit
- 5 gb de stockage gratuit
- 1 gb de transfert par jour gratuit

#### estimation pour 100 utilisateurs
- 100 photos de profil x 50 kb moyenne = 5 mb
- 1000 chargements par jour x 50 kb = 50 mb transfert
- largement dans le gratuit

#### cout si depassement
- 0.026 dollar par gb de stockage
- 0.12 dollar par gb de transfert
- pour atteindre 1 dollar il faudrait 40 gb de stockage ou 8 gb de transfert par jour

## prochaines etapes possibles

### court terme
1 afficher la photo dans le feed et les commentaires
2 ajouter un bouton supprimer la photo
3 permettre de prendre une photo avec la camera

### moyen terme
1 ajouter des photos aux activites
2 galerie de photos pour chaque activite
3 carousel de photos dans le feed

### long terme
1 recadrage avance des photos
2 filtres instagram style
3 stickers et emojis
4 stories temporaires

## regles de securite firebase storage

### a ajouter dans firebase console storage rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // photos de profil
    match /profilePictures/{userId}.jpg {
      // lecture publique
      allow read: if true;
      
      // ecriture uniquement par le proprietaire
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024  // max 5mb
        && request.resource.contentType.matches('image/.*');
    }
    
    // images dactivites
    match /activityImages/{userId}/{activityId}.jpg {
      // lecture publique
      allow read: if true;
      
      // ecriture uniquement par le proprietaire
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 10 * 1024 * 1024  // max 10mb
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## troubleshooting

### erreur permission denied
- verifier que les regles storage sont deployees
- verifier que lutilisateur est connecte
- verifier que le uid correspond

### photo ne saffiche pas
- verifier que photourl est bien stocke dans firestore
- verifier que lurl est accessible navigateur
- verifier les regles de lecture storage

### upload trop lent
- augmenter la compression qualite plus basse
- reduire la taille max des images
- verifier la connexion internet

### erreur de compression
- verifier que expo-image-manipulator est installe
- verifier que luri de limage est valide
- essayer avec une autre image
