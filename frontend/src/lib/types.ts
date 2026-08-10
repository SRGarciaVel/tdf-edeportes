export interface User {
  id: string;
  twitch_username: string;
  display_name: string;
  avatar_url: string | null;
  is_staff: boolean;
}
