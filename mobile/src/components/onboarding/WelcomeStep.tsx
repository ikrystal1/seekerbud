import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Fingerprint } from "lucide-react-native";
import { SolanaLogo } from "../ui/SolanaLogo";
import { useWalletConnect } from "../../utils/useWalletConnect";
import { useAuthorization } from "../../utils/useAuthorization";
import { COLORS, RADIUS } from "../../theme";
import { CtaButton } from "../ui/CtaButton";

const LOGO = require("../../../assets/adaptive-icon.png");

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { connect } = useWalletConnect();
  const { selectedAccount } = useAuthorization();
  const [connecting, setConnecting] = useState(false);

  return (
    <View style={styles.container}>
      {/* ── Hero ── */}
      <View style={styles.hero}>
        <Image source={LOGO} style={styles.mascot} resizeMode="contain" />
        <Text style={styles.name}>SeekerBud</Text>
        <Text style={styles.tagline}>
          Chat with your wallet.{"\n"}Control your Solana.
        </Text>
      </View>

      {/* ── Action ── */}
      <View style={styles.footer}>
        {selectedAccount ? (
          // Already connected — show address + explicit continue button
          <>
            <View style={styles.connectedPill}>
              <Fingerprint size={14} color={COLORS.green} />
              <Text style={styles.connectedText}>
                {selectedAccount.publicKey.toBase58().slice(0, 6)}...{selectedAccount.publicKey.toBase58().slice(-4)}
              </Text>
            </View>
            <CtaButton onPress={onNext}>Continue</CtaButton>
          </>
        ) : (
          <CtaButton
            onPress={async () => {
              setConnecting(true);
              try {
                await connect();
              } catch (err: any) {
                Alert.alert(
                  "Connection failed",
                  err?.message ?? "Could not connect to wallet. Make sure you're running on a Solana Mobile device."
                );
              } finally {
                setConnecting(false);
              }
            }}
            loading={connecting}
          >
            <View style={styles.ctaInner}>
              <SolanaLogo size={20} color="#0B0B12" />
              <Text style={styles.ctaText}>Solana Mobile</Text>
            </View>
          </CtaButton>
        )}

        <Text style={styles.hint}>
          Biometrics · your keys never leave your device
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  // ── Hero ──────────────────────────────────────────────
  hero: {
    flex: 1,
    alignItems: "center",
    gap: 16,
  },
  mascot: {
    width: 260,
    height: 260,
    marginBottom: 8,
  },
  name: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  // ── Footer ────────────────────────────────────────────
  footer: {
    gap: 14,
    alignItems: "center",
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B0B12",
  },
  connectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  connectedText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    opacity: 0.7,
  },
});
