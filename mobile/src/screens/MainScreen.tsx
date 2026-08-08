import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChatScreen } from "./ChatScreen";
import { SettingsScreen } from "./SettingsScreen";
import { AccountScreen } from "./AccountScreen";

type Screen = "chat" | "wallet" | "settings";

export function MainScreen() {
  const [screen, setScreen] = useState<Screen>("chat");

  return (
    <View style={styles.container}>
      {screen === "chat" && (
        <ChatScreen
          onWallet={() => setScreen("wallet")}
          onSettings={() => setScreen("settings")}
        />
      )}
      {screen === "wallet" && (
        <AccountScreen onBack={() => setScreen("chat")} />
      )}
      {screen === "settings" && (
        <SettingsScreen onBack={() => setScreen("chat")} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
