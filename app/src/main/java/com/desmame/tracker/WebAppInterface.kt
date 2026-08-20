package com.desmame.tracker

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * WebAppInterface — ponte entre o JavaScript do WebView e o Android nativo.
 * -----------------------------------------------------------
 * Cada método aqui é chamado do lado JS como `AndroidBridge.metodo(...)`
 * (ver db.js e export.js em assets/www/). Os métodos são executados em
 * uma thread de trabalho do WebView (não a thread de UI), então operações
 * de banco de dados aqui não travam a interface.
 *
 * Este arquivo NÃO interpreta nem decide nada sobre os dados — apenas
 * grava, lê e devolve exatamente o que o JavaScript pediu.
 */
class WebAppInterface(private val context: Context) {

    private val db = DbHelper(context)

    // ---------------- records ----------------

    @JavascriptInterface
    fun getRecord(date: String): String? = db.getRecord(date)

    @JavascriptInterface
    fun putRecord(recordJson: String) {
        db.putRecord(recordJson)
    }

    @JavascriptInterface
    fun deleteRecord(date: String) {
        db.deleteRecord(date)
    }

    @JavascriptInterface
    fun getAllRecords(): String = db.getAllRecords().toString()

    // ---------------- stages ----------------

    @JavascriptInterface
    fun getAllStages(): String = db.getAllStages().toString()

    @JavascriptInterface
    fun putStage(stageJson: String): String = db.putStage(stageJson).toString()

    @JavascriptInterface
    fun deleteStage(id: String) {
        db.deleteStage(id)
    }

    // ---------------- settings ----------------

    @JavascriptInterface
    fun getSetting(key: String): String? = db.getSetting(key)

    @JavascriptInterface
    fun setSetting(key: String, valueJson: String) {
        db.setSetting(key, valueJson)
    }

    // ---------------- manutenção / import-export ----------------

    @JavascriptInterface
    fun clearAll() {
        db.clearAll()
    }

    /** Espelha exatamente o formato gerado pela versão web (DB.exportAll em db.js),
     *  para que um backup .json exportado de um app continue importável no outro. */
    @JavascriptInterface
    fun exportAll(): String {
        val out = JSONObject()
        out.put("appId", "escitalopram_tracker")
        out.put("exportVersion", 1)
        out.put("exportedAt", isoNow())
        out.put("records", db.getAllRecords())
        out.put("stages", db.getAllStages())
        val settings = JSONObject()
        val doseSetting = db.getSetting("currentDoseSuggestion")
        val doseValue = if (doseSetting != null) org.json.JSONTokener(doseSetting).nextValue() else JSONObject.NULL
        settings.put("currentDoseSuggestion", doseValue)
        out.put("settings", settings)
        return out.toString()
    }

    @JavascriptInterface
    fun importAll(payloadJson: String): String {
        val payload = JSONObject(payloadJson)
        val records = payload.optJSONArray("records") ?: JSONArray()
        val stages = payload.optJSONArray("stages") ?: JSONArray()

        var importedRecords = 0
        for (i in 0 until records.length()) {
            val r = records.getJSONObject(i)
            if (!r.has("date")) continue
            db.putRecord(r.toString())
            importedRecords++
        }

        val existingStages = db.getAllStages()
        val existingKeys = HashSet<String>()
        for (i in 0 until existingStages.length()) {
            val s = existingStages.getJSONObject(i)
            existingKeys.add(stageKey(s))
        }

        var importedStages = 0
        for (i in 0 until stages.length()) {
            val s = stages.getJSONObject(i)
            if (!s.has("startDate") || !s.has("dose")) continue
            val key = stageKey(s)
            if (existingKeys.contains(key)) continue
            s.remove("id") // deixa o SQLite gerar um novo id
            db.putStage(s.toString())
            existingKeys.add(key)
            importedStages++
        }

        val settings = payload.optJSONObject("settings")
        if (settings != null && !settings.isNull("currentDoseSuggestion")) {
            db.setSetting("currentDoseSuggestion", settings.get("currentDoseSuggestion").toString())
        }

        val result = JSONObject()
        result.put("importedRecords", importedRecords)
        result.put("importedStages", importedStages)
        return result.toString()
    }

    private fun stageKey(s: JSONObject): String {
        val dose = s.optDouble("dose", 0.0)
        return "${s.optString("startDate")}__${"%.2f".format(dose)}"
    }

    private fun isoNow(): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(java.util.Date())
    }

    // ---------------- exportação de arquivos (Downloads) ----------------

    /**
     * Salva um arquivo de texto na pasta Downloads pública do aparelho,
     * usando MediaStore (não exige permissão de armazenamento no Android 10+).
     */
    @JavascriptInterface
    fun saveFile(filename: String, content: String, mimeType: String) {
        try {
            val resolver = context.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
            }
            val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
            val uri = resolver.insert(collection, values)
            if (uri == null) {
                toastOnUiThread("Não foi possível salvar o arquivo.")
                return
            }
            resolver.openOutputStream(uri)?.use { out ->
                out.write(content.toByteArray(Charsets.UTF_8))
            }
            toastOnUiThread("Arquivo salvo em Downloads: $filename")
        } catch (e: Exception) {
            toastOnUiThread("Erro ao salvar arquivo: ${e.message}")
        }
    }

    private fun toastOnUiThread(message: String) {
        val handler = android.os.Handler(context.mainLooper)
        handler.post { Toast.makeText(context, message, Toast.LENGTH_LONG).show() }
    }
}
