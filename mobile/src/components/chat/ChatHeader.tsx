import React from "react";
import { Appbar } from "react-native-paper";
import { RefreshCw } from "lucide-react-native";

export function ChatHeader({
  address,
  onReset,
}: {
  address?: string;
  onReset: () => void;
}) {
  return (
    <Appbar.Header>
      <Appbar.Content
        title="SeekerBud"
        subtitle={
          address ? `${address.slice(0, 6)}...${address.slice(-4)} (devnet)` : "connecting..."
        }
        titleStyle={{ fontWeight: "bold" }}
      />
      <Appbar.Action icon={() => <RefreshCw size={20} />} onPress={onReset} />
    </Appbar.Header>
  );
}
