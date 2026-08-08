import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useAuthorization } from "../utils/useAuthorization";
import { nextId, sendMessage, type ChatMessage } from "../services/chat";
import { loadChatHistory, saveChatHistory, toHistoryItems } from "../services/chatHistory";
import { Message, type MessageCallbacks } from "../components/chat/Message";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ChatInput } from "../components/chat/ChatInput";
import { TypingIndicator } from "../components/chat/TypingIndicator";
import { SuggestionChips } from "../components/chat/SuggestionChips";
import { EmptyState } from "../components/chat/EmptyState";
import { useOnboarding } from "../context/OnboardingContext";

export function ChatScreen({
  onWallet,
  onSettings,
}: {
  onWallet?: () => void;
  onSettings?: () => void;
}) {
  const { selectedAccount } = useAuthorization();
  const { state: onboarding, reset } = useOnboarding();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const streamRef = useRef("");
  const listRef = useRef<FlatList>(null);

  // Restore the conversation from on-device memory.
  useEffect(() => {
    loadChatHistory()
      .then((saved) => {
        if (saved.length > 0) setMessages(saved);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Persist every change to on-device memory.
  useEffect(() => {
    if (!loaded) return;
    void saveChatHistory(messages);
  }, [messages, loaded]);

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
      streamRef.current = "";
      setStreamText("");
      try {
        // Replay the recent conversation so the agent has context
        // (only plain user/assistant text — no actions, no errors).
        const history = toHistoryItems(messages);
        const events = await sendMessage(
          selectedAccount.publicKey,
          text,
          { history, name: onboarding.name },
          (delta) => {
            streamRef.current += delta;
            setStreamText(streamRef.current);
          }
        );
        const streamed = streamRef.current;
        const textEvent = events.find((e) => e.type === "text") as
          | { type: "text"; content: string; costUsd?: number }
          | undefined;
        if (streamed) {
          append({
            id: nextId(),
            role: "assistant",
            text: streamed,
            costUsd: textEvent?.costUsd,
            ts: Date.now(),
          });
        }
        for (const event of events) {
          if (event.type === "action") {
            append({
              id: nextId(),
              role: "assistant",
              action: event.proposal,
              ts: Date.now(),
            });
          }
        }
      } catch (err) {
        append({
          id: nextId(),
          role: "assistant",
          text: `Something went wrong: ${err instanceof Error ? err.message : String(err)}`,
          isError: true,
          retryText: text,
          ts: Date.now(),
        });
      } finally {
        setSending(false);
        streamRef.current = "";
        setStreamText("");
      }
    },
    [input, sending, selectedAccount, append, messages]
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

  const callbacks: MessageCallbacks = {
    onResult: handleActionResult,
    onRetry: (text) => void handleSend(text),
  };

  const data: ChatMessage[] = sending
    ? [...messages, { id: "stream", role: "assistant", text: streamText, ts: 0 }]
    : messages;

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
        data={data}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Message message={item} callbacks={callbacks} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={loaded && !sending ? <EmptyState /> : null}
      />

      {sending && streamText === "" && <TypingIndicator />}

      {loaded && !sending && messages.length === 0 && (
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
