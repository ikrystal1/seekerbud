import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Info,
  LogOut,
  PiggyBank,
  ShieldCheck,
} from "lucide-react-native";
import { useAuthorization } from "../utils/useAuthorization";
import { useWalletConnect } from "../utils/useWalletConnect";
import { useOnboarding } from "../context/OnboardingContext";
import { useCluster } from "../components/cluster/cluster-data-access";
import * as Clipboard from "expo-clipboard";
import { loadAgentWallet } from "../services/agentWallet";
import { COLORS, RADIUS } from "../theme";

const MASCOT = require("../../assets/adaptive-icon.png");

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  showChevron,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  showChevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {showChevron && <ChevronRight size={16} color={COLORS.textSecondary} />}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen({ onBack }: { onBack?: () => void }) {
  const { selectedAccount } = useAuthorization();
  const { disconnect } = useWalletConnect();
  const { state, update } = useOnboarding();
  const { selectedCluster } = useCluster();
  const [agentAddress, setAgentAddress] = useState<string | null>(null);

  useEffect(() => {
    if (state.fundingMode === "prepaid") {
      loadAgentWallet().then((w) => setAgentAddress(w?.publicKey ?? null));
    }
  }, [state.fundingMode]);

  const shortAgentAddress = agentAddress
    ? `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`
    : null;

  const shortAddress = selectedAccount
    ? `${selectedAccount.publicKey.toBase58().slice(0, 6)}...${selectedAccount.publicKey.toBase58().slice(-4)}`
    : "—";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Settings</Text>
        {onBack && <View style={styles.backBtn} />}
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {state.name ? state.name : "SeekerBud User"}
          </Text>
          <Text style={styles.profileAddress}>{shortAddress}</Text>
        </View>
      </View>

      {/* Wallet */}
      <Text style={styles.sectionLabel}>WALLET</Text>
      <View style={styles.card}>
        <Row
          icon={<ShieldCheck size={16} color={COLORS.green} />}
          label="Connected wallet"
          value={shortAddress}
        />
        <View style={styles.divider} />
        <Row
          icon={<Globe size={16} color={COLORS.blue} />}
          label="Network"
          value={selectedCluster.name}
        />
        <View style={styles.divider} />
        <View style={styles.payModeSection}>
          <View style={styles.payModeHeader}>
            <PiggyBank size={16} color={COLORS.purple} />
            <Text style={styles.payModeLabel}>Payment mode</Text>
          </View>
          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segment, state.fundingMode === "prepaid" && styles.segmentActive]}
              onPress={() => update({ fundingMode: "prepaid" })}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.segmentText, state.fundingMode === "prepaid" && styles.segmentTextActive]}
              >
                Prepaid wallet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, state.fundingMode === "user" && styles.segmentActive]}
              onPress={() => update({ fundingMode: "user" })}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.segmentText, state.fundingMode === "user" && styles.segmentTextActive]}
              >
                Pay as you go
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.payModeHint}>
            {state.fundingMode === "prepaid"
              ? "The on-device agent wallet signs payments silently."
              : "Each message is approved with your Seed Vault fingerprint."}
          </Text>
        </View>
        {shortAgentAddress && (
          <>
            <View style={styles.divider} />
            <Row
              icon={<PiggyBank size={16} color={COLORS.purple} />}
              label="Agent wallet (tap to copy)"
              value={shortAgentAddress}
              onPress={() => agentAddress && Clipboard.setStringAsync(agentAddress)}
              showChevron
            />
          </>
        )}
      </View>

      {/* App */}
      <Text style={styles.sectionLabel}>APP</Text>
      <View style={styles.card}>
        <Row
          icon={<Info size={16} color={COLORS.textSecondary} />}
          label="Version"
          value="1.0.0"
        />
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <Row
          icon={<LogOut size={16} color={COLORS.red} />}
          label="Disconnect wallet"
          onPress={async () => {
            try {
              await disconnect();
            } catch {
              // ignore disconnect errors
            }
          }}
          danger
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 8,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
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

  // Profile card
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    marginBottom: 8,
  },
  mascot: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  profileAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: "monospace",
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 2,
  },

  // Rows card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 28,
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dangerText: {
    color: COLORS.red,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
  payModeSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  payModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  payModeLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
  },
  payModeHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
});
