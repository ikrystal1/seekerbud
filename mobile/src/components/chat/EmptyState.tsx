import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../theme";

const MASCOT = require("../../../assets/adaptive-icon.png");

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
      <Text style={styles.title}>Hey, I'm SeekerBud</Text>
      <Text style={styles.subtitle}>
        Ask me about your wallet — balance, tokens, activity, or send SOL. Every
        message is paid in USDC via x402.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  mascot: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
