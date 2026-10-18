# рџ¤– Jarvis AI (Uzbek) вЂ” Desktop & Mobile Companion

Coucou asosida yaratilgan, o'zbek tilida gapiruvchi va noutbukni to'liq boshqara oladigan shaxsiy AI yordamchi tizimi.

## рџЊџ Asosiy imkoniyatlari
- рџЋ™пёЏ **O'zbekcha Ovoz Tizimi**: В«Salom JarvisВ» wake-word orqali faollashadi, o'zbekcha nutqni tushunadi (STT) va o'zbek tilida javob beradi (TTS).
- рџ’» **Noutbukni To'liq Boshqarish**:
  - Dasturlarni ochish/yopish (Chrome, VS Code, Terminal va b.)
  - Ovoz balandligini boshqarish, mute
  - Ekran suratini olish (Screenshot)
  - Ekranni qulflash (Lock screen)
  - Batareya holatini aytish
  - O'chirish / Restart buyruqlari
  - Web qidiruv
- рџ“± **Android Mobil Ilova**:
  - WiFi orqali mDNS yordamida PC'ni avtomatik topish
  - Telefondan turib ovozli buyruqlar berish
  - AI kodlovchi agentlar ruxsatini (Allow / Deny) masofadan tasdiqlash
- рџ¤– **Antigravity va Ko'p AI integratsiyasi**:
  - Claude API va Google AI Studio (Gemini) bilan o'zbekcha muloqot
  - Antigravity agentlari holatini to'g'ridan-to'g'ri kuzatish

## рџ“‚ Loyiha tuzilmasi
- windows/src/jarvis/ вЂ” Ovozli boshqaruv, PC nazorati va Antigravity integratsiyasi (TypeScript)
- windows/src-tauri/src/jarvis/ вЂ” Tizim buyruqlari, ilovalar nazorati (Rust backend)
- windows/src/i18n/uz.json вЂ” To'liq o'zbek tili lokalizatsiyasi
- ndroid/ вЂ” Android uchun sodda va qulay boshqaruv ilovasi (Kotlin)

---
Yaratuvchi: **@backandchi**