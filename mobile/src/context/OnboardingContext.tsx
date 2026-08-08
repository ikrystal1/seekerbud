import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FundingMode = "prepaid" | "user";

export type OnboardingState = {
  done: boolean;
  name: string;
  fundingMode: FundingMode;
};

const STORAGE_KEY = "onboarding";

const DEFAULT_STATE: OnboardingState = {
  done: false,
  name: "",
  fundingMode: "prepaid",
};

type OnboardingContextValue = {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => Promise<void>;
  reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue>(
  {} as OnboardingContextValue
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
      })
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(async (patch: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState(DEFAULT_STATE);
  }, []);

  return (
    <OnboardingContext.Provider value={{ state, update, reset }}>
      {loaded ? children : null}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
