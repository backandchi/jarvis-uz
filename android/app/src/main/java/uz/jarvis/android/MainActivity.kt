package uz.jarvis.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import uz.jarvis.android.network.JarvisClient
import uz.jarvis.android.network.Discovery

class MainActivity : AppCompatActivity() {

    private lateinit var client: JarvisClient
    private lateinit var statusText: TextView
    private lateinit var agentStatus: TextView
    private lateinit var btnMic: Button
    private lateinit var btnAllow: Button
    private lateinit var btnDeny: Button
    private lateinit var chatInput: EditText
    private lateinit var chatSend: Button
    private lateinit var chatView: TextView

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var pendingApprovalId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        bindViews()
        checkPermissions()
        startDiscovery()
        setupClickListeners()
    }

    private fun bindViews() {
        statusText   = findViewById(R.id.statusText)
        agentStatus  = findViewById(R.id.agentStatus)
        btnMic       = findViewById(R.id.btnMic)
        btnAllow     = findViewById(R.id.btnAllow)
        btnDeny      = findViewById(R.id.btnDeny)
        chatInput    = findViewById(R.id.chatInput)
        chatSend     = findViewById(R.id.chatSend)
        chatView     = findViewById(R.id.chatView)
    }

    private fun setupClickListeners() {
        btnMic.setOnClickListener { startVoiceInput() }

        btnAllow.setOnClickListener {
            pendingApprovalId?.let { id ->
                scope.launch {
                    client.sendCommand("approve", mapOf("sessionId" to id, "decision" to "allow"))
                    btnAllow.isEnabled = false
                    btnDeny.isEnabled  = false
                    agentStatus.text   = "✅ Ruxsat berildi"
                    pendingApprovalId  = null
                }
            }
        }

        btnDeny.setOnClickListener {
            pendingApprovalId?.let { id ->
                scope.launch {
                    client.sendCommand("approve", mapOf("sessionId" to id, "decision" to "deny"))
                    btnAllow.isEnabled = false
                    btnDeny.isEnabled  = false
                    agentStatus.text   = "❌ Rad etildi"
                    pendingApprovalId  = null
                }
            }
        }

        chatSend.setOnClickListener {
            val msg = chatInput.text.toString().trim()
            if (msg.isEmpty()) return@setOnClickListener
            scope.launch {
                chatView.append("\n👤 $msg")
                chatInput.setText("")
                val reply = client.sendCommand("chat", mapOf("message" to msg))
                chatView.append("\n🤖 ${reply["text"] ?: "..."}")
            }
        }
    }

    private fun startDiscovery() {
        statusText.text = "🔍 Jarvis qidirilmoqda..."
        scope.launch(Dispatchers.IO) {
            try {
                val host = Discovery.findJarvis(this@MainActivity)
                withContext(Dispatchers.Main) {
                    if (host != null) {
                        client = JarvisClient(host)
                        statusText.text = "✅ Ulandi: $host"
                        startPolling()
                    } else {
                        statusText.text = "❌ Jarvis topilmadi. WiFi ga ulaning."
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    statusText.text = "❌ Xato: ${e.message}"
                }
            }
        }
    }

    private fun startPolling() {
        scope.launch {
            while (true) {
                try {
                    val status = client.getStatus()
                    updateUI(status)
                } catch (_: Exception) {
                    statusText.text = "⚠️ Ulanish uzildi"
                }
                delay(2000L)
            }
        }
    }

    private fun updateUI(status: Map<String, Any>) {
        @Suppress("UNCHECKED_CAST")
        val agents = status["agents"] as? List<Map<String, Any>> ?: emptyList()

        if (agents.isEmpty()) {
            agentStatus.text = "🟢 Agentlar: hech biri ishlamayapti"
            btnAllow.isEnabled = false
            btnDeny.isEnabled  = false
        } else {
            val waiting = agents.filter { it["state"] == "waiting" }
            if (waiting.isNotEmpty()) {
                val a = waiting.first()
                val tool = a["pendingTool"] as? String ?: "noma'lum"
                val cmd  = a["pendingCmd"]  as? String ?: ""
                agentStatus.text = "⚠️ Ruxsat kerak!\n🔧 $tool\n$ $cmd"
                btnAllow.isEnabled = true
                btnDeny.isEnabled  = true
                pendingApprovalId  = a["id"] as? String
            } else {
                val info = agents.joinToString("\n") {
                    val state = when (it["state"]) {
                        "working" -> "🔄"
                        "done"    -> "✅"
                        "error"   -> "❌"
                        else      -> "⚙️"
                    }
                    "$state ${it["name"]}: ${it["step"] ?: ""}"
                }
                agentStatus.text = info
                btnAllow.isEnabled = false
                btnDeny.isEnabled  = false
            }
        }
    }

    private fun startVoiceInput() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                     RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "uz-UZ")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Jarvisga buyruq...")
        }
        try {
            startActivityForResult(intent, 100)
        } catch (e: Exception) {
            Toast.makeText(this, "Mikrofon xatosi: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 100 && resultCode == RESULT_OK) {
            val results = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val text = results?.firstOrNull() ?: return
            chatView.append("\n🎤 $text")
            scope.launch {
                val reply = client.sendCommand("voice_command", mapOf("text" to text))
                chatView.append("\n🤖 ${reply["text"] ?: "..."}")
            }
        }
    }

    private fun checkPermissions() {
        val needed = arrayOf(
            Manifest.permission.INTERNET,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CHANGE_WIFI_STATE,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.ACCESS_NETWORK_STATE,
        )
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 1)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
