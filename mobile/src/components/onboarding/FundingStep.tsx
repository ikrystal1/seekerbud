import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  PiggyBank,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react-native";
import { getOrCreateAgentWallet } from "../../services/agentWallet";
import { COLORS, RADIUS } from "../../theme";
import { CtaButton } from "../ui/CtaButton";

export type FundingMode = "prepaid" | "user";

const OPTIONS: {
  mode: FundingMode;
  Icon: LucideIcon;
  iconColor: string;
  title: string;
  desc: string;
}[] = [
  {
    mode: "prepaid",
    Icon: PiggyBank,
    iconColor: COLORS.purple,
    title: "Prepaid wallet",
    desc: "A private wallet on your phone — top up once, then chat freely.",
  },
  {
    mode: "user",
    Icon: CircleDollarSign,
    iconColor: COLORS.green,
    title: "Pay as you go",
    desc: "Approve each message with your Seed Vault fingerprint.",
  },
];

export function FundingStep({ onComplete }: { onComplete: (mode: FundingMode) => void }) {
  const [mode, setMode] = useState<FundingMode>("prepaid");
  const [submitting, setSubmitting] = useState(false);

  async function handleStartChatting() {
    setSubmitting(true);
    try {
      if (mode === "prepaid") {
        // Generate the agent wallet now — not when the option is selected
        await getOrCreateAgentWallet();
      }
      await onComplete(mode);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* ── TOP ── */}
      <View style={styles.top}>
        <Text style={styles.title}>How do you want to pay?</Text>
        <Text style={styles.subtitle}>
          Every AI message costs a few cents in USDC via x402. No subscriptions.
        </Text>
      </View>

      {/* ── MIDDLE ── */}
      <View style={styles.middle}>
        {OPTIONS.map(({ mode: optMode, Icon, iconColor, title, desc }) => (
          <TouchableOpacity
            key={optMode}
            style={[styles.card, mode === optMode && styles.cardSelected]}
            onPress={() => setMode(optMode)}
            activeOpacity={0.85}
          >
            <Icon size={22} color={iconColor} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDesc}>{desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── PREPAID WALLET INFO ── */}
        {mode === "prepaid" && (
          <View style={styles.walletSection}>
            <Text style={styles.walletHint}>
              A private Solana wallet will be created on your device when you continue.
              You can fund it anytime from your main wallet.
            </Text>
          </View>
        )}

        {mode === "user" && (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>
              Each message asks your Seed Vault to approve a tiny USDC payment (~$0.004).
              No subscriptions, no prepaid balance.
            </Text>
          </View>
        )}
      </View>

      {/* ── BOTTOM ── */}
      <CtaButton
        onPress={handleStartChatting}
        loading={submitting}
      >
        Start chatting
      </CtaButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  // ── TOP ──────────────────────────────────────────────────
  top: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // ── MIDDLE ───────────────────────────────────────────────
  middle: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardSelected: {
    borderColor: COLORS.accent,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // ── PREPAID WALLET INFO ──────────────────────────────────
  walletSection: {
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  walletHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  userInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  userInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
});
