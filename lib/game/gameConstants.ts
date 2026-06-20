/**
 * Game Constants for Neuroclash.gg
 * Centralizing all magic numbers and rules for easier balancing.
 */

export const GAME_CONSTANTS = {
    // Battle Mechanics
    BASE_DAMAGE: 20,
    ROUND_DAMAGE_MIN: 5,
    ROUND_DAMAGE_SCALE: 20,

    // Buffs & Multipliers
    ATTACK_BUFF_ID: 2,
    ATTACK_BUFF_VALUE: 10,

    SHIELD_BUFF_ID: 4,
    SHIELD_BUFF_VALUE: 20,

    TROPHY_BUFF_ID: 5,
    COIN_BUFF_ID: 6,
    BUFF_PERCENT_PER_STOCK: 5,

    // Game Session Defaults
    DEFAULT_TOTAL_ROUNDS: 20,
    STARBOX_INTERVAL: 5,

    // Rewards & Rankings
    BASE_COINS_WIN: 200,
    MAX_COINS_RANK_MULTIPLIER: 600,

    MIN_TROPHY_WIN: 20,
    MAX_TROPHY_LOSS: 15,
    DYNAMIC_SCALE_FACTOR: 5,

    // Efficiency factors
    EFFICIENCY_BASE_ROUNDS: 15,
    EFFICIENCY_INCREMENT_SCALE: 0.01,

    // Win Limits
    MAX_STATS_RANK_ID: 6,
    DEFAULT_MAX_TROPHY: 3000,
};
