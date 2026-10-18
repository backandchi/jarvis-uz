/**
 * JARVIS — O'zbek tilidagi ovoz tizimi
 * Web Speech API asosida: STT (nutqni matn qilish) + TTS (matnni ovoz qilish)
 * Wake word: "Salom Jarvis" yoki "Jarvis"
 */

import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { State } from "../core/state";

const WAKE_WORDS = [
  "salom jarvis", "jarvis", "hey jarvis", "salom jarvus",
  "salomm jarvis", "jarwis", "dzarvis"
];
const STT_LANG   = "uz-UZ";
const TTS_LANG   = "uz-UZ";
const LISTEN_MS  = 8000;

export type VoiceState = "idle" | "wake_listening" | "cmd_listening" | "thinking" | "speaking";

let recognition: any = null;
let wakeRecognition: any = null;
let currentState: VoiceState = "idle";
let listenTimer: any = null;
let onStateChange: ((s: VoiceState) => void) | null = null;

export function initVoice(stateCallback: (s: VoiceState) => void) {
  onStateChange = stateCallback;
  if (!isSupported()) {
    console.warn("[Jarvis] Speech API qo'llab-quvvatlanmaydi");
    return;
  }
  startWakeListener();
}

export function stopVoice() {
  try {
    wakeRecognition?.stop();
    recognition?.stop();
    window.speechSynthesis.cancel();
  } catch (e) {}
  setState("idle");
}

export function startManualListen() {
  startCommandListener();
}

export function speak(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = TTS_LANG;
  utt.rate  = 1.05;
  utt.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const voice  =
    voices.find(v => v.lang.startsWith("uz")) ??
    voices.find(v => v.lang.startsWith("ru")) ??
    voices.find(v => v.lang.startsWith("en")) ??
    voices[0];
  if (voice) utt.voice = voice;

  utt.onstart = () => setState("speaking");
  utt.onend   = () => { setState("idle"); onEnd?.(); };
  utt.onerror = () => setState("idle");

  window.speechSynthesis.speak(utt);
}

function startWakeListener() {
  const SR = getSR();
  if (!SR) return;

  wakeRecognition = new SR();
  wakeRecognition.lang = STT_LANG;
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = false;
  wakeRecognition.maxAlternatives = 5;

  wakeRecognition.onresult = (e: any) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const alts = Array.from({ length: e.results[i].length }, (_, j) =>
        e.results[i][j].transcript.toLowerCase().trim()
      );
      const detected = WAKE_WORDS.some(w => alts.some(a => a.includes(w)));
      if (detected && currentState === "idle") {
        onWakeDetected();
        return;
      }
    }
  };

  wakeRecognition.onend = () => {
    if (currentState === "idle" || currentState === "wake_listening") {
      setTimeout(() => {
        try { wakeRecognition?.start(); } catch (e) {}
      }, 200);
    }
  };

  wakeRecognition.onerror = (e: any) => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      console.error("[Jarvis Wake]", e.error);
    }
  };

  setState("wake_listening");
  try {
    wakeRecognition.start();
  } catch (e) {}
}

function onWakeDetected() {
  try { wakeRecognition?.stop(); } catch (e) {}
  setState("cmd_listening");
  speak("Ha, tinglamoqdaman", () => startCommandListener());
  void emit("jarvis_wake", {});
}

function startCommandListener() {
  const SR = getSR();
  if (!SR) return;

  recognition = new SR();
  recognition.lang = STT_LANG;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  listenTimer = setTimeout(() => {
    try { recognition?.stop(); } catch (e) {}
    speak("Tushunmadim. Qayta aytib bering.");
    startWakeListener();
  }, LISTEN_MS);

  recognition.onresult = (e: any) => {
    const last = e.results[e.results.length - 1];
    if (last.isFinal) {
      const text = last[0].transcript.trim();
      if (listenTimer) clearTimeout(listenTimer);
      onCommandReceived(text);
    }
  };

  recognition.onerror = () => {
    if (listenTimer) clearTimeout(listenTimer);
    speak("Eshitmadim, qayta aytib bering.");
    startWakeListener();
  };

  recognition.onend = () => setState("thinking");

  try {
    recognition.start();
  } catch (e) {}
}

async function onCommandReceived(text: string) {
  setState("thinking");
  void emit("jarvis_command", { text });

  const localResult = await handleLocalCommand(text);
  if (localResult) {
    speak(localResult);
    setTimeout(() => startWakeListener(), 500);
    return;
  }

  try {
    const reply: string = await invoke("jarvis_ask", {
      text,
      provider: State.settings.chatProvider ?? "anthropic",
    });
    speak(reply);
  } catch (err) {
    speak("Xato yuz berdi. Qayta urinib ko'ring.");
    console.error("[Jarvis AI]", err);
  }

  setTimeout(() => startWakeListener(), 500);
}

async function handleLocalCommand(text: string): Promise<string | null> {
  const t = text.toLowerCase();

  if (t.includes("soat") || t.includes("vaqt")) {
    const now = new Date();
    return `Hozir soat ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  if (t.includes("bugun") && t.includes("kun")) {
    const d = new Date();
    const days = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
    return `Bugun ${days[d.getDay()]}, ${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
  }

  if (t.includes("tovush") && t.includes("baland") || t.includes("volume up")) {
    await invoke("jarvis_volume", { delta: 10 });
    return "Tovush balandlashtirildi";
  }
  if (t.includes("tovush") && t.includes("past") || t.includes("volume down")) {
    await invoke("jarvis_volume", { delta: -10 });
    return "Tovush pastlashtirildi";
  }
  if (t.includes("ovozni o'chir") || t.includes("mute")) {
    await invoke("jarvis_mute", {});
    return "Ovoz o'chirildi";
  }

  if (t.includes("ekran surati") || t.includes("screenshot")) {
    await invoke("jarvis_screenshot", {});
    return "Ekran surati olindi";
  }

  if (t.includes("brauzer") || t.includes("internet") || t.includes("chrome") || t.includes("firefox")) {
    await invoke("jarvis_open_app", { name: "browser" });
    return "Brauzer ochilmoqda";
  }
  if (t.includes("vs code") || t.includes("kod") || t.includes("redaktor")) {
    await invoke("jarvis_open_app", { name: "vscode" });
    return "VS Code ochilmoqda";
  }
  if (t.includes("terminal") || t.includes("konsol")) {
    await invoke("jarvis_open_app", { name: "terminal" });
    return "Terminal ochilmoqda";
  }

  if (t.includes("ekranni qufla") || t.includes("lock")) {
    await invoke("jarvis_lock_screen", {});
    return "Ekran quflanmoqda";
  }
  if (t.includes("batareya") || t.includes("zaryad")) {
    const bat: number = await invoke("jarvis_battery", {});
    return `Batareya ${bat} foiz`;
  }
  if (t.includes("o'chir") && t.includes("kompyuter")) {
    return "Kompyuterni o'chirishni buyurdingiz. Tasdiqlash uchun: 'Ha, o'chir' deng";
  }
  if (t === "ha, o'chir") {
    await invoke("jarvis_shutdown", {});
    return "O'chirilmoqda...";
  }

  if (t.includes("antigravity") || t.includes("agent")) {
    const status: string = await invoke("jarvis_agy_status", {});
    return status;
  }

  if (t.startsWith("qidir") || t.startsWith("search")) {
    const query = t.replace(/^(qidir|search)\s*/i, "");
    await invoke("jarvis_search_web", { query });
    return `"${query}" qidirilmoqda`;
  }

  return null;
}

function getSR() {
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

function isSupported(): boolean {
  return !!getSR() && "speechSynthesis" in window;
}

function setState(s: VoiceState) {
  currentState = s;
  onStateChange?.(s);
}

export { currentState };
