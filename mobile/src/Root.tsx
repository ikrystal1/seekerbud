import React from "react";
import { useAuthorization } from "./utils/useAuthorization";
import { useOnboarding } from "./context/OnboardingContext";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { MainScreen } from "./screens/MainScreen";

/**
 * Gate: no wallet → onboarding; wallet but onboarding incomplete → onboarding;
 * otherwise → chat. Returning users with a cached auth + completed onboarding
 * land straight in the chat.
 */
export function Root() {
  const { selectedAccount } = useAuthorization();
  const { state } = useOnboarding();

  if (!selectedAccount || !state.done) {
    return <OnboardingScreen />;
  }
  return <MainScreen />;
}
