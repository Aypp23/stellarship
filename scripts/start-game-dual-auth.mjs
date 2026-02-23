#!/usr/bin/env node

import { execSync } from 'node:child_process';
import {
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  authorizeEntry,
} from '@stellar/stellar-sdk';

function env(name, fallback = '') {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return fallback;
  return String(v);
}

function mustEnv(name) {
  const v = env(name);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function keySecret(alias) {
  return execSync(`stellar keys secret ${alias}`, { encoding: 'utf8' }).trim();
}

async function main() {
  const rpcUrl = env('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org');
  const networkPassphrase = env('NETWORK_PASSPHRASE', Networks.TESTNET);
  const contractId = mustEnv('CONTRACT_ID');

  const p1Alias = mustEnv('P1_ALIAS');
  const p2Alias = mustEnv('P2_ALIAS');
  const p1Pub = mustEnv('P1_PUB');
  const p2Pub = mustEnv('P2_PUB');

  const sessionIdRaw = mustEnv('SESSION_ID');
  const modeIdRaw = env('MODE_ID', '0');
  const p1PointsRaw = env('P1_POINTS', '10');
  const p2PointsRaw = env('P2_POINTS', '10');

  const sessionId = Number(sessionIdRaw);
  const modeId = Number(modeIdRaw);
  if (!Number.isInteger(sessionId) || sessionId < 0 || sessionId > 0xffff_ffff) {
    throw new Error(`SESSION_ID must be u32, got: ${sessionIdRaw}`);
  }
  if (!Number.isInteger(modeId) || (modeId !== 0 && modeId !== 1)) {
    throw new Error(`MODE_ID must be 0 or 1, got: ${modeIdRaw}`);
  }

  const p1 = Keypair.fromSecret(keySecret(p1Alias));
  const p2 = Keypair.fromSecret(keySecret(p2Alias));
  if (p1.publicKey() !== p1Pub) {
    throw new Error(`P1 alias/public mismatch: alias=${p1.publicKey()} env=${p1Pub}`);
  }
  if (p2.publicKey() !== p2Pub) {
    throw new Error(`P2 alias/public mismatch: alias=${p2.publicKey()} env=${p2Pub}`);
  }

  const server = new rpc.Server(rpcUrl);
  const account = await server.getAccount(p1.publicKey());

  const contract = new Contract(contractId);
  const op = contract.call(
    'start_game',
    nativeToScVal(sessionId, { type: 'u32' }),
    nativeToScVal(modeId, { type: 'u32' }),
    nativeToScVal(p1Pub, { type: 'address' }),
    nativeToScVal(p2Pub, { type: 'address' }),
    nativeToScVal(p1PointsRaw, { type: 'i128' }),
    nativeToScVal(p2PointsRaw, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: String(BASE_FEE),
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (sim.error) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  const auth = prepared.operations[0].auth || [];
  const latest = await server.getLatestLedger();
  const validUntil = Number(latest.sequence) + 1000;

  for (let i = 0; i < auth.length; i += 1) {
    const credType = auth[i].credentials().switch().name;
    if (credType === 'sorobanCredentialsAddress') {
      auth[i] = await authorizeEntry(auth[i], p2, validUntil, networkPassphrase);
    }
  }
  prepared.operations[0].auth = auth;

  prepared.sign(p1);
  const sent = await server.sendTransaction(prepared);
  if (!sent?.hash) {
    throw new Error('RPC did not return tx hash for start_game');
  }

  const final = await server.pollTransaction(sent.hash, {
    attempts: 60,
    sleepStrategy: rpc.BasicSleepStrategy,
  });
  if (final.status !== 'SUCCESS') {
    throw new Error(`start_game failed: status=${final.status}`);
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        txHash: sent.hash,
        sessionId,
        modeId,
        player1: p1Pub,
        player2: p2Pub,
      },
      null,
      2
    ) + '\n'
  );
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});

