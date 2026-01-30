import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth } from "./firebase";
import * as ImageManipulator from "expo-image-manipulator";

const storage = getStorage();

// compresse et redimensionne une image
export async function compressImage(uri: string, maxWidth = 800, quality = 0.8) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error("erreur compression image", error);
    return uri;
  }
}

// upload une photo de profil
export async function uploadProfilePicture(imageUri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("pas de user connecte");

  // compresse l image d abord
  const compressedUri = await compressImage(imageUri, 400, 0.7);

  // converti l uri en blob
  const response = await fetch(compressedUri);
  const blob = await response.blob();

  // upload vers firebase storage
  const storageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
  await uploadBytes(storageRef, blob);

  // recupere l url publique
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

// supprime une photo de profil
export async function deleteProfilePicture() {
  const user = auth.currentUser;
  if (!user) throw new Error("pas de user connecte");

  const storageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    console.error("erreur suppression photo", error);
  }
}

// upload une photo d activite
export async function uploadActivityImage(imageUri: string, activityId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("pas de user connecte");

  // compresse l image
  const compressedUri = await compressImage(imageUri, 1200, 0.8);

  // converti en blob
  const response = await fetch(compressedUri);
  const blob = await response.blob();

  // upload vers firebase storage
  const storageRef = ref(storage, `activityImages/${user.uid}/${activityId}.jpg`);
  await uploadBytes(storageRef, blob);

  // recupere l url publique
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
