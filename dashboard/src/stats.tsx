import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ActivityDay,
  ActivitySnapshot,
  CountWindow,
  GoogleChannel,
  GoogleInsights,
  LoginEvent,
  RankedMetric,
} from "./api";
import { formatCount, formatDay, formatWhen } from "./format";

type Tone = "neutral" | "blue" | "green" | "amber";
type SourceId = "analytics" | "search" | "ads";
type Breakdown = "terms" | "countries";

const SOURCES: { id: SourceId; label: string }[] = [
  { id: "analytics", label: "Analytics" },
  { id: "search", label: "Search" },
  { id: "ads", label: "Ads" },
];

export function OverviewBoard({ activity, google }: { activity: ActivitySnapshot; google: GoogleInsights }) {
  return (
    <div className="board">
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">Last 7 days. Each card also shows today and the last 30 days.</p>
        </div>
      </header>
      <div className="kpi-grid">
        <KpiCard label="New users" window={activity.users} tone="neutral" series={activity.daily} pick={(day) => day.users} />
        <KpiCard label="New markings" window={activity.markings} tone="blue" series={activity.daily} pick={(day) => day.markings} />
        <KpiCard label="PK uploads" window={activity.pk_uploads} tone="green" series={activity.daily} pick={(day) => day.pk_uploads} />
        <KpiCard label="Screenshots" window={activity.screenshots} tone="amber" series={activity.daily} pick={(day) => day.screenshots} />
      </div>
      <AcquisitionSummary google={google} />
    </div>
  );
}

export function ActivityBoard({ activity }: { activity: ActivitySnapshot }) {
  const rows: { label: string; window: CountWindow }[] = [
    { label: "New users", window: activity.users },
    { label: "New markings", window: activity.markings },
    { label: "PK uploads", window: activity.pk_uploads },
    { label: "Screenshots", window: activity.screenshots },
  ];
  return (
    <div className="board">
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p className="muted">UTC. Markings are saves, PK uploads are accepted files, and screenshots are box scans.</p>
        </div>
      </header>
      <article className="panel">
        <div className="panel-head">
          <h2>Windows</h2>
        </div>
        <table className="numbers compact">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Today</th>
              <th>7 days</th>
              <th>30 days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{formatCount(row.window.today)}</td>
                <td>{formatCount(row.window.last_7_days)}</td>
                <td>{formatCount(row.window.last_30_days)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
      <div className="trend-grid">
        <TrendCard label="New users" tone="neutral" days={activity.daily} pick={(day) => day.users} />
        <TrendCard label="New markings" tone="blue" days={activity.daily} pick={(day) => day.markings} />
        <TrendCard label="PK uploads" tone="green" days={activity.daily} pick={(day) => day.pk_uploads} />
        <TrendCard label="Screenshots" tone="amber" days={activity.daily} pick={(day) => day.screenshots} />
      </div>
    </div>
  );
}

export function AcquisitionBoard({ google }: { google: GoogleInsights }) {
  const updated = google.fetched_at ? formatWhen(google.fetched_at) : null;
  return (
    <div className="board">
      <header className="page-head">
        <div>
          <h1>Acquisition</h1>
          <p className="muted">
            {formatDay(google.range_start)} – {formatDay(google.range_end)}
            {updated ? ` · Updated ${updated}` : ""}
          </p>
        </div>
      </header>
      {google.account_email ? <p className="muted">Service account {google.account_email}</p> : null}
      {google.error ? <p className="notice">{google.error}</p> : <AcquisitionBody google={google} />}
    </div>
  );
}

export function SignInBoard({
  userCount,
  loginsToday,
  loginsWeek,
  logins,
}: {
  userCount: number;
  loginsToday: number;
  loginsWeek: number;
  logins: LoginEvent[];
}) {
  return (
    <div className="board">
      <header className="page-head">
        <div>
          <h1>Sign-ins</h1>
          <p className="muted">Account totals, then the latest events.</p>
        </div>
      </header>
      <div className="kpi-grid kpi-grid-3">
        <article className="panel kpi">
          <h2>Accounts</h2>
          <p className="stat-value">{formatCount(userCount)}</p>
          <p className="note">All users</p>
        </article>
        <article className="panel kpi">
          <h2>Today</h2>
          <p className="stat-value">{formatCount(loginsToday)}</p>
          <p className="note">UTC day</p>
        </article>
        <article className="panel kpi">
          <h2>Last 7 days</h2>
          <p className="stat-value">{formatCount(loginsWeek)}</p>
          <p className="note">Rolling</p>
        </article>
      </div>
      <MethodMix logins={logins} />
      <article className="panel">
        <div className="panel-head">
          <h2>Latest</h2>
        </div>
        {logins.length === 0 ? (
          <p className="muted empty">No sign-ins recorded yet.</p>
        ) : (
          <table className="compact">
            <thead>
              <tr>
                <th>When</th>
                <th>Email</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {logins.map((event) => (
                <tr key={event.event_id}>
                  <td>{formatWhen(event.occurred_at)}</td>
                  <td>{event.email ?? event.user_id}</td>
                  <td>
                    <span className="tag">{event.method}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}

const TREND_STROKE: Record<Tone, string> = {
  neutral: "#1c212b",
  blue: "#1a73e8",
  green: "#1e8e3e",
  amber: "#e37400",
};

const BAR_FILL: Record<Tone, string> = {
  neutral: "#1c212b",
  blue: "#3b6fd8",
  green: "#2f9d57",
  amber: "#d4892a",
};

const CHART_TOOLTIP = {
  contentStyle: {
    border: "1px solid #eceef3",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(28, 36, 51, 0.08)",
    fontSize: 12,
  },
};

function TrendCard({
  label,
  tone,
  days,
  pick,
}: {
  label: string;
  tone: Tone;
  days: ActivityDay[];
  pick: (day: ActivityDay) => number;
}) {
  const currentDays = days.slice(-7);
  const previousDays = days.slice(Math.max(0, days.length - 14), Math.max(0, days.length - 7));
  const current = currentDays.map(pick);
  const previous = previousDays.map(pick);
  const currentTotal = current.reduce((sum, value) => sum + value, 0);
  const previousTotal = previous.reduce((sum, value) => sum + value, 0);
  const delta = percentChange(currentTotal, previousTotal);
  return (
    <article className={`panel trend-card tone-${tone}`}>
      <h2>{label}</h2>
      <p className="stat-value">{formatCount(currentTotal)}</p>
      <p className={`trend-delta ${delta.direction}`}>{delta.text}</p>
      <TrendChart
        label={label}
        labels={currentDays.map((day) => formatDay(day.date))}
        current={current}
        previous={previous}
        color={TREND_STROKE[tone]}
      />
      <div className="trend-legend">
        <span>
          <i className={`line-swatch tone-${tone}`} /> Last 7 days
        </span>
        <span>
          <i className="line-swatch is-previous" /> Previous period
        </span>
      </div>
    </article>
  );
}

function TrendChart({
  label,
  labels,
  current,
  previous,
  color,
}: {
  label: string;
  labels: string[];
  current: number[];
  previous: number[];
  color: string;
}) {
  const points = labels.map((day, index) => ({
    day,
    current: current[index] ?? 0,
    previous: previous[index] ?? 0,
  }));
  return (
    <div className="trend-chart" role="img" aria-label={`${label} over the last 7 days`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eceff3" />
          <XAxis dataKey="day" tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
          <YAxis
            orientation="right"
            width={36}
            allowDecimals={false}
            domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.15))]}
            tick={{ fill: "#9aa0a6", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "#d7dbe2", strokeWidth: 1 }}
            contentStyle={CHART_TOOLTIP.contentStyle}
            formatter={(value, name) => [formatCount(Number(value ?? 0)), name]}
          />
          <Line
            type="monotone"
            dataKey="previous"
            name="Previous period"
            stroke="#9aa0a6"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="current"
            name="Last 7 days"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function percentChange(current: number, previous: number): { text: string; direction: "up" | "down" | "flat" } {
  if (previous === 0 && current === 0) {
    return { text: "No change vs previous 7 days", direction: "flat" };
  }
  if (previous === 0) {
    return { text: "↑ from 0 in the previous 7 days", direction: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
  if (rounded === 0) {
    return { text: "No change vs previous 7 days", direction: "flat" };
  }
  const arrow = rounded > 0 ? "↑" : "↓";
  return {
    text: `${arrow} ${Math.abs(rounded)}% vs previous 7 days`,
    direction: rounded > 0 ? "up" : "down",
  };
}

function KpiCard({
  label,
  window,
  tone,
  series,
  pick,
}: {
  label: string;
  window: CountWindow;
  tone: Tone;
  series: ActivityDay[];
  pick: (day: ActivityDay) => number;
}) {
  const points = series.map((day) => ({ day: formatDay(day.date), value: pick(day) }));
  return (
    <article className="panel kpi">
      <h2>{label}</h2>
      <p className="stat-kicker">7 days</p>
      <p className="stat-value">{formatCount(window.last_7_days)}</p>
      <p className={`note note-${tone}`}>
        {formatCount(window.today)} today · {formatCount(window.last_30_days)} in 30 days
      </p>
      <div className="spark" role="img" aria-label={`${label} over 14 days`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
            <Tooltip
              cursor={{ fill: "rgba(28, 33, 43, 0.05)" }}
              contentStyle={CHART_TOOLTIP.contentStyle}
              formatter={(value) => [formatCount(Number(value ?? 0)), label]}
            />
            <Bar dataKey="value" fill={BAR_FILL[tone]} radius={[3, 3, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function AcquisitionSummary({ google }: { google: GoogleInsights }) {
  return (
    <section className="board-section">
      <h2 className="section-title">Acquisition</h2>
      <p className="muted">
        {formatDay(google.range_start)} – {formatDay(google.range_end)}
      </p>
      {google.error ? <p className="notice">{google.error}</p> : <SourceGrid google={google} />}
    </section>
  );
}

function AcquisitionBody({ google }: { google: GoogleInsights }) {
  return (
    <>
      <SourceGrid google={google} />
      <Breakdown google={google} />
    </>
  );
}

function SourceGrid({ google }: { google: GoogleInsights }) {
  return (
    <div className="source-grid">
      <SourceCard
        title="Analytics"
        channel={google.analytics}
        metrics={[
          { label: "Sessions", value: google.analytics.sessions },
          { label: "Pageviews", value: google.analytics.pageviews },
          { label: "Users", value: google.analytics.users },
        ]}
      />
      <SourceCard
        title="Search"
        channel={google.search_console}
        metrics={[
          { label: "Clicks", value: google.search_console.clicks },
          { label: "Impressions", value: google.search_console.impressions },
        ]}
      />
      <SourceCard
        title="Ads"
        channel={google.ads}
        metrics={[
          { label: "Clicks", value: google.ads.clicks },
          { label: "Impressions", value: google.ads.impressions },
        ]}
      />
    </div>
  );
}

function SourceCard({
  title,
  channel,
  metrics,
}: {
  title: string;
  channel: GoogleChannel;
  metrics: { label: string; value: number }[];
}) {
  const unavailable = !channel.connected || Boolean(channel.error);
  return (
    <article className="panel source">
      <h2>{title}</h2>
      {unavailable ? (
        <p className={channel.connected ? "error" : "muted"}>{channel.error ?? "Not connected."}</p>
      ) : (
        <div className="metric-strip">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <strong>{formatCount(metric.value)}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Breakdown({ google }: { google: GoogleInsights }) {
  const [source, setSource] = useState<SourceId>(firstConnected(google));
  const [slice, setSlice] = useState<Breakdown>("countries");
  const channel = channelFor(google, source);
  const unavailable = !channel.connected || Boolean(channel.error);
  const showTerms = source !== "analytics";
  const activeSlice: Breakdown = showTerms ? slice : "countries";
  const rows = activeSlice === "terms" ? channel.search_terms : channel.countries;
  const columns: Array<"clicks" | "impressions" | "sessions" | "pageviews"> =
    source === "analytics" ? ["sessions", "pageviews"] : ["clicks", "impressions"];

  return (
    <article className="panel">
      <div className="panel-head">
        <div className="segmented" role="tablist" aria-label="Source">
          {SOURCES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === source ? "is-active" : undefined}
              onClick={() => setSource(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {showTerms ? (
          <div className="segmented" role="tablist" aria-label="Breakdown">
            <button type="button" className={activeSlice === "countries" ? "is-active" : undefined} onClick={() => setSlice("countries")}>
              Countries
            </button>
            <button type="button" className={activeSlice === "terms" ? "is-active" : undefined} onClick={() => setSlice("terms")}>
              Search terms
            </button>
          </div>
        ) : (
          <span className="legend">Countries</span>
        )}
      </div>
      {unavailable ? (
        <p className={channel.connected ? "error" : "muted"}>{channel.error ?? "Not connected."}</p>
      ) : (
        <RankTable caption={activeSlice === "terms" ? "Search term" : "Country"} rows={rows} columns={columns} />
      )}
    </article>
  );
}

function MethodMix({ logins }: { logins: LoginEvent[] }) {
  const parts = [
    { label: "Password", value: countMethod(logins, "password"), tone: "neutral" as const },
    { label: "Google", value: countMethod(logins, "google"), tone: "blue" as const },
    { label: "Microsoft", value: countMethod(logins, "microsoft"), tone: "green" as const },
    { label: "Other", value: countOther(logins), tone: "amber" as const },
  ];
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <article className="panel">
      <div className="panel-head">
        <h2>Methods</h2>
        <span className="legend">Latest {formatCount(logins.length)}</span>
      </div>
      {total === 0 ? (
        <p className="muted">Methods show up with the next sign-in.</p>
      ) : (
        <div className="method-chart" role="img" aria-label="Sign-in methods">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parts} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={88}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#4b5160", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(28, 33, 43, 0.05)" }}
                contentStyle={CHART_TOOLTIP.contentStyle}
                formatter={(value) => [formatCount(Number(value ?? 0)), "Sign-ins"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {parts.map((part) => (
                  <Cell key={part.label} fill={BAR_FILL[part.tone]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

function RankTable({
  caption,
  rows,
  columns,
}: {
  caption: string;
  rows: RankedMetric[];
  columns: Array<"clicks" | "impressions" | "sessions" | "pageviews">;
}) {
  if (rows.length === 0) {
    return <p className="muted empty">No {caption.toLowerCase()} rows in this range.</p>;
  }
  const labels = {
    clicks: "Clicks",
    impressions: "Impressions",
    sessions: "Sessions",
    pageviews: "Pageviews",
  };
  return (
    <table className="rank compact">
      <thead>
        <tr>
          <th>{caption}</th>
          {columns.map((column) => (
            <th key={column}>{labels[column]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.label}-${index}`}>
            <td>{row.label}</td>
            {columns.map((column) => (
              <td key={column}>{formatCount(row[column])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function channelFor(google: GoogleInsights, source: SourceId): GoogleChannel {
  if (source === "analytics") {
    return google.analytics;
  }
  if (source === "search") {
    return google.search_console;
  }
  return google.ads;
}

function firstConnected(google: GoogleInsights): SourceId {
  const ready = (channel: GoogleChannel) => channel.connected && !channel.error;
  if (ready(google.analytics)) {
    return "analytics";
  }
  if (ready(google.search_console)) {
    return "search";
  }
  if (ready(google.ads)) {
    return "ads";
  }
  return "analytics";
}

function countMethod(events: LoginEvent[], method: string): number {
  return events.filter((event) => event.method === method).length;
}

function countOther(events: LoginEvent[]): number {
  return events.filter((event) => !["password", "google", "microsoft"].includes(event.method)).length;
}
