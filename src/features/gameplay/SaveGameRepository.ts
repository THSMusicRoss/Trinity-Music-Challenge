import { APP_CONFIG } from "../../core/config";
import { readJson, removeStoredValue, writeJson } from "../../services/storage";
import type { SavedGame } from "./SaveGameTypes";

export class SaveGameRepository {
  load(): SavedGame | null {
    const saved = readJson<SavedGame | null>(APP_CONFIG.storageKeys.activeGame, null);
    if (!saved || saved.schemaVersion !== "1.0") return null;
    return saved;
  }

  save(game: SavedGame): boolean {
    return writeJson(APP_CONFIG.storageKeys.activeGame, game);
  }

  clear(): boolean {
    return removeStoredValue(APP_CONFIG.storageKeys.activeGame);
  }

  exists(): boolean {
    return this.load() !== null;
  }
}
