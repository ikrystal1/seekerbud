import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { useAuthorization } from "../../utils/useAuthorization";
import { COLORS, RADIUS } from "../../theme";

export function ProfileStep({
  name,
  onNameChange,
  onNext,
}: {
  name: string;
  onNameChange: (v: string) => void;
  onNext: () => void;
}) {
  const { selectedAccount } = useAuthorization();
  const addr = selectedAccount?.address ?? "";

  return (
    <View style={styles.container}>
      {/* ── TOP ── */}
      <View style={styles.top}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>This is how SeekerBud will greet you.</Text>
      </View>

      {/* ── MIDDLE ── */}
      <View style={styles.middle}>
        <TextInput
          style={styles.input}
          placeholder="Display name (optional)"
          placeholderTextColor={COLORS.textSecondary}
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          returnKeyType="done"
        />
        <View style={styles.walletRow}>
          <ShieldCheck size={18} color={COLORS.green} />
          <View style={styles.walletText}>
            <Text style={styles.walletLabel}>Wallet connected</Text>
            {addr ? (
              <Text style={styles.walletAddr}>
                {addr.slice(0, 6)}...{addr.slice(-4)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── BOTTOM ── */}
      <TouchableOpacity style={styles.cta} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.ctaText}>Continue</Text>
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
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: 15,
    padding: 16,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  walletText: {
    flex: 1,
    gap: 3,
  },
  walletLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  walletAddr: {
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
