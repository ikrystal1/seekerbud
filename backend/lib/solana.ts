import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export type TokenHolding = {
  mint: string;
  symbol: string;
  amount: number;
  raw: string;
};

export type TxEntry = {
  signature: string;
  blockTime: number | null;
  slot: number;
  err: string | null;
};

function txEntryOf(s: {
  signature: string;
  blockTime?: number | null;
  slot: number;
  err: unknown;
}): TxEntry {
  return {
    signature: s.signature,
    blockTime: s.blockTime ?? null,
    slot: s.slot,
    err: s.err ? String(s.err) : null,
  };
}

/**
 * Thin read-only RPC helpers. Nothing here signs or spends.
 */

export async function getSolBalance(
  connection: Connection,
  address: PublicKey
): Promise<number> {
  return connection.getBalance(address);
}

export async function getTokenBalances(
  connection: Connection,
  address: PublicKey
): Promise<TokenHolding[]> {
  const parsed = await connection.getParsedTokenAccountsByOwner(address, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });
  const holdings: TokenHolding[] = [];
  for (const { account } of parsed.value) {
    const info = account.data.parsed.info;
    const amount = Number(info.tokenAmount.uiAmount ?? 0);
    if (amount <= 0) continue;
    holdings.push({
      mint: info.mint,
      symbol: info.tokenAmount.symbol ?? "",
      amount,
      raw: String(amount),
    });
  }
  return holdings;
}

export async function getTransactionHistory(
  connection: Connection,
  address: PublicKey,
  limit = 5
): Promise<TxEntry[]> {
  const sigs = await connection.getSignaturesForAddress(address, {
    limit: Math.min(Math.max(limit, 1), 20),
  });
  return sigs.map(txEntryOf);
}

/**
 * Live fee estimate for a 1-SOL transfer — the actual fee for a single
 * SystemProgram transfer on the current cluster.
 */
export async function estimateTransferFee(
  connection: Connection
): Promise<string> {
  try {
    const from = Keypair.generate();
    const to = Keypair.generate();
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const message = new TransactionMessage({
      payerKey: from.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: LAMPORTS_PER_SOL,
        }),
      ],
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    const fee = await connection.getFeeForMessage(tx.message, "confirmed");
    return fee.value ? (fee.value / LAMPORTS_PER_SOL).toFixed(6) : "0.000005";
  } catch {
    return "0.000005";
  }
}
