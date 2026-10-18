package uz.jarvis.android.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.*
import java.net.HttpURLConnection
import java.net.URL

class JarvisClient(private val host: String, private val port: Int = 59876) {

    private val base = "http://$host:$port"

    suspend fun getStatus(): Map<String, Any> = withContext(Dispatchers.IO) {
        val json = get("/jarvis/status")
        parseResponse(json)
    }

    suspend fun sendCommand(
        command: String,
        params: Map<String, String> = emptyMap()
    ): Map<String, Any> = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("command", command)
            params.forEach { (k, v) -> put(k, v) }
        }
        val json = post("/jarvis/command", body.toString())
        parseResponse(json)
    }

    private fun get(path: String): String {
        val conn = URL("$base$path").openConnection() as HttpURLConnection
        conn.connectTimeout = 3000
        conn.readTimeout    = 5000
        return try {
            conn.inputStream.bufferedReader().readText()
        } finally {
            conn.disconnect()
        }
    }

    private fun post(path: String, body: String): String {
        val conn = URL("$base$path").openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput      = true
        conn.connectTimeout = 3000
        conn.readTimeout    = 10000
        conn.setRequestProperty("Content-Type", "application/json")
        conn.outputStream.write(body.toByteArray())
        return try {
            conn.inputStream.bufferedReader().readText()
        } finally {
            conn.disconnect()
        }
    }

    private fun parseResponse(json: String): Map<String, Any> = try {
        val obj = JSONObject(json)
        obj.keys().asSequence().associateWith { key ->
            when (val v = obj.get(key)) {
                is JSONObject -> mapOf<String, Any>()
                else          -> v
            }
        }
    } catch (_: Exception) { emptyMap() }
}
