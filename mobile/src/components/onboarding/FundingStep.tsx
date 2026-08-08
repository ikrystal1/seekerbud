import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { Zap, Fingerprint, CircleDollarSign } from "lucide-react-native";
import { PrimaryButton } from "../ui/PrimaryButton";
import { RADIUS } from "../../theme";

export type FundingMode = "prepaid" | "user";

export function FundingStep({
  onComplete,
}: {
  onComplete: (mode: FundingMode) => void;
}) {
  const theme = useTheme();
  const [mode, setMode] = useState<FundingMode>("prepaid");

  const options: {
    mode: FundingMode;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }[] = [
    {
      mode: "prepaid",
      icon: <Zap size={18} color={theme.colors.primary} />,
      title: "Prepaid agent wallet",
      desc: "Top up once with your wallet, then chat seamlessly.",
    },
    {
      mode: "user",
      icon: <Fingerprint size={18} color={theme.colors.secondary} />,
      title: "Pay as you go",
      desc: "Sign each message with your Seed Vault.",
    },
  ];

  return (
    <>
      <Text variant="labelLarge" style={styles.header}>
        Step 3 of 3 — Paying for your AI buddy
      </Text>
      <Text variant="bodySmall" style={styles.note}>
        <CircleDollarSign size={14} /> Every chat message costs a few cents
        (USDC) paid via x402. No API keys, no subscriptions.
      </Text>
      {options.map((o) => (
        <Card
          key={o.mode}
          mode={mode === o.mode ? "contained" : "outlined"}
          onPress={() => setMode(o.mode)}
          style={styles.card}
        >
          <Card.Content style={styles.row}>
            {o.icon}
            <Text variant="titleSmall" style={styles.rowTitle}>
              {o.title}
            </Text>
            <Text variant="bodySmall">{o.desc}</Text>
          </Card.Content>
        </Card>
      ))}
      <PrimaryButton onPress={() => onComplete(mode)} style={styles.button}>
        Start chatting
      </PrimaryButton>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  note: {
    opacity: 0.7,
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    borderRadius: RADIUS.md,
  },
  row: {
    gap: 8,
  },
  rowTitle: {
    fontWeight: "bold",
  },
  button: {
    marginTop: 8,
  },
});
