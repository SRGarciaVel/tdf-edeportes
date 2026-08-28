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
  bio: string | null;
  card_background_url: string | null;
  card_background_brightness: number | null;
  league_rank: string | null;
  league_points: number | null;
  master_rating: number | null;
  character_name: string | null;
  drive_impact_received: number | null;
  drive_parry_perfect: number | null;
  drive_impact_punish_landed: number | null;
  corner_time_opponent: number | null;
  throws_landed: number | null;
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

export interface UnlinkedCandidate {
  user_id: string;
  twitch_username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface UnlinkedRegistration {
  cfn_id: string;
  display_name: string;
  candidate: UnlinkedCandidate | null;
}

export interface UserSearchResult {
  id: string;
  twitch_username: string;
  display_name: string;
  avatar_url: string | null;
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
  sample_images: string[];
}

// --- Meta actual de SF6 (dato global de Capcom, no de TDF) ---

export interface UsageRateCharacter {
  character_tool_name: string;
  character_alpha: string;
  play_rate: number;
  previous_rate: number;
}

export interface UsageRateLeague {
  league_rank: number;
  league_alpha: string;
  val: UsageRateCharacter[];
}

export interface UsageRateOperationType {
  operation_type: number;
  val: UsageRateLeague[];
}

export interface UsageRateData {
  usagerateData: UsageRateOperationType[];
}

export interface DiaCharacterHeader {
  id: number;
  name_alpha: string;
  tool_name: string;
  input_type: "C" | "M";
}

export interface DiaMatchupValue {
  _oid: number;
  thm: number;
  val: string;
}

export interface DiaCharacterRecord {
  id: number;
  name_alpha: string;
  tool_name: string;
  input_type: "C" | "M";
  total: string;
  values: DiaMatchupValue[];
}

// la forma real tiene más anidación de la que necesitamos usar — el
// resto de campos (sf, _dsort, etc.) no se usan en el frontend, no
// hace falta tipar todo lo que Capcom manda
export interface DiaLeagueBucket {
  opponent_header?: DiaCharacterHeader[];
  records: DiaCharacterRecord[];
}

// dos formas reales distintas, confirmadas 21-08-2026 — "overall" trae
// todo bajo ci.ci_sort (registros con su propio input_type C/M
// mezclados en una sola lista). "Solo Master" viene separado por tipo
// de control en la raíz (c = Classic, m = Modern sin confirmar si
// existe) y por sub-liga adentro de cada uno (d_sort, las 4 ligas de
// Master como claves, sin un "ALL" que las junte) — los registros ahí
// NO traen su propio input_type, va implícito en la rama c/m.
export interface DiaData {
  diaData: {
    ci?: { ci_sort: Record<string, DiaLeagueBucket> };
    c?: { d_sort: Record<string, DiaLeagueBucket> };
    m?: { d_sort: Record<string, DiaLeagueBucket> };
  };
}

export interface MetaSnapshot<T = unknown> {
  snapshot_type: string;
  month: string;
  data: T;
}

// --- Notas de parche de SF6 (dato global de Capcom, no de TDF) ---

export interface PatchChange {
  move_name: string | null;
  category: string;
  category_es?: string;
  details: string;
  details_es?: string;
}

export interface PatchCharacter {
  tool_name: string;
  alpha: string;
  summary: string;
  summary_es?: string;
  changes: PatchChange[];
}

export interface PatchNoteData {
  title: string;
  overall_concept: string;
  overall_concept_es?: string;
  universal_changes: PatchChange[];
  characters: PatchCharacter[];
}

export interface PatchNote {
  patch_id: string;
  title: string;
  data: PatchNoteData;
}

export interface TwitchLiveStatus {
  is_live: boolean;
  title: string | null;
  viewer_count: number | null;
}
