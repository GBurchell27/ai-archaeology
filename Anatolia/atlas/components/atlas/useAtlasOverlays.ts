import { useState, type Dispatch, type SetStateAction } from "react";

export interface AtlasOverlays {
  settingsOpen: boolean;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  landscapeOpen: boolean;
  setLandscapeOpen: Dispatch<SetStateAction<boolean>>;
  help: boolean;
  setHelp: Dispatch<SetStateAction<boolean>>;
  climateId: string | null;
  setClimateId: (recordId: string | null) => void;
  query: string;
  setQuery: (query: string) => void;
}

/** The floating surfaces over the map: settings, landscape statistics, shortcuts, climate chart, search text. */
export function useAtlasOverlays(): AtlasOverlays {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [landscapeOpen, setLandscapeOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [climateId, setClimateId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  return { settingsOpen, setSettingsOpen, landscapeOpen, setLandscapeOpen, help, setHelp, climateId, setClimateId, query, setQuery };
}
