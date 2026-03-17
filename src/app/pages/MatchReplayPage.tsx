import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { MapViewport } from "../components/MapViewport";
import {
  DATE_OPTIONS,
  MAPS,
  fetchMatches,
  fetchReplayMatch,
  formatDuration,
  getMapMeta,
  getPlayerColor,
  shortId,
  type MapId,
  type ReplayPlayer,
} from "../lib/data";

export function MatchReplayPage() {
  const [matches, setMatches] = useState<{ match_id: string; map_id: MapId; date: string }[]>([]);
  const [mapFilter, setMapFilter] = useState<MapId | "All">("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [replay, setReplay] = useState<Awaited<ReturnType<typeof fetchReplayMatch>> | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMatches().then((result) => {
      setMatches(result);
      setSelectedMatchId(result[0]?.match_id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!selectedMatchId) {
      return;
    }
    fetchReplayMatch(selectedMatchId).then((result) => {
      setReplay(result);
      setCurrentTime(0);
      setIsPlaying(false);
      setSelectedPlayerId(null);
      setPlaybackSpeed(0.5);
    });
  }, [selectedMatchId]);

  useEffect(() => {
    if (!isPlaying || !replay) {
      return;
    }

    const tick = (timestamp: number) => {
      if (!lastTickRef.current) {
        lastTickRef.current = timestamp;
      }

      const delta = (timestamp - lastTickRef.current) / 1000;
      lastTickRef.current = timestamp;

      setCurrentTime((previous) => {
        const next = previous + delta * playbackSpeed;
        if (next >= replay.duration_seconds) {
          setIsPlaying(false);
          return replay.duration_seconds;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTickRef.current = 0;
    };
  }, [isPlaying, playbackSpeed, replay]);

  useEffect(() => {
    if (!feedRef.current || !replay) {
      return;
    }
    const activeIndex = replay.events.findIndex((event) => event.elapsed_seconds >= currentTime);
    if (activeIndex >= 0) {
      const target = feedRef.current.children.item(Math.max(0, activeIndex - 1)) as HTMLElement | null;
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [currentTime, replay]);

  const filteredMatches = matches.filter((entry) => {
    const byMap = mapFilter === "All" || entry.map_id === mapFilter;
    const byDate = dateFilter === "All" || entry.date === dateFilter;
    const richTimeline = (entry.total_players ?? 0) >= 10;
    return byMap && byDate && richTimeline;
  });

  useEffect(() => {
    if (selectedMatchId && !filteredMatches.some((entry) => entry.match_id === selectedMatchId)) {
      setSelectedMatchId(filteredMatches[0]?.match_id ?? "");
    }
  }, [filteredMatches, selectedMatchId]);

  const players = useMemo(() => {
    if (!replay) {
      return [];
    }
    return [...replay.players].sort((a, b) => b.time_in_match - a.time_in_match);
  }, [replay]);

  const mapMeta = replay ? getMapMeta(replay.map_id) : getMapMeta("AmbroseValley");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-base)]">
      <header className="flex h-12 items-center justify-between border-b border-[var(--bg-elevated)] bg-[var(--bg-surface)] px-4">
        <div className="flex items-center gap-6">
          <HeaderField label="Match ID" value={replay ? `MATCH-${shortId(replay.match_id).toUpperCase()}` : "MATCH-"} />
          <HeaderField label="Map Name" value={mapMeta.label} />
          <HeaderField label="Date" value={replay?.date ?? "Feb 10"} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <aside className="flex w-[260px] flex-col rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
          <Field label="Select Match">
            <select value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)} className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white">
              {filteredMatches.map((match) => (
                <option key={match.match_id} value={match.match_id}>
                  {getMapMeta(match.map_id).label} - #{shortId(match.match_id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Map Filter">
            <select value={mapFilter} onChange={(event) => setMapFilter(event.target.value as MapId | "All")} className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white">
              <option value="All">All</option>
              {MAPS.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date Filter">
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white">
              {DATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <div className="my-4 h-px bg-[var(--border-subtle)]" />
          <div className="mb-3 font-display text-[11px] uppercase tracking-[0.28em] text-white/56">Match Events</div>
          <div ref={feedRef} className="panel-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {replay?.events.slice(0, 80).map((event) => (
              <div
                key={event.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  event.elapsed_seconds <= currentTime ? "border-white/14 bg-white/6" : "border-transparent bg-black/10"
                }`}
              >
                <div className="font-mono text-[11px] text-white/54">{formatDuration(event.elapsed_seconds)}</div>
                <div
                  className={
                    event.type === "kill"
                      ? "text-[var(--kill-red)]"
                      : event.type === "loot"
                        ? "text-[var(--loot-yellow)]"
                        : "text-[var(--storm-blue)]"
                  }
                >
                  {event.description}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <MapViewport
            imageUrl={mapMeta.imageUrl}
            zoom={zoom}
            onZoomChange={setZoom}
            onWheel={(delta) => setZoom((current) => Math.min(2.5, Math.max(0.75, current + (delta > 0 ? -0.08 : 0.08))))}
            footer={
              <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <button type="button" onClick={() => setIsPlaying((current) => !current)} className="rounded-md bg-[var(--purple)] p-2 text-white">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTime(0);
                      setIsPlaying(false);
                    }}
                    className="rounded-md border border-[var(--border-subtle)] p-2 text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-1.5 font-mono text-sm font-semibold text-white">
                    {formatDuration(currentTime)} / {formatDuration(replay?.duration_seconds ?? 0)}
                  </div>
                  <div className="ml-auto flex gap-2">
                    {[0.25, 0.5, 1, 2].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`rounded-md px-3 py-1 text-xs ${playbackSpeed === speed ? "bg-[var(--purple)] text-white" : "bg-black/20 text-white/64"}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={replay?.duration_seconds ?? 0}
                  step={1}
                  value={currentTime}
                  onChange={(event) => setCurrentTime(Number(event.target.value))}
                  className="w-full accent-[var(--purple)]"
                />
              </div>
            }
          >
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1024 1024" preserveAspectRatio="none">
              {players.map((player, index) => {
                const active = !selectedPlayerId || selectedPlayerId === player.user_id;
                const path = player.positions
                  .filter((position) => position.elapsed_seconds <= currentTime)
                  .map((position) => `${position.x},${position.y}`)
                  .join(" ");
                if (!path) {
                  return null;
                }
                return (
                  <polyline
                    key={player.user_id}
                    points={path}
                    fill="none"
                    stroke={getPlayerColor(index)}
                    strokeWidth={selectedPlayerId === player.user_id ? 4 : 2}
                    opacity={active ? 1 : 0.2}
                  />
                );
              })}
            </svg>

            {players.map((player, index) => {
              const position = interpolatePosition(player, currentTime);
              if (!position || currentTime > player.time_in_match) {
                return null;
              }
              const color = getPlayerColor(index);
              const active = !selectedPlayerId || selectedPlayerId === player.user_id;
              return (
                <div
                  key={player.user_id}
                  className="absolute"
                  style={{
                    left: `${(position.x / 1024) * 100}%`,
                    top: `${(position.y / 1024) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    opacity: active ? 1 : 0.2,
                  }}
                >
                  <div className="h-3.5 w-3.5 rounded-full border border-black" style={{ background: color }} />
                  <div className="ml-3 mt-1 rounded bg-black/35 px-1.5 py-0.5 font-display text-xs font-semibold text-white">{player.label}</div>
                </div>
              );
            })}
          </MapViewport>
        </section>

        <aside className="flex w-[280px] flex-col rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="mb-3 font-display text-[13px] uppercase tracking-[0.24em] text-white">Players ({players.length})</div>
          <div className="panel-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {players.map((player, index) => {
              const isExpired = currentTime > player.time_in_match;
              return (
                <button
                  key={player.user_id}
                  type="button"
                  onClick={() => setSelectedPlayerId((current) => (current === player.user_id ? null : player.user_id))}
                  className={`w-full rounded-md border px-3 py-2 text-left ${selectedPlayerId === player.user_id ? "border-[var(--purple)] bg-white/6" : "border-transparent bg-black/10"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${isExpired ? "text-white/32 line-through" : "text-white"}`}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: getPlayerColor(index) }} />
                      <span>{player.label}</span>
                      {player.is_bot ? <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] uppercase text-white/48">BOT</span> : null}
                    </div>
                    <span className="font-display text-sm text-white">{player.kills}K</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-white/44">
                    <span>{player.user_id.slice(0, 12)}</span>
                    <span>{formatDuration(player.time_in_match)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-3">
            <div className="mb-2 font-display text-[11px] uppercase tracking-[0.28em] text-white/56">Legend</div>
            <LegendRow symbol="☠" symbolColor="#60a5fa" label="Storm Death" />
            <LegendRow symbol="☠" symbolColor="var(--death-orange)" label="Death" />
            <LegendRow symbol="●" symbolColor="var(--loot-yellow)" label="Loot" />
            <LegendRow symbol="●" symbolColor="var(--kill-red)" label="Kill" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-[9px] uppercase tracking-[0.26em] text-white/42">{label}</div>
      <div className="font-display text-[13px] font-semibold text-white">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 font-display text-[9px] uppercase tracking-[0.28em] text-white/42">{label}</div>
      {children}
    </label>
  );
}

function LegendRow({ symbol, symbolColor, label }: { symbol: string; symbolColor: string; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-sm text-white/72">
      <span className="w-4 text-center text-base" style={{ color: symbolColor }}>
        {symbol}
      </span>
      {label}
    </div>
  );
}

function interpolatePosition(player: ReplayPlayer, currentTime: number) {
  const positions = player.positions;
  if (!positions.length || currentTime > player.time_in_match) {
    return null;
  }
  const nextIndex = positions.findIndex((position) => position.elapsed_seconds >= currentTime);
  if (nextIndex <= 0) {
    return positions[0];
  }
  const previous = positions[nextIndex - 1];
  const next = positions[nextIndex] ?? positions[positions.length - 1];
  const span = next.elapsed_seconds - previous.elapsed_seconds || 1;
  const progress = (currentTime - previous.elapsed_seconds) / span;
  return {
    x: previous.x + (next.x - previous.x) * progress,
    y: previous.y + (next.y - previous.y) * progress,
  };
}
