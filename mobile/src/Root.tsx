import React from "react";
import { useAuthorization } from "./utils/useAuthorization";
import { useOnboarding } from "./context/OnboardingContext";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { MainScreen } from "./screens/MainScreen";

/**
 * Gate:
 * - Not onboarded yet → full onboarding flow
 * - Onboarded but wallet disconnected → just the connect screen (no re-onboarding)
 * - Wallet connected + onboarded → main app
 */
export function Root() {
  const { selectedAccount } = useAuthorization();
  const { state } = useOnboarding();

  if (!state.done) {
    return <OnboardingScreen />;
  }

  if (!selectedAccount) {
    return <OnboardingScreen reconnect />;
  }

  return <MainScreen />;
}
