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
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<OnboardingState>;
        if (!parsed || typeof parsed !== "object") return;
        setState({
          done: typeof parsed.done === "boolean" ? parsed.done : DEFAULT_STATE.done,
          name:
            typeof parsed.name === "string" ? parsed.name.slice(0, 50) : DEFAULT_STATE.name,
          fundingMode:
            parsed.fundingMode === "prepaid" || parsed.fundingMode === "user"
              ? parsed.fundingMode
              : DEFAULT_STATE.fundingMode,
        });
      })
      .catch(() => {
        // Corrupt onboarding data must never brick the app — start fresh.
      })
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(async (patch: Partial<OnboardingState>) => {
    const next = { ...state, ...patch };
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [state]);

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
