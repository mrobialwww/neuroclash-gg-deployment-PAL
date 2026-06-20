import { z } from "zod";

/**
 * Validasi untuk parameter pencarian (Query Params) pada endpoint Leaderboard
 */
export const leaderboardQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_trophy: number;
  total_match: number;
  created_at: string;
  character_image: string;
  base_character: string;
}

export interface LeaderboardRank {
  rank_id: number;
  name: string;
  min_trophy: number;
  max_trophy: number | null;
  image_url: string;
}

export interface LeaderboardRankEntry extends LeaderboardEntry {
  position: number;
  rank: LeaderboardRank | null;
}

export interface LeaderboardPositionEntry extends LeaderboardEntry {
  position: number;
}

export interface LeaderboardResponse {
  success: boolean;
  message: string;
  data: LeaderboardRankEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  myEntry?: LeaderboardRankEntry | null;
}

export type LeaderboardQueryRequest = z.infer<typeof leaderboardQuerySchema>;
