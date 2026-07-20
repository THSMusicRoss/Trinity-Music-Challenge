import { APP_CONFIG } from "../../core/config";
import { readJson, writeJson } from "../../services/storage";
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from "./PreferencesTypes";

export class PreferencesRepository {
  load(): UserPreferences {
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...readJson<Partial<UserPreferences>>(APP_CONFIG.storageKeys.preferences, {})
    };
  }

  save(preferences: UserPreferences): boolean {
    return writeJson(APP_CONFIG.storageKeys.preferences, preferences);
  }
}
