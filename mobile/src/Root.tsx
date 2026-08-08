import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthorization } from "./utils/useAuthorization";
import { useOnboarding } from "./context/OnboardingContext";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { MainScreen } from "./screens/MainScreen";
import { COLORS } from "./theme";

export function Root() {
  const { selectedAccount } = useAuthorization();
  const { state, loaded } = useOnboarding();
  const [everOnboarded, setEverOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("onboarding_ever_done").then((v) => {
      if (v === "1") setEverOnboarded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // Never onboarded → full flow
  if (!state.done && !everOnboarded) {
    return <OnboardingScreen />;
  }

  // Onboarded but disconnected → just reconnect
  if (!selectedAccount) {
    return <OnboardingScreen reconnect />;
  }

  return <MainScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
