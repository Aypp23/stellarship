mod constants;
mod contexts;
mod error;
mod events;
mod types;

use crate::{contexts::*, error::ErrorCode, events::*};
use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

declare_id!("EgoazoFTsMHtx9RoZZ2iXZYLpMhRSz85Q4oYZnNKqB91");

#[arcium_program]
pub mod hidden_warrior {
    use super::*;

    pub fn init_battle_warrior_comp_def(ctx: Context<InitBattleWarriorCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            0,
            None, // On-chain circuit uploaded via uploadCircuit
            None,
        )
    }
    
    pub fn init_battle_result(ctx: Context<InitBattleResult>) -> Result<()> {
        ctx.accounts.battle_result.bump = ctx.bumps.battle_result;
        Ok(())
    }

    pub fn battle_warrior(
        ctx: Context<BattleWarrior>,
        computation_offset: u64,
        encryption_pubkey: [u8; 32],
        nonce: u128,
        strength_ct: [u8; 32],
        agility_ct: [u8; 32],
        endurance_ct: [u8; 32],
        intelligence_ct: [u8; 32],
    ) -> Result<()> {
        // Как в battleships: передаем каждое поле структуры отдельно + pubkey и nonce
        let args = vec![
            Argument::ArcisPubkey(encryption_pubkey),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU8(strength_ct),
            Argument::EncryptedU8(agility_ct),
            Argument::EncryptedU8(endurance_ct),
            Argument::EncryptedU8(intelligence_ct),
        ];
        
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![BattleWarriorCallback::callback_ix(&[])],
            1,
        )?; 
        
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "battle_warrior")]
    pub fn battle_warrior_callback(
        ctx: Context<BattleWarriorCallback>,
        output: ComputationOutputs<BattleWarriorOutput>,
    ) -> Result<()> {
        let battle_result_code = match output {
            ComputationOutputs::Success(BattleWarriorOutput { 
                field_0: result_code
            }) => {
                result_code
            },
            _ => {
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        let result_str = match battle_result_code {
            0 => "Player Victory".to_string(),
            1 => "Enemy Victory".to_string(),
            2 => "Draw".to_string(),
            _ => format!("Error: {}", battle_result_code),
        };

        ctx.accounts.battle_result.result = result_str.clone();
        ctx.accounts.battle_result.result_code = battle_result_code;

        emit!(BattleResultEvent { 
            result: result_str,
            result_code: battle_result_code 
        });
        
        Ok(())
    }
} 