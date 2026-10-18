package uz.jarvis.android.network

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import kotlinx.coroutines.*

object Discovery {

    suspend fun findJarvis(context: Context): String? =
        withContext(Dispatchers.IO) {
            val deferred = CompletableDeferred<String?>()
            val nsd = context.getSystemService(Context.NSD_SERVICE) as NsdManager

            val listener = object : NsdManager.DiscoveryListener {
                override fun onStartDiscoveryFailed(s: String, e: Int) {
                    deferred.complete(null)
                }
                override fun onStopDiscoveryFailed(s: String, e: Int) {}
                override fun onDiscoveryStarted(s: String) {}
                override fun onDiscoveryStopped(s: String) {}
                override fun onServiceFound(info: NsdServiceInfo) {
                    nsd.resolveService(info, object : NsdManager.ResolveListener {
                        override fun onResolveFailed(i: NsdServiceInfo, e: Int) {}
                        override fun onServiceResolved(i: NsdServiceInfo) {
                            val host = i.host?.hostAddress
                            if (host != null) deferred.complete(host)
                        }
                    })
                }
                override fun onServiceLost(info: NsdServiceInfo) {}
            }

            nsd.discoverServices("_coucou._tcp", NsdManager.PROTOCOL_DNS_SD, listener)

            withTimeoutOrNull(5000L) { deferred.await() }.also {
                try { nsd.stopServiceDiscovery(listener) } catch (_: Exception) {}
            }
        }
}
