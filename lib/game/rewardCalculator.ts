import { GAME_CONSTANTS } from "./gameConstants";

export interface RewardParams {
    rank: number;
    totalPlayers: number;
    totalRounds: number;
    wins: number;
    losses: number;
    coinBoost?: number;
    trophyBoost?: number;
}

export function calculateRewards({
    rank,
    totalPlayers,
    totalRounds,
    wins,
    losses,
    coinBoost = 0,
    trophyBoost = 0,
}: RewardParams) {
    let baseCoin = 0;
    let baseTrophy = 0;

    // Efficiency factor based on total rounds (modeled from endgameService)
    const Ef =
        1 +
        Math.max(0, totalRounds - GAME_CONSTANTS.EFFICIENCY_BASE_ROUNDS) *
            GAME_CONSTANTS.EFFICIENCY_INCREMENT_SCALE;

    if (totalPlayers === 1) {
        // Solo Mode Rewards
        baseCoin = wins * 15 + losses * 5;
        baseTrophy = Math.round(Math.max(0, wins * 1.2 - losses * 0.5));
    } else {
        // Multiplayer Rewards
        // Coin Formula
        const BaseCoin =
            GAME_CONSTANTS.BASE_COINS_WIN +
            (GAME_CONSTANTS.MAX_COINS_RANK_MULTIPLIER * (totalPlayers - rank)) /
                Math.max(1, totalPlayers - 1);
        baseCoin = Math.round(BaseCoin * Ef);

        // Trophy Formula
        const dynamicScale = Math.max(
            2,
            10 - Math.floor(totalPlayers / GAME_CONSTANTS.DYNAMIC_SCALE_FACTOR),
        );
        const boundary = Math.floor(totalPlayers / 2);
        let TrophyBase =
            rank <= boundary
                ? GAME_CONSTANTS.MIN_TROPHY_WIN +
                  (boundary - rank) * dynamicScale
                : -(
                      GAME_CONSTANTS.MAX_TROPHY_LOSS +
                      (rank - boundary - 1) * dynamicScale
                  );
        baseTrophy = Math.round(TrophyBase * Ef);
    }

    // Apply Multipliers/Boosts
    // Formula: final = base + abs(base * boost/100)
    // (Shields/Boosts reduce penalties or increase gains)
    const finalTrophy =
        baseTrophy >= 0
            ? Math.round(baseTrophy * (1 + trophyBoost / 100))
            : Math.round(
                  baseTrophy + Math.abs(baseTrophy * (trophyBoost / 100)),
              );

    const finalCoin =
        baseCoin >= 0
            ? Math.round(baseCoin * (1 + coinBoost / 100))
            : Math.round(baseCoin + Math.abs(baseCoin * (coinBoost / 100)));

    return {
        trophyWon: finalTrophy,
        coinsEarned: finalCoin,
        baseTrophy,
        baseCoin,
    };
}
