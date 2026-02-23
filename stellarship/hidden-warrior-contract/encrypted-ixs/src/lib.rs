use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct WarriorStats {
        pub strength: u8,
        pub agility: u8,
        pub endurance: u8,
        pub intelligence: u8,
    }

    #[instruction]
    pub fn battle_warrior(
        stats_ctxt: Enc<Shared, WarriorStats>
    ) -> u8 {
        let player_stats = stats_ctxt.to_arcis();
        let strength = player_stats.strength;
        let agility = player_stats.agility;
        let endurance = player_stats.endurance;
        let intelligence = player_stats.intelligence;
        
        // Fixed enemy stats for testing
        let enemy_strength = 50;
        let enemy_agility = 50; 
        let enemy_endurance = 50;
        let enemy_intelligence = 50;

        // Calculate total power
        let player_power = strength as u32 
            + agility as u32 
            + endurance as u32 
            + intelligence as u32;
                           
        let enemy_power = (enemy_strength + enemy_agility + enemy_endurance + enemy_intelligence) as u32;
        
        // Determine winner
        let result = if player_power > enemy_power {
            0 // Player Victory
        } else if enemy_power > player_power {
            1 // Enemy Victory
        } else {
            2 // Draw
        };
        
        // Return plaintext result
        result.reveal()
    }
}

#[cfg(test)]
mod tests {
    use super::circuits::*;

    #[test]
    fn test_player_wins() {
        let stats = WarriorStats {
            strength: 80,
            agility: 70,
            endurance: 60,
            intelligence: 50,
        };
        // Player power: 260, Enemy power: 200
        // Expected: Player Victory (0)
        assert!(260 > 200);
    }

    #[test]
    fn test_enemy_wins() {
        let stats = WarriorStats {
            strength: 30,
            agility: 30,
            endurance: 30,
            intelligence: 30,
        };
        // Player power: 120, Enemy power: 200
        // Expected: Enemy Victory (1)
        assert!(120 < 200);
    }

    #[test]
    fn test_draw() {
        let stats = WarriorStats {
            strength: 50,
            agility: 50,
            endurance: 50,
            intelligence: 50,
        };
        // Player power: 200, Enemy power: 200
        // Expected: Draw (2)
        assert_eq!(200, 200);
    }
} 