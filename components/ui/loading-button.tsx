// bouton avec indicateur de chargement
import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors } from "../../constants/color";

interface LoadingButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export function LoadingButton({
  title,
  loading = false,
  variant = "primary",
  buttonStyle,
  textStyle,
  disabled,
  ...props
}: LoadingButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case "primary":
        return s.primaryButton;
      case "secondary":
        return s.secondaryButton;
      case "danger":
        return s.dangerButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "primary":
        return s.primaryText;
      case "secondary":
        return s.secondaryText;
      case "danger":
        return s.dangerText;
    }
  };

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      style={[
        s.button,
        getButtonStyle(),
        (disabled || loading) && s.buttonDisabled,
        buttonStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" ? colors.text : "#fff"}
          size="small"
        />
      ) : (
        <Text style={[s.text, getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  dangerButton: {
    backgroundColor: "#ef4444",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryText: {
    color: "#0b111f",
  },
  secondaryText: {
    color: colors.text,
  },
  dangerText: {
    color: "#fff",
  },
});
