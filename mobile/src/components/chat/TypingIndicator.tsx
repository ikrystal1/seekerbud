import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

export function TypingIndicator() {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
        SeekerBud is thinking...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  text: {
    fontSize: 12,
  },
});
