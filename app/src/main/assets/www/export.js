/**
 * export.js — Exportação/importação (versão do app Android nativo)
 * -----------------------------------------------------------
 * Dentro de um WebView, o truque de "blob + <a download>" usado na
 * versão web não aciona o gerenciador de downloads do Android. Por
 * isso, aqui a gravação do arquivo é delegada à ponte nativa, que
 * salva diretamente na pasta Downloads do aparelho via MediaStore.
 */

const ExportImport = {
  async exportJSON() {
    const data = await DB.exportAll();
    const filename = `backup_desmame_${todayISO()}.json`;
    const content = JSON.stringify(data, null, 2);
    AndroidBridge.saveFile(filename, content, 'application/json');
  },

  async exportCSV() {
    const records = await DB.getAllRecords();
    const headers = [
      'data',
      'dose_mg',
      'humor',
      'ansiedade',
      'energia',
      'sono',
      'interesse_prazer',
      'irritabilidade',
      'raciocinio',
      'indice_estado_mental',
      'indice_sintomas_retirada',
      'tristeza_causa_identificavel',
      'pensamentos_seguranca',
      'situacoes_do_dia',
      'outros_sintomas',
    ];

    const rows = records.map((r) => {
      const indiceMental = Calc.indiceEstadoMental(r);
      const indiceRetirada = Calc.indiceSintomasRetirada(r);
      return [
        r.date,
        r.doseTaken ?? '',
        r.humor ?? '',
        r.ansiedade ?? '',
        r.energia ?? '',
        r.sono ?? '',
        r.interesse ?? '',
        r.irritabilidade ?? '',
        r.raciocinio ?? '',
        indiceMental ?? '',
        indiceRetirada ?? '',
        r.tristezaCausaIdentificavel === true ? 'sim' : r.tristezaCausaIdentificavel === false ? 'nao' : '',
        r.seguranca === true ? 'sim' : r.seguranca === false ? 'nao' : '',
        csvEscape(r.situacoesTexto || ''),
        csvEscape(r.outrosSintomasTexto || ''),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const filename = `registros_desmame_${todayISO()}.csv`;
    AndroidBridge.saveFile(filename, '\ufeff' + csvContent, 'text/csv');
  },

  /** Lê um arquivo de backup JSON selecionado pelo seletor nativo do Android. */
  async readBackupFile(file) {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('O arquivo selecionado não é um JSON válido.');
    }
    if (parsed.appId !== 'escitalopram_tracker') {
      throw new Error('Este arquivo não parece ser um backup deste aplicativo.');
    }
    return parsed;
  },
};

function csvEscape(text) {
  const t = String(text).replace(/"/g, '""');
  return `"${t}"`;
}
