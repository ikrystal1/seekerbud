import { Platform } from "react-native";
import { useCallback } from "react";
import { Keypair } from "@solana/web3.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { useMobileWallet } from "./useMobileWallet";

const AUTH_KEY = "authorization-cache";
const DEMO_KEYPAIR_KEY = "web-demo-keypair";

/**
 * On web  → simulates a wallet by generating (or reusing) a local keypair
 *           stored in AsyncStorage, then writing a fake authorization so the
 *           rest of the app thinks a wallet is connected.
 *
 * On native → delegates straight to useMobileWallet().connect() which opens
 *              the real Seed Vault / Mobile Wallet Adapter.
 */
export function useWalletConnect() {
  const queryClient = useQueryClient();
  const mobileWallet = Platform.OS !== "web" ? useMobileWallet() : null;

  const connect = useCallback(async () => {
    if (Platform.OS !== "web") {
      return mobileWallet!.connect();
    }

    // ── Web simulation ────────────────────────────────────────────────────
    // Reuse an existing demo keypair so the address stays consistent across
    // refreshes, giving a more realistic feel.
    let keypair: Keypair;
    const stored = await AsyncStorage.getItem(DEMO_KEYPAIR_KEY);
    if (stored) {
      keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(stored)));
    } else {
      keypair = Keypair.generate();
      await AsyncStorage.setItem(
        DEMO_KEYPAIR_KEY,
        JSON.stringify(Array.from(keypair.secretKey))
      );
    }

    // base64-encode the raw public key bytes — matches what MWA sends natively
    const address = Buffer.from(keypair.publicKey.toBytes()).toString("base64");

    const fakeAuth = {
      accounts: [{ address, label: "Demo Wallet (web)", publicKey: keypair.publicKey }],
      authToken: "web-demo-token",
      selectedAccount: { address, label: "Demo Wallet (web)", publicKey: keypair.publicKey },
    };

    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(fakeAuth));
    queryClient.invalidateQueries({ queryKey: ["wallet-authorization"] });
  }, [mobileWallet, queryClient]);

  const disconnect = useCallback(async () => {
    if (Platform.OS !== "web") {
      return mobileWallet!.disconnect();
    }
    await AsyncStorage.removeItem(AUTH_KEY);
    queryClient.invalidateQueries({ queryKey: ["wallet-authorization"] });
  }, [mobileWallet, queryClient]);

  return { connect, disconnect };
}
