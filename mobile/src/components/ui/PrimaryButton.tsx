import React from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { RADIUS } from "../../theme";

export function PrimaryButton({
  children,
  onPress,
  disabled,
  loading,
  icon,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: object;
}) {
  return (
    <Button
      mode="contained"
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      style={[styles.button, style]}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.pill,
  },
});
