import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../constants/color";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>ProjetPerso{"\n"}AntoninHotte</Text>
        <Text style={styles.subtitle}>
          Fais-toi des potes à la Catho.{'\n'}
          Postez des sorties et rejoignez-vous.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push("/login")}
          activeOpacity={0.9}
        >
          <Text style={styles.btnPrimaryText}>Se connecter</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>v0.1 — prototype</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  hero: { gap: 16 },
  logo: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  actions: { gap: 12 },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#0b111f",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 12,
  },
});
