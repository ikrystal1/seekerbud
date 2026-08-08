import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, Copy, Check, Coins, Clock } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useAuthorization } from "../utils/useAuthorization";
import { fetchAccountData, type AccountData } from "../services/account";
import { COLORS, RADIUS } from "../theme";
import { loadAgentWallet } from "../services/agentWallet";
import { useOnboarding } from "../context/OnboardingContext";

const MASCOT = require("../../assets/adaptive-icon.png");

function InfoRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, dim && styles.dimValue]}>{value}</Text>
    </View>
  );
}

const shortSig = (sig: string) => `${sig.slice(0, 4)}...${sig.slice(-4)}`;

export function AccountScreen({ onBack }: { onBack?: () => void }) {
  const { selectedAccount } = useAuthorization();
  const { state } = useOnboarding();
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [copiedAgent, setCopiedAgent] = useState(false);

  useEffect(() => {
    if (state.fundingMode === "prepaid") {
      loadAgentWallet().then((w) => setAgentAddress(w?.publicKey ?? null));
    }
  }, [state.fundingMode]);

  const load = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError("");
    try {
      setData(await fetchAccountData(selectedAccount.publicKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    void load();
  }, [load]);

  const fullAddress = selectedAccount?.publicKey.toBase58() ?? "—";
  const shortAddress = fullAddress !== "—"
    ? `${fullAddress.slice(0, 4)}...${fullAddress.slice(-4)}`
    : "—";
  const network = data?.network === "devnet" ? "Devnet" : "Mainnet";

  const shortAgentAddress = agentAddress
    ? `${agentAddress.slice(0, 4)}...${agentAddress.slice(-4)}`
    : null;

  const handleCopy = async () => {
    if (fullAddress === "—") return;
    await Clipboard.setStringAsync(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAgent = async () => {
    if (!agentAddress) return;
    await Clipboard.setStringAsync(agentAddress);
    setCopiedAgent(true);
    setTimeout(() => setCopiedAgent(false), 2000);
  };

  return (
    <View style={styles.container}>

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
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={COLORS.accent} />
        }
      >
        {/* Address card */}
        <View style={styles.card}>
          <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />

          <View style={styles.networkBadge}>
            <Text style={styles.networkText}>{network}</Text>
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

        {/* Agent wallet card (prepaid) */}
        {shortAgentAddress && (
          <View style={[styles.card, styles.agentCard]}>
            <Text style={styles.agentLabel}>AGENT WALLET</Text>
            <Text style={styles.address}>{shortAgentAddress}</Text>
            <TouchableOpacity
              style={[styles.copyBtn, copiedAgent && styles.copyBtnDone]}
              onPress={handleCopyAgent}
              activeOpacity={0.8}
            >
              {copiedAgent ? (
                <Check size={14} color={COLORS.green} />
              ) : (
                <Copy size={14} color="#0B0B12" />
              )}
              <Text style={[styles.copyText, copiedAgent && styles.copyTextDone]}>
                {copiedAgent ? "Copied!" : "Copy & fund"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Balance rows */}
        <View style={styles.statsCard}>
          <InfoRow
            label="SOL Balance"
            value={loading ? "—" : `${(data?.sol_balance ?? 0).toFixed(4)} SOL`}
            dim={loading}
          />
          <View style={styles.divider} />
          <InfoRow
            label="USD Value"
            value={loading ? "—" : `$${(data?.sol_balance ?? 0).toFixed(2)}`}
            dim={loading}
          />
        </View>

        {error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.errorText}>Couldn't load wallet data: {error}</Text>
          </View>
        ) : null}

        {/* Tokens */}
        <Text style={styles.sectionLabel}>TOKENS</Text>
        {data && data.tokens.length > 0 ? (
          <View style={styles.statsCard}>
            {data.tokens.map((t, i) => (
              <View key={t.mint}>
                {i > 0 && <View style={styles.divider} />}
                <InfoRow
                  label={t.symbol || `${t.mint.slice(0, 4)}...${t.mint.slice(-4)}`}
                  value={`${t.amount}`}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Coins size={20} color={COLORS.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyText}>No tokens yet</Text>
          </View>
        )}

        {/* Activity */}
        <Text style={styles.sectionLabel}>ACTIVITY</Text>
        {data && data.history.length > 0 ? (
          <View style={styles.statsCard}>
            {data.history.map((h, i) => (
              <View key={h.signature}>
                {i > 0 && <View style={styles.divider} />}
                <InfoRow
                  label={shortSig(h.signature)}
                  value={h.err ? "failed" : "confirmed"}
                  dim={!!h.err}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Clock size={20} color={COLORS.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyText}>No activity yet</Text>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
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
  copyTextDone: {
    color: COLORS.green,
  },

  // Agent wallet
  agentCard: {
    marginTop: 12,
    gap: 6,
  },
  agentLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.purple,
    letterSpacing: 1,
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
  errorText: {
    fontSize: 13,
    color: COLORS.red,
    textAlign: "center",
    padding: 8,
  },
});
