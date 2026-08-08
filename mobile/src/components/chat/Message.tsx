import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AlertCircle, RotateCcw } from "lucide-react-native";
import { TouchableOpacity } from "react-native";
import type { ChatMessage } from "../../services/chat";
import { ActionCard, type ActionCardCallbacks } from "./ActionCard";
import { MessageBubble } from "./MessageBubble";

export type MessageCallbacks = ActionCardCallbacks & {
  onRetry?: (text: string) => void;
};

export function Message({
  message,
  callbacks,
}: {
  message: ChatMessage;
  callbacks?: MessageCallbacks;
}) {
  if (message.action) {
    return <ActionCard proposal={message.action} callbacks={callbacks} />;
  }

  if (message.isError) {
    return <ErrorBubble text={message.text ?? ""} retryText={message.retryText} callbacks={callbacks} />;
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

function ErrorBubble({
  text,
  retryText,
  callbacks,
}: {
  text: string;
  retryText?: string;
  callbacks?: MessageCallbacks;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <View style={styles.iconRow}>
          <AlertCircle size={14} color="#FF003C" />
        </View>
        <Text style={styles.errorText}>{text}</Text>
        {retryText && callbacks?.onRetry ? (
          <TouchableOpacity
            onPress={() => callbacks.onRetry?.(retryText)}
            style={styles.retryBtn}
            activeOpacity={0.7}
          >
            <RotateCcw size={14} color="#0B0B12" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
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
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0B0B12",
  },
});
