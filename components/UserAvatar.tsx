import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/color";
import { db } from "../lib/firebase";

type UserAvatarProps = {
  userId?: string;
  size?: number;
  userName?: string;
  photoURL?: string; // si fourni, évite le fetch Firestore
};

export function UserAvatar({ userId, size = 40, userName, photoURL: photoProp }: UserAvatarProps) {
  const [photoURL, setPhotoURL] = useState<string | null>(photoProp ?? null);
  const [loading, setLoading] = useState(!photoProp);

  useEffect(() => {
    if (photoProp !== undefined) {
      setPhotoURL(photoProp ?? null);
      setLoading(false);
      return;
    }

    const safeUserId = typeof userId === "string" ? userId.trim() : "";
    if (!safeUserId) {
      setPhotoURL(null);
      setLoading(false);
      return;
    }

    getDoc(doc(db, "users", safeUserId))
      .then((snap) => {
        if (snap.exists()) {
          const raw = snap.data()?.photoURL;
          setPhotoURL(typeof raw === "string" && raw.trim() ? raw.trim() : null);
        } else {
          setPhotoURL(null);
        }
      })
      .catch(() => setPhotoURL(null))
      .finally(() => setLoading(false));
  }, [userId, photoProp]);

  const initial = userName?.[0]?.toUpperCase() || "?";

  if (loading) {
    return <View style={[s.placeholder, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[s.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[s.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.initial, { fontSize: size / 2.5 }]}>{initial}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  placeholder: {
    backgroundColor: "#0f172a",
  },
  image: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  fallback: {
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  initial: {
    color: colors.text,
    fontWeight: "700",
  },
});
