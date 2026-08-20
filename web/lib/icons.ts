/**
 * Semantic icon layer over `reicon-react`.
 *
 * Every icon the app renders comes from here rather than importing the icon
 * library directly. That keeps naming intent-based ("the icon for a season")
 * instead of shape-based, and leaves a single file to touch if the underlying
 * set ever changes again.
 *
 * Sizing: reicon writes `width`/`height` attributes on the <svg>, which CSS
 * beats — so size icons with Tailwind (`className="size-5"`), not the `size`
 * prop. Colour comes from `currentColor`, so `text-primary` just works.
 */
export type { IconProps, IconComponent, IconWeight } from "reicon-react";

export {
  // ---- Navigation ----
  Home as HomeIcon,
  Search as SearchIcon,
  Bookmark as WatchlistIcon,
  History as HistoryIcon,
  // Radar rather than a TV set: it's more distinctive at tab-bar size and it
  // matches the language the app already uses ("on your radar").
  Radar as TrackingIcon,
  Bell as AlertsIcon,
  Category as MoreTabIcon,

  // ---- Media & domain ----
  Film as MovieIcon,
  Tv as ShowIcon,
  Layers as SeasonIcon,
  Play as PlayIcon,
  Flame as TrendingIcon,
  Sparkles as DiscoverIcon,
  Ticket as ShowtimeIcon,
  Global as NetworkIcon,
  Radio as BroadcastIcon,

  // ---- Time ----
  Calendar as CalendarIcon,
  CalendarDays as TimelineIcon,
  CalendarCheck as PremiereIcon,
  Clock as ClockIcon,

  // ---- Actions ----
  Plus as AddIcon,
  Check as CheckIcon,
  CheckRead as CheckAllIcon,
  CheckCircle as CheckCircleIcon,
  Xmark as CloseIcon,
  Trash as DeleteIcon,
  Edit as EditIcon,
  Setting2 as SettingsIcon,
  Refresh as RefreshIcon,
  Filter as FilterIcon,
  Share as ShareIcon,
  MoreH as MoreIcon,
  Logout as SignOutIcon,

  // ---- State & status ----
  Star as StarIcon,
  Heart as FavoriteIcon,
  BellRing as BellRingIcon,
  BellOff as BellOffIcon,
  Flash as ZapIcon,
  Eye as EyeIcon,
  User as UserIcon,
  Location as LocationIcon,

  // ---- Theme ----
  Sun as SunIcon,
  Moon as MoonIcon,
  Monitor as SystemIcon,

  // ---- Feedback ----
  AlertCircle as AlertIcon,
  AlertTriangle as WarningIcon,
  InfoCircle as InfoIcon,
  WifiOff as OfflineIcon,
  RecordCircle as DotIcon,

  // ---- Directional ----
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
} from "reicon-react";
