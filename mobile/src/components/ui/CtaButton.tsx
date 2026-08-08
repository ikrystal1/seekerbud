import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, RADIUS } from "../../theme";

export function CtaButton({
  children,
  onPress,
  loading = false,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: object;
}) {
  const isDisabled = disabled || loading;

  const inner =
    typeof children === "string" ? (
      <Text style={styles.ctaText}>{children}</Text>
    ) : (
      children
    );

  return (
    <TouchableOpacity
      style={[styles.cta, isDisabled && styles.ctaDisabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#0B0B12" />
          <Text style={styles.ctaText}>Please wait…</Text>
        </View>
      ) : (
        inner
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cta: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    alignSelf: "stretch",
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B0B12",
  },
});
