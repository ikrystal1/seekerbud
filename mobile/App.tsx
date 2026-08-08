// Polyfills
import "./src/polyfills";

import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme as NavigationDarkTheme } from "@react-navigation/native";
import { PaperProvider, MD3DarkTheme, adaptNavigationTheme } from "react-native-paper";
import { Root } from "./src/Root";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { OnboardingProvider } from "./src/context/OnboardingContext";
import { COLORS } from "./src/theme";

const queryClient = new QueryClient();

const { DarkTheme } = adaptNavigationTheme({
  reactNavigationDark: NavigationDarkTheme,
});

// Solana Seeker is dark-first: force the dark theme with Solana brand colors.
const CombinedTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: COLORS.purple,
    secondary: COLORS.green,
    background: COLORS.background,
    surface: COLORS.surface,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ClusterProvider>
          <ConnectionProvider config={{ commitment: "processed" }}>
            <SafeAreaView style={[styles.shell, { backgroundColor: COLORS.background }]}>
              <PaperProvider theme={CombinedTheme}>
                <OnboardingProvider>
                  <Root />
                </OnboardingProvider>
              </PaperProvider>
            </SafeAreaView>
          </ConnectionProvider>
        </ClusterProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
