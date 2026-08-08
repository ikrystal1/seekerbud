import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import {
  Coins,
  Clock,
  ArrowUpRight,
  Info,
  Wallet,
  AlertCircle,
  type LucideIcon,
} from "lucide-react-native";
import type { ReplyIcon } from "../../services/chat";
import { COLORS } from "../../theme";

const REPLY_ICONS: Record<ReplyIcon, LucideIcon> = {
  balance: Wallet,
  tokens: Coins,
  activity: Clock,
  send: ArrowUpRight,
  info: Info,
};

export function MessageBubble({
  isUser,
  text,
  icon,
  costUsd,
}: {
  isUser: boolean;
  text?: string;
  icon?: ReplyIcon;
  costUsd?: number;
}) {
  const theme = useTheme();
  const Icon = icon ? REPLY_ICONS[icon] : undefined;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser
              ? COLORS.purple
              : theme.colors.surfaceVariant,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
          },
        ]}
      >
        {Icon && (
          <View style={styles.iconRow}>
            <Icon size={14} color={COLORS.blue} />
          </View>
        )}
        <Text variant="bodyMedium" style={[styles.text, isUser && styles.textUser]}>
          {text}
        </Text>
        {!isUser && costUsd != null && (
          <Text variant="labelSmall" style={styles.cost}>
            {costUsd} USDC · x402
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 6,
    flexDirection: "row",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
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
  text: {
    lineHeight: 20,
  },
  textUser: {
    color: "#fff",
  },
  cost: {
    marginTop: 6,
    opacity: 0.55,
    textAlign: "right",
  },
});
