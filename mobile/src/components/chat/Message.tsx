import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { AlertCircle } from "lucide-react-native";
import type { ChatMessage } from "../../services/chat";
import { MessageBubble } from "./MessageBubble";
import { ActionCard, type ActionCardCallbacks } from "./ActionCard";

export function Message({
  message,
  callbacks,
}: {
  message: ChatMessage;
  callbacks?: ActionCardCallbacks;
}) {
  const theme = useTheme();

  if (message.action) {
    return <ActionCard proposal={message.action} callbacks={callbacks} />;
  }

  if (message.isError) {
    return <ErrorBubble text={message.text ?? ""} />;
  }

  return (
    <MessageBubble
      isUser={message.role === "user"}
      text={message.text}
      icon={message.icon}
      costUsd={message.costUsd}
    />
  );
}

function ErrorBubble({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.bubble, { backgroundColor: theme.colors.errorContainer }]}>
        <View style={styles.iconRow}>
          <AlertCircle size={14} color={theme.colors.error} />
        </View>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 6,
    flexDirection: "row",
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  iconRow: {
    marginBottom: 4,
  },
});
