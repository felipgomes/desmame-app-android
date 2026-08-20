/**
 * db.js — Camada de armazenamento (versão do app Android nativo)
 * -----------------------------------------------------------
 * Esta versão substitui o IndexedDB por chamadas síncronas à ponte
 * nativa `AndroidBridge`, que grava os dados em SQLite no armazenamento
 * privado do app (nunca limpo automaticamente pelo Android/Chrome).
 *
 * Mantém exatamente a mesma API pública (DB.getRecord, DB.putRecord etc.)
 * usada pelo resto do app (app.js, export.js), envolvendo cada chamada
 * síncrona em uma Promise — nenhum outro arquivo precisa mudar.
 */

function bridgeCall(method, ...args) {
  if (typeof AndroidBridge === 'undefined') {
    throw new Error('AndroidBridge indisponível — este arquivo só funciona dentro do app Android nativo.');
  }
  const raw = AndroidBridge[method](...args);
  if (raw === null || raw === undefined || raw === 'null') return null;
  return JSON.parse(raw);
}

const DB = {
  // ---------- records ----------
  async getRecord(date) {
    return bridgeCall('getRecord', date);
  },

  async putRecord(record) {
    bridgeCall('putRecord', JSON.stringify(record));
    return record;
  },

  async deleteRecord(date) {
    bridgeCall('deleteRecord', date);
  },

  async getAllRecords() {
    const all = bridgeCall('getAllRecords') || [];
    return all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  },

  // ---------- stages ----------
  async getAllStages() {
    const all = bridgeCall('getAllStages') || [];
    return all.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  },

  async putStage(stage) {
    const idStr = bridgeCall('putStage', JSON.stringify(stage));
    return Number(idStr);
  },

  async deleteStage(id) {
    bridgeCall('deleteStage', String(id));
  },

  // ---------- settings ----------
  async getSetting(key) {
    const value = bridgeCall('getSetting', key);
    return value === null ? undefined : value;
  },

  async setSetting(key, value) {
    bridgeCall('setSetting', key, JSON.stringify(value));
  },

  // ---------- manutenção / import-export ----------
  async clearAll() {
    bridgeCall('clearAll');
  },

  async exportAll() {
    return bridgeCall('exportAll');
  },

  async importAll(payload) {
    return bridgeCall('importAll', JSON.stringify(payload));
  },
};
