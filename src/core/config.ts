export const APP_CONFIG = Object.freeze({
  appName: "Trinity Music Challenge",
  appVersion: "1.0.0",
  defaultTheme: "dark",
  supportedThemes: Object.freeze(["dark", "light"] as const),
  storageKeys: Object.freeze({
    preferences: "tmc.preferences.v1",
    activeGame: "tmc.activeGame.v2",
    completedGames: "tmc.completedGames.v1",
    presets: "tmc.presets.v1"
  }),
  screens: Object.freeze({
    MAIN_MENU: "screen-main-menu",
    SETUP: "screen-setup",
    PRESETS: "screen-presets",
    GAMEPLAY: "screen-gameplay",
    SETTINGS: "screen-settings",
    PLACEHOLDER: "screen-placeholder"
  })
});

export type ThemeName = (typeof APP_CONFIG.supportedThemes)[number];
