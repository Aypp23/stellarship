use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BattleResult {
    #[max_len(32)]
    pub result: String,
    pub result_code: u8,
    pub bump: u8,
}

#[derive(InitSpace)]
#[account]
pub struct SignerAccount {
    pub bump: u8,
}

