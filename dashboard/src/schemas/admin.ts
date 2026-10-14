/** Staff overview. */

export type LoginEvent = {
  event_id: string;
  user_id: string;
  email: string | null;
  method: string;
  occurred_at: string;
};

export type CountWindow = {
  today: number;
  last_7_days: number;
  last_30_days: number;
};

export type ActivityDay = {
  date: string;
  users: number;
  markings: number;
  pk_uploads: number;
  screenshots: number;
};

export type ActivitySnapshot = {
  users: CountWindow;
  markings: CountWindow;
  pk_uploads: CountWindow;
  screenshots: CountWindow;
  daily: ActivityDay[];
};

export type RankedMetric = {
  label: string;
  clicks: number;
  impressions: number;
  sessions: number;
  pageviews: number;
};

export type GoogleChannel = {
  connected: boolean;
  error: string | null;
  clicks: number;
  impressions: number;
  sessions: number;
  pageviews: number;
  users: number;
  search_terms: RankedMetric[];
  countries: RankedMetric[];
};

export type GoogleInsights = {
  error: string | null;
  account_email: string | null;
  range_start: string;
  range_end: string;
  fetched_at: string | null;
  analytics: GoogleChannel;
  search_console: GoogleChannel;
  ads: GoogleChannel;
};

export type AdminOverview = {
  user_count: number;
  logins_today: number;
  logins_last_7_days: number;
  recent_logins: LoginEvent[];
  activity: ActivitySnapshot;
  google: GoogleInsights;
};
