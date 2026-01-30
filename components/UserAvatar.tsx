import React, { useEffect, useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { colors } from "../constants/color";

type UserAvatarProps = {
  userId: string;
  size?: number;
  userName?: string;
};

export function UserAvatar({ userId, size = 40, userName }: UserAvatarProps) {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserPhoto = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPhotoURL(userData.photoURL || null);
        }
      } catch (error) {
        console.error("erreur chargement photo", error);
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
