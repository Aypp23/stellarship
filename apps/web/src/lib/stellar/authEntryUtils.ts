import { Buffer } from 'buffer';
import { Address, authorizeEntry, xdr } from '@stellar/stellar-sdk';
import { contract } from '@stellar/stellar-sdk';
import { calculateValidUntilLedger } from './ledgerUtils';
import { DEFAULT_AUTH_TTL_MINUTES } from './constants';

type Signer = Pick<contract.ClientOptions, 'signAuthEntry'>;

function unwrapSignedAuthEntry(res: any): string {
  if (typeof res === 'string') return res;
  if (res && typeof res.signedAuthEntry === 'string') return res.signedAuthEntry;
  throw new Error('Wallet returned an unexpected signAuthEntry response');
}

/**
 * Inject Player 1's signed auth entry into Player 2's assembled transaction by replacing
 * the stubbed entry in `tx.simulationData.result.auth`. Optionally signs Player 2's auth
 * entry if they appear as a non-invoker address auth entry.
 */
export async function injectSignedAuthEntry(
  tx: contract.AssembledTransaction<any>,
  player1AuthEntryXdr: string,
  player2Address: string,
  player2Signer: Signer,
  validUntilLedgerSeq?: number
): Promise<contract.AssembledTransaction<any>> {
  const player1SignedAuthEntry = xdr.SorobanAuthorizationEntry.fromXDR(player1AuthEntryXdr, 'base64');
  const player1SignedAddress = player1SignedAuthEntry.credentials().address().address();
  const player1AddressString = Address.fromScAddress(player1SignedAddress).toString();

  if (!tx.simulationData?.result?.auth) {
    throw new Error('No auth entries found in transaction simulation');
  }

  const authEntries = tx.simulationData.result.auth;

  let player1StubIndex = -1;
  let player2AuthEntry: xdr.SorobanAuthorizationEntry | null = null;
  let player2Index = -1;

  for (let i = 0; i < authEntries.length; i++) {
    const entry = authEntries[i];
    const credentialType = entry.credentials().switch().name;
    if (credentialType !== 'sorobanCredentialsAddress') continue;

    const entryAddress = entry.credentials().address().address();
    const entryAddressString = Address.fromScAddress(entryAddress).toString();

    if (entryAddressString === player1AddressString) {
      player1StubIndex = i;
    } else if (entryAddressString === player2Address) {
      player2AuthEntry = entry;
      player2Index = i;
    }
  }

  if (player1StubIndex === -1) {
    throw new Error('Could not find Player 1 stub auth entry in simulation data');
  }

  // Replace Player 1 stub with their signed entry.
  authEntries[player1StubIndex] = player1SignedAuthEntry;

  // If Player 2 appears as a non-invoker address auth entry, sign it as well.
  if (player2AuthEntry && player2Index !== -1) {
    const signAuthEntry = player2Signer.signAuthEntry;
    if (!signAuthEntry) {
      throw new Error('Wallet does not support signAuthEntry');
    }

    const expiration =
      validUntilLedgerSeq ?? (await calculateValidUntilLedger(tx.options.rpcUrl, DEFAULT_AUTH_TTL_MINUTES));

    const player2SignedAuthEntry = await authorizeEntry(
      player2AuthEntry,
      async (preimage) => {
        const res = await signAuthEntry(preimage.toXDR('base64'), {
          networkPassphrase: tx.options.networkPassphrase,
          address: player2Address,
        });
        return Buffer.from(unwrapSignedAuthEntry(res), 'base64');
      },
      expiration,
      tx.options.networkPassphrase
    );

    authEntries[player2Index] = player2SignedAuthEntry;
  }

  tx.simulationData.result.auth = authEntries;
  return tx;
}
