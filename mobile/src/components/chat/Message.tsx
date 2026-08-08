import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import type { ChatMessage } from "../../services/chat";
import { ActionCard, type ActionCardCallbacks } from "./ActionCard";
import { MessageBubble } from "./MessageBubble";

export function Message({
  message,
  callbacks,
}: {
  message: ChatMessage;
  callbacks?: ActionCardCallbacks;
}) {
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
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <View style={styles.iconRow}>
          <AlertCircle size={14} color="#FF003C" />
        </View>
        <Text style={styles.errorText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginVertical: 4,
  },
  bubble: {
    backgroundColor: "#2D0A0A",
    borderRadius: 12,
    padding: 12,
    maxWidth: "80%",
  },
  iconRow: {
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#FF6B6B",
  },
});
