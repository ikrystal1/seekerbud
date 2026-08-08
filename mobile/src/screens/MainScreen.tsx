import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChatScreen } from "./ChatScreen";
import { SettingsScreen } from "./SettingsScreen";
import { AccountScreen } from "./AccountScreen";
import { COLORS } from "../theme";

type Screen = "chat" | "wallet" | "settings";

export function MainScreen() {
  const [screen, setScreen] = useState<Screen>("chat");
  const [mounted, setMounted] = useState<Set<Screen>>(new Set(["chat"]));

  const visit = (s: Screen) => {
    setMounted((prev) => new Set([...prev, s]));
    setScreen(s);
  };

  return (
    <View style={styles.container}>
      {/* Chat always stays mounted so streaming/AI responses aren't lost */}
      <View style={screen === "chat" ? styles.show : styles.hide}>
        <ChatScreen
          onWallet={() => visit("wallet")}
          onSettings={() => visit("settings")}
        />
      </View>
      {mounted.has("wallet") && (
        <View style={screen === "wallet" ? styles.show : styles.hide}>
          <AccountScreen onBack={() => setScreen("chat")} />
        </View>
      )}
      {mounted.has("settings") && (
        <View style={screen === "settings" ? styles.show : styles.hide}>
          <SettingsScreen onBack={() => setScreen("chat")} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  show: { flex: 1 },
  hide: { display: "none" },
});
