import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

// configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// demander les permissions et recuperer le token
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  let token = null;

  // verifier que c'est un appareil physique
  if (!Device.isDevice) {
    console.log('Les notifications push ne fonctionnent que sur un appareil physique');
    return null;
  }

  // demander la permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission de notification refusee');
    return null;
  }

  // recuperer le token
  try {
    const projectId = 'your-project-id'; // sera remplace par la config Expo
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Token push:', token);

    // sauvegarder le token dans Firestore
    if (userId && token) {
      await savePushToken(userId, token);
    }
  } catch (error) {
    console.log('Erreur recuperation token:', error);
  }

  // configuration Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

// sauvegarder le token dans Firestore
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const tokenRef = doc(db, 'users', userId, 'pushTokens', token);
    await setDoc(tokenRef, {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Token sauvegarde dans Firestore');
  } catch (error) {
    console.log('Erreur sauvegarde token:', error);
  }
}

// supprimer un token invalide
export async function removePushToken(userId: string, token: string): Promise<void> {
  try {
    const tokenRef = doc(db, 'users', userId, 'pushTokens', token);
    await deleteDoc(tokenRef);
    console.log('Token supprime de Firestore');
  } catch (error) {
    console.log('Erreur suppression token:', error);
  }
}

// marquer une notification comme lue
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await setDoc(notifRef, { read: true }, { merge: true });
  } catch (error) {
    console.log('Erreur marquage notification:', error);
  }
}

// supprimer une notification
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (error) {
    console.log('Erreur suppression notification:', error);
  }
}
