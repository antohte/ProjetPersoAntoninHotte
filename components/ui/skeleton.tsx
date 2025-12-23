import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { colors } from "../../constants/color";

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        style,
        {
          opacity,
        },
      ]}
    />
  );
}

export function SkeletonActivityCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width="40%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={12} />
        </View>
      </View>

      <View style={styles.body}>
        <Skeleton width="80%" height={20} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 16 }} />

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <Skeleton width={120} height={32} borderRadius={12} />
          <Skeleton width={100} height={32} borderRadius={12} />
        </View>

        <Skeleton width={150} height={12} />
      </View>
    </View>
  );
}

export function SkeletonProfileCard() {
  return (
    <View style={styles.profileCard}>
      <Skeleton width={64} height={64} borderRadius={32} />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#1e293b",
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  body: {
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
});
