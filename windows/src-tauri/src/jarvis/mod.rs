//! Jarvis — PC boshqaruv buyruqlari (Tauri commands)

pub mod system;
pub mod apps;

use tauri::command;

/// AI dan o'zbek tilida javob olish
#[command]
pub async fn jarvis_ask(
    app: tauri::AppHandle,
    text: String,
    provider: String,
) -> Result<String, String> {
    use crate::Shared;
    use tauri::Manager;

    let shared = app.state::<Shared>();
    let settings = shared.settings.lock().unwrap().clone();

    let system = format!(
        "Sen Jarvis — foydalanuvchining shaxsiy AI yordamchisisan. \
         DOIM o'zbek tilida javob ber. \
         Qisqa va aniq gapir (1-3 jumla). \
         Texnik savollar bo'lsa ham o'zbek tilida tushuntir. \
         Hozirgi vaqt: {}.",
        chrono_local_time()
    );

    let reply = match provider.as_str() {
        "anthropic" => crate::claude::ask(&app, &settings, &text, &system).await,
        "google"    => crate::openai_compat::ask_google(&app, &settings, &text, &system).await,
        _           => crate::claude::ask(&app, &settings, &text, &system).await,
    };

    reply.map_err(|e| e.to_string())
}

/// AGY agent holati (o'zbek tilida)
#[command]
pub async fn jarvis_agy_status(app: tauri::AppHandle) -> String {
    let tasks = crate::agents::active_tasks(&app);
    if tasks.is_empty() {
        return "Hozir hech qanday agent ishlamayapti.".to_string();
    }
    let parts: Vec<String> = tasks
        .iter()
        .map(|t| format!("{}: faol", t.name))
        .collect();
    format!("{} ta agent faol: {}.", tasks.len(), parts.join("; "))
}

fn chrono_local_time() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let seconds = now % 86400;
    let h = (seconds / 3600 + 5) % 24; // UTC+5 Toshkent
    let m = (seconds % 3600) / 60;
    format!("{:02}:{:02}", h, m)
}
