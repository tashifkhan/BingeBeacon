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

// ---------- Watchlist ----------

export interface WatchlistItem {
  id: string;
  user_id: string;
  show_id: string;
  show?: Show; // Helper to include show details if joined
  priority: "low" | "medium" | "high";
  notes: string;
  added_at: string;
}

export interface CreateWatchlistItemRequest {
  show_id: string;
  priority?: "low" | "medium" | "high";
  notes?: string;
}

export interface UpdateWatchlistItemRequest {
  priority?: "low" | "medium" | "high";
  notes?: string;
}

// ---------- Watch History ----------

export interface WatchHistoryEntry {
  id: string;
  user_id: string;
  show_id: string;
  season_number: number;
  episode_number: number;
  watched_at: string;
  rating?: number; // 1-10
  notes?: string;
  show_title?: string; // Joined field
  show_poster_url?: string; // Joined field
}

export interface CreateHistoryEntryRequest {
  show_id: string;
  season_number: number;
  episode_number: number;
  watched_at?: string; // ISO timestamp
  rating?: number;
  notes?: string;
}

export interface UpdateHistoryEntryRequest {
  watched_at?: string;
  rating?: number;
  notes?: string;
}

export interface HistoryStats {
  total_episodes_watched: number;
  total_time_minutes: number;
  distinct_shows_watched: number;
  this_month_count: number;
}

export interface ShowProgress {
  show_id: string;
  completed_episodes: number;
  total_episodes: number;
  percentage: number;
  last_watched_at: string;
}

// ---------- Showtimes (MovieGlu) ----------

export interface CinemaShowtime {
  cinema_id: string;
  cinema_name: string;
  times: string[]; // "14:30"
}

export interface FilmShowtime {
  film_id: string;
  film_name: string;
  showtimes: CinemaShowtime[];
}

export interface ShowtimesResponse {
  show_id: string;
  imdb_id: string;
  date: string;
  films: FilmShowtime[];
}

export interface Cinema {
  cinema_id: string;
  cinema_name: string;
  distance?: string;
  // logo_url, address, city, lat, lng might not be available in basic endpoint
}

export interface CinemasNearbyResponse {
  cinemas: Cinema[];
}

// ---------- Streaming (TMDB) ----------

export interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface StreamingOptions {
  link: string;
  flatrate?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
}
