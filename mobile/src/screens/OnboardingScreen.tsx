import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthorization } from "../utils/useAuthorization";
import { useOnboarding } from "../context/OnboardingContext";
import { StepIndicator } from "../components/ui/StepIndicator";
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import { ProfileStep } from "../components/onboarding/ProfileStep";
import { CapabilitiesStep } from "../components/onboarding/CapabilitiesStep";
import { FundingStep, type FundingMode } from "../components/onboarding/FundingStep";

const STEPS = ["Profile", "Capabilities", "Funding"];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { selectedAccount } = useAuthorization();
  const { state, update } = useOnboarding();

  const [step, setStep] = useState(state.done ? 1 : 0);
  const [name, setName] = useState(state.name);

  const next = () => setStep((s) => s + 1);
  const complete = async (fundingMode: FundingMode) => {
    await update({ done: true, name: name.trim(), fundingMode });
  };

  // Step 0 — welcome, full screen, no chrome
  if (step === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <WelcomeStep onNext={next} />
      </View>
    );
  }

  // Steps 1-3 — indicator at top, step component fills remaining space
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.indicatorWrapper}>
        <StepIndicator current={step - 1} total={STEPS.length} />
      </View>
      {step === 1 && selectedAccount && (
        <ProfileStep name={name} onNameChange={setName} onNext={next} />
      )}
      {step === 2 && selectedAccount && <CapabilitiesStep onNext={next} />}
      {step === 3 && selectedAccount && <FundingStep onComplete={complete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B12",
  },
  indicatorWrapper: {
    paddingTop: 16,
  },
});
