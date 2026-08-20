/**
 * calc.js — Funções matemáticas puras
 * -----------------------------------------------------------
 * Nenhuma função aqui interpreta, diagnostica ou recomenda.
 * Apenas calcula números a partir dos dados informados pelo usuário.
 */

const MENTAL_STATE_FIELDS = [
  'humor',
  'ansiedade',
  'energia',
  'sono',
  'interesse',
  'irritabilidade',
  'raciocinio',
];

const SYMPTOM_KEYS = [
  'tontura',
  'desequilibrio',
  'choqueEletrico',
  'nausea',
  'diarreia',
  'dorDeCabeca',
  'sudorese',
  'tremores',
  'alteracoesVisuais',
  'sensacaoGripe',
  'insonia',
  'sonhosVividos',
  'irritabilidadeIncomum',
  'agitacao',
  'ansiedadeIncomum',
  'chorofacil',
  'sensacaoEstranhaCabeca',
  'alteracoesSensoriais',
  'palpitacoes',
  'outros',
];

const Calc = {
  /**
   * Índice diário de estado mental = média simples das 7 escalas (1 a 5).
   * 1 = melhor estado registrado · 5 = pior estado registrado.
   * Retorna null se algum campo estiver ausente (não calcula com dados incompletos).
   */
  indiceEstadoMental(record) {
    let sum = 0;
    for (const field of MENTAL_STATE_FIELDS) {
      const v = record[field];
      if (typeof v !== 'number' || v < 1 || v > 5) return null;
      sum += v;
    }
    const media = sum / MENTAL_STATE_FIELDS.length;
    return Math.round(media * 100) / 100; // 2 casas decimais
  },

  /**
   * Índice de sintomas de retirada = contagem simples de checkboxes marcados.
   * 'outros' só conta se o campo de texto livre correspondente não estiver vazio.
   */
  indiceSintomasRetirada(record) {
    const symptoms = record.symptoms || {};
    let count = 0;
    for (const key of SYMPTOM_KEYS) {
      if (key === 'outros') {
        if (symptoms.outros && (record.outrosSintomasTexto || '').trim().length > 0) count++;
        continue;
      }
      if (symptoms[key]) count++;
    }
    return count;
  },

  /**
   * Percentual de redução em relação à dose anterior.
   * redução% = ((doseAnterior - doseNova) / doseAnterior) * 100
   * Retorna null se doseAnterior for 0/ausente (primeira etapa, sem etapa anterior).
   */
  percentualReducao(doseAnterior, doseNova) {
    if (doseAnterior === null || doseAnterior === undefined || doseAnterior <= 0) return null;
    const pct = ((doseAnterior - doseNova) / doseAnterior) * 100;
    return Math.round(pct * 10) / 10; // 1 casa decimal
  },

  /**
   * Duração em dias entre startDate (inclusive) e endDate (ou hoje, se em curso).
   * Datas no formato 'YYYY-MM-DD'. Dia 1 = dia de início.
   */
  duracaoDias(startDate, endDate) {
    const start = new Date(startDate + 'T00:00:00');
    const end = endDate ? new Date(endDate + 'T00:00:00') : new Date(todayISO() + 'T00:00:00');
    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays + 1; // inclusivo
  },
};

/** Data de hoje no formato 'YYYY-MM-DD', em fuso local. */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Converte 'YYYY-MM-DD' para 'DD/MM/AAAA' para exibição. */
function formatDateBR(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
