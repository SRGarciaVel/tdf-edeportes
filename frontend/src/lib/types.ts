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
