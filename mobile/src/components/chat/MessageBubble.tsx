import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  Wallet,
  Coins,
  Clock,
  ArrowUpRight,
  Info,
  type LucideIcon,
} from "lucide-react-native";
import type { ReplyIcon } from "../../services/chat";
import { COLORS } from "../../theme";

const MASCOT = require("../../../assets/adaptive-icon.png");

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
  const Icon = icon ? REPLY_ICONS[icon] : undefined;

  if (isUser) {
    return (
      <View style={[styles.row, styles.rowUser]}>
        <View style={[styles.bubble, styles.bubbleUser]}>
          {Icon ? (
            <View style={styles.iconRow}>
              <Icon size={14} color={COLORS.blue} />
            </View>
          ) : null}
          <Text style={[styles.text, styles.textUser]}>{text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowAssistant]}>
      <Image source={MASCOT} style={styles.avatar} />
      <View style={[styles.bubble, styles.bubbleAssistant]}>
        {Icon ? (
          <View style={styles.iconRow}>
            <Icon size={14} color={COLORS.blue} />
          </View>
        ) : null}
        <Text style={[styles.text, styles.textAssistant]}>{text}</Text>
        {costUsd != null ? (
          <Text style={styles.cost}>{costUsd} USDC · x402</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    alignSelf: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconRow: {
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: "#0B0B12",
  },
  textAssistant: {
    color: COLORS.textPrimary,
  },
  cost: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
});
