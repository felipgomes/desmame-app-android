/**
 * stages.js — Gerenciamento das etapas de dose
 * -----------------------------------------------------------
 * Uma "etapa" representa um período em que o usuário manteve
 * (ou planejou manter) uma dose diária específica.
 *
 * Este módulo NÃO decide quando uma nova etapa deve começar.
 * Isso é sempre uma ação manual do usuário na tela "Etapas".
 */

const Stages = {
  /**
   * Retorna a etapa vigente (a de maior startDate cujo endDate esteja vazio,
   * ou, na ausência de uma "aberta", a de startDate mais recente).
   */
  getCurrentStage(stages) {
    if (!stages || stages.length === 0) return null;
    const ordered = [...stages].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    const open = ordered.filter((s) => !s.endDate);
    if (open.length > 0) return open[open.length - 1];
    return ordered[ordered.length - 1];
  },

  /** Etapa imediatamente anterior a uma dada etapa (pela data de início). */
  getPreviousStage(stages, stage) {
    if (!stage) return null;
    const ordered = [...stages].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    const idx = ordered.findIndex((s) => s.id === stage.id);
    if (idx <= 0) return null;
    return ordered[idx - 1];
  },

  /**
   * Monta um objeto de nova etapa a partir dos dados de formulário.
   * Calcula automaticamente o percentual de redução quando houver dose anterior,
   * mas permite que o valor seja sobrescrito manualmente (overridePercent).
   */
  buildStage({ startDate, dose, previousDose, overridePercent, note }) {
    const pctAuto = Calc.percentualReducao(previousDose, dose);
    const reductionPercent =
      overridePercent !== null && overridePercent !== undefined && overridePercent !== ''
        ? Math.round(Number(overridePercent) * 10) / 10
        : pctAuto;
    return {
      startDate,
      endDate: null,
      dose: Math.round(Number(dose) * 100) / 100,
      previousDose:
        previousDose !== null && previousDose !== undefined && previousDose !== ''
          ? Math.round(Number(previousDose) * 100) / 100
          : null,
      reductionPercent,
      note: note || '',
    };
  },

  /**
   * Ao criar uma nova etapa com startDate D, fecha automaticamente
   * (define endDate = dia anterior a D) qualquer etapa aberta anterior.
   * Isso mantém o histórico consistente sem exigir uma ação extra do usuário,
   * mas não decide quando a nova etapa deve ser criada — isso é sempre manual.
   */
  closePreviousOpenStage(stages, newStartDate) {
    const open = stages.find((s) => !s.endDate && s.startDate < newStartDate);
    if (!open) return null;
    const d = new Date(newStartDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { ...open, endDate: `${y}-${m}-${day}` };
  },
};
