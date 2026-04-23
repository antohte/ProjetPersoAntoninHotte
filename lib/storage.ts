import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth } from "./firebase";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const storage = getStorage();

export async function compressImage(uri: string, maxWidth = 800, quality = 0.8) {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: maxWidth });
    const imageRef = await ctx.renderAsync();
    const result = await imageRef.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    return uri;
  }
}

async function uploadImage(uri: string, path: string, maxWidth: number, quality: number): Promise<string> {
  const compressed = await compressImage(uri, maxWidth, quality);
  const blob = await fetch(compressed).then((r) => r.blob());
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadProfilePicture(imageUri: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("pas de user connecte");
  return uploadImage(imageUri, `profilePictures/${user.uid}.jpg`, 400, 0.7);
}

export async function deleteProfilePicture() {
  const user = auth.currentUser;
  if (!user) throw new Error("pas de user connecte");
  try {
    await deleteObject(ref(storage, `profilePictures/${user.uid}.jpg`));
  } catch (error) {
    console.error("erreur suppression photo", error);
  }
}

export async function uploadActivityImage(imageUri: string, activityId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("pas de user connecte");
  return uploadImage(imageUri, `activityImages/${user.uid}/${activityId}.jpg`, 1200, 0.8);
}
