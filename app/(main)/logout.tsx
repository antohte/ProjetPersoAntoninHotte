import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { colors } from "../../constants/color";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await signOut(auth);
      } finally {
        router.replace("/"); // retour accueil
      }
    })();
  }, []);

  return (
    <View style={{ flex:1, backgroundColor: colors.bg, justifyContent:"center", alignItems:"center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
