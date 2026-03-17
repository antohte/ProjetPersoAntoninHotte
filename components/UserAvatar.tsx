import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/color";
import { db } from "../lib/firebase";

type UserAvatarProps = {
  userId?: string;
  size?: number;
  userName?: string;
};

export function UserAvatar({ userId, size = 40, userName }: UserAvatarProps) {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safeUserId = typeof userId === "string" ? userId.trim() : "";
    if (!safeUserId) {
      setPhotoURL(null);
      setLoading(false);
      return;
    }

    const loadUserPhoto = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", safeUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const rawPhotoURL = userData?.photoURL;
          const safePhotoURL =
            typeof rawPhotoURL === "string" && rawPhotoURL.trim().length > 0
              ? rawPhotoURL.trim()
              : null;
          setPhotoURL(safePhotoURL);
        } else {
          setPhotoURL(null);
        }
      } catch (error) {
        console.error("erreur chargement photo", error);
        setPhotoURL(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserPhoto();
  }, [userId]);

  const initial = userName?.[0]?.toUpperCase() || "?";

  if (loading) {
    return (
      <View
        style={[
          s.placeholder,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          s.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        s.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
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
