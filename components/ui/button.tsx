import React, { useRef } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors } from "../../constants/color";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  onPress: () => void;
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
};

export function Button({
  onPress,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.button,
          styles[variant],
          styles[size],
          isDisabled && styles.disabled,
          { transform: [{ scale }] },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "ghost" ? colors.primary : "#0b111f"}
            size="small"
          />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`], textStyle]}>
              {children}
            </Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 8,
  },
  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: "#ef4444",
  },
  success: {
    backgroundColor: "#16a34a",
  },
  // Sizes
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  // Text styles
  text: {
    fontWeight: "700",
  },
  primaryText: {
    color: "#0b111f",
  },
  secondaryText: {
    color: colors.text,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: "#ffffff",
  },
  successText: {
    color: "#ffffff",
  },
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 17,
  },
  disabled: {
    opacity: 0.5,
  },
});
