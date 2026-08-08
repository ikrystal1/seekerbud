import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";
import { RADIUS } from "../../theme";

const SUGGESTIONS = [
  "How much SOL do I have?",
  "What tokens do I own?",
  "What did I do today?",
  "Send 0.05 SOL to 7xK...",
];

export function SuggestionChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <View style={styles.row}>
      {SUGGESTIONS.map((s) => (
        <Button
          key={s}
          mode="outlined"
          compact
          onPress={() => onSelect(s)}
          style={styles.chip}
        >
          {s}
        </Button>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  chip: {
    borderRadius: RADIUS.pill,
  },
});
