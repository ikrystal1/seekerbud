import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Zap, Fingerprint } from "lucide-react-native";
import { WalletButton } from "../wallet/WalletButton";
import { useAuthorization } from "../../utils/useAuthorization";
import { COLORS } from "../../theme";

export function WelcomeStep() {
  const { selectedAccount } = useAuthorization();

  return (
    <>
      <View style={styles.hero}>
        <Zap size={56} color={COLORS.purple} />
        <Text variant="displaySmall" style={styles.logo}>
          SeekerBud
        </Text>
        <Text variant="titleMedium" style={styles.tagline}>
          Chat with your wallet. Control your Solana experience.
        </Text>
        <Text variant="bodyMedium" style={styles.askLine}>
          Ask. Understand. Confirm. Done.
        </Text>
      </View>
      <View style={styles.actionArea}>
        <WalletButton />
        {selectedAccount && (
          <Text variant="labelSmall" style={styles.walletNote}>
            {selectedAccount.address.slice(0, 6)}...{selectedAccount.address.slice(-4)}
          </Text>
        )}
        <Text variant="labelSmall" style={styles.secureNote}>
          <Fingerprint size={12} color={COLORS.textSecondary} /> Sign in with your
          Seed Vault wallet · biometrics · your keys never leave your device
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  logo: {
    fontWeight: "bold",
  },
  tagline: {
    opacity: 0.85,
    textAlign: "center",
  },
  askLine: {
    opacity: 0.6,
  },
  actionArea: {
    gap: 12,
  },
  walletNote: {
    textAlign: "center",
    color: COLORS.textSecondary,
  },
  secureNote: {
    opacity: 0.6,
    textAlign: "center",
    marginTop: 4,
  },
});
