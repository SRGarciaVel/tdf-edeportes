export interface User {
  id: string;
  twitch_username: string;
  display_name: string;
  avatar_url: string | null;
  is_staff: boolean;
}

export type EventType = "torneo" | "stream" | "reunion" | "otro";
export type EventVisibility = "staff" | "publico";

export interface EventItem {
  id: string;
  title: string;
  type: EventType;
  start_at: string;
  end_at: string | null;
  description: string | null;
  external_url: string | null;
  visibility: EventVisibility;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventFormValues {
  title: string;
  type: EventType;
  start_at: string;
  end_at: string | null;
  description: string | null;
  external_url: string | null;
  visibility: EventVisibility;
}

export type GoalStatus = "en_progreso" | "cumplido" | "descartado";

export interface QuarterlyGoal {
  id: string;
  quarter: number;
  year: number;
  title: string;
  description: string | null;
  status: GoalStatus;
}

export interface CFNProfile {
  cfn_id: string;
  display_name: string | null;
  league_rank: string | null;
  league_points: number | null;
  master_rating: number | null;
  character_name: string | null;
  updated_at: string;
  last_error: string | null;
}

export interface CFNMatchStats {
  cfn_id: string;
  days: number;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  characters: Record<string, number>;
}

export interface CFNMatchRead {
  played_at: string;
  character_name: string | null;
  opponent_name: string | null;
  opponent_character: string | null;
  won: boolean | null;
}

export type TierListGame = "sf6" | "3s";

export interface TierListData {
  id: string;
  game: TierListGame;
  tiers: Record<string, string[]>;
  created_at: string;
}
