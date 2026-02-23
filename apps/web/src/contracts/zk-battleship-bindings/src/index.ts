import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const Errors = {
  1: {message:"SessionNotFound"},
  2: {message:"NotPlayer"},
  3: {message:"AlreadyCommitted"},
  4: {message:"InvalidMode"},
  5: {message:"SessionAlreadyEnded"},
  6: {message:"NotConfigured"},
  7: {message:"InvalidJournal"},
  8: {message:"NotCommitted"},
  9: {message:"TranscriptNotCommitted"},
  10: {message:"AlreadyCommittedTranscript"}
}


export interface Session {
  ended: boolean;
  mode_id: u32;
  player1: string;
  player1_commitment: Option<Buffer>;
  player1_points: i128;
  player1_transcript_digest: Option<Buffer>;
  player2: string;
  player2_commitment: Option<Buffer>;
  player2_points: i128;
  player2_transcript_digest: Option<Buffer>;
}

export type DataKey = {tag: "Session", values: readonly [u32]} | {tag: "GameHubAddress", values: void} | {tag: "Admin", values: void} | {tag: "VerifierRouter", values: void} | {tag: "ImageId", values: void};

export interface Client {
  /**
   * Construct and simulate a set_verifier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_verifier: ({verifier_router, image_id}: {verifier_router: string, image_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a start_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Start a new match.
   * 
   * `mode_id` is on-chain enforced by binding it into `require_auth_for_args` so both players sign it.
   */
  start_game: ({session_id, mode_id, player1, player2, player1_points, player2_points}: {session_id: u32, mode_id: u32, player1: string, player2: string, player1_points: i128, player2_points: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_session transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_session: ({session_id}: {session_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Session>>>

  /**
   * Construct and simulate a commit_board transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  commit_board: ({session_id, player, commitment}: {session_id: u32, player: string, commitment: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a commit_transcript transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Commit the transcript digest (sha256 of transcript bytes) for settlement.
   * 
   * Both players must submit the same digest (each authenticated) before `end_game` can succeed.
   */
  commit_transcript: ({session_id, player, transcript_digest}: {session_id: u32, player: string, transcript_digest: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a end_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * End a match after ZK verification.
   * 
   * This verifies a RISC Zero receipt (Groth16) via the deployed verifier router.
   * 
   * The `journal` is included so we can:
   * 1) compute the journal digest on-chain for `router.verify(...)`
   * 2) parse and validate outputs (session/mode/commitments/winner) against on-chain state.
   * 
   * Journal format (fixed length = 105 bytes, big-endian u32 fields):
   * - 0..4:   session_id (u32 BE)
   * - 4..8:   mode_id (u32 BE)
   * - 8..40:  player1_commitment (32 bytes)
   * - 40..72: player2_commitment (32 bytes)
   * - 72..104 transcript_digest (32 bytes)
   * - 104:    player1_won (u8: 0 or 1)
   */
  end_game: ({session_id, seal, journal}: {session_id: u32, seal: Buffer, journal: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, game_hub, verifier_router, image_id}: {admin: string, game_hub: string, verifier_router: string, image_id: Buffer},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, game_hub, verifier_router, image_id}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACgAAAAAAAAAPU2Vzc2lvbk5vdEZvdW5kAAAAAAEAAAAAAAAACU5vdFBsYXllcgAAAAAAAAIAAAAAAAAAEEFscmVhZHlDb21taXR0ZWQAAAADAAAAAAAAAAtJbnZhbGlkTW9kZQAAAAAEAAAAAAAAABNTZXNzaW9uQWxyZWFkeUVuZGVkAAAAAAUAAAAAAAAADU5vdENvbmZpZ3VyZWQAAAAAAAAGAAAAAAAAAA5JbnZhbGlkSm91cm5hbAAAAAAABwAAAAAAAAAMTm90Q29tbWl0dGVkAAAACAAAAAAAAAAWVHJhbnNjcmlwdE5vdENvbW1pdHRlZAAAAAAACQAAAAAAAAAaQWxyZWFkeUNvbW1pdHRlZFRyYW5zY3JpcHQAAAAAAAo=",
        "AAAAAQAAAAAAAAAAAAAAB1Nlc3Npb24AAAAACgAAAAAAAAAFZW5kZWQAAAAAAAABAAAAAAAAAAdtb2RlX2lkAAAAAAQAAAAAAAAAB3BsYXllcjEAAAAAEwAAAAAAAAAScGxheWVyMV9jb21taXRtZW50AAAAAAPoAAAD7gAAACAAAAAAAAAADnBsYXllcjFfcG9pbnRzAAAAAAALAAAAAAAAABlwbGF5ZXIxX3RyYW5zY3JpcHRfZGlnZXN0AAAAAAAD6AAAA+4AAAAgAAAAAAAAAAdwbGF5ZXIyAAAAABMAAAAAAAAAEnBsYXllcjJfY29tbWl0bWVudAAAAAAD6AAAA+4AAAAgAAAAAAAAAA5wbGF5ZXIyX3BvaW50cwAAAAAACwAAAAAAAAAZcGxheWVyMl90cmFuc2NyaXB0X2RpZ2VzdAAAAAAAA+gAAAPuAAAAIA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAEAAAAAAAAAB1Nlc3Npb24AAAAAAQAAAAQAAAAAAAAAAAAAAA5HYW1lSHViQWRkcmVzcwAAAAAAAAAAAAAAAAAFQWRtaW4AAAAAAAAAAAAAAAAAAA5WZXJpZmllclJvdXRlcgAAAAAAAAAAAAAAAAAHSW1hZ2VJZAA=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIZ2FtZV9odWIAAAATAAAAAAAAAA92ZXJpZmllcl9yb3V0ZXIAAAAAEwAAAAAAAAAIaW1hZ2VfaWQAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAAAAAAAMc2V0X3ZlcmlmaWVyAAAAAgAAAAAAAAAPdmVyaWZpZXJfcm91dGVyAAAAABMAAAAAAAAACGltYWdlX2lkAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAHZTdGFydCBhIG5ldyBtYXRjaC4KCmBtb2RlX2lkYCBpcyBvbi1jaGFpbiBlbmZvcmNlZCBieSBiaW5kaW5nIGl0IGludG8gYHJlcXVpcmVfYXV0aF9mb3JfYXJnc2Agc28gYm90aCBwbGF5ZXJzIHNpZ24gaXQuAAAAAAAKc3RhcnRfZ2FtZQAAAAAABgAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAAHbW9kZV9pZAAAAAAEAAAAAAAAAAdwbGF5ZXIxAAAAABMAAAAAAAAAB3BsYXllcjIAAAAAEwAAAAAAAAAOcGxheWVyMV9wb2ludHMAAAAAAAsAAAAAAAAADnBsYXllcjJfcG9pbnRzAAAAAAALAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAALZ2V0X3Nlc3Npb24AAAAAAQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAEAAAPpAAAH0AAAAAdTZXNzaW9uAAAAAAM=",
        "AAAAAAAAAAAAAAAMY29tbWl0X2JvYXJkAAAAAwAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAABAAAAAAAAAAGcGxheWVyAAAAAAATAAAAAAAAAApjb21taXRtZW50AAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAKdDb21taXQgdGhlIHRyYW5zY3JpcHQgZGlnZXN0IChzaGEyNTYgb2YgdHJhbnNjcmlwdCBieXRlcykgZm9yIHNldHRsZW1lbnQuCgpCb3RoIHBsYXllcnMgbXVzdCBzdWJtaXQgdGhlIHNhbWUgZGlnZXN0IChlYWNoIGF1dGhlbnRpY2F0ZWQpIGJlZm9yZSBgZW5kX2dhbWVgIGNhbiBzdWNjZWVkLgAAAAARY29tbWl0X3RyYW5zY3JpcHQAAAAAAAADAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAEAAAAAAAAAAZwbGF5ZXIAAAAAABMAAAAAAAAAEXRyYW5zY3JpcHRfZGlnZXN0AAAAAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAkVFbmQgYSBtYXRjaCBhZnRlciBaSyB2ZXJpZmljYXRpb24uCgpUaGlzIHZlcmlmaWVzIGEgUklTQyBaZXJvIHJlY2VpcHQgKEdyb3RoMTYpIHZpYSB0aGUgZGVwbG95ZWQgdmVyaWZpZXIgcm91dGVyLgoKVGhlIGBqb3VybmFsYCBpcyBpbmNsdWRlZCBzbyB3ZSBjYW46CjEpIGNvbXB1dGUgdGhlIGpvdXJuYWwgZGlnZXN0IG9uLWNoYWluIGZvciBgcm91dGVyLnZlcmlmeSguLi4pYAoyKSBwYXJzZSBhbmQgdmFsaWRhdGUgb3V0cHV0cyAoc2Vzc2lvbi9tb2RlL2NvbW1pdG1lbnRzL3dpbm5lcikgYWdhaW5zdCBvbi1jaGFpbiBzdGF0ZS4KCkpvdXJuYWwgZm9ybWF0IChmaXhlZCBsZW5ndGggPSAxMDUgYnl0ZXMsIGJpZy1lbmRpYW4gdTMyIGZpZWxkcyk6Ci0gMC4uNDogICBzZXNzaW9uX2lkICh1MzIgQkUpCi0gNC4uODogICBtb2RlX2lkICh1MzIgQkUpCi0gOC4uNDA6ICBwbGF5ZXIxX2NvbW1pdG1lbnQgKDMyIGJ5dGVzKQotIDQwLi43MjogcGxheWVyMl9jb21taXRtZW50ICgzMiBieXRlcykKLSA3Mi4uMTA0IHRyYW5zY3JpcHRfZGlnZXN0ICgzMiBieXRlcykKLSAxMDQ6ICAgIHBsYXllcjFfd29uICh1ODogMCBvciAxKQAAAAAAAAhlbmRfZ2FtZQAAAAMAAAAAAAAACnNlc3Npb25faWQAAAAAAAQAAAAAAAAABHNlYWwAAAAOAAAAAAAAAAdqb3VybmFsAAAAAA4AAAABAAAD6QAAAAIAAAAD" ]),
      options
    )
  }
  public readonly fromJSON = {
    set_verifier: this.txFromJSON<Result<void>>,
        start_game: this.txFromJSON<Result<void>>,
        get_session: this.txFromJSON<Result<Session>>,
        commit_board: this.txFromJSON<Result<void>>,
        commit_transcript: this.txFromJSON<Result<void>>,
        end_game: this.txFromJSON<Result<void>>
  }
}