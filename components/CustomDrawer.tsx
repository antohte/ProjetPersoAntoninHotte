import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from "@react-navigation/drawer";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { colors } from "../constants/color";
import { UserAvatar } from "./UserAvatar";

export default function CustomDrawer(props: DrawerContentComponentProps) {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const unsub = onSnapshot(doc(db, "users", u.uid), (snap) => setUserData(snap.data() || null));
    return unsub;
  }, []);

  const displayName = userData?.displayName || auth.currentUser?.email || "Mon profil";
  const sub = userData?.program || auth.currentUser?.email || "—";

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      <View style={s.header}>
        <UserAvatar
          userId={auth.currentUser?.uid}
          size={52}
          userName={displayName}
          photoURL={userData?.photoURL}
        />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{displayName}</Text>
          <Text style={s.sub}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={() => props.navigation.navigate("profile-edit" as never)}>
          <Text style={s.edit}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: "#0b111f" }}>
        <DrawerItemList {...props} />
      </View>

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
  name: { color: colors.text, fontWeight: "800", fontSize: 16 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  edit: { color: colors.primary, fontWeight: "700" },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: "#111826", backgroundColor: "#0b111f" },
  footerText: { color: colors.muted, fontSize: 12, textAlign: "center" },
});
