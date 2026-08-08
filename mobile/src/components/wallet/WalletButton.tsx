import React, { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  if (selectedAccount) {
    return (
      <View style={styles.connectedRow}>
        <Fingerprint size={16} color={theme.colors.onSurfaceVariant} />
        <Text
          variant="bodySmall"
          style={[styles.address, { color: theme.colors.onSurfaceVariant }]}
        >
          {selectedAccount.publicKey.toBase58().slice(0, 6)}...{selectedAccount.publicKey.toBase58().slice(-4)}
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
      onPress={async () => {
        setLoading(true);
        try {
          await connect();
        } finally {
          setLoading(false);
        }
      }}
      loading={loading}
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
