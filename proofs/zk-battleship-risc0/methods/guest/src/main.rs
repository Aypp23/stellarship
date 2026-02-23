#![no_main]
#![no_std]

extern crate alloc;

use risc0_zkvm::guest::{entry, env};
use sha2::{Digest, Sha256};
use zkbs_shared::{JournalBytes, ProverInput, GRID_SIZE, JOURNAL_LEN, MODE_CLASSIC, MODE_SALVO, SHIP_CELLS};

entry!(main);

fn popcount(bits: &[u8; 8]) -> usize {
    bits.iter().map(|b| b.count_ones() as usize).sum()
}

fn board_bit(bits: &[u8; 8], x: u8, y: u8) -> bool {
    let idx = (y as usize) * GRID_SIZE + (x as usize);
    let byte = idx / 8;
    let inner = idx % 8;
    ((bits[byte] >> inner) & 1) == 1
}

fn sha256_concat(a: &[u8], b: &[u8]) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(a);
    h.update(b);
    let out = h.finalize();
    out.into()
}

fn sha256_bytes(data: &[u8]) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(data);
    let out = h.finalize();
    out.into()
}

fn main() {
    let input: ProverInput = env::read();

    let shots_per_turn: usize = match input.mode_id {
        MODE_CLASSIC => 1,
        MODE_SALVO => 2,
        _ => panic!("invalid mode_id"),
    };

    assert!(
        popcount(&input.p1_board_bits) == SHIP_CELLS,
        "player1 board must have exactly 10 ship cells"
    );
    assert!(
        popcount(&input.p2_board_bits) == SHIP_CELLS,
        "player2 board must have exactly 10 ship cells"
    );

    let stride = shots_per_turn * 3;
    assert!(stride > 0, "invalid stride");
    assert!(
        input.transcript.len() % stride == 0,
        "transcript length must be multiple of shots_per_turn*3"
    );

    let turns = input.transcript.len() / stride;
    assert!(turns > 0, "empty transcript");

    let mut p1_hits: usize = 0;
    let mut p2_hits: usize = 0;
    let mut p1_shots: u64 = 0;
    let mut p2_shots: u64 = 0;

    let mut player1_won: Option<bool> = None;

    for t in 0..turns {
        let attacker_is_p1 = (t % 2) == 0;

        let (def_bits, shots_mask, hits_ref) = if attacker_is_p1 {
            (&input.p2_board_bits, &mut p1_shots, &mut p1_hits)
        } else {
            (&input.p1_board_bits, &mut p2_shots, &mut p2_hits)
        };

        for i in 0..shots_per_turn {
            let off = t * stride + i * 3;
            let x = input.transcript[off];
            let y = input.transcript[off + 1];
            let hit = input.transcript[off + 2];

            assert!(x < GRID_SIZE as u8, "x out of bounds");
            assert!(y < GRID_SIZE as u8, "y out of bounds");
            assert!(hit == 0 || hit == 1, "hit must be 0 or 1");

            let idx = (y as u64) * (GRID_SIZE as u64) + (x as u64);
            let bit = 1u64 << idx;
            assert!((*shots_mask & bit) == 0, "repeated shot");
            *shots_mask |= bit;

            let expected = board_bit(def_bits, x, y);
            if expected {
                assert!(hit == 1, "incorrect hit flag");
                *hits_ref += 1;
                assert!(*hits_ref <= SHIP_CELLS, "too many hits");
            } else {
                assert!(hit == 0, "incorrect hit flag");
            }
        }

        if player1_won.is_some() {
            panic!("transcript continues after win");
        }

        // Winner is determined at end of turn (matches the frontend: shots are sent in batches).
        if attacker_is_p1 {
            if p1_hits >= SHIP_CELLS {
                player1_won = Some(true);
                assert!(t == turns - 1, "transcript continues after win");
            }
        } else if p2_hits >= SHIP_CELLS {
            player1_won = Some(false);
            assert!(t == turns - 1, "transcript continues after win");
        }
    }

    let player1_won = player1_won.expect("no winner in transcript");

    let p1_commit = sha256_concat(&input.p1_salt, &input.p1_board_bits);
    let p2_commit = sha256_concat(&input.p2_salt, &input.p2_board_bits);
    let transcript_digest = sha256_bytes(&input.transcript);

    let mut journal: JournalBytes = [0u8; JOURNAL_LEN];
    journal[0..4].copy_from_slice(&input.session_id.to_be_bytes());
    journal[4..8].copy_from_slice(&input.mode_id.to_be_bytes());
    journal[8..40].copy_from_slice(&p1_commit);
    journal[40..72].copy_from_slice(&p2_commit);
    journal[72..104].copy_from_slice(&transcript_digest);
    journal[104] = if player1_won { 1 } else { 0 };

    // Commit raw journal bytes (must be exactly 105 bytes for the on-chain parser).
    env::commit_slice(&journal);
}
