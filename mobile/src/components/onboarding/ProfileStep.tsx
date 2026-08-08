import React from "react";
import { StyleSheet } from "react-native";
import { Card, Text, TextInput } from "react-native-paper";
import { ShieldCheck } from "lucide-react-native";
import { PrimaryButton } from "../ui/PrimaryButton";
import { useAuthorization } from "../../utils/useAuthorization";
import { COLORS, RADIUS } from "../../theme";

export function ProfileStep({
  name,
  onNameChange,
  onNext,
}: {
  name: string;
  onNameChange: (v: string) => void;
  onNext: () => void;
}) {
  const { selectedAccount } = useAuthorization();

  return (
    <>
      <Text variant="labelLarge" style={styles.header}>
        Step 1 of 3 — Welcome aboard!
      </Text>
      <TextInput
        mode="outlined"
        label="Display name (optional)"
        value={name}
        onChangeText={onNameChange}
        style={styles.field}
      />
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="bodyMedium">
            Connected as{" "}
            <Text variant="bodyMedium" style={{ fontWeight: "bold" }}>
              {selectedAccount?.address.slice(0, 6)}...{selectedAccount?.address.slice(-4)}
            </Text>
          </Text>
          <Text variant="bodySmall" style={styles.cardNote}>
            <ShieldCheck size={12} color={COLORS.green} /> Seed Vault wallet
            connected — verified via your Seed Vault
          </Text>
        </Card.Content>
      </Card>
      <PrimaryButton onPress={onNext}>Continue</PrimaryButton>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  card: {
    marginBottom: 20,
    borderRadius: RADIUS.lg,
  },
  cardNote: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
});
