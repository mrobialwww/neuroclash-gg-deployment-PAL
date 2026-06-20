export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_trophy: number;
  total_match: number;
  created_at: string;
  character_image: string;
  base_character: string;
}

export interface LeaderboardRankEntry extends LeaderboardEntry {
  position: number;
  rank: LeaderboardRank | null;
}

export interface LeaderboardRank {
  rank_id: number;
  name: string;
  min_trophy: number;
  max_trophy: number | null;
  image_url: string;
}

export interface LeaderboardResponse {
  success: boolean;
  message: string;
  data: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}