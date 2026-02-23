#![no_std]

//! # ZK Battleship (Hackathon Prototype)
//!
//! Hidden-information match where players commit to a private board and later settle
//! the full game with a ZK proof.
//!
//! ## Game Hub integration (required)
//! This contract must call `start_game()` and `end_game()` on the Game Hub contract.
//! See `task.md` at repo root for the hackathon requirement and hub contract id.

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, Address, Bytes, BytesN,
    Env, IntoVal, Val, vec, symbol_short,
};

// ============================================================================
// Game Hub Interface
// ============================================================================

#[contractclient(name = "GameHubClient")]
pub trait GameHub {
    fn start_game(
        env: Env,
        game_id: Address,
        session_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
    );

    fn end_game(env: Env, session_id: u32, player1_won: bool);
}

// ============================================================================
// RISC Zero Verifier Router Interface (Nethermind)
// ============================================================================
//
// We call the router using `env.invoke_contract` so we don't need to duplicate
// the full `VerifierError` type for decoding. Any verification failure will
// revert the transaction.
// ============================================================================
// Errors
// ============================================================================

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    SessionNotFound = 1,
    NotPlayer = 2,
    AlreadyCommitted = 3,
    InvalidMode = 4,
    SessionAlreadyEnded = 5,
    NotConfigured = 6,
    InvalidJournal = 7,
    NotCommitted = 8,
    TranscriptNotCommitted = 9,
    AlreadyCommittedTranscript = 10,
}

// ============================================================================
// Data Types
// ============================================================================

pub const MODE_CLASSIC: u32 = 0;
pub const MODE_SALVO: u32 = 1;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Session {
    pub player1: Address,
    pub player2: Address,
    pub mode_id: u32,
    pub player1_points: i128,
    pub player2_points: i128,

    pub player1_commitment: Option<BytesN<32>>,
    pub player2_commitment: Option<BytesN<32>>,

    // Both players must commit the transcript digest before settlement.
    pub player1_transcript_digest: Option<BytesN<32>>,
    pub player2_transcript_digest: Option<BytesN<32>>,

    pub ended: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Session(u32),
    GameHubAddress,
    Admin,
    VerifierRouter,
    ImageId,
}

// 30 days worth of ledgers.
const SESSION_TTL_LEDGERS: u32 = 518_400;

#[contract]
pub struct ZkBattleshipContract;

#[contractimpl]
impl ZkBattleshipContract {
    pub fn __constructor(
        env: Env,
        admin: Address,
        game_hub: Address,
        verifier_router: Address,
        image_id: BytesN<32>,
    ) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::GameHubAddress, &game_hub);
        env.storage()
            .instance()
            .set(&DataKey::VerifierRouter, &verifier_router);
        env.storage().instance().set(&DataKey::ImageId, &image_id);
    }

    pub fn set_verifier(env: Env, verifier_router: Address, image_id: BytesN<32>) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set");
        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::VerifierRouter, &verifier_router);
        env.storage().instance().set(&DataKey::ImageId, &image_id);

        Ok(())
    }

    /// Start a new match.
    ///
    /// `mode_id` is on-chain enforced by binding it into `require_auth_for_args` so both players sign it.
    pub fn start_game(
        env: Env,
        session_id: u32,
        mode_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
    ) -> Result<(), Error> {
        if player1 == player2 {
            panic!("Cannot play against yourself");
        }

        if mode_id != MODE_CLASSIC && mode_id != MODE_SALVO {
            return Err(Error::InvalidMode);
        }

        // CRITICAL: both players sign (session_id, mode_id, their_points)
        player1.require_auth_for_args(vec![
            &env,
            session_id.into_val(&env),
            mode_id.into_val(&env),
            player1_points.into_val(&env),
        ]);
        player2.require_auth_for_args(vec![
            &env,
            session_id.into_val(&env),
            mode_id.into_val(&env),
            player2_points.into_val(&env),
        ]);

        let game_hub_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::GameHubAddress)
            .expect("GameHub address not set");

        let game_hub = GameHubClient::new(&env, &game_hub_addr);

        // Locks points and emits GameStarted event in the hub.
        game_hub.start_game(
            &env.current_contract_address(),
            &session_id,
            &player1,
            &player2,
            &player1_points,
            &player2_points,
        );

        let session = Session {
            player1: player1.clone(),
            player2: player2.clone(),
            mode_id,
            player1_points,
            player2_points,
            player1_commitment: None,
            player2_commitment: None,
            player1_transcript_digest: None,
            player2_transcript_digest: None,
            ended: false,
        };

        let key = DataKey::Session(session_id);
        env.storage().temporary().set(&key, &session);
        env.storage()
            .temporary()
            .extend_ttl(&key, SESSION_TTL_LEDGERS, SESSION_TTL_LEDGERS);

        Ok(())
    }

    pub fn get_session(env: Env, session_id: u32) -> Result<Session, Error> {
        let key = DataKey::Session(session_id);
        env.storage()
            .temporary()
            .get(&key)
            .ok_or(Error::SessionNotFound)
    }

    pub fn commit_board(
        env: Env,
        session_id: u32,
        player: Address,
        commitment: BytesN<32>,
    ) -> Result<(), Error> {
        player.require_auth();

        let key = DataKey::Session(session_id);
        let mut session: Session = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::SessionNotFound)?;

        if session.ended {
            return Err(Error::SessionAlreadyEnded);
        }

        if player == session.player1 {
            if session.player1_commitment.is_some() {
                return Err(Error::AlreadyCommitted);
            }
            session.player1_commitment = Some(commitment);
        } else if player == session.player2 {
            if session.player2_commitment.is_some() {
                return Err(Error::AlreadyCommitted);
            }
            session.player2_commitment = Some(commitment);
        } else {
            return Err(Error::NotPlayer);
        }

        env.storage().temporary().set(&key, &session);
        env.storage()
            .temporary()
            .extend_ttl(&key, SESSION_TTL_LEDGERS, SESSION_TTL_LEDGERS);

        Ok(())
    }

    /// Commit the transcript digest (sha256 of transcript bytes) for settlement.
    ///
    /// Both players must submit the same digest (each authenticated) before `end_game` can succeed.
    pub fn commit_transcript(
        env: Env,
        session_id: u32,
        player: Address,
        transcript_digest: BytesN<32>,
    ) -> Result<(), Error> {
        player.require_auth();

        let key = DataKey::Session(session_id);
        let mut session: Session = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::SessionNotFound)?;

        if session.ended {
            return Err(Error::SessionAlreadyEnded);
        }

        if player == session.player1 {
            if session.player1_transcript_digest.is_some() {
                return Err(Error::AlreadyCommittedTranscript);
            }
            session.player1_transcript_digest = Some(transcript_digest);
        } else if player == session.player2 {
            if session.player2_transcript_digest.is_some() {
                return Err(Error::AlreadyCommittedTranscript);
            }
            session.player2_transcript_digest = Some(transcript_digest);
        } else {
            return Err(Error::NotPlayer);
        }

        env.storage().temporary().set(&key, &session);
        env.storage()
            .temporary()
            .extend_ttl(&key, SESSION_TTL_LEDGERS, SESSION_TTL_LEDGERS);

        Ok(())
    }

    /// End a match after ZK verification.
    ///
    /// This verifies a RISC Zero receipt (Groth16) via the deployed verifier router.
    ///
    /// The `journal` is included so we can:
    /// 1) compute the journal digest on-chain for `router.verify(...)`
    /// 2) parse and validate outputs (session/mode/commitments/winner) against on-chain state.
    ///
    /// Journal format (fixed length = 105 bytes, big-endian u32 fields):
    /// - 0..4:   session_id (u32 BE)
    /// - 4..8:   mode_id (u32 BE)
    /// - 8..40:  player1_commitment (32 bytes)
    /// - 40..72: player2_commitment (32 bytes)
    /// - 72..104 transcript_digest (32 bytes)
    /// - 104:    player1_won (u8: 0 or 1)
    pub fn end_game(env: Env, session_id: u32, seal: Bytes, journal: Bytes) -> Result<(), Error> {
        let key = DataKey::Session(session_id);
        let mut session: Session = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::SessionNotFound)?;

        if session.ended {
            return Err(Error::SessionAlreadyEnded);
        }

        let player1_commitment = session.player1_commitment.clone().ok_or(Error::NotCommitted)?;
        let player2_commitment = session.player2_commitment.clone().ok_or(Error::NotCommitted)?;

        let verifier_router: Address = env
            .storage()
            .instance()
            .get(&DataKey::VerifierRouter)
            .ok_or(Error::NotConfigured)?;
        let image_id: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::ImageId)
            .ok_or(Error::NotConfigured)?;

        // Compute the digest the verifier expects.
        let journal_digest: BytesN<32> = env.crypto().sha256(&journal).into();

        // Verify receipt via router. Reverts on failure.
        let _ret: Val = env.invoke_contract(
            &verifier_router,
            &symbol_short!("verify"),
            vec![
                &env,
                seal.into_val(&env),
                image_id.into_val(&env),
                journal_digest.into_val(&env),
            ],
        );

        // Parse journal and bind to on-chain state.
        const JOURNAL_LEN: u32 = 105;
        if journal.len() != JOURNAL_LEN {
            return Err(Error::InvalidJournal);
        }

        let sid = read_u32_be(&journal, 0).ok_or(Error::InvalidJournal)?;
        let mid = read_u32_be(&journal, 4).ok_or(Error::InvalidJournal)?;
        if sid != session_id || mid != session.mode_id {
            return Err(Error::InvalidJournal);
        }

        let j_p1 = read_bytesn_32(&env, &journal, 8).ok_or(Error::InvalidJournal)?;
        let j_p2 = read_bytesn_32(&env, &journal, 40).ok_or(Error::InvalidJournal)?;
        if j_p1 != player1_commitment || j_p2 != player2_commitment {
            return Err(Error::InvalidJournal);
        }

        let j_transcript_digest = read_bytesn_32(&env, &journal, 72).ok_or(Error::InvalidJournal)?;
        let p1_t = session
            .player1_transcript_digest
            .clone()
            .ok_or(Error::TranscriptNotCommitted)?;
        let p2_t = session
            .player2_transcript_digest
            .clone()
            .ok_or(Error::TranscriptNotCommitted)?;
        if p1_t != p2_t || p1_t != j_transcript_digest {
            return Err(Error::InvalidJournal);
        }

        let winner_byte = journal.get(104).ok_or(Error::InvalidJournal)?;
        if winner_byte != 0 && winner_byte != 1 {
            return Err(Error::InvalidJournal);
        }
        let player1_won = winner_byte == 1;

        let game_hub_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::GameHubAddress)
            .expect("GameHub address not set");
        let game_hub = GameHubClient::new(&env, &game_hub_addr);
        game_hub.end_game(&session_id, &player1_won);

        session.ended = true;
        env.storage().temporary().set(&key, &session);
        env.storage()
            .temporary()
            .extend_ttl(&key, SESSION_TTL_LEDGERS, SESSION_TTL_LEDGERS);

        Ok(())
    }
}

fn read_u32_be(b: &Bytes, start: u32) -> Option<u32> {
    let a0 = b.get(start)? as u32;
    let a1 = b.get(start + 1)? as u32;
    let a2 = b.get(start + 2)? as u32;
    let a3 = b.get(start + 3)? as u32;
    Some((a0 << 24) | (a1 << 16) | (a2 << 8) | a3)
}

fn read_bytesn_32(env: &Env, b: &Bytes, start: u32) -> Option<BytesN<32>> {
    let mut out = [0u8; 32];
    let mut i = 0;
    while i < 32 {
        out[i] = b.get(start + i as u32)?;
        i += 1;
    }
    Some(BytesN::from_array(env, &out))
}
