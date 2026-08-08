import { PublicKey } from "@solana/web3.js";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { X, Check, ArrowUpRight, ShieldCheck } from "lucide-react-native";
import { useTransferSol } from "../account/account-data-access";
import { useAuthorization } from "../../utils/useAuthorization";
import { COLORS, RADIUS } from "../../theme";

export type ActionCardCallbacks = {
  onResult: (signature?: string, error?: string) => void;
};

export function ActionCard({
  proposal,
  callbacks,
}: {
  proposal: { amount: string; to: string; fee_estimate: string };
  callbacks?: ActionCardCallbacks;
}) {
  const theme = useTheme();
  const { selectedAccount } = useAuthorization();
  const transferSol = useTransferSol({
    address: selectedAccount?.publicKey ?? new PublicKey(0),
  });

  const confirm = () => {
    if (!selectedAccount) return;
    transferSol
      .mutateAsync({
        destination: new PublicKey(proposal.to),
        amount: parseFloat(proposal.amount),
      })
      .then((signature) => callbacks?.onResult(signature, undefined))
      .catch((err: unknown) => {
        callbacks?.onResult(
          undefined,
          err instanceof Error ? err.message : String(err)
        );
      });
  };

  return (
    <View style={styles.row}>
      <Card style={styles.card}>
        <Card.Title
          title="Send SOL"
          titleVariant="titleMedium"
          left={() => <ArrowUpRight size={20} color={theme.colors.primary} />}
        />
        <Card.Content>
          <View style={styles.line}>
            <Text style={styles.label}>Amount</Text>
            <Text variant="titleMedium">{proposal.amount} SOL</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>To</Text>
            <Text variant="bodyMedium" selectable>
              {proposal.to}
            </Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.label}>Network fee</Text>
            <Text variant="bodySmall">~{proposal.fee_estimate} SOL</Text>
          </View>
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => callbacks?.onResult(undefined, "cancelled")}
              style={styles.actionButton}
              icon={() => <X size={16} />}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={confirm}
              loading={transferSol.isPending}
              disabled={transferSol.isPending}
              style={styles.actionButton}
              icon={() => <Check size={16} />}
            >
              Confirm
            </Button>
          </View>
          <View style={styles.secureRow}>
            <ShieldCheck size={12} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={styles.secureText}>
              Confirm opens your Seed Vault to sign. I never hold your keys.
            </Text>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 6,
    alignItems: "flex-start",
  },
  card: {
    width: "100%",
    borderRadius: RADIUS.lg,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  label: {
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  secureText: {
    color: COLORS.textSecondary,
    flex: 1,
  },
});
