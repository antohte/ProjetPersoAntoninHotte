import { Drawer } from "expo-router/drawer";
import { colors } from "../../constants/color";
import CustomDrawer from "../../components/CustomDrawer";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { auth } from "../../lib/firebase";
import { registerForPushNotificationsAsync } from "../../lib/notifications";

export default function MainLayout() {
  // enregistrer le token push au montage
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      registerForPushNotificationsAsync(user.uid);
    }
  }, []);

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        drawerStyle: { backgroundColor: "#0b111f" },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: { fontWeight: "600" },
      }}
    >
      <Drawer.Screen
        name="feed"
        options={{
          title: "Activités",
          drawerIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profil",
          drawerIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="create-activity"
        options={{
          title: "Créer une activité",
          drawerIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          title: "Notifications",
          drawerIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="logout"
        options={{
          title: "Se déconnecter",
          drawerIcon: ({ color, size }) => <Ionicons name="log-out" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="profile-edit"
        options={{
            // cache l’entrée dans le menu
            drawerItemStyle: { display: "none" },
            // et évite les titres chelous si on ouvre l’écran
            title: "Modifier le profil",
        }}
      />
      <Drawer.Screen
        name="activity-details"
        options={{
            drawerItemStyle: { display: "none" },
            title: "Détails de l'activité",
        }}
      />

    </Drawer>
  );
}

