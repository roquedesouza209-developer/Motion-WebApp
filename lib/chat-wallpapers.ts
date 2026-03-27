export const CHAT_WALLPAPER_OPTIONS = [
  { id: "portrait", label: "Portrait" },
  { id: "midnight", label: "Midnight" },
  { id: "aurora", label: "Aurora" },
  { id: "sunset", label: "Sunset" },
  { id: "ocean", label: "Ocean" },
] as const;

export const CHAT_WALLPAPER_TARGETS = [
  { id: "all", label: "All looks" },
  { id: "light", label: "Light mode" },
  { id: "dark", label: "Dark mode" },
] as const;

export type ChatWallpaper = (typeof CHAT_WALLPAPER_OPTIONS)[number]["id"];
export type ChatWallpaperSelection = ChatWallpaper | "custom";
export type ChatWallpaperTarget = (typeof CHAT_WALLPAPER_TARGETS)[number]["id"];
export type ChatAppearanceTone = "light" | "dark";

export const DEFAULT_CHAT_WALLPAPER: ChatWallpaper = "portrait";
export const DEFAULT_CHAT_WALLPAPER_BLUR = 18;
export const DEFAULT_CHAT_WALLPAPER_DIM = 38;
export const CHAT_WALLPAPER_BLUR_MIN = 0;
export const CHAT_WALLPAPER_BLUR_MAX = 28;
export const CHAT_WALLPAPER_DIM_MIN = 0;
export const CHAT_WALLPAPER_DIM_MAX = 70;

const LIGHT_THEME_IDS = new Set(["light", "summer", "spring"]);

export function isChatWallpaper(value: string | null | undefined): value is ChatWallpaper {
  return CHAT_WALLPAPER_OPTIONS.some((option) => option.id === value);
}

export function isChatWallpaperTarget(
  value: string | null | undefined,
): value is ChatWallpaperTarget {
  return CHAT_WALLPAPER_TARGETS.some((option) => option.id === value);
}

export function isChatWallpaperSelection(
  value: string | null | undefined,
): value is ChatWallpaperSelection {
  return value === "custom" || isChatWallpaper(value);
}

export function clampChatWallpaperBlur(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_CHAT_WALLPAPER_BLUR;
  }

  return Math.min(
    CHAT_WALLPAPER_BLUR_MAX,
    Math.max(CHAT_WALLPAPER_BLUR_MIN, Math.round(value)),
  );
}

export function clampChatWallpaperDim(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_CHAT_WALLPAPER_DIM;
  }

  return Math.min(
    CHAT_WALLPAPER_DIM_MAX,
    Math.max(CHAT_WALLPAPER_DIM_MIN, Math.round(value)),
  );
}

export function resolveChatAppearanceTone(
  themeSelection: string | null | undefined,
): ChatAppearanceTone {
  return LIGHT_THEME_IDS.has(themeSelection ?? "") ? "light" : "dark";
}
