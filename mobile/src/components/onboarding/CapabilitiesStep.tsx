import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { Wallet, Coins, Clock, ArrowUpRight } from "lucide-react-native";
import { PrimaryButton } from "../ui/PrimaryButton";
import { COLORS, RADIUS } from "../../theme";

const CAPABILITIES = [
  {
    icon: Wallet,
    label: '"How much SOL do I have?"',
    color: COLORS.purple,
  },
  { icon: Coins, label: '"What tokens do I own?"', color: COLORS.blue },
  { icon: Clock, label: '"What did I do today?"', color: COLORS.green },
  { icon: ArrowUpRight, label: '"Send 0.05 SOL to Bob"', color: COLORS.orange },
];

export function CapabilitiesStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <Text variant="labelLarge" style={styles.header}>
        Step 2 of 3 — What I can do
      </Text>
      {CAPABILITIES.map((c) => (
        <Card key={c.label} style={styles.card}>
          <Card.Content style={styles.row}>
            <c.icon size={22} color={c.color} />
            <Text variant="bodyMedium" style={styles.label}>
              {c.label}
            </Text>
          </Card.Content>
        </Card>
      ))}
      <Text variant="bodySmall" style={styles.note}>
        I can prepare actions — you always confirm and sign with your Seed
        Vault.
      </Text>
      <PrimaryButton onPress={onNext}>Got it</PrimaryButton>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 10,
    borderRadius: RADIUS.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    flex: 1,
  },
  note: {
    opacity: 0.7,
    marginVertical: 12,
  },
});
