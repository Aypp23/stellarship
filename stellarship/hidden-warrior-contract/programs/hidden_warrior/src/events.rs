use anchor_lang::prelude::*;

#[event]
pub struct BattleResultEvent {
    pub result: String,
    pub result_code: u8,
}

