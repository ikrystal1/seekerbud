import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Appbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthorization } from "../utils/useAuthorization";
import { useOnboarding } from "../context/OnboardingContext";
import { StepIndicator } from "../components/ui/StepIndicator";
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import { ProfileStep } from "../components/onboarding/ProfileStep";
import { CapabilitiesStep } from "../components/onboarding/CapabilitiesStep";
import {
  FundingStep,
  type FundingMode,
} from "../components/onboarding/FundingStep";

const STEPS = ["Welcome", "Profile", "Capabilities", "Funding"];

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Appbar.Header>
        <Appbar.Content title="SeekerBud" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {step > 0 && <StepIndicator current={step - 1} total={STEPS.length - 1} />}

        {step === 0 && <WelcomeStep />}

        {step === 1 && selectedAccount && (
          <ProfileStep name={name} onNameChange={setName} onNext={next} />
        )}

        {step === 2 && selectedAccount && <CapabilitiesStep onNext={next} />}

        {step === 3 && selectedAccount && <FundingStep onComplete={complete} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
});
