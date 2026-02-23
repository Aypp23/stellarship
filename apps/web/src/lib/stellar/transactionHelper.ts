import { contract } from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';

function assertTransactionSucceeded<T>(sent: contract.SentTransaction<T>, actionLabel: string): contract.SentTransaction<T> {
  const txAny = sent as any;
  const status = String(txAny?.getTransactionResponse?.status ?? '');
  if (!status) return sent;
  if (status === 'SUCCESS') return sent;

  const hash = String(txAny?.sendTransactionResponse?.hash ?? '').trim();
  const suffix = hash ? ` (hash=${hash})` : '';
  throw new Error(`${actionLabel} failed on-chain with status=${status}${suffix}. Please retry.`);
}

function isSwitchDecodeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return message.includes("reading 'switch'");
}

function isTxBadSeqError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (message.toLowerCase().includes('txbadseq')) return true;
  const anyErr = err as any;
  if (String(anyErr?.errorResult?._attributes?.result?._switch?.name ?? '') === 'txBadSeq') return true;
  try {
    const raw = JSON.stringify(err);
    if (raw && raw.toLowerCase().includes('txbadseq')) return true;
  } catch {
    // ignore stringify failures
  }
  return false;
}

async function signAndSendWithWorkarounds<T>(
  assembled: contract.AssembledTransaction<T>,
  actionLabel: string
): Promise<contract.SentTransaction<T>> {
  try {
    const sent = await assembled.signAndSend();
    return assertTransactionSucceeded(sent, actionLabel);
  } catch (err: any) {
    const errName = err?.name ?? '';
    const errMessage = err instanceof Error ? err.message : String(err);
    const isNoSignatureNeeded =
      errName.includes('NoSignatureNeededError') ||
      errMessage.includes('NoSignatureNeededError') ||
      errMessage.includes('This is a read call') ||
      errMessage.includes('requires no signature') ||
      errMessage.includes('force: true');

    // Some bindings misclassify state-changing methods as read calls. Allow forcing submission.
    if (isNoSignatureNeeded) {
      const sent = await assembled.signAndSend({ force: true });
      return assertTransactionSucceeded(sent, actionLabel);
    }

    // Workaround for wallet/sdk edge cases where auth-signature introspection crashes
    // inside `needsNonInvokerSigningBy()` (`reading 'switch'`).
    if (isSwitchDecodeError(err)) {
      const txAny = assembled as any;
      const options = txAny?.options;
      const built = txAny?.built;
      const signTransaction = options?.signTransaction;
      const networkPassphrase = options?.networkPassphrase;

      if (built && signTransaction && networkPassphrase) {
        const signedRes = await signTransaction(built.toXDR(), {
          networkPassphrase,
          address: options?.address,
        });
        const signedTxXdr = signedRes?.signedTxXdr;
        if (!signedTxXdr) throw err;
        txAny.signed = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase);
        const sent = await txAny.send();
        return assertTransactionSucceeded(sent, actionLabel);
      }
    }

    throw err;
  }
}

export async function simulateAndSignAndSend<T>(
  tx: contract.AssembledTransaction<T>,
  actionLabel = 'Transaction'
): Promise<contract.SentTransaction<T>> {
  try {
    const simulated = await tx.simulate();
    return await signAndSendWithWorkarounds(simulated, actionLabel);
  } catch (err: any) {
    // Sequence mismatch is usually transient (another tx consumed sequence).
    // Re-simulate once to refresh sequence number and retry.
    if (isTxBadSeqError(err)) {
      try {
        const refreshed = await tx.simulate();
        return await signAndSendWithWorkarounds(refreshed, actionLabel);
      } catch (retryErr) {
        if (isTxBadSeqError(retryErr)) {
          throw new Error(
            'Transaction sequence is out of date (txBadSeq). Another transaction from this wallet was submitted at the same time. Please retry once.'
          );
        }
        throw retryErr;
      }
    }
    throw err;
  }
}
