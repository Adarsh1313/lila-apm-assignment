import { createBrowserRouter, Navigate } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { MapAnalysisPage } from "./pages/MapAnalysisPage";
import { TelemetryPage } from "./pages/TelemetryPage";
import { MatchReplayPage } from "./pages/MatchReplayPage";
import { PlayerProfilesPage } from "./pages/PlayerProfilesPage";
import { RootLayout } from "./components/RootLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: "map/ambrose-valley", Component: MapAnalysisPage },
      { path: "map/grand-rift", Component: MapAnalysisPage },
      { path: "map/lockdown", Component: MapAnalysisPage },
      { path: "telemetry", Component: TelemetryPage },
      { path: "match-replay", Component: MatchReplayPage },
      { path: "player-profiles", Component: PlayerProfilesPage },
    ],
  },
]);
