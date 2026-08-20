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

export interface CFNPlayer {
  cfn_id: string;
  display_name: string;
  is_tdf: boolean;
  liquipedia_url: string | null;
  avatar_url: string | null;
  card_background_url: string | null;
  league_rank: string | null;
  league_points: number | null;
  master_rating: number | null;
  character_name: string | null;
  updated_at: string | null;
  last_error: string | null;
}

export interface CFNRegistration {
  id: string;
  cfn_id: string;
  display_name: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
}

export interface CFNRegistrationPending {
  id: string;
  cfn_id: string;
  display_name: string;
  requested_at: string;
  twitch_username: string;
  twitch_display_name: string;
  twitch_avatar_url: string | null;
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

export interface EncounterData {
  player_a_cfn_id: string;
  player_a_name: string;
  player_b_cfn_id: string;
  player_b_name: string;
  played_at: string;
}

export interface TierItemData {
  id: string;
  label: string;
  image?: string | null;
}

export interface TierMetaData {
  id: string;
  label: string;
  color: string;
}

export interface TierListData {
  id: string;
  template_id: string | null;
  creator_name: string;
  created_by: string | null;
  template_name: string | null;
  tier_meta: TierMetaData[];
  tiers: Record<string, TierItemData[]>;
  label_width: number | null;
  created_at: string;
}

export interface TierListSummaryData {
  id: string;
  creator_name: string;
  created_by: string | null;
  template_name: string | null;
  item_count: number;
  created_at: string;
}

export interface TierListTemplateData {
  id: string;
  name: string;
  items: TierItemData[];
  creator_name: string;
  created_by: string;
  created_at: string;
}

export interface TierListTemplateSummaryData {
  id: string;
  name: string;
  item_count: number;
  creator_name: string;
  created_at: string;
}
