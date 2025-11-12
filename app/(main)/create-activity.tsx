import { View, Text, StyleSheet } from "react-native";

export default function CreateActivityScreen() {
  return (
    <View style={s.container}>
      <Text style={s.txt}>Créer une activité (placeholder)</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  txt: { fontSize: 20 }
});
