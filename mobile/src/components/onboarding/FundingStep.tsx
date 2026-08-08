import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PiggyBank, CircleDollarSign, type LucideIcon } from "lucide-react-native";
import { COLORS, RADIUS } from "../../theme";

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
    desc: "Top up once, then chat freely.",
  },
  {
    mode: "user",
    Icon: CircleDollarSign,
    iconColor: COLORS.green,
    title: "Pay as you go",
    desc: "Sign each message with your Seed Vault.",
  },
];

export function FundingStep({ onComplete }: { onComplete: (mode: FundingMode) => void }) {
  const [mode, setMode] = useState<FundingMode>("prepaid");

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
      </View>

      {/* ── BOTTOM ── */}
      <TouchableOpacity
        style={styles.cta}
        onPress={() => onComplete(mode)}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Start chatting</Text>
      </TouchableOpacity>
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
  // ── BOTTOM ───────────────────────────────────────────────
  cta: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B0B12",
  },
});
