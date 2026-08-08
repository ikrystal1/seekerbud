import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Wallet } from "lucide-react-native";
import { useAuthorization } from "../utils/useAuthorization";
import { COLORS, RADIUS } from "../theme";

export function AccountScreen({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const { selectedAccount } = useAuthorization();

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
        <Text style={styles.title}>Wallet</Text>
        {onBack && <View style={styles.backBtn} />}
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Wallet size={28} color={COLORS.accent} />
        </View>
        <Text style={styles.addressLabel}>Address</Text>
        <Text style={styles.address} selectable>
          {selectedAccount?.publicKey.toBase58() ?? "—"}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Devnet</Text>
        </View>
      </View>

      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonText}>
          Token balances & activity coming soon
        </Text>
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
    gap: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: "center",
    fontFamily: "monospace",
  },
  badge: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.blue,
    fontWeight: "600",
  },
  comingSoon: {
    paddingVertical: 32,
    alignItems: "center",
  },
  comingSoonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
});
