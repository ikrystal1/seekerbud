import { PublicKey } from "@solana/web3.js";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowUpRight, ShieldCheck } from "lucide-react-native";
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

  const shortTo =
    proposal.to.length > 10
      ? `${proposal.to.slice(0, 6)}...${proposal.to.slice(-4)}`
      : proposal.to;

  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <ArrowUpRight size={18} color={COLORS.purple} />
          <Text style={styles.headerText}>Send SOL</Text>
        </View>

        <View style={styles.divider} />

        {/* Amount row */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>{proposal.amount} SOL</Text>
        </View>

        <View style={styles.divider} />

        {/* To row */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>To</Text>
          <Text style={styles.value} selectable>
            {shortTo}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Fee row */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Network fee</Text>
          <Text style={styles.value}>~{proposal.fee_estimate} SOL</Text>
        </View>

        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => callbacks?.onResult(undefined, "cancelled")}
            style={styles.cancelBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirm}
            disabled={transferSol.isPending}
            style={styles.confirmBtn}
            activeOpacity={0.8}
          >
            {transferSol.isPending ? (
              <ActivityIndicator size="small" color="#0B0B12" />
            ) : (
              <Text style={styles.confirmText}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <View style={styles.footerNote}>
          <ShieldCheck size={12} color={COLORS.green} />
          <Text style={styles.footerText}>I never hold your keys.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B0B12",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
