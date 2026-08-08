import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Account, useAuthorization } from "./useAuthorization";
import {
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useMemo } from "react";
import { SignInPayload } from "@solana-mobile/mobile-wallet-adapter-protocol";

export function useMobileWallet() {
  const { authorizeSessionWithSignIn, authorizeSession, deauthorizeSession } =
    useAuthorization();

  const connect = useCallback(async (): Promise<Account> => {
    return await transact(async (wallet) => {
      return await authorizeSession(wallet);
    });
  }, [authorizeSession]);

  const signIn = useCallback(
    async (signInPayload: SignInPayload): Promise<Account> => {
      return await transact(async (wallet) => {
        return await authorizeSessionWithSignIn(wallet, signInPayload);
      });
    },
    [authorizeSession]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    await transact(async (wallet) => {
      await deauthorizeSession(wallet);
    });
  }, [deauthorizeSession]);

  const signAndSendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      minContextSlot: number,
    ): Promise<TransactionSignature> => {
      return await transact(async (wallet) => {
        await authorizeSession(wallet);
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
          minContextSlot,
        });
        return signatures[0];
      });
    },
    [authorizeSession]
  );

  /**
   * Sign transactions WITHOUT sending them (x402 payments). The Seed Vault
   * shows a signing prompt; the app relays the signature to the backend.
   */
  const signTransactions = useCallback(
    async (
      transactions: Array<Transaction | VersionedTransaction>,
    ): Promise<Array<Transaction | VersionedTransaction>> => {
      return await transact(async (wallet) => {
        await authorizeSession(wallet);
        return await wallet.signTransactions({ transactions });
      });
    },
    [authorizeSession]
  );

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      return await transact(async (wallet) => {
        const authResult = await authorizeSession(wallet);
        const signedMessages = await wallet.signMessages({
          addresses: [authResult.address],
          payloads: [message],
        });
        return signedMessages[0];
      });
    },
    [authorizeSession]
  );

  return useMemo(
    () => ({
      connect,
      signIn,
      disconnect,
      signAndSendTransaction,
      signTransactions,
      signMessage,
    }),
    [signAndSendTransaction, signTransactions, signMessage]
  );
}
