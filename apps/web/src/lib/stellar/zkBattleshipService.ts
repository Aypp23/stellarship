import { Buffer } from 'buffer';
import { Address, authorizeEntry, contract, xdr } from '@stellar/stellar-sdk';
import { Client as ZkBattleshipClient, type Session } from '@/contracts/zk-battleship-bindings/src';
import {
  DEFAULT_METHOD_OPTIONS,
  MULTI_SIG_AUTH_TTL_MINUTES,
  NETWORK_PASSPHRASE,
  RPC_URL,
  SIMULATION_SOURCE_ADDRESS,
  ZK_BATTLESHIP_CONTRACT_ID,
} from '@/lib/stellar/constants';
import { calculateValidUntilLedger } from '@/lib/stellar/ledgerUtils';
import { injectSignedAuthEntry } from '@/lib/stellar/authEntryUtils';
import { simulateAndSignAndSend } from '@/lib/stellar/transactionHelper';

export type ParsedStartGameAuthEntry = {
  sessionId: number;
  modeId: number;
  player1: string;
  player1Points: bigint;
  functionName: string;
};

type Signer = Pick<contract.ClientOptions, 'signTransaction' | 'signAuthEntry'>;

function unwrapSignedAuthEntry(res: any): string {
  if (typeof res === 'string') return res;
  if (res && typeof res.signedAuthEntry === 'string') return res.signedAuthEntry;
  throw new Error('Wallet returned an unexpected signAuthEntry response');
}

/**
 * Minimal service layer (SGS-style) for multi-sig start_game flows.
 */
export class ZkBattleshipService {
  private readonly contractId: string;

  constructor(contractId?: string) {
    this.contractId = contractId ?? ZK_BATTLESHIP_CONTRACT_ID;
  }

  private assertConfigured() {
    if (!this.contractId) {
      throw new Error(
        'Missing contract id. Set NEXT_PUBLIC_ZK_BATTLESHIP_CONTRACT_ID (and redeploy if needed).'
      );
    }
  }

  private createSigningClient(publicKey: string, signer?: Signer): ZkBattleshipClient {
    this.assertConfigured();
    return new ZkBattleshipClient({
      contractId: this.contractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey,
      ...(signer ?? {}),
    });
  }

  parseAuthEntry(authEntryXdr: string): ParsedStartGameAuthEntry {
    const authEntry = xdr.SorobanAuthorizationEntry.fromXDR(authEntryXdr, 'base64');

    const credentials = authEntry.credentials();
    const addressCreds = credentials.address();
    const player1Address = addressCreds.address();
    const player1 = Address.fromScAddress(player1Address).toString();

    const rootInvocation = authEntry.rootInvocation();
    const authorizedFunction = rootInvocation.function();
    const contractFn = authorizedFunction.contractFn();

    const functionName = contractFn.functionName().toString();
    if (functionName !== 'start_game') {
      throw new Error(`Unexpected function: ${functionName}. Expected start_game.`);
    }

    // require_auth_for_args args:
    // 0: session_id (u32)
    // 1: mode_id (u32)
    // 2: player_points (i128)
    const args = contractFn.args();
    if (args.length !== 3) {
      throw new Error(`Expected 3 arguments for start_game auth entry, got ${args.length}`);
    }

    const sessionId = args[0].u32();
    const modeId = args[1].u32();
    const player1Points = args[2].i128().lo().toBigInt();

    return { sessionId, modeId, player1, player1Points, functionName };
  }

  async getSession(sessionId: number, publicKey: string): Promise<Session | null> {
    const client = this.createSigningClient(publicKey);
    const tx = await client.get_session({ session_id: sessionId }, DEFAULT_METHOD_OPTIONS);
    const sim = await tx.simulate();
    if (sim.result.isOk()) return sim.result.unwrap();
    return null;
  }

  async commitBoard(
    sessionId: number,
    player: string,
    commitmentBytes: Uint8Array,
    signer: Signer
  ) {
    const client = this.createSigningClient(player, signer);
    const tx = await client.commit_board(
      {
        session_id: sessionId,
        player,
        commitment: Buffer.from(commitmentBytes),
      },
      DEFAULT_METHOD_OPTIONS
    );
    return await simulateAndSignAndSend(tx);
  }

  async commitTranscript(
    sessionId: number,
    player: string,
    transcriptDigestBytes: Uint8Array,
    signer: Signer
  ) {
    if (transcriptDigestBytes.length !== 32) {
      throw new Error('Transcript digest must be 32 bytes');
    }
    const client = this.createSigningClient(player, signer);
    const tx = await client.commit_transcript(
      {
        session_id: sessionId,
        player,
        transcript_digest: Buffer.from(transcriptDigestBytes),
      },
      DEFAULT_METHOD_OPTIONS
    );
    return await simulateAndSignAndSend(tx);
  }

  async endGame(
    sessionId: number,
    submitter: string,
    sealBytes: Uint8Array,
    journalBytes: Uint8Array,
    signer: Signer
  ) {
    const client = this.createSigningClient(submitter, signer);
    const tx = await client.end_game(
      {
        session_id: sessionId,
        seal: Buffer.from(sealBytes),
        journal: Buffer.from(journalBytes),
      },
      DEFAULT_METHOD_OPTIONS
    );
    return await simulateAndSignAndSend(tx);
  }

  /**
   * STEP 1 (Player 1): Prepare a start_game tx (simulated) and return ONLY Player 1's signed auth entry XDR.
   *
   * If `player2` is blank, we simulate using `SIMULATION_SOURCE_ADDRESS` and use that same address as a placeholder
   * player2 value. Player 2 will rebuild the tx later with their real address and points.
   */
  async prepareStartGame(
    sessionId: number,
    modeId: number,
    player1: string,
    player2: string,
    player1Points: bigint,
    player2Points: bigint,
    player1Signer: Signer,
    authTtlMinutes?: number
  ): Promise<string> {
    this.assertConfigured();

    const hasPlayer2 = !!player2;
    const txSource = hasPlayer2 ? player2 : SIMULATION_SOURCE_ADDRESS;
    const player2Arg = hasPlayer2 ? player2 : SIMULATION_SOURCE_ADDRESS;

    if (!txSource) {
      throw new Error(
        'Opponent address is required for invites unless NEXT_PUBLIC_SIMULATION_SOURCE_ADDRESS is configured.'
      );
    }

    // Build (and simulate) tx with Player 2 as the transaction source for the classic SGS multi-sig flow.
    const buildClient = this.createSigningClient(txSource);
    const tx = await buildClient.start_game(
      {
        session_id: sessionId,
        mode_id: modeId,
        player1,
        player2: player2Arg,
        player1_points: player1Points,
        player2_points: player2Points,
      },
      DEFAULT_METHOD_OPTIONS
    );

    if (!tx.simulationData?.result?.auth) {
      throw new Error('No auth entries found in simulation; cannot prepare invite.');
    }

    const authEntries = tx.simulationData.result.auth;
    let player1AuthEntry: xdr.SorobanAuthorizationEntry | null = null;

    for (const entry of authEntries) {
      const credType = entry.credentials().switch().name;
      if (credType !== 'sorobanCredentialsAddress') continue;
      const entryAddress = entry.credentials().address().address();
      const entryAddressString = Address.fromScAddress(entryAddress).toString();
      if (entryAddressString === player1) {
        player1AuthEntry = entry;
        break;
      }
    }

    if (!player1AuthEntry) {
      throw new Error('Could not find a stubbed auth entry for Player 1 in the simulation result.');
    }

    const validUntilLedgerSeq = authTtlMinutes
      ? await calculateValidUntilLedger(RPC_URL, authTtlMinutes)
      : await calculateValidUntilLedger(RPC_URL, MULTI_SIG_AUTH_TTL_MINUTES);

    const signAuthEntry = player1Signer.signAuthEntry;
    if (!signAuthEntry) {
      throw new Error('Connected wallet does not support signAuthEntry.');
    }

    const signedAuthEntry = await authorizeEntry(
      player1AuthEntry,
      async (preimage) => {
        const res = await signAuthEntry(preimage.toXDR('base64'), {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: player1,
        });
        return Buffer.from(unwrapSignedAuthEntry(res), 'base64');
      },
      validUntilLedgerSeq,
      NETWORK_PASSPHRASE
    );

    return signedAuthEntry.toXDR('base64');
  }

  /**
   * STEP 2 (Player 2): Import Player 1's signed auth entry, rebuild tx, inject auth, sign as needed, return full tx XDR.
   */
  async importAndSignAuthEntry(
    player1SignedAuthEntryXdr: string,
    player2Address: string,
    player2Points: bigint,
    player2Signer: Signer,
    authTtlMinutes?: number
  ): Promise<string> {
    this.assertConfigured();

    const gameParams = this.parseAuthEntry(player1SignedAuthEntryXdr);
    if (player2Address === gameParams.player1) {
      throw new Error('Cannot play against yourself. Player 2 must be different from Player 1.');
    }

    const buildClient = this.createSigningClient(player2Address);
    const tx = await buildClient.start_game(
      {
        session_id: gameParams.sessionId,
        mode_id: gameParams.modeId,
        player1: gameParams.player1,
        player2: player2Address,
        player1_points: gameParams.player1Points,
        player2_points: player2Points,
      },
      DEFAULT_METHOD_OPTIONS
    );

    const validUntilLedgerSeq = authTtlMinutes
      ? await calculateValidUntilLedger(RPC_URL, authTtlMinutes)
      : await calculateValidUntilLedger(RPC_URL, MULTI_SIG_AUTH_TTL_MINUTES);

    const txWithInjectedAuth = await injectSignedAuthEntry(
      tx,
      player1SignedAuthEntryXdr,
      player2Address,
      player2Signer,
      validUntilLedgerSeq
    );

    const player2Client = this.createSigningClient(player2Address, player2Signer);
    const player2Tx = player2Client.txFromXDR(txWithInjectedAuth.toXDR());

    const needsSigning = await player2Tx.needsNonInvokerSigningBy();
    if (needsSigning.includes(player2Address)) {
      await player2Tx.signAuthEntries({ expiration: validUntilLedgerSeq });
    }

    return player2Tx.toXDR();
  }

  /**
   * STEP 3 (Typically Player 2): Import the full tx XDR, re-simulate, sign envelope, and submit to the network.
   */
  async finalizeStartGame(
    txXdr: string,
    signerAddress: string,
    signer: Signer,
    authTtlMinutes?: number
  ) {
    this.assertConfigured();

    const client = this.createSigningClient(signerAddress, signer);
    const tx = client.txFromXDR(txXdr);

    // Must simulate again after auth entries are injected/signed (simulateAndSignAndSend does this).
    void authTtlMinutes; // Reserved for future "validUntilLedgerSeq" plumbing.
    return await simulateAndSignAndSend(tx);
  }
}
