import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RefreshCw, Wallet, Settings2 } from "lucide-react-native";
import { COLORS } from "../../theme";

const MASCOT = require("../../../assets/adaptive-icon.png");

export function ChatHeader({
  address,
  onReset,
  onWallet,
  onSettings,
}: {
  address?: string;
  onReset: () => void;
  onWallet?: () => void;
  onSettings?: () => void;
}) {
  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)} · devnet`
    : undefined;

  return (
    <View style={styles.container}>
      {/* Left: avatar + name */}
      <View style={styles.left}>
        <Image source={MASCOT} style={styles.avatar} resizeMode="contain" />
        <View>
          <Text style={styles.name}>SeekerBud</Text>
          {shortAddress && (
            <Text style={styles.address}>{shortAddress}</Text>
          )}
        </View>
      </View>

      {/* Right: refresh · wallet · settings */}
      <View style={styles.right}>
        <TouchableOpacity onPress={onReset} style={styles.iconBtn} hitSlop={8}>
          <RefreshCw size={17} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {onWallet && (
          <TouchableOpacity onPress={onWallet} style={styles.iconBtn} hitSlop={8}>
            <Wallet size={17} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        {onSettings && (
          <TouchableOpacity onPress={onSettings} style={styles.iconBtn} hitSlop={8}>
            <Settings2 size={17} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
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
    paddingVertical: 10,
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
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  address: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});
