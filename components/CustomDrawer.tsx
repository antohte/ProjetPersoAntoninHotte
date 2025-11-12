import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from "@react-navigation/drawer";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { colors } from "../constants/color";

export default function CustomDrawer(props: DrawerContentComponentProps) {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const ref = doc(db, "users", u.uid);
    const unsub = onSnapshot(ref, (snap) => setUserData(snap.data() || null));
    return unsub;
  }, []);

  // pp
  const initials =
    (userData?.displayName?.[0] || auth.currentUser?.email?.[0] || "?").toUpperCase();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      {/* Header profil */}
      <View style={s.header}>
        {userData?.avatarUrl ? (
          <Image source={{ uri: userData.avatarUrl }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{userData?.displayName || "Mon profil"}</Text>
          <Text style={s.sub}>
            {userData?.program || auth.currentUser?.email || "—"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => props.navigation.navigate("profile-edit" as never)}>
            <Text style={s.edit}>Modifier</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des items du Drawer (Activités, Profil, etc.) */}
      <View style={{ flex: 1, backgroundColor: "#0b111f" }}>
        <DrawerItemList {...props} />
      </View>

      {/* Footer éventuel */}
      <View style={s.footer}>
        <Text style={s.footerText}>v0.1 • Catho Lille</Text>
      </View>
    </DrawerContentScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: "#0b111f",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111826",
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1f2937" },
  avatarFallback: { justifyContent: "center", alignItems: "center" },
  avatarText: { color: colors.text, fontWeight: "800", fontSize: 18 },
  name: { color: colors.text, fontWeight: "800", fontSize: 16 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  edit: { color: colors.primary, fontWeight: "700" },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: "#111826", backgroundColor: "#0b111f" },
  footerText: { color: colors.muted, fontSize: 12, textAlign: "center" },
});
