import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PiggyBank,
  CircleDollarSign,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { getOrCreateAgentWallet, type AgentWallet } from "../../services/agentWallet";
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
  const [agentWallet, setAgentWallet] = useState<AgentWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode !== "prepaid") return;

    let cancelled = false;

    async function load() {
      setLoadingWallet(true);
      try {
        const wallet = await getOrCreateAgentWallet();
        if (!cancelled) setAgentWallet(wallet);
      } finally {
        if (!cancelled) setLoadingWallet(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [mode]);

  async function handleCopy() {
    if (!agentWallet) return;
    await Clipboard.setStringAsync(agentWallet.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shortAddress(address: string) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
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
            {loadingWallet && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
                <Text style={styles.loadingText}>Generating wallet…</Text>
              </View>
            )}

            {!loadingWallet && agentWallet && (
              <View style={styles.walletCard}>
                {/* Row 1 – label + address pill */}
                <View style={styles.walletRow}>
                  <Text style={styles.walletLabel}>AGENT WALLET</Text>
                  <View style={styles.addressPill}>
                    <Text style={styles.addressText}>
                      {shortAddress(agentWallet.publicKey)}
                    </Text>
                  </View>
                </View>

                {/* Row 2 – copy button */}
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopy}
                  activeOpacity={0.8}
                >
                  {copied ? (
                    <Check size={13} color={COLORS.green} />
                  ) : (
                    <Copy size={13} color="#0B0B12" />
                  )}
                  <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                    {copied ? "Copied!" : "Copy address"}
                  </Text>
                </TouchableOpacity>

                {/* Row 3 – info */}
                <Text style={styles.walletInfo}>
                  Top up with USDC from your Seed Vault after connecting. Messages cost ~$0.01 each.
                </Text>
              </View>
            )}
          </View>
        )}
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
  // ── PREPAID WALLET INFO ──────────────────────────────────
  walletSection: {
    marginTop: 4, // gap: 12 on `middle` already adds spacing
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  walletCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    gap: 10,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  addressPill: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontFamily: "monospace",
  },
  copyButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0B0B12",
  },
  copyTextDone: {
    color: COLORS.green,
  },
  walletInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
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
