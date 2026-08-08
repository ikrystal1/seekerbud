import React from "react";
import { StyleSheet, View } from "react-native";
import { COLORS } from "../../theme";

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.bar, i <= current && styles.barActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 6,
    marginBottom: 32,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  barActive: {
    backgroundColor: COLORS.purple,
  },
});
