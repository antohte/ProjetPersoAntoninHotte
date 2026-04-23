import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// layout racine : configure la navigation pour toute l'app
export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(main)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
