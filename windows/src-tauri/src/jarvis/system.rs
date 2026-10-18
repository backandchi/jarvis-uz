//! Tizim buyruqlari — noutbukni boshqarish

use std::process::Command;
use tauri::command;

#[command]
pub fn jarvis_volume(delta: i32) -> Result<(), String> {
    #[cfg(windows)]
    {
        let script = if delta > 0 {
            format!(
                "$obj = New-Object -ComObject WScript.Shell; \
                 for ($i=0; $i -lt {}; $i++) {{ $obj.SendKeys([char]175) }}",
                (delta / 2).max(1)
            )
        } else {
            format!(
                "$obj = New-Object -ComObject WScript.Shell; \
                 for ($i=0; $i -lt {}; $i++) {{ $obj.SendKeys([char]174) }}",
                ((-delta) / 2).max(1)
            )
        };
        run_ps(&script)
    }
    #[cfg(target_os = "linux")]
    {
        let dir = if delta > 0 { "+" } else { "-" };
        run_cmd("pactl", &["set-sink-volume", "@DEFAULT_SINK@",
                          &format!("{}{}%", dir, delta.unsigned_abs())])
    }
}

#[command]
pub fn jarvis_mute() -> Result<(), String> {
    #[cfg(windows)]
    run_ps("$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]173)")
    #[cfg(target_os = "linux")]
    run_cmd("pactl", &["set-sink-mute", "@DEFAULT_SINK@", "toggle"])
}

#[command]
pub async fn jarvis_screenshot() -> Result<String, String> {
    let desktop = dirs::desktop_dir().ok_or("Desktop topilmadi")?;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let path = desktop.join(format!("jarvis-screenshot-{}.png", ts));
    let path_str = path.to_string_lossy().to_string();

    #[cfg(windows)]
    {
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; \
             [System.Windows.Forms.Screen]::PrimaryScreen | Out-Null; \
             $b = [System.Drawing.Bitmap]::new([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, \
                                               [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); \
             $g = [System.Drawing.Graphics]::FromImage($b); \
             $g.CopyFromScreen(0,0,0,0,$b.Size); \
             $b.Save('{}');",
            path_str.replace("'", "''")
        );
        run_ps(&script)?;
    }
    #[cfg(target_os = "linux")]
    {
        run_cmd("scrot", &[&path_str])?;
    }

    Ok(path_str)
}

#[command]
pub fn jarvis_lock_screen() -> Result<(), String> {
    #[cfg(windows)]
    run_cmd("rundll32.exe", &["user32.dll,LockWorkStation"])
    #[cfg(target_os = "linux")]
    run_cmd("loginctl", &["lock-session"])
}

#[command]
pub fn jarvis_shutdown() -> Result<(), String> {
    #[cfg(windows)]
    run_cmd("shutdown", &["/s", "/t", "5"])
    #[cfg(target_os = "linux")]
    run_cmd("systemctl", &["poweroff"])
}

#[command]
pub fn jarvis_restart() -> Result<(), String> {
    #[cfg(windows)]
    run_cmd("shutdown", &["/r", "/t", "5"])
    #[cfg(target_os = "linux")]
    run_cmd("systemctl", &["reboot"])
}

#[command]
pub fn jarvis_sleep() -> Result<(), String> {
    #[cfg(windows)]
    run_ps("Add-Type -AssemblyName System.Windows.Forms; \
            [System.Windows.Forms.Application]::SetSuspendState('Suspend',$false,$false)")
    #[cfg(target_os = "linux")]
    run_cmd("systemctl", &["suspend"])
}

#[derive(serde::Serialize)]
pub struct SystemInfo {
    cpu:  f32,
    ram:  f32,
    disk: f32,
}

#[command]
pub fn jarvis_system_info() -> SystemInfo {
    SystemInfo { cpu: 0.0, ram: 0.0, disk: 0.0 }
}

#[command]
pub fn jarvis_battery() -> u32 {
    #[cfg(windows)]
    {
        let out = Command::new("powershell")
            .args(["-Command",
                   "(Get-WmiObject Win32_Battery).EstimatedChargeRemaining"])
            .output()
            .ok();
        if let Some(o) = out {
            let s = String::from_utf8_lossy(&o.stdout);
            s.trim().parse::<u32>().unwrap_or(0)
        } else { 0 }
    }
    #[cfg(not(windows))]
    { 0 }
}

#[command]
pub fn jarvis_get_clipboard() -> Result<String, String> {
    #[cfg(windows)]
    {
        let out = Command::new("powershell")
            .args(["-Command", "Get-Clipboard"])
            .output()
            .map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    }
    #[cfg(not(windows))]
    Err("Faqat Windows'da ishlaydi".to_string())
}

#[command]
pub fn jarvis_set_clipboard(text: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let script = format!("Set-Clipboard -Value '{}'", text.replace("'", "''"));
        run_ps(&script)
    }
    #[cfg(not(windows))]
    Err("Faqat Windows'da ishlaydi".to_string())
}

#[command]
pub fn jarvis_notify(title: String, body: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; \
             $n = New-Object System.Windows.Forms.NotifyIcon; \
             $n.Icon = [System.Drawing.SystemIcons]::Information; \
             $n.Visible = $true; \
             $n.ShowBalloonTip(3000, '{}', '{}', \
             [System.Windows.Forms.ToolTipIcon]::Info); \
             Start-Sleep 4; $n.Dispose()",
            title.replace("'", "''"),
            body.replace("'", "''")
        );
        std::thread::spawn(move || { let _ = run_ps(&script); });
        Ok(())
    }
    #[cfg(not(windows))]
    run_cmd("notify-send", &[&title, &body])
}

#[command]
pub fn jarvis_search_web(query: String) -> Result<(), String> {
    let encoded = query.replace(" ", "+");
    let url = format!("https://www.google.com/search?q={}", encoded);
    #[cfg(windows)]
    run_cmd("cmd", &["/c", "start", &url])?;
    #[cfg(target_os = "linux")]
    run_cmd("xdg-open", &[&url])?;
    Ok(())
}

fn run_cmd(cmd: &str, args: &[&str]) -> Result<(), String> {
    Command::new(cmd)
        .args(args)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(windows)]
fn run_ps(script: &str) -> Result<(), String> {
    Command::new("powershell")
        .args(["-WindowStyle", "Hidden", "-Command", script])
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
