import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RefreshCw, Settings2 } from "lucide-react-native";
import { COLORS } from "../../theme";

const MASCOT = require("../../../assets/adaptive-icon.png");

export function ChatHeader({
  address,
  onReset,
  onSettings,
}: {
  address?: string;
  onReset: () => void;
  onSettings?: () => void;
}) {
  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)} · devnet`
    : undefined;

  return (
    <View style={styles.container}>
      {/* Left: avatar + name/address */}
      <View style={styles.left}>
        <Image source={MASCOT} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name}>SeekerBud</Text>
          {shortAddress ? (
            <Text style={styles.address} numberOfLines={1}>
              {shortAddress}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right: action buttons */}
      <View style={styles.right}>
        <TouchableOpacity onPress={onReset} style={styles.iconBtn} hitSlop={6}>
          <RefreshCw size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {onSettings ? (
          <TouchableOpacity
            onPress={onSettings}
            style={styles.iconBtn}
            hitSlop={6}
          >
            <Settings2 size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  info: {
    flexDirection: "column",
    gap: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  address: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    padding: 8,
  },
});
