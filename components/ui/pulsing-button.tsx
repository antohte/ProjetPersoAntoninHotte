// bouton avec effet pulse pour attirer lattention
import React, { useEffect, useRef } from "react";
import { TouchableOpacity, Animated, StyleSheet, Text, ViewStyle, TextStyle } from "react-native";
import { colors } from "../../constants/color";

interface PulsingButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  variant?: "primary" | "success";
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PulsingButton({
  onPress,
  title,
  disabled = false,
  variant = "primary",
  style,
  textStyle,
}: PulsingButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!disabled) {
      // animation pulse continue
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.7,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [disabled]);

  const backgroundColor = disabled
    ? "#4b5563"
    : variant === "success"
    ? "#16a34a"
    : colors.primary;

  return (
    <Animated.View
      style={{
        transform: [{ scale: disabled ? 1 : scaleAnim }],
        opacity: disabled ? 0.5 : opacityAnim,
      }}
    >
      <TouchableOpacity
        style={[s.button, { backgroundColor }, style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[s.text, textStyle]}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#0b111f",
    fontSize: 16,
    fontWeight: "700",
  },
});
