//! Ilovalar boshqaruvi

use std::process::Command;
use tauri::command;

#[command]
pub fn jarvis_open_app(name: String) -> Result<(), String> {
    let app = name.to_lowercase();
    #[cfg(windows)]
    {
        let cmd = match app.as_str() {
            "browser" | "chrome"     => ("start", vec!["chrome"]),
            "firefox"                => ("start", vec!["firefox"]),
            "vscode"  | "code"       => ("code",  vec![]),
            "terminal"| "powershell" => ("powershell", vec![]),
            "cmd"                    => ("cmd",   vec![]),
            "notepad"                => ("notepad", vec![]),
            "calculator"             => ("calc",   vec![]),
            "explorer"               => ("explorer", vec![]),
            "word"                   => ("winword", vec![]),
            "excel"                  => ("excel",  vec![]),
            "teams"                  => ("teams",  vec![]),
            "telegram"               => ("telegram", vec![]),
            _                        => ("start", vec![app.as_str()]),
        };
        Command::new("cmd")
            .args(["/c", cmd.0].iter().chain(cmd.1.iter()))
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "linux")]
    {
        let cmd = match app.as_str() {
            "browser" | "chrome"   => "google-chrome",
            "firefox"              => "firefox",
            "vscode"  | "code"     => "code",
            "terminal"             => "gnome-terminal",
            _                      => app.as_str(),
        };
        Command::new(cmd).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
}

#[command]
pub fn jarvis_close_app(name: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let proc = match name.to_lowercase().as_str() {
            "chrome"          => "chrome.exe",
            "firefox"         => "firefox.exe",
            "vscode" | "code" => "Code.exe",
            other             => other,
        };
        Command::new("taskkill")
            .args(["/F", "/IM", proc])
            .output()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("pkill")
            .arg(&name)
            .output()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

#[command]
pub fn jarvis_list_apps() -> Vec<String> {
    #[cfg(windows)]
    {
        let out = Command::new("powershell")
            .args(["-Command",
                   "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} \
                    | Select-Object -ExpandProperty ProcessName | Sort-Object -Unique"])
            .output();
        if let Ok(o) = out {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect()
        } else { vec![] }
    }
    #[cfg(not(windows))]
    { vec![] }
}

#[command]
pub fn jarvis_open_file(path: String) -> Result<(), String> {
    #[cfg(windows)]
    Command::new("explorer")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
