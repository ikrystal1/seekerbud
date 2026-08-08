import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, RADIUS } from "../../theme";
import type { PaymentRequirement } from "../../services/chat";

/**
 * Payment approval card for "pay as you go" mode. Shown when the gateway
 * asks for a payment: the user reviews the price and approves it with their
 * Seed Vault (fingerprint prompt comes from the wallet itself).
 */
export function PaymentCard({
  requirement,
  signing,
  onApprove,
  onCancel,
}: {
  requirement: PaymentRequirement;
  signing: boolean;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const price = `$${(requirement.priceUsd || 0).toFixed(4)} USDC`;
  const to = `${requirement.payTo.slice(0, 4)}...${requirement.payTo.slice(-4)}`;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>AI PAYMENT · x402</Text>
      <Text style={styles.title}>Approve {price}</Text>
      <Text style={styles.line}>
        A few cents of USDC paid straight to the AI gateway — no subscriptions.
      </Text>
      <Text style={styles.to}>Recipient {to}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.cancel}
          onPress={onCancel}
          disabled={signing}
          activeOpacity={0.85}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approve}
          onPress={onApprove}
          disabled={signing}
          activeOpacity={0.85}
        >
          {signing ? (
            <ActivityIndicator size="small" color="#0B0B12" />
          ) : (
            <Text style={styles.approveText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  line: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  to: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: "monospace",
  },
  buttons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  cancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  approve: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  approveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B0B12",
  },
});
