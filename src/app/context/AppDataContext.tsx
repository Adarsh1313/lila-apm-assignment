import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMapConfigs } from "../lib/data";

interface MapConfig {
  scale: number;
  origin_x: number;
  origin_z: number;
  image_size: number;
}

interface AppDataContextValue {
  mapConfigs: Record<string, MapConfig> | null;
  mapConfigStatus: "loading" | "ready" | "unavailable";
}

const AppDataContext = createContext<AppDataContextValue>({
  mapConfigs: null,
  mapConfigStatus: "loading",
});

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [mapConfigs, setMapConfigs] = useState<Record<string, MapConfig> | null>(null);
  const [mapConfigStatus, setMapConfigStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let mounted = true;

    fetchMapConfigs().then((configs) => {
      if (!mounted) {
        return;
      }

      setMapConfigs(configs);
      setMapConfigStatus(configs ? "ready" : "unavailable");
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppDataContext.Provider value={{ mapConfigs, mapConfigStatus }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}
