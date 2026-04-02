import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MapViewport } from "../components/MapViewport";
import {
  DATE_OPTIONS,
  MAPS,
  fetchPlayerProfile,
  fetchPlayers,
  formatDuration,
  getMapMeta,
  getPlayerColor,
  shortId,
  type MapId,
  type PlayerMatchHistory,
  type PlayerProfileResponse,
} from "../lib/data";

type EventFilter = "kills" | "deaths" | "storm" | "loots";
const DEFAULT_SHOWCASE_PLAYER_ID = "3e88c2aa-f4bb-4713-bc4b-332536e3de87";

export function PlayerProfilesPage() {
  const [players, setPlayers] = useState<{ user_id: string; player_type: "Human" | "Bot" }[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [profile, setProfile] = useState<PlayerProfileResponse | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [mapFilter, setMapFilter] = useState<MapId | "All">("All");
  const [enabledEvents, setEnabledEvents] = useState<EventFilter[]>(["kills", "deaths", "storm", "loots"]);
  const [pathOnly, setPathOnly] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [opacity, setOpacity] = useState(100);
  const [dim, setDim] = useState(20);
  const [previewMatchId, setPreviewMatchId] = useState<string | null>(null);
  const [lockedMatchId, setLockedMatchId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let active = true;

    fetchPlayers()
      .then((result) => {
        if (!active) {
          return;
        }
        setPlayers(result);
        const showcasePlayer = result.find((player) => player.user_id === DEFAULT_SHOWCASE_PLAYER_ID);
        setSelectedPlayerId(showcasePlayer?.user_id ?? result[0]?.user_id ?? "");
      })
      .catch((error) => {
        console.error("Failed to load players", error);
        if (active) {
          setPlayers([]);
          setSelectedPlayerId("");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlayerId) {
      return;
    }

    let active = true;

    fetchPlayerProfile(selectedPlayerId)
      .then((result) => {
        if (!active) {
          return;
        }
        setProfile(result);
        setLockedMatchId(null);
        setPreviewMatchId(null);
      })
      .catch((error) => {
        console.error(`Failed to load profile for ${selectedPlayerId}`, error);
        if (active) {
          setProfile(null);
          setLockedMatchId(null);
          setPreviewMatchId(null);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedPlayerId]);

  const filteredMatches = useMemo(() => {
    if (!profile) {
      return [];
    }
    return profile.matches.filter((match) => {
      const byDate = dateFilter === "All" || match.date === dateFilter;
      const byMap = mapFilter === "All" || match.map_id === mapFilter;
      return byDate && byMap;
    });
  }, [dateFilter, mapFilter, profile]);

  const focusMatchId = lockedMatchId ?? previewMatchId;
  const activeMatch = filteredMatches.find((match) => match.match_id === focusMatchId) ?? filteredMatches[0] ?? null;
  const activeMapId = activeMatch?.map_id ?? null;
  const mapMatches = activeMapId ? filteredMatches.filter((match) => match.map_id === activeMapId) : [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-base)]">
      <div className="flex h-10 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4">
        <div>
          <div className="font-mono text-[11px] font-medium text-white">{selectedPlayerId || "Select player"}</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/42">
            {activeMatch ? shortId(activeMatch.match_id) : "--------"}
          </div>
        </div>
      </div>

      <div className="flex h-9 items-center gap-3 border-b border-[var(--border-subtle)] bg-black/20 px-4">
        <TogglePill label="Kills" active={enabledEvents.includes("kills")} onClick={() => toggleFilter("kills", enabledEvents, setEnabledEvents)} />
        <TogglePill label="Deaths" active={enabledEvents.includes("deaths")} onClick={() => toggleFilter("deaths", enabledEvents, setEnabledEvents)} />
        <TogglePill label="Storm" active={enabledEvents.includes("storm")} onClick={() => toggleFilter("storm", enabledEvents, setEnabledEvents)} />
        <TogglePill label="Loots" active={enabledEvents.includes("loots")} onClick={() => toggleFilter("loots", enabledEvents, setEnabledEvents)} />
        <span className="h-4 w-px bg-white/10" />
        <TogglePill label="Path Only" active={pathOnly} onClick={() => setPathOnly((current) => !current)} />
        <TogglePill label="Grid" active={showGrid} onClick={() => setShowGrid((current) => !current)} />
        <div className="ml-3 flex items-center gap-2 text-[11px] text-white/68">
          Opacity
          <input type="range" min={40} max={100} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="accent-[var(--purple)]" />
          <span className="font-mono">{opacity}%</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/68">
          Dim
          <input type="range" min={10} max={60} value={dim} onChange={(event) => setDim(Number(event.target.value))} className="accent-[var(--purple)]" />
          <span className="font-mono">{dim}%</span>
        </div>
        <div className="ml-auto rounded-full border border-[var(--border-subtle)] px-3 py-1 font-display text-[11px] uppercase tracking-[0.24em] text-white">
          {profile?.player_type ?? "Human"}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <aside className="flex w-[214px] flex-col rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
          <Field label="Player">
            <select value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)} className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white">
              <optgroup label="Humans">
                {players.filter((player) => player.player_type === "Human").map((player) => (
                  <option key={player.user_id} value={player.user_id}>
                    {player.user_id}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Bots">
                {players.filter((player) => player.player_type === "Bot").map((player) => (
                  <option key={player.user_id} value={player.user_id}>
                    {player.user_id}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field label="Date">
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white">
              {DATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Map">
            <select value={mapFilter} onChange={(event) => setMapFilter(event.target.value as MapId | "All")} className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white">
              <option value="All">All</option>
              {MAPS.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="my-4 h-px bg-[var(--border-subtle)]" />
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-[11px] uppercase tracking-[0.28em] text-white/56">Match History</div>
            <button
              type="button"
              onClick={() => {
                setDateFilter("All");
                setMapFilter("All");
                setLockedMatchId(null);
                setPreviewMatchId(null);
              }}
              className="text-[10px] text-white/44"
            >
              CLEAR ×
            </button>
          </div>
          <div className="panel-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredMatches.map((match, index) => {
              const active = lockedMatchId === match.match_id;
              const previewing = previewMatchId === match.match_id;
              return (
                <button
                  key={match.match_id}
                  type="button"
                  onMouseEnter={() => setPreviewMatchId(match.match_id)}
                  onMouseLeave={() => setPreviewMatchId((current) => (current === match.match_id ? null : current))}
                  onClick={() => setLockedMatchId((current) => (current === match.match_id ? null : match.match_id))}
                  className={`w-full rounded-r-md border border-white/6 border-l-[3px] bg-black/20 px-3 py-3 text-left ${
                    active || previewing ? "border-l-[var(--purple)]" : "border-l-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: getPlayerColor(index) }} />
                      <span className="font-display text-[10px] uppercase tracking-[0.2em] text-white">{match.map_id}</span>
                    </div>
                    <span className="font-mono text-[9px] text-white/52">{formatDuration(match.time_in_match)}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-white/76">
                    {match.kills}K · {match.deaths}D · {match.loots}L
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] uppercase ${match.survived ? "bg-[var(--green)]/15 text-[var(--accent-green)]" : "bg-[var(--kill-red)]/15 text-[var(--kill-red)]"}`}>
                      {match.survived ? "Survived" : "Died"}
                    </span>
                    <span className="text-[8px] text-white/42">{match.date}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 font-mono text-[8px] italic text-white/34">Hover to preview · Click to lock</div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col">
          {activeMapId ? (
            <div className="min-h-0 flex-1">
              <MapViewport
                imageUrl={getMapMeta(activeMapId).imageUrl}
                zoom={zoom}
                onZoomChange={setZoom}
                onWheel={(delta) => setZoom((current) => Math.min(2.5, Math.max(0.75, current + (delta > 0 ? -0.08 : 0.08))))}
              >
                {showGrid ? <ProfileGrid /> : null}

                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1024 1024" preserveAspectRatio="none">
                  {mapMatches.map((match, index) => {
                    const focusActive = focusMatchId === match.match_id;
                    const pathOpacity = focusMatchId && !focusActive ? dim / 100 : opacity / 100;
                    return (
                      <g key={match.match_id} opacity={pathOpacity}>
                        <polyline
                          points={match.positions.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill="none"
                          stroke={getPlayerColor(index)}
                          strokeWidth={focusActive ? 3.2 : 2}
                        />
                      </g>
                    );
                  })}
                </svg>

                {mapMatches.map((match, index) => {
                  const focusActive = focusMatchId === match.match_id;
                  const pointOpacity = focusMatchId && !focusActive ? dim / 100 : opacity / 100;
                  const first = match.positions[0];
                  if (!first) {
                    return null;
                  }
                  return (
                    <div
                      key={`${match.match_id}-spawn`}
                      className="absolute"
                      style={{ left: `${(first.x / 1024) * 100}%`, top: `${(first.y / 1024) * 100}%`, transform: "translate(-50%, -50%)", opacity: pointOpacity }}
                    >
                      <div className={`relative text-sm ${lockedMatchId === match.match_id ? "animate-pulse" : ""}`} style={{ color: getPlayerColor(index) }}>
                        ★
                        {lockedMatchId === match.match_id ? <span className="absolute inset-0 rounded-full border border-current opacity-40" /> : null}
                      </div>
                    </div>
                  );
                })}

                {!pathOnly
                  ? mapMatches.map((match, matchIndex) =>
                      match.events
                        .filter((event) => enabledEvents.includes(mapEventToFilter(event.type)))
                        .map((event) => {
                          const focusActive = focusMatchId === match.match_id;
                          const eventOpacity = focusMatchId && !focusActive ? dim / 100 : opacity / 100;
                          return (
                            <div
                              key={event.id}
                              title={`${match.map_id} · ${match.date} · ${shortId(match.match_id)} · ${formatDuration(event.elapsed_seconds)}`}
                              className="absolute text-center"
                              style={{ left: `${(event.x / 1024) * 100}%`, top: `${(event.y / 1024) * 100}%`, transform: "translate(-50%, -50%)", opacity: eventOpacity }}
                            >
                              <span style={{ color: eventColor(event.type), fontSize: event.type === "kill" || event.type === "loot" ? 14 : 16 }}>
                                {eventSymbol(event.type)}
                              </span>
                            </div>
                          );
                        }),
                    )
                  : null}
              </MapViewport>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="text-center">
                <div className="font-display text-[14px] uppercase tracking-[0.22em] text-white/72">No Data Found</div>
                <div className="mt-2 text-sm text-white/42">Try adjusting the player, date, or map filters.</div>
              </div>
            </div>
          )}
        </section>

        {activeMapId && (
          <aside className="flex w-[210px] flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-[12px] text-white/72">
            <div className="mb-3 font-display text-[11px] uppercase tracking-[0.28em] text-white/56">Legend</div>
            <LegendItem icon="★" label="Spawn" color="var(--loot-yellow)" />
            <LegendItem icon="●" label="Kill" color="var(--kill-red)" />
            <LegendItem icon="☠" label="Death" color="var(--death-orange)" />
            <LegendItem icon="☠" label="Storm" color="var(--storm-blue)" />
            <LegendItem icon="●" label="Loot" color="var(--loot-yellow)" />
          </aside>
        )}
      </div>
    </div>
  );
}

function toggleFilter(value: EventFilter, current: EventFilter[], setState: (value: EventFilter[]) => void) {
  setState(current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
}

function mapEventToFilter(type: PlayerMatchHistory["events"][number]["type"]): EventFilter {
  if (type === "kill") return "kills";
  if (type === "death") return "deaths";
  if (type === "storm") return "storm";
  return "loots";
}

function eventColor(type: PlayerMatchHistory["events"][number]["type"]) {
  if (type === "kill") return "var(--kill-red)";
  if (type === "death") return "var(--death-orange)";
  if (type === "storm") return "var(--storm-blue)";
  return "var(--loot-yellow)";
}

function eventSymbol(type: PlayerMatchHistory["events"][number]["type"]) {
  if (type === "death" || type === "storm") {
    return "☠";
  }
  return "●";
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[10px] font-display uppercase tracking-[0.2em] ${
        active ? "border-[var(--purple)] bg-[var(--purple)] text-white" : "border-[var(--border-subtle)] text-white/52"
      }`}
    >
      {label}
    </button>
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

function LegendItem({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="w-4 text-center text-[15px]" style={{ color }}>
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}

function ProfileGrid() {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full">
        {Array.from({ length: 9 }, (_, index) => (
          <line key={`x-${index}`} x1={`${(index / 8) * 100}%`} y1="0%" x2={`${(index / 8) * 100}%`} y2="100%" stroke="rgba(255,255,255,0.07)" />
        ))}
        {Array.from({ length: 6 }, (_, index) => (
          <line key={`y-${index}`} x1="0%" y1={`${(index / 5) * 100}%`} x2="100%" y2={`${(index / 5) * 100}%`} stroke="rgba(255,255,255,0.07)" />
        ))}
      </svg>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={`label-x-${index}`} className="absolute font-mono text-[7px] text-white/40" style={{ left: `${index * 12.5 + 1}%`, top: "1%" }}>
          {String.fromCharCode(65 + index)}
        </div>
      ))}
      {Array.from({ length: 5 }, (_, index) => (
        <div key={`label-y-${index}`} className="absolute font-mono text-[7px] text-white/40" style={{ left: "1%", top: `${index * 20 + 2}%` }}>
          {index + 1}
        </div>
      ))}
    </>
  );
}
