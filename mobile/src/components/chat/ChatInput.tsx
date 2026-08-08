import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RADIUS } from "../../theme";

export function ChatInput({
  value,
  onChangeText,
  onSubmit,
  disabled,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingBottom: insets.bottom + 8 }]}>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        placeholder="Ask me anything..."
        onSubmitEditing={onSubmit}
        style={styles.input}
        dense
      />
      <Button
        mode="contained"
        onPress={onSubmit}
        disabled={!value.trim() || disabled}
        style={styles.sendButton}
        icon={() => <Send size={16} color="#fff" />}
      >
        Send
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
  },
  sendButton: {
    borderRadius: RADIUS.pill,
  },
});
