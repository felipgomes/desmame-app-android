package com.desmame.tracker

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * DbHelper — armazenamento local em SQLite.
 * -----------------------------------------------------------
 * Usa o armazenamento privado do próprio app (arquivo .db dentro de
 * /data/data/com.desmame.tracker/databases/). O Android só remove esses
 * dados se o usuário desinstalar o app ou limpar manualmente os dados
 * dele em Configurações — nunca por "pressão de espaço" automática,
 * ao contrário do armazenamento de sites usado por um navegador.
 *
 * Cada registro/etapa é guardado como um único blob JSON por linha,
 * espelhando exatamente a estrutura já usada no IndexedDB da versão
 * web — isso mantém o restante do app (calc.js, stages.js, app.js)
 * inalterado.
 */
class DbHelper(context: Context) : SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {

    companion object {
        const val DB_NAME = "escitalopram_tracker.db"
        const val DB_VERSION = 1
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE records (date TEXT PRIMARY KEY, data TEXT NOT NULL)")
        db.execSQL("CREATE TABLE stages (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL)")
        db.execSQL("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Ainda não há migrações — versão 1 é a primeira.
    }

    // ---------------- records ----------------

    fun getRecord(date: String): String? {
        readableDatabase.rawQuery("SELECT data FROM records WHERE date = ?", arrayOf(date)).use { c ->
            return if (c.moveToFirst()) c.getString(0) else null
        }
    }

    fun putRecord(recordJson: String) {
        val obj = JSONObject(recordJson)
        val date = obj.getString("date")
        val values = ContentValues().apply {
            put("date", date)
            put("data", recordJson)
        }
        writableDatabase.insertWithOnConflict("records", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun deleteRecord(date: String) {
        writableDatabase.delete("records", "date = ?", arrayOf(date))
    }

    fun getAllRecords(): JSONArray {
        val arr = JSONArray()
        readableDatabase.rawQuery("SELECT data FROM records", null).use { c ->
            while (c.moveToNext()) arr.put(JSONObject(c.getString(0)))
        }
        return arr
    }

    // ---------------- stages ----------------

    fun getAllStages(): JSONArray {
        val arr = JSONArray()
        readableDatabase.rawQuery("SELECT data FROM stages", null).use { c ->
            while (c.moveToNext()) arr.put(JSONObject(c.getString(0)))
        }
        return arr
    }

    /** Insere (se não tiver "id") ou atualiza (se tiver) uma etapa. Retorna o id. */
    fun putStage(stageJson: String): Long {
        val obj = JSONObject(stageJson)
        val db = writableDatabase
        return if (obj.isNull("id") || !obj.has("id")) {
            obj.remove("id")
            val values = ContentValues().apply { put("data", obj.toString()) }
            val newId = db.insert("stages", null, values)
            obj.put("id", newId)
            val updateValues = ContentValues().apply { put("data", obj.toString()) }
            db.update("stages", updateValues, "id = ?", arrayOf(newId.toString()))
            newId
        } else {
            val id = obj.getLong("id")
            val values = ContentValues().apply { put("data", obj.toString()) }
            db.update("stages", values, "id = ?", arrayOf(id.toString()))
            id
        }
    }

    fun deleteStage(id: String) {
        writableDatabase.delete("stages", "id = ?", arrayOf(id))
    }

    // ---------------- settings ----------------

    fun getSetting(key: String): String? {
        readableDatabase.rawQuery("SELECT value FROM settings WHERE key = ?", arrayOf(key)).use { c ->
            return if (c.moveToFirst()) c.getString(0) else null
        }
    }

    fun setSetting(key: String, valueJson: String) {
        val values = ContentValues().apply {
            put("key", key)
            put("value", valueJson)
        }
        writableDatabase.insertWithOnConflict("settings", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // ---------------- manutenção ----------------

    fun clearAll() {
        writableDatabase.apply {
            delete("records", null, null)
            delete("stages", null, null)
            delete("settings", null, null)
        }
    }
}
