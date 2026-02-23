#![no_std]

extern crate alloc;

use alloc::vec::Vec;
use serde::{Deserialize, Serialize};

pub const GRID_SIZE: usize = 8;
pub const SHIP_CELLS: usize = 10;

pub const MODE_CLASSIC: u32 = 0;
pub const MODE_SALVO: u32 = 1;

pub const JOURNAL_LEN: usize = 105;
pub type JournalBytes = [u8; JOURNAL_LEN];

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProverInput {
    pub session_id: u32,
    pub mode_id: u32,
    pub p1_salt: [u8; 32],
    pub p1_board_bits: [u8; 8],
    pub p2_salt: [u8; 32],
    pub p2_board_bits: [u8; 8],
    pub transcript: Vec<u8>,
}

