import { APP_CONFIG } from "../../core/config";
import { readJson, writeJson } from "../../services/storage";
import type { SessionPreset } from "./PresetTypes";

export class PresetRepository {
  list(): SessionPreset[] {
    return readJson<SessionPreset[]>(APP_CONFIG.storageKeys.presets, [])
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  save(preset: SessionPreset): SessionPreset {
    const presets = this.list();
    const existingIndex = presets.findIndex((item) => item.id === preset.id);
    const updated = existingIndex >= 0
      ? presets.map((item, index) => index === existingIndex ? preset : item)
      : [...presets, preset];

    if (!writeJson(APP_CONFIG.storageKeys.presets, updated)) {
      throw new Error("The preset could not be saved.");
    }
    return preset;
  }

  delete(id: string): void {
    const updated = this.list().filter((preset) => preset.id !== id);
    if (!writeJson(APP_CONFIG.storageKeys.presets, updated)) {
      throw new Error("The preset could not be deleted.");
    }
  }
}
