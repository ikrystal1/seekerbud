import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Wallet, Coins, Clock, ArrowUpRight, type LucideIcon } from "lucide-react-native";
import { COLORS, RADIUS } from "../../theme";
import { CtaButton } from "../ui/CtaButton";

const CAPABILITIES: { Icon: LucideIcon; color: string; label: string }[] = [
  { Icon: Wallet,       color: COLORS.purple, label: "Check your SOL & token balances" },
  { Icon: Coins,        color: COLORS.blue,   label: "Explore tokens you own" },
  { Icon: Clock,        color: COLORS.green,  label: "Review your recent activity" },
  { Icon: ArrowUpRight, color: COLORS.orange, label: "Send SOL with a single message" },
];

export function CapabilitiesStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.container}>
      {/* ── TOP ── */}
      <View style={styles.top}>
        <Text style={styles.title}>Here's what I can do</Text>
        <Text style={styles.subtitle}>Just ask me anything about your wallet.</Text>
      </View>

      {/* ── MIDDLE ── */}
      <View style={styles.middle}>
        {CAPABILITIES.map(({ Icon, color, label }) => (
          <View key={label} style={styles.row}>
            <Icon size={20} color={color} />
            <Text style={styles.rowLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── BOTTOM ── */}
      <CtaButton onPress={onNext}>Got it</CtaButton>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  // ── BOTTOM ───────────────────────────────────────────────
});
