import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../constants/color";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger";

type BadgeProps = {
  children: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
};

export function Badge({ children, variant = "default", style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  default: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  primary: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  success: {
    backgroundColor: "#16a34a20",
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  warning: {
    backgroundColor: "#f59e0b20",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  danger: {
    backgroundColor: "#ef444420",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  defaultText: {
    color: colors.text,
  },
  primaryText: {
    color: colors.primary,
  },
  successText: {
    color: "#16a34a",
  },
  warningText: {
    color: "#f59e0b",
  },
  dangerText: {
    color: "#ef4444",
  },
});
