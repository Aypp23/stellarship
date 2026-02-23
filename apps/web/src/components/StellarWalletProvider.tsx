'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import * as StellarSdk from '@stellar/stellar-sdk';

// NOTE: Stellar Wallets Kit touches `window` during module initialization in some environments.
// To keep Next.js static builds clean, we only import it dynamically on the client.
import type { StellarWalletsKit as StellarWalletsKitType } from '@creit.tech/stellar-wallets-kit';

type SignTransactionResult = { signedTxXdr: string; signerAddress?: string };
type SignAuthEntryResult = { signedAuthEntry: string; signerAddress?: string };

export type StellarWalletSigner = {
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<SignTransactionResult>;
  signAuthEntry: (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<SignAuthEntryResult>;
};

function isBase64AsciiBytes(bytes: Uint8Array): boolean {
  for (const b of bytes) {
    const isAZ = b >= 0x41 && b <= 0x5a;
    const isaz = b >= 0x61 && b <= 0x7a;
    const is09 = b >= 0x30 && b <= 0x39;
    const isPlus = b === 0x2b;
    const isSlash = b === 0x2f;
    const isEq = b === 0x3d;
    if (isAZ || isaz || is09 || isPlus || isSlash || isEq) continue;
    return false;
  }
  return true;
}

function normalizeSorobanAuthSignatureBase64(signatureB64: string): string {
  // Soroban address auth requires a 64-byte Ed25519 signature.
  // Some wallet adapters mistakenly return base64(base64(signatureBytes)).
  const first = Buffer.from(signatureB64, 'base64');
  if (first.length === 64) return signatureB64;

  // If the decoded payload itself looks like a base64 string, decode again.
  if (isBase64AsciiBytes(first)) {
    const inner = Buffer.from(first).toString('utf8');
    const second = Buffer.from(inner, 'base64');
    if (second.length === 64) return inner;
  }

  throw new Error(`Invalid Soroban auth signature: expected 64 bytes, got ${first.length}.`);
}

type StellarWalletContextValue = {
  connected: boolean;
  address: string | null;
  walletId: string | null;
  supportsSignAuthEntry: boolean;
  networkPassphrase: string;
  connect: () => Promise<string>;
  disconnect: () => void;
  signer: StellarWalletSigner;
};

const StellarWalletContext = createContext<StellarWalletContextValue | undefined>(undefined);

export function StellarWalletProvider({ children }: { children: React.ReactNode }) {
  const networkPassphrase = StellarSdk.Networks.TESTNET;
  const [walletId, setWalletId] = useState<string | null>(null);
  const supportsSignAuthEntry = walletId ? walletId.toLowerCase() !== 'rabet' : true;

  const kitRef = useRef<StellarWalletsKitType | null>(null);
  const [kitReady, setKitReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import('@creit.tech/stellar-wallets-kit');
        if (cancelled) return;

        const kit = new mod.StellarWalletsKit({
          network: mod.WalletNetwork.TESTNET,
          selectedWalletId: mod.FREIGHTER_ID,
          modules: mod.allowAllModules(),
        });

        kitRef.current = kit;
        setWalletId(mod.FREIGHTER_ID ?? 'freighter');
        setKitReady(true);
      } catch (err) {
        console.error('[StellarWalletProvider] Failed to init wallet kit:', err);
        kitRef.current = null;
        setWalletId(null);
        setKitReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const [address, setAddress] = useState<string | null>(null);
  const connected = !!address;

  const refreshAddress = useCallback(async () => {
    const kit = kitRef.current as any;
    if (!kit) return;
    try {
      const res = await kit.getAddress();
      if (res?.address) setAddress(res.address);
    } catch {
      setAddress(null);
    }
  }, []);

  useEffect(() => {
    if (!kitReady) return;
    refreshAddress();
  }, [kitReady, refreshAddress]);

  const connect = useCallback(async () => {
    return new Promise<string>((resolve, reject) => {
      try {
        const kit = kitRef.current as any;
        if (!kit) throw new Error('Wallet kit not ready');

        kit.openModal({
          onWalletSelected: async (option: { id: string }) => {
            try {
              kit.setWallet(option.id);
              setWalletId(option.id ?? null);
              const res = await kit.getAddress();
              if (!res?.address) throw new Error('No address returned from wallet');
              setAddress(res.address);
              resolve(res.address);
            } catch (err) {
              reject(err);
            }
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    // Hackathon UX: clear app state. Users can disconnect from their wallet UI if desired.
    setAddress(null);
    setWalletId(null);
  }, []);

  const signer: StellarWalletSigner = useMemo(() => {
    return {
      signTransaction: async (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => {
        const kit = kitRef.current as any;
        if (!kit) throw new Error('Wallet kit not ready');
        const res: any = await kit.signTransaction(xdr, {
          networkPassphrase: opts?.networkPassphrase ?? networkPassphrase,
          address: opts?.address ?? address ?? undefined,
        });
        return { signedTxXdr: res.signedTxXdr ?? res.signedTx ?? res, signerAddress: res.signerAddress };
      },
      signAuthEntry: async (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => {
        const kit = kitRef.current as any;
        if (!kit) throw new Error('Wallet kit not ready');
        const fn = kit.signAuthEntry;
        if (typeof fn !== 'function') {
          throw new Error('Connected wallet does not support signAuthEntry');
        }
        try {
          const res: any = await fn.call(kit, xdr, {
            networkPassphrase: opts?.networkPassphrase ?? networkPassphrase,
            address: opts?.address ?? address ?? undefined,
          });
          const raw = res?.signedAuthEntry ?? res;
          const b64 = typeof raw === 'string' ? raw : Buffer.from(raw).toString('base64');
          return { signedAuthEntry: normalizeSorobanAuthSignatureBase64(b64), signerAddress: res?.signerAddress };
        } catch (err: any) {
          const msg = String(err?.message ?? err ?? '');
          if (/does not support the "signAuthEntry" function/i.test(msg)) {
            throw new Error(
              'This wallet cannot generate Soroban auth-entry invites. Use Freighter to generate the invite, then switch back to this wallet to join/play.'
            );
          }
          throw err;
        }
      },
    };
  }, [address, networkPassphrase]);

  const value: StellarWalletContextValue = useMemo(() => {
    return {
      connected,
      address,
      walletId,
      supportsSignAuthEntry,
      networkPassphrase,
      connect,
      disconnect,
      signer,
    };
  }, [connected, address, walletId, supportsSignAuthEntry, networkPassphrase, connect, disconnect, signer]);

  return <StellarWalletContext.Provider value={value}>{children}</StellarWalletContext.Provider>;
}

export function useStellarWallet() {
  const ctx = useContext(StellarWalletContext);
  if (!ctx) throw new Error('useStellarWallet must be used within StellarWalletProvider');
  return ctx;
}
