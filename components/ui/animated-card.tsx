import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle, TouchableOpacity } from "react-native";

type AnimatedCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  delay?: number;
  style?: ViewStyle;
};

export function AnimatedCard({ children, onPress, delay = 0, style }: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
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

  const animatedStyle = {
    opacity,
    transform: [{ translateY }, { scale }],
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={[animatedStyle, style]}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
