import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, RADIUS } from "../../theme";

const SUGGESTIONS = [
  "What's my SOL balance?",
  "Show my tokens",
  "Recent activity",
  "Send SOL",
];

export function SuggestionChips({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  return (
    <View style={styles.container}>
      {SUGGESTIONS.map((s) => (
        <TouchableOpacity
          key={s}
          onPress={() => onSelect(s)}
          style={styles.chip}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
