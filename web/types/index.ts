// ============================================================
// BingeBeacon — API Type Definitions
// Matches the Go backend response shapes exactly.
// ============================================================

// ---------- Generic API Envelope ----------

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    details?: unknown;
  };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  per_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

// ---------- Auth ----------

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

// ---------- User ----------

/** Backend `UserDevice` has no JSON tags → PascalCase field names. */
export interface UserDevice {
  ID: string;
  UserID: string;
  DeviceToken: string;
  Platform: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  timezone: string;
  devices: UserDevice[];
}

export interface UpdateProfileRequest {
  username?: string;
  timezone?: string;
}

export interface RegisterDeviceRequest {
  device_token: string;
  platform: string;
}

// ---------- Show ----------

export interface ShowRatings {
  imdb_rating?: string;
  imdb_votes?: string;
  rotten_tomatoes?: string;
  metascore?: string;
  [key: string]: string | undefined;
}

export interface Episode {
  id: string;
  show_id: string;
  season_id: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  runtime_minutes: number | null;
  still_url: string | null;
  tmdb_id: number | null;
  thetvdb_id: number | null;
  imdb_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  show_id: string;
  season_number: number;
  name: string | null;
  overview: string | null;
  poster_url: string | null;
  air_date: string | null;
  episode_count: number | null;
  tmdb_id: number | null;
  thetvdb_id: number | null;
  created_at: string;
  updated_at: string;
  episodes: Episode[];
}

export interface Show {
  id: string;
  title: string;
  media_type: string;
  status: string | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  network: string | null;
  premiere_date: string | null;
  tmdb_id: number | null;
  imdb_id: string | null;
  thetvdb_id: number | null;
  omdb_id: string | null;
  last_synced_at: string;
  sync_priority: number;
  created_at: string;
  updated_at: string;
  seasons: Season[] | null;
  ratings: ShowRatings | null;
}

export interface ShowSearchResult {
  id: string;
  title: string;
  media_type: string;
  poster_url: string | null;
  overview: string | null;
  premiere_date: string | null;
  genres: string[] | null;
  // May include additional fields from TMDB search
  [key: string]: unknown;
}

export interface SyncStatus {
  show_id: string;
  last_synced_at: string;
  sync_priority: number;
  seasons_count: number;
  episodes_count: number;
}

// ---------- Tracking ----------

export interface TrackedShowResponse {
  show_id: string;
  show_title: string;
  poster_url: string;
  is_favorite: boolean;
  notify_new_episode: boolean;
  notify_new_season: boolean;
  notify_status_change: boolean;
  notify_hours_before: number;
  last_watched_season?: number;
  last_watched_episode?: number;
  status: string;
  next_episode_date?: string;
}

export interface TrackShowRequest {
  show_id?: string;
  tmdb_id?: number;
  is_favorite?: boolean;
  notify_new_episode?: boolean;
  notify_new_season?: boolean;
  notify_status_change?: boolean;
  notify_hours_before?: number;
}

export interface UpdateTrackingRequest {
  is_favorite?: boolean;
  notify_new_episode?: boolean;
  notify_new_season?: boolean;
  notify_status_change?: boolean;
  notify_hours_before?: number;
}

// ---------- Timeline ----------

export interface TimelineEvent {
  id: string;
  show_id: string;
  show_title: string;
  event_type: string;
  title: string;
  description: string;
  event_date: string;
  season_number?: number;
  episode_number?: number;
  metadata?: Record<string, unknown>;
}

// ---------- Notifications ----------

export interface NotificationResponse {
  id: string;
  title: string;
  body: string;
  status: "pending" | "sent" | "failed" | "read";
  created_at: string;
  read_at?: string;
}

/**
 * The backend wraps paginated notifications in `PaginatedNotifications`,
 * then httputil.JSON wraps that again in `{data: ...}`.
 * So the actual response is: `{ data: { data: [...], total, page, limit } }`
 */
export interface PaginatedNotifications {
  data: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationFilters {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface UnreadCount {
  count: number;
}
