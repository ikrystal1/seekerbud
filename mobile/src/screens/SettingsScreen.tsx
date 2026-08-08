import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Globe, Info, LogOut, ShieldCheck } from "lucide-react-native";
import { useAuthorization } from "../utils/useAuthorization";
import { useWalletConnect } from "../utils/useWalletConnect";
import { useOnboarding } from "../context/OnboardingContext";
import { COLORS, RADIUS } from "../theme";

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        {icon}
        <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </TouchableOpacity>
  );
}

export function SettingsScreen({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const { selectedAccount } = useAuthorization();
  const { disconnect } = useWalletConnect();
  const { reset } = useOnboarding();

  const shortAddress = selectedAccount
    ? `${selectedAccount.address.slice(0, 6)}...${selectedAccount.address.slice(-4)}`
    : "—";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.titleRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Settings</Text>
        {onBack && <View style={styles.backBtn} />}
      </View>

      {/* Wallet section */}
      <Text style={styles.sectionLabel}>WALLET</Text>
      <View style={styles.card}>
        <Row
          icon={<ShieldCheck size={18} color={COLORS.green} />}
          label="Connected wallet"
          value={shortAddress}
        />
        <View style={styles.divider} />
        <Row
          icon={<Globe size={18} color={COLORS.blue} />}
          label="Network"
          value="Devnet"
        />
      </View>

      {/* App section */}
      <Text style={styles.sectionLabel}>APP</Text>
      <View style={styles.card}>
        <Row
          icon={<Info size={18} color={COLORS.textSecondary} />}
          label="Version"
          value="1.0.0"
        />
      </View>

      {/* Danger zone */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <Row
          icon={<LogOut size={18} color={COLORS.red} />}
          label="Disconnect wallet"
          onPress={async () => { await disconnect(); await reset(); }}
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
    paddingBottom: 40,
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
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
  rowLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  rowValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  danger: {
    color: COLORS.red,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 46,
  },
});
