import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageSquare, Settings, Wallet } from "lucide-react-native";
import { ChatScreen } from "./ChatScreen";
import { SettingsScreen } from "./SettingsScreen";
import { AccountScreen } from "./AccountScreen";
import { COLORS } from "../theme";

type Tab = "chat" | "account" | "settings";

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: "chat",     label: "Chat",     Icon: MessageSquare },
  { id: "account",  label: "Wallet",   Icon: Wallet },
  { id: "settings", label: "Settings", Icon: Settings },
];

export function MainScreen() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<Tab>("chat");

  return (
    <View style={styles.container}>
      {/* ── Screen content ── */}
      <View style={styles.screen}>
        {active === "chat"     && <ChatScreen />}
        {active === "account"  && <AccountScreen />}
        {active === "settings" && <SettingsScreen />}
      </View>

      {/* ── Bottom tab bar ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {TABS.map(({ id, label, Icon }) => {
          const focused = active === id;
          return (
            <TouchableOpacity
              key={id}
              style={styles.tab}
              onPress={() => setActive(id)}
              activeOpacity={0.7}
            >
              <Icon
                size={22}
                color={focused ? COLORS.purple : COLORS.textSecondary}
                strokeWidth={focused ? 2.2 : 1.8}
              />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.purple,
    fontWeight: "600",
  },
});
