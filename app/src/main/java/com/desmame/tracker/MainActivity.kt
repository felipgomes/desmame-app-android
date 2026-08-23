package com.desmame.tracker

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

/**
 * MainActivity — tela única do app.
 * -----------------------------------------------------------
 * Carrega o mesmo HTML/CSS/JS que já existia na versão web, agora
 * empacotado dentro do próprio APK (assets/www), sem precisar de rede.
 *
 * Implementa o seletor de arquivo nativo (necessário para o botão
 * "Importar backup (JSON)" funcionar dentro de um WebView — por padrão,
 * <input type="file"> não abre nada sem este código).
 */
class MainActivity : ComponentActivity() {

    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var webView: WebView

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val data = result.data
        val uris: Array<Uri>? = if (result.resultCode == RESULT_OK && data?.data != null) {
            arrayOf(data.data!!)
        } else {
            null
        }
        fileChooserCallback?.onReceiveValue(uris)
        fileChooserCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.allowFileAccess = true
        webView.addJavascriptInterface(WebAppInterface(applicationContext), "AndroidBridge")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileChooserCallback = filePathCallback
                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "application/json"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                filePickerLauncher.launch(Intent.createChooser(intent, "Selecionar backup"))
                return true
            }
        }

        webView.loadUrl("file:///android_asset/www/index.html")

        requestLegacyStoragePermissionIfNeeded()
    }

    /**
     * Só é necessário no Android 6 a 9 (API 23-28). No Android 10+ a gravação
     * do backup usa MediaStore, que não exige esta permissão.
     */
    private fun requestLegacyStoragePermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) return
        val granted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.WRITE_EXTERNAL_STORAGE
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            requestPermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* se negada, a exportação de backup mostrará um aviso ao tentar salvar */ }

    override fun onBackPressed() {
        // A navegação entre telas do app já é tratada dentro do próprio
        // JavaScript (botão "voltar" do cabeçalho); aqui só cobrimos o
        // botão físico/gestual de voltar do Android quando o WebView
        // tiver histórico de navegação de página (raro neste app).
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
