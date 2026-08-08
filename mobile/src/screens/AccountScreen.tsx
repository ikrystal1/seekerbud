import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Copy, Check, Coins, Clock } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useAuthorization } from "../utils/useAuthorization";
import { COLORS, RADIUS } from "../theme";

const MASCOT = require("../../assets/adaptive-icon.png");

function InfoRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, dim && styles.dimValue]}>{value}</Text>
    </View>
  );
}

export function AccountScreen({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const { selectedAccount } = useAuthorization();
  const [copied, setCopied] = useState(false);

  const fullAddress = selectedAccount?.publicKey.toBase58() ?? "—";
  const shortAddress = fullAddress !== "—"
    ? `${fullAddress.slice(0, 4)}...${fullAddress.slice(-4)}`
    : "—";

  const handleCopy = async () => {
    if (fullAddress === "—") return;
    await Clipboard.setStringAsync(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Sticky header ── */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Wallet</Text>
        {onBack && <View style={styles.backBtn} />}
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Address card */}
        <View style={styles.card}>
          <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />

          <View style={styles.networkBadge}>
            <Text style={styles.networkText}>Devnet</Text>
          </View>

          <Text style={styles.address}>{shortAddress}</Text>

          <TouchableOpacity
            style={[styles.copyBtn, copied && styles.copyBtnDone]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            {copied
              ? <Check size={14} color="#0B0B12" />
              : <Copy size={14} color="#0B0B12" />}
            <Text style={styles.copyText}>{copied ? "Copied!" : "Copy address"}</Text>
          </TouchableOpacity>
        </View>

        {/* Balance rows */}
        <View style={styles.statsCard}>
          <InfoRow label="SOL Balance" value="— SOL" dim />
          <View style={styles.divider} />
          <InfoRow label="USD Value" value="$—" dim />
        </View>

        {/* Tokens */}
        <Text style={styles.sectionLabel}>TOKENS</Text>
        <View style={styles.emptyCard}>
          <Coins size={20} color={COLORS.textSecondary} style={{ opacity: 0.4 }} />
          <Text style={styles.emptyText}>Token balances coming soon</Text>
        </View>

        {/* Activity */}
        <Text style={styles.sectionLabel}>ACTIVITY</Text>
        <View style={styles.emptyCard}>
          <Clock size={20} color={COLORS.textSecondary} style={{ opacity: 0.4 }} />
          <Text style={styles.emptyText}>Transaction history coming soon</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Sticky header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  // Scrollable area
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 10,
  },

  // Address card — compact
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  mascot: {
    width: 52,
    height: 52,
    marginBottom: 2,
  },
  networkBadge: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  networkText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.blue,
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  copyBtnDone: {
    backgroundColor: COLORS.accent,
  },
  copyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0B0B12",
  },

  // Balance
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  dimValue: {
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 16,
  },

  // Empty states
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: 6,
    marginLeft: 2,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
});
