/**
 * PC Control — noutbukni boshqarish funksiyalari (UI tomoni)
 */
import { invoke } from "@tauri-apps/api/core";

export const PC = {
  openApp: (name: string) => invoke<void>("jarvis_open_app", { name }),
  closeApp: (name: string) => invoke<void>("jarvis_close_app", { name }),
  volume: (delta: number) => invoke<void>("jarvis_volume", { delta }),
  mute: () => invoke<void>("jarvis_mute", {}),
  screenshot: () => invoke<string>("jarvis_screenshot", {}),
  lockScreen: () => invoke<void>("jarvis_lock_screen", {}),
  shutdown: () => invoke<void>("jarvis_shutdown", {}),
  restart: () => invoke<void>("jarvis_restart", {}),
  sleep: () => invoke<void>("jarvis_sleep", {}),
  battery: () => invoke<number>("jarvis_battery", {}),
  getClipboard: () => invoke<string>("jarvis_get_clipboard", {}),
  setClipboard: (text: string) => invoke<void>("jarvis_set_clipboard", { text }),
  listApps: () => invoke<string[]>("jarvis_list_apps", {}),
  systemInfo: () => invoke<{ cpu: number; ram: number; disk: number }>("jarvis_system_info", {}),
  searchWeb: (query: string) => invoke<void>("jarvis_search_web", { query }),
  openFile: (path: string) => invoke<void>("jarvis_open_file", { path }),
  notify: (title: string, body: string) => invoke<void>("jarvis_notify", { title, body }),
};
