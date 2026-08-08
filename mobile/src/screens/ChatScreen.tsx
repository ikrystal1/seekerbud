import React, { useCallback, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthorization } from "../utils/useAuthorization";
import { useConnection } from "../utils/ConnectionProvider";
import { nextId, sendMessage, type ChatMessage } from "../services/chat";
import { Message } from "../components/chat/Message";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ChatInput } from "../components/chat/ChatInput";
import { TypingIndicator } from "../components/chat/TypingIndicator";
import { SuggestionChips } from "../components/chat/SuggestionChips";
import { useOnboarding } from "../context/OnboardingContext";

export function ChatScreen({
  onWallet,
  onSettings,
}: {
  onWallet?: () => void;
  onSettings?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { connection } = useConnection();
  const { selectedAccount } = useAuthorization();
  const { reset } = useOnboarding();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hey! I'm SeekerBud. Ask me about your wallet on Solana — balance, tokens, activity, or send SOL.",
      icon: "info",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const append = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const handleSend = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || sending || !selectedAccount) return;
      setInput("");
      append({ id: nextId(), role: "user", text, ts: Date.now() });
      setSending(true);
      try {
        const events = await sendMessage(connection, selectedAccount.publicKey, text);
        for (const event of events) {
          if (event.type === "text") {
            append({
              id: nextId(),
              role: "assistant",
              text: event.content,
              icon: event.icon,
              costUsd: event.costUsd,
              ts: Date.now(),
            });
          } else if (event.type === "action") {
            append({
              id: nextId(),
              role: "assistant",
              action: event.proposal,
              ts: Date.now(),
            });
          } else {
            append({
              id: nextId(),
              role: "assistant",
              text: event.content,
              isError: true,
              ts: Date.now(),
            });
          }
        }
      } catch (err) {
        append({
          id: nextId(),
          role: "assistant",
          text: `Something went wrong: ${
            err instanceof Error ? err.message : String(err)
          }`,
          ts: Date.now(),
        });
      } finally {
        setSending(false);
      }
    },
    [input, sending, selectedAccount, connection, append]
  );

  const handleActionResult = useCallback(
    (signature?: string, error?: string) => {
      if (error === "cancelled") {
        append({
          id: nextId(),
          role: "assistant",
          text: "Cancelled — nothing was sent.",
          ts: Date.now(),
        });
        return;
      }
      if (error) {
        append({
          id: nextId(),
          role: "assistant",
          text: `Transfer failed: ${error}`,
          isError: true,
          ts: Date.now(),
        });
        return;
      }
      append({
        id: nextId(),
        role: "assistant",
        text: `Transaction complete! Signature: ${signature}`,
        icon: "send",
        ts: Date.now(),
      });
    },
    [append]
  );

  return (
    <View style={styles.container}>
      <ChatHeader
        address={selectedAccount?.address}
        onReset={() => reset()}
        onWallet={onWallet}
        onSettings={onSettings}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <Message message={item} callbacks={{ onResult: handleActionResult }} />
        )}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {sending && <TypingIndicator />}

      {!sending && messages.length <= 1 && (
        <SuggestionChips onSelect={handleSend} />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ChatInput
          value={input}
          onChangeText={setInput}
          onSubmit={() => handleSend()}
          disabled={sending}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },
});
