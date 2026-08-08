import { Platform } from "react-native";
import { useCallback } from "react";
import { useMobileWallet } from "./useMobileWallet";

/**
 * Wallet connection for the real product: Solana Mobile Wallet Adapter
 * (Seed Vault) on Android. No demo, no simulation — on web the MWA is
 * physically unavailable, so connect() rejects with a clear message
 * instead of fabricating a fake wallet.
 */
export function useWalletConnect() {
  const mobileWallet = Platform.OS !== "web" ? useMobileWallet() : null;

  const connect = useCallback(async () => {
    if (!mobileWallet) {
      throw new Error(
        "Solana Mobile Wallet is only available on Android. Run SeekerBud on a Solana Mobile device."
      );
    }
    return mobileWallet.connect();
  }, [mobileWallet]);

  const disconnect = useCallback(async () => {
    if (!mobileWallet) return;
    return mobileWallet.disconnect();
  }, [mobileWallet]);

  return { connect, disconnect };
}
