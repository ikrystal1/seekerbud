import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { Fingerprint, Wallet, LogOut } from "lucide-react-native";
import { useWalletConnect } from "../../utils/useWalletConnect";
import { useAuthorization } from "../../utils/useAuthorization";
import { RADIUS } from "../../theme";

export function WalletButton() {
  const { connect, disconnect } = useWalletConnect();
  const { selectedAccount } = useAuthorization();
  const theme = useTheme();

  if (selectedAccount) {
    return (
      <View style={styles.connectedRow}>
        <Fingerprint size={16} color={theme.colors.onSurfaceVariant} />
        <Text
          variant="bodySmall"
          style={[styles.address, { color: theme.colors.onSurfaceVariant }]}
        >
          {selectedAccount.address.slice(0, 6)}...{selectedAccount.address.slice(-4)}
        </Text>
        <Button mode="text" compact onPress={() => disconnect()} icon={() => <LogOut size={16} />}>
          Disconnect
        </Button>
      </View>
    );
  }

  return (
    <Button
      mode="contained"
      onPress={() => connect()}
      style={styles.button}
      icon={() => <Wallet size={18} color={theme.colors.onPrimary} />}
    >
      Connect Solana Wallet
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.pill,
  },
  connectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  address: {
    flex: 1,
  },
});
