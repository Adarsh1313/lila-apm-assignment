export type MapId = "AmbroseValley" | "GrandRift" | "Lockdown";

export interface MapMeta {
  id: MapId;
  slug: string;
  label: string;
  imageUrl: string;
  accent: string;
}

export interface MatchSummary {
  match_id: string;
  map_id: MapId;
  date: string;
  total_players?: number;
}

export interface GlobalStats {
  matches: number;
  total_players: number;
  humans: number;
  bots: number;
  avg_match_duration_seconds: number;
  total_kills: number;
  total_deaths: number;
  storm_deaths: number;
  total_loot_events: number;
}

export interface HeatmapPoint {
  id: string;
  x: number;
  y: number;
  intensity?: number;
  player_type?: "Human" | "Bot";
  match_id?: string;
  survived_time?: number;
  kind?: string | null;
  event_name?: string;
  world_x?: number;
  world_z?: number;
}

export interface ReplayEvent {
  id: string;
  type: "kill" | "loot" | "storm";
  elapsed_seconds: number;
  description: string;
  player_id?: string;
}

export interface ReplayPosition {
  elapsed_seconds: number;
  x: number;
  y: number;
}

export interface ReplayPlayer {
  user_id: string;
  label: string;
  is_bot: boolean;
  kills: number;
  team: "User Team" | "Enemy Team";
  time_in_match: number;
  positions: ReplayPosition[];
}

export interface ReplayMatch {
  match_id: string;
  map_id: MapId;
  date: string;
  duration_seconds: number;
  events: ReplayEvent[];
  players: ReplayPlayer[];
}

export interface PlayerListItem {
  user_id: string;
  player_type: "Human" | "Bot";
}

export interface PlayerMatchEvent {
  id: string;
  type: "kill" | "death" | "storm" | "loot";
  x: number;
  y: number;
  elapsed_seconds: number;
  kills: number;
  deaths: number;
  loots: number;
}

export interface PlayerMatchHistory {
  match_id: string;
  map_id: MapId;
  date: string;
  kills: number;
  deaths: number;
  loots: number;
  survived: boolean;
  time_in_match: number;
  positions: ReplayPosition[];
  events: PlayerMatchEvent[];
}

export interface PlayerProfileResponse {
  user_id: string;
  player_type: "Human" | "Bot";
  matches: PlayerMatchHistory[];
}

export interface OverviewTotals {
  totalMatches: number;
  totalPlayers: number;
  totalEvents: number;
  totalHumans: number;
  totalBots: number;
  totalMaps: number;
  totalDays: number;
  stormDeaths: number;
  eventsByDay: Array<Record<string, string | number>>;
  eventsByMapDay: Array<Record<string, string | number>>;
  mapDistribution: { name: string; value: number }[];
  playerDistribution: { name: string; value: number }[];
  eventDistribution: { name: string; value: number }[];
}

interface BackendMatchSummary extends MatchSummary {
  day?: string;
  human_count?: number;
  bot_count?: number;
  total_players?: number;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010").replace(/\/$/, "");

export const MAPS: MapMeta[] = [
  {
    id: "AmbroseValley",
    slug: "ambrose-valley",
    label: "Ambrose Valley",
    imageUrl: `${API_BASE_URL}/minimaps/AmbroseValley_Minimap.png`,
    accent: "#7b2fff",
  },
  {
    id: "GrandRift",
    slug: "grand-rift",
    label: "Grand Rift",
    imageUrl: `${API_BASE_URL}/minimaps/GrandRift_Minimap.png`,
    accent: "#00e5ff",
  },
  {
    id: "Lockdown",
    slug: "lockdown",
    label: "Lockdown",
    imageUrl: `${API_BASE_URL}/minimaps/Lockdown_Minimap.jpg`,
    accent: "#3fb950",
  },
];

export const DATE_OPTIONS = ["All", "Feb 10", "Feb 11", "Feb 12", "Feb 13", "Feb 14"];

export const getMapMeta = (mapId: MapId) => MAPS.find((map) => map.id === mapId)!;
export const getMapBySlug = (slug: string) => MAPS.find((map) => map.slug === slug);
export const shortId = (value: string) => value.slice(0, 8);
export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "All") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function fetchMapConfigs(): Promise<Record<string, { scale: number; origin_x: number; origin_z: number; image_size: number }> | null> {
  try {
    return await apiGet("/map-configs");
  } catch (error) {
    console.warn("Measure mode unavailable: could not load map configs", error);
    return null;
  }
}

export async function fetchMatches(mapId?: MapId): Promise<MatchSummary[]> {
  const matches = await apiGet<BackendMatchSummary[]>("/api/matches");
  return matches
    .filter((match) => !mapId || match.map_id === mapId)
    .map((match) => ({
      match_id: match.match_id,
      map_id: match.map_id,
      date: match.date ?? match.day ?? "Feb 10",
      total_players: match.total_players,
    }));
}

export async function fetchStats(mapId: MapId, date = "All", matchId = "All"): Promise<GlobalStats> {
  return apiGet<GlobalStats>(`/api/stats${qs({ map_id: mapId, date, match_id: matchId })}`);
}

export async function fetchHeatmap(
  mapId: MapId,
  type: "loot" | "kills" | "deaths",
  date = "All",
  matchId = "All",
): Promise<HeatmapPoint[]> {
  return apiGet<HeatmapPoint[]>(`/api/heatmap-points${qs({ map_id: mapId, type, date, match_id: matchId })}`);
}

export async function fetchStormDeaths(mapId: MapId, date = "All", matchId = "All"): Promise<HeatmapPoint[]> {
  return apiGet<HeatmapPoint[]>(`/api/storm-deaths${qs({ map_id: mapId, date, match_id: matchId })}`);
}

export async function fetchTelemetryOverview(): Promise<OverviewTotals> {
  const telemetry = await apiGet<{
    stats: {
      total_matches: number;
      total_humans: number;
      total_bots: number;
      total_events: number;
      total_maps: number;
      total_days: number;
      storm_deaths: number;
    };
    events_by_day: { data?: Array<{ name?: string; x?: string[]; y?: number[] | { dtype: string; bdata: string } }> };
    events_by_map_day: { data?: Array<{ name?: string; x?: string[]; y?: number[] | { dtype: string; bdata: string } }> };
    map_distribution: { data?: Array<{ labels?: string[]; values?: number[] | { dtype: string; bdata: string } }> };
    player_distribution: { data?: Array<{ labels?: string[]; values?: number[] | { dtype: string; bdata: string } }> };
    event_distribution: { data?: Array<{ labels?: string[]; values?: number[] | { dtype: string; bdata: string } }> };
  }>("/api/telemetry");

  // Plotly may encode numeric arrays as binary {dtype, bdata} objects.
  // This helper checks both formats and always returns a plain number[].
  function decodePlotlyArray(raw: number[] | { dtype: string; bdata: string } | undefined): number[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const { dtype, bdata } = raw;
    const binary = atob(bdata);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    const bytesPerElement = dtype === "i1" ? 1 : dtype === "i2" ? 2 : 4;
    const length = bytes.length / bytesPerElement;
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      const offset = i * bytesPerElement;
      if (dtype === "i1") result.push(view.getInt8(offset));
      else if (dtype === "i2") result.push(view.getInt16(offset, true));
      else result.push(view.getInt32(offset, true));
    }
    return result;
  }

  const toStackedRows = (figure?: { data?: Array<{ name?: string; x?: string[]; y?: number[] | { dtype: string; bdata: string } }> }) => {
    const rows = new Map<string, Record<string, string | number>>();
    (figure?.data ?? []).forEach((trace) => {
      const yValues = decodePlotlyArray(trace.y);
      trace.x?.forEach((label, index) => {
        const row = rows.get(label) ?? { label };
        row[trace.name ?? `series-${index}`] = yValues[index] ?? 0;
        rows.set(label, row);
      });
    });
    return Array.from(rows.values());
  };

  const toDistributionRows = (figure?: { data?: Array<{ labels?: string[]; values?: number[] | { dtype: string; bdata: string } }> }) => {
    const trace = figure?.data?.[0];
    const decodedValues = decodePlotlyArray(trace?.values);
    return (trace?.labels ?? []).map((name, index) => ({
      name,
      value: decodedValues[index] ?? 0,
    }));
  };

  return {
    totalMatches: telemetry.stats.total_matches,
    totalPlayers: telemetry.stats.total_humans + telemetry.stats.total_bots,
    totalEvents: telemetry.stats.total_events,
    totalHumans: telemetry.stats.total_humans,
    totalBots: telemetry.stats.total_bots,
    totalMaps: telemetry.stats.total_maps,
    totalDays: telemetry.stats.total_days,
    stormDeaths: telemetry.stats.storm_deaths,
    eventsByDay: toStackedRows(telemetry.events_by_day),
    eventsByMapDay: toStackedRows(telemetry.events_by_map_day),
    mapDistribution: toDistributionRows(telemetry.map_distribution),
    playerDistribution: toDistributionRows(telemetry.player_distribution),
    eventDistribution: toDistributionRows(telemetry.event_distribution),
  };
}

export async function fetchPlayerCountSeries(mapId: MapId, date = "All") {
  return apiGet<{ elapsed_seconds: number; count: number }[]>(
    `/api/telemetry/player-count${qs({ map_id: mapId, date })}`,
  );
}

export async function fetchPctAliveSeries(mapId: MapId, date = "All") {
  return apiGet<{ elapsed_seconds: number; pct_alive: number }[]>(
    `/api/telemetry/pct-alive${qs({ map_id: mapId, date })}`,
  );
}

export async function fetchSpawnZones(mapId: MapId, date = "All") {
  return apiGet<{ id: string; x: number; y: number; player_type: "Human" | "Bot" }[]>(
    `/api/telemetry/spawn-zones${qs({ map_id: mapId, date })}`,
  );
}

export async function fetchReplayMatch(matchId: string): Promise<ReplayMatch> {
  const replay = await apiGet<ReplayMatch>(`/api/replay-match${qs({ match_id: matchId })}`);
  if (replay.duration_seconds >= 30) {
    return replay;
  }

  const virtualDuration = Math.max(
    180,
    replay.players.reduce((max, player) => Math.max(max, player.positions.length * 8), 0),
    replay.events.length * 16,
  );
  const scale = replay.duration_seconds > 0 ? virtualDuration / replay.duration_seconds : 1;

  return {
    ...replay,
    duration_seconds: Math.max(virtualDuration, 1),
    events: replay.events.map((event) => ({
      ...event,
      elapsed_seconds: event.elapsed_seconds * scale,
    })),
    players: replay.players.map((player) => ({
      ...player,
      time_in_match: player.time_in_match * scale,
      positions: player.positions.map((position) => ({
        ...position,
        elapsed_seconds: position.elapsed_seconds * scale,
      })),
    })),
  };
}

export async function fetchPlayers(): Promise<PlayerListItem[]> {
  return apiGet<PlayerListItem[]>("/api/players-all");
}

export async function fetchPlayerProfile(userId: string): Promise<PlayerProfileResponse> {
  return apiGet<PlayerProfileResponse>(`/api/player-profile${qs({ user_id: userId })}`);
}

export function getPlayerColor(index: number) {
  const palette = [
    "#00e5ff", // cyan
    "#ff4081", // hot pink
    "#69ff47", // lime green
    "#ffd740", // amber
    "#e040fb", // purple
    "#ff6d00", // deep orange
    "#40c4ff", // light blue
    "#ff1744", // red
    "#1de9b6", // teal
    "#f9a825", // dark amber
    "#00e676", // green
    "#d500f9", // purple-pink
    "#ff9100", // orange
    "#76ff03", // bright lime
    "#00b0ff", // blue
    "#ff3d00", // deep red-orange
    "#ffea00", // yellow
    "#64ffda", // mint
    "#ea80fc", // light purple
    "#ccff90", // pale green
  ];
  return palette[index % palette.length];
}
