/**
 * app.js — Controlador principal da interface
 * -----------------------------------------------------------
 * Liga os módulos (db, calc, stages, charts, export) às telas.
 * Este arquivo NÃO calcula nada por conta própria além de montar
 * o que já foi calculado em calc.js/stages.js para exibição.
 */

/* ============================================================
   Dados estáticos de conteúdo (descrições das escalas e sintomas)
   ============================================================ */

const SCALE_LABELS = {
  humor: 'Humor deprimido',
  ansiedade: 'Ansiedade',
  energia: 'Energia / disposição',
  sono: 'Problemas de sono',
  interesse: 'Interesse e prazer',
  irritabilidade: 'Irritabilidade',
  raciocinio: 'Capacidade de raciocínio',
};

const SCALE_DESCRIPTIONS = {
  humor: [
    'Nenhuma tristeza, bem-disposto.',
    'Tristeza leve, mas ainda me sinto bem.',
    'Tristeza moderada, perceptível durante o dia.',
    'Tristeza importante, afetando meu dia.',
    'Tristeza muito intensa, difícil de suportar.',
  ],
  ansiedade: [
    'Nenhuma ansiedade, tranquilo.',
    'Ansiedade leve, sem interferência relevante.',
    'Ansiedade moderada, perceptível durante o dia.',
    'Ansiedade intensa, interferindo no dia.',
    'Ansiedade muito intensa, difícil de controlar.',
  ],
  energia: [
    'Energia normal, disposição muito boa.',
    'Pequena redução de energia.',
    'Energia moderadamente reduzida.',
    'Pouca energia, dificultando atividades.',
    'Exaustão ou falta de energia muito intensa.',
  ],
  sono: [
    'Nenhum problema de sono.',
    'Pequenas alterações, mas sono satisfatório.',
    'Alterações moderadas no sono.',
    'Sono ruim, pouco reparador.',
    'Sono muito ruim ou quase inexistente.',
  ],
  interesse: [
    'Interesse e prazer normais.',
    'Pequena redução do interesse ou prazer.',
    'Redução moderada do interesse ou prazer.',
    'Grande perda de interesse ou prazer.',
    'Quase nenhum interesse ou prazer.',
  ],
  irritabilidade: [
    'Nenhuma irritabilidade incomum.',
    'Irritabilidade leve.',
    'Irritabilidade moderada.',
    'Irritabilidade intensa.',
    'Irritabilidade muito intensa ou difícil de controlar.',
  ],
  raciocinio: [
    'Raciocínio normal, claro e fácil.',
    'Pequena dificuldade de concentração/raciocínio.',
    'Dificuldade moderada.',
    'Dificuldade importante.',
    'Grande dificuldade de raciocínio ou concentração.',
  ],
};

const SYMPTOM_LABELS = [
  ['tontura', 'Tontura'],
  ['desequilibrio', 'Desequilíbrio'],
  ['choqueEletrico', 'Sensação de choque elétrico / "brain zaps"'],
  ['nausea', 'Náusea'],
  ['diarreia', 'Diarreia'],
  ['dorDeCabeca', 'Dor de cabeça'],
  ['sudorese', 'Sudorese aumentada'],
  ['tremores', 'Tremores'],
  ['alteracoesVisuais', 'Alterações visuais'],
  ['sensacaoGripe', 'Sensação semelhante à gripe'],
  ['insonia', 'Insônia'],
  ['sonhosVividos', 'Sonhos muito vívidos ou incomuns'],
  ['irritabilidadeIncomum', 'Irritabilidade incomum'],
  ['agitacao', 'Agitação'],
  ['ansiedadeIncomum', 'Ansiedade incomum'],
  ['chorofacil', 'Choro fácil'],
  ['sensacaoEstranhaCabeca', 'Sensação estranha na cabeça'],
  ['alteracoesSensoriais', 'Alterações sensoriais'],
  ['palpitacoes', 'Palpitações'],
  ['outros', 'Outros (descrever abaixo)'],
];

const SCALE_FIELD_ORDER = ['humor', 'ansiedade', 'energia', 'sono', 'interesse', 'irritabilidade', 'raciocinio'];

/* ============================================================
   Estado da navegação
   ============================================================ */

const NavState = {
  stack: ['home'],
  formContext: {
    recordDate: null,        // data ISO em edição na tela de registro
    recordEditingExisting: false,
    stageEditingId: null,    // id da etapa em edição, ou null para nova
  },
  calendar: {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-indexado
  },
};

const PRIMARY_SCREENS = ['home', 'history', 'evolution', 'calendar', 'more'];

function showScreen(name, { push = true } = {}) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (!target) return;
  target.classList.add('active');

  if (push) {
    if (NavState.stack[NavState.stack.length - 1] !== name) {
      NavState.stack.push(name);
    }
  }

  const isPrimary = PRIMARY_SCREENS.includes(name);
  document.getElementById('btn-back').classList.toggle('hidden', isPrimary);

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  document.getElementById('screen-title').textContent = screenTitle(name);
  window.scrollTo(0, 0);

  // renders sob demanda ao entrar na tela
  if (name === 'home') renderHome();
  if (name === 'history') renderHistory();
  if (name === 'evolution') renderEvolution();
  if (name === 'stages') renderStages();
  if (name === 'calendar') renderCalendar();
  if (name === 'more') renderMore();
}

function screenTitle(name) {
  return {
    home: 'Acompanhamento',
    record: NavState.formContext.recordEditingExisting ? 'Editar registro' : 'Registro diário',
    history: 'Histórico',
    evolution: 'Evolução',
    stages: 'Etapas',
    'stage-form': NavState.formContext.stageEditingId ? 'Editar etapa' : 'Nova etapa',
    calendar: 'Calendário',
    more: 'Mais',
  }[name] || 'Acompanhamento';
}

function goBack() {
  NavState.stack.pop();
  const prev = NavState.stack[NavState.stack.length - 1] || 'home';
  showScreen(prev, { push: false });
}

document.getElementById('btn-back').addEventListener('click', goBack);
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    NavState.stack = [btn.dataset.screen];
    showScreen(btn.dataset.screen, { push: false });
  });
});

/* ============================================================
   Toast e Modal (substituem alert/confirm/prompt nativos)
   ============================================================ */

let toastTimer = null;
function showToast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function showModal({ message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', showCancel = true }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const msgEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    msgEl.textContent = message;
    confirmBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;
    cancelBtn.classList.toggle('hidden', !showCancel);
    overlay.classList.remove('hidden');

    function cleanup(result) {
      overlay.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onConfirm() { cleanup(true); }
    function onCancel() { cleanup(false); }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

/* ============================================================
   TELA: Acompanhamento (Home)
   ============================================================ */

async function renderHome() {
  const [stages, records] = await Promise.all([DB.getAllStages(), DB.getAllRecords()]);
  const currentStage = Stages.getCurrentStage(stages);

  document.getElementById('home-dose').textContent = currentStage
    ? `${currentStage.dose.toFixed(2)} mg/dia`
    : '— sem etapa registrada';

  document.getElementById('home-days').textContent = currentStage
    ? `${Calc.duracaoDias(currentStage.startDate, currentStage.endDate)} dias`
    : '—';

  document.getElementById('home-start').textContent = currentStage
    ? formatDateBR(currentStage.startDate)
    : '—';

  document.getElementById('home-reduction').textContent =
    currentStage && currentStage.reductionPercent !== null && currentStage.reductionPercent !== undefined
      ? `${currentStage.reductionPercent.toFixed(1)}%`
      : '—';

  const lastRecord = records[records.length - 1];
  document.getElementById('home-last-record').textContent = lastRecord ? formatDateBR(lastRecord.date) : 'Nenhum registro ainda';

  const recentList = document.getElementById('home-recent-list');
  recentList.innerHTML = '';
  const recent = [...records].reverse().slice(0, 7);
  if (recent.length === 0) {
    recentList.innerHTML = '<p class="empty-state">Nenhum registro ainda.</p>';
  }
  for (const r of recent) {
    const idx = Calc.indiceEstadoMental(r);
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.innerHTML = `
      <div>
        <div class="recent-item-date">${formatDateBR(r.date)}</div>
        <div class="recent-item-meta">Dose ${r.doseTaken?.toFixed(2) ?? '—'} mg · ${Calc.indiceSintomasRetirada(r)} sintoma(s)</div>
      </div>
      <div class="recent-item-index">${idx !== null ? idx.toFixed(2) : '—'}</div>
    `;
    item.addEventListener('click', () => openRecordForm(r.date));
    recentList.appendChild(item);
  }
}

document.getElementById('btn-new-record').addEventListener('click', () => openRecordForm(todayISO()));

/* ============================================================
   TELA: Registro diário
   ============================================================ */

function buildScaleOptions() {
  document.querySelectorAll('.scale-options').forEach((container) => {
    const field = container.dataset.scale;
    container.innerHTML = '';
    for (let v = 1; v <= 5; v++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scale-option-btn';
      btn.dataset.value = v;
      btn.style.setProperty('--scale-color', `var(--scale-${v})`);
      btn.innerHTML = `<span class="num">${v}</span>`;
      btn.addEventListener('click', () => selectScaleValue(field, v));
      container.appendChild(btn);
    }
    const desc = document.createElement('div');
    desc.className = 'scale-description';
    desc.id = `scale-desc-${field}`;
    container.parentElement.appendChild(desc);
  });
}
buildScaleOptions();

function selectScaleValue(field, value) {
  const container = document.querySelector(`.scale-options[data-scale="${field}"]`);
  container.querySelectorAll('.scale-option-btn').forEach((b) => {
    b.classList.toggle('selected', Number(b.dataset.value) === value);
  });
  container.dataset.selected = value;
  const descEl = document.getElementById(`scale-desc-${field}`);
  descEl.textContent = SCALE_DESCRIPTIONS[field][value - 1];
}

function getScaleValue(field) {
  const container = document.querySelector(`.scale-options[data-scale="${field}"]`);
  const v = container.dataset.selected;
  return v ? Number(v) : null;
}

function buildSymptomsList() {
  const list = document.getElementById('symptoms-list');
  list.innerHTML = '';
  SYMPTOM_LABELS.forEach(([key, label]) => {
    const wrap = document.createElement('label');
    wrap.className = 'symptom-item';
    wrap.innerHTML = `<input type="checkbox" data-symptom="${key}" /><span>${label}</span>`;
    list.appendChild(wrap);
  });
}
buildSymptomsList();

function setupToggleGroup(groupEl) {
  groupEl.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      groupEl.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      groupEl.dataset.selected = btn.dataset.value;
      if (groupEl.dataset.toggle === 'seguranca') {
        document.getElementById('safety-help-message').classList.toggle('hidden', btn.dataset.value !== 'true');
      }
    });
  });
}
document.querySelectorAll('.toggle-group').forEach(setupToggleGroup);

function resetRecordForm() {
  document.getElementById('record-form').reset();
  document.querySelectorAll('.scale-option-btn').forEach((b) => b.classList.remove('selected'));
  document.querySelectorAll('.scale-options').forEach((c) => delete c.dataset.selected);
  document.querySelectorAll('.scale-description').forEach((d) => (d.textContent = ''));
  document.querySelectorAll('.toggle-group').forEach((g) => {
    delete g.dataset.selected;
    g.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('selected'));
  });
  document.getElementById('safety-help-message').classList.add('hidden');
  document.getElementById('record-date-warning').classList.add('hidden');
  document.querySelectorAll('#symptoms-list input[type="checkbox"]').forEach((cb) => (cb.checked = false));
}

async function openRecordForm(dateISO) {
  resetRecordForm();
  NavState.formContext.recordDate = dateISO;
  NavState.formContext.recordEditingExisting = false;

  const dateInput = document.getElementById('record-date');
  dateInput.max = todayISO();
  dateInput.value = dateISO;

  const existing = await DB.getRecord(dateISO);
  if (existing) {
    NavState.formContext.recordEditingExisting = true;
    fillRecordForm(existing);
  } else {
    const defaultDose = await DB.getSetting('currentDoseSuggestion');
    if (defaultDose !== undefined && defaultDose !== null) {
      document.getElementById('record-dose').value = defaultDose;
    } else {
      const stages = await DB.getAllStages();
      const cur = Stages.getCurrentStage(stages);
      if (cur) document.getElementById('record-dose').value = cur.dose;
    }
  }
  showScreen('record');
}

function fillRecordForm(record) {
  document.getElementById('record-dose').value = record.doseTaken ?? '';
  SCALE_FIELD_ORDER.forEach((field) => {
    if (record[field]) selectScaleValue(field, record[field]);
  });
  if (record.tristezaCausaIdentificavel !== undefined && record.tristezaCausaIdentificavel !== null) {
    const g = document.querySelector('[data-toggle="tristezaCausaIdentificavel"]');
    const btn = g.querySelector(`[data-value="${record.tristezaCausaIdentificavel}"]`);
    if (btn) btn.click();
  }
  if (record.seguranca !== undefined && record.seguranca !== null) {
    const g = document.querySelector('[data-toggle="seguranca"]');
    const btn = g.querySelector(`[data-value="${record.seguranca}"]`);
    if (btn) btn.click();
  }
  const symptoms = record.symptoms || {};
  document.querySelectorAll('#symptoms-list input[type="checkbox"]').forEach((cb) => {
    cb.checked = !!symptoms[cb.dataset.symptom];
  });
  document.getElementById('outros-sintomas-texto').value = record.outrosSintomasTexto || '';
  document.getElementById('situacoes-texto').value = record.situacoesTexto || '';
}

document.getElementById('record-date').addEventListener('change', async (e) => {
  const newDate = e.target.value;
  if (!newDate) return;
  if (newDate > todayISO()) {
    showToast('Não é possível registrar uma data futura.');
    e.target.value = NavState.formContext.recordDate || todayISO();
    return;
  }
  const existing = await DB.getRecord(newDate);
  const warningEl = document.getElementById('record-date-warning');
  if (existing && newDate !== NavState.formContext.recordDate) {
    warningEl.textContent = 'Já existe um registro para esta data.';
    warningEl.classList.remove('hidden');
    const editExisting = await showModal({
      message: 'Já existe um registro para esta data. Deseja editar o registro existente?',
      confirmLabel: 'Editar existente',
      cancelLabel: 'Voltar à data anterior',
    });
    if (editExisting) {
      NavState.formContext.recordDate = newDate;
      NavState.formContext.recordEditingExisting = true;
      fillRecordForm(existing);
    } else {
      e.target.value = NavState.formContext.recordDate;
    }
  } else {
    warningEl.classList.add('hidden');
    NavState.formContext.recordDate = newDate;
    NavState.formContext.recordEditingExisting = !!existing;
  }
});

document.getElementById('btn-cancel-record').addEventListener('click', goBack);

document.getElementById('record-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const date = document.getElementById('record-date').value;
  const doseTaken = parseFloat(document.getElementById('record-dose').value);

  if (!date || date > todayISO()) {
    showToast('Selecione uma data válida (não futura).');
    return;
  }
  if (isNaN(doseTaken) || doseTaken < 0) {
    showToast('Informe uma dose válida.');
    return;
  }

  const scaleValues = {};
  for (const field of SCALE_FIELD_ORDER) {
    const v = getScaleValue(field);
    if (v === null) {
      showToast(`Responda: ${SCALE_LABELS[field]}`);
      return;
    }
    scaleValues[field] = v;
  }

  const tristezaGroup = document.querySelector('[data-toggle="tristezaCausaIdentificavel"]');
  const segurancaGroup = document.querySelector('[data-toggle="seguranca"]');

  const symptoms = {};
  document.querySelectorAll('#symptoms-list input[type="checkbox"]').forEach((cb) => {
    symptoms[cb.dataset.symptom] = cb.checked;
  });

  const record = {
    date,
    doseTaken: Math.round(doseTaken * 100) / 100,
    ...scaleValues,
    tristezaCausaIdentificavel: tristezaGroup.dataset.selected === undefined ? null : tristezaGroup.dataset.selected === 'true',
    symptoms,
    outrosSintomasTexto: document.getElementById('outros-sintomas-texto').value.trim(),
    situacoesTexto: document.getElementById('situacoes-texto').value.trim(),
    seguranca: segurancaGroup.dataset.selected === undefined ? null : segurancaGroup.dataset.selected === 'true',
    updatedAt: new Date().toISOString(),
  };
  const existing = await DB.getRecord(date);
  record.createdAt = existing ? existing.createdAt : new Date().toISOString();

  await DB.putRecord(record);
  showToast('Registro salvo.');
  NavState.stack = ['home'];
  showScreen('home', { push: false });
});

/* ============================================================
   TELA: Histórico
   ============================================================ */

let historySortAsc = false; // mais recente primeiro por padrão

async function renderHistory() {
  const records = await DB.getAllRecords();
  const sorted = [...records].sort((a, b) => {
    if (a.date < b.date) return historySortAsc ? -1 : 1;
    if (a.date > b.date) return historySortAsc ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('history-tbody');
  tbody.innerHTML = '';
  document.getElementById('history-empty').classList.toggle('hidden', sorted.length > 0);

  for (const r of sorted) {
    const idx = Calc.indiceEstadoMental(r);
    const retirada = Calc.indiceSintomasRetirada(r);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateBR(r.date)}</td>
      <td>${r.doseTaken?.toFixed(2) ?? '—'}</td>
      <td>${r.humor ?? '—'}</td>
      <td>${r.ansiedade ?? '—'}</td>
      <td>${r.energia ?? '—'}</td>
      <td>${r.sono ?? '—'}</td>
      <td>${r.interesse ?? '—'}</td>
      <td>${r.irritabilidade ?? '—'}</td>
      <td>${r.raciocinio ?? '—'}</td>
      <td>${idx !== null ? idx.toFixed(2) : '—'}</td>
      <td>${retirada}</td>
    `;
    tr.addEventListener('click', () => openRecordForm(r.date));
    tbody.appendChild(tr);
  }
}

document.querySelector('[data-sort="date"]').addEventListener('click', () => {
  historySortAsc = !historySortAsc;
  renderHistory();
});

/* ============================================================
   TELA: Evolução
   ============================================================ */

const SERIES_CONFIG = {
  humor: { label: 'Humor deprimido', color: 'var(--scale-4)', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  ansiedade: { label: 'Ansiedade', color: 'var(--scale-4)', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  energia: { label: 'Energia', color: 'var(--scale-3)', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  sono: { label: 'Problemas de sono', color: 'var(--scale-3)', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  interesse: { label: 'Interesse e prazer', color: 'var(--scale-4)', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  irritabilidade: { label: 'Irritabilidade', color: 'var(--scale-5)', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  raciocinio: { label: 'Capacidade de raciocínio', color: 'var(--scale-3)', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  indiceMental: { label: 'Índice diário de estado mental', color: '#1F6F6B', yMin: 1, yMax: 5, yTicks: [1, 2, 3, 4, 5] },
  indiceRetirada: { label: 'Índice de sintomas de retirada', color: '#A5432B', yMin: 0, yMax: 20, yTicks: [0, 5, 10, 15, 20] },
};

async function renderEvolution() {
  const [records, stages] = await Promise.all([DB.getAllRecords(), DB.getAllStages()]);
  const seriesKey = document.getElementById('evolution-series-select').value;
  const cfg = SERIES_CONFIG[seriesKey];

  const chartEl = document.getElementById('evolution-chart');
  const bandEl = document.getElementById('evolution-dose-band');

  if (records.length === 0) {
    chartEl.innerHTML = '';
    bandEl.innerHTML = '';
    document.getElementById('evolution-empty').classList.remove('hidden');
    return;
  }
  document.getElementById('evolution-empty').classList.add('hidden');

  const allDates = records.map((r) => r.date).concat(stages.map((s) => s.startDate));
  const dateStart = allDates.reduce((a, b) => (a < b ? a : b));
  const dateEndCandidate = allDates.reduce((a, b) => (a > b ? a : b));
  const dateEnd = dateEndCandidate > todayISO() ? dateEndCandidate : todayISO();

  const points = records
    .map((r) => {
      let value;
      if (seriesKey === 'indiceMental') value = Calc.indiceEstadoMental(r);
      else if (seriesKey === 'indiceRetirada') value = Calc.indiceSintomasRetirada(r);
      else value = r[seriesKey];
      if (value === null || value === undefined) return null;
      return { date: r.date, value, dose: r.doseTaken };
    })
    .filter(Boolean);

  Chart.renderLine(chartEl, {
    dateStart,
    dateEnd,
    series: [{ label: cfg.label, color: resolveColor(cfg.color), points }],
    yMin: cfg.yMin,
    yMax: cfg.yMax,
    yTicks: cfg.yTicks,
    ariaLabel: cfg.label,
    onPointTap: (p) => {
      showModal({
        message: `${formatDateBR(p.date)}\n${cfg.label}: ${p.value}\nDose tomada: ${p.dose?.toFixed(2) ?? '—'} mg`,
        showCancel: false,
        confirmLabel: 'Fechar',
      });
    },
  });

  Chart.renderDoseBand(bandEl, {
    dateStart,
    dateEnd,
    stages,
    onSegmentTap: (stage) => {
      const prevTxt =
        stage.reductionPercent !== null && stage.reductionPercent !== undefined
          ? `Redução: ${stage.reductionPercent.toFixed(1)}%`
          : 'Primeira etapa registrada';
      showModal({
        message: `Dose: ${stage.dose.toFixed(2)} mg\nInício: ${formatDateBR(stage.startDate)}\nTérmino: ${stage.endDate ? formatDateBR(stage.endDate) : 'em curso'}\n${prevTxt}`,
        showCancel: false,
        confirmLabel: 'Fechar',
      });
    },
  });
}

function resolveColor(cssVarExpr) {
  if (!cssVarExpr.startsWith('var(')) return cssVarExpr;
  const varName = cssVarExpr.slice(4, -1);
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#1F6F6B';
}

document.getElementById('evolution-series-select').addEventListener('change', renderEvolution);

/* ============================================================
   TELA: Etapas
   ============================================================ */

async function renderStages() {
  const stages = await DB.getAllStages();
  const ordered = [...stages].sort((a, b) => (a.startDate < b.startDate ? 1 : -1)); // mais recente primeiro
  const list = document.getElementById('stages-list');
  list.innerHTML = '';
  document.getElementById('stages-empty').classList.toggle('hidden', ordered.length > 0);

  ordered.forEach((stage, i) => {
    const duracao = Calc.duracaoDias(stage.startDate, stage.endDate);
    const card = document.createElement('div');
    card.className = 'stage-card';
    card.innerHTML = `
      <div class="stage-card-title">${stage.dose.toFixed(2)} mg/dia</div>
      <div class="stage-card-meta">
        Início: ${formatDateBR(stage.startDate)}<br/>
        ${stage.endDate ? `Término: ${formatDateBR(stage.endDate)} · Duração: ${duracao} dias` : `Em curso · Duração: ${duracao} dias`}
      </div>
      ${
        stage.reductionPercent !== null && stage.reductionPercent !== undefined
          ? `<span class="stage-card-badge">Redução de ${stage.reductionPercent.toFixed(1)}%</span>`
          : ''
      }
    `;
    card.addEventListener('click', () => openStageForm(stage.id));
    list.appendChild(card);
  });
}

document.getElementById('btn-open-stages').addEventListener('click', () => showScreen('stages'));
document.getElementById('btn-new-stage').addEventListener('click', () => openStageForm(null));

async function openStageForm(stageId) {
  NavState.formContext.stageEditingId = stageId;
  const form = document.getElementById('stage-form');
  form.reset();
  document.getElementById('btn-delete-stage').classList.toggle('hidden', stageId === null);

  if (stageId !== null) {
    const stages = await DB.getAllStages();
    const stage = stages.find((s) => s.id === stageId);
    if (stage) {
      document.getElementById('stage-start-date').value = stage.startDate;
      document.getElementById('stage-previous-dose').value = stage.previousDose ?? '';
      document.getElementById('stage-dose').value = stage.dose;
      document.getElementById('stage-percent').value = stage.reductionPercent ?? '';
      document.getElementById('stage-note').value = stage.note || '';
    }
  } else {
    const stages = await DB.getAllStages();
    const current = Stages.getCurrentStage(stages);
    document.getElementById('stage-start-date').value = todayISO();
    if (current) document.getElementById('stage-previous-dose').value = current.dose;
  }
  showScreen('stage-form');
}

document.getElementById('btn-cancel-stage').addEventListener('click', goBack);

function recalcStagePercent() {
  const prev = parseFloat(document.getElementById('stage-previous-dose').value);
  const dose = parseFloat(document.getElementById('stage-dose').value);
  if (!isNaN(prev) && !isNaN(dose) && prev > 0) {
    const pct = Calc.percentualReducao(prev, dose);
    document.getElementById('stage-percent').value = pct;
  }
}
document.getElementById('stage-previous-dose').addEventListener('input', recalcStagePercent);
document.getElementById('stage-dose').addEventListener('input', recalcStagePercent);

document.getElementById('stage-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const startDate = document.getElementById('stage-start-date').value;
  const dose = parseFloat(document.getElementById('stage-dose').value);
  const previousDoseRaw = document.getElementById('stage-previous-dose').value;
  const percentRaw = document.getElementById('stage-percent').value;
  const note = document.getElementById('stage-note').value.trim();

  if (!startDate) { showToast('Informe a data de início.'); return; }
  if (isNaN(dose) || dose <= 0) { showToast('Informe uma dose maior que zero.'); return; }

  const stageData = Stages.buildStage({
    startDate,
    dose,
    previousDose: previousDoseRaw === '' ? null : parseFloat(previousDoseRaw),
    overridePercent: percentRaw === '' ? null : percentRaw,
    note,
  });

  if (NavState.formContext.stageEditingId !== null) {
    stageData.id = NavState.formContext.stageEditingId;
    const stages = await DB.getAllStages();
    const original = stages.find((s) => s.id === stageData.id);
    if (original) stageData.endDate = original.endDate;
  }

  const savedId = await DB.putStage(stageData);
  if (NavState.formContext.stageEditingId === null) stageData.id = savedId;

  // fecha automaticamente qualquer etapa aberta anterior a esta (histórico consistente)
  if (NavState.formContext.stageEditingId === null) {
    const stages = await DB.getAllStages();
    const toClose = Stages.closePreviousOpenStage(
      stages.filter((s) => s.id !== stageData.id),
      startDate
    );
    if (toClose) await DB.putStage(toClose);
  }

  showToast('Etapa salva.');
  goBack();
  renderStages();
});

document.getElementById('btn-delete-stage').addEventListener('click', async () => {
  const ok = await showModal({ message: 'Excluir esta etapa? Esta ação não pode ser desfeita.' });
  if (!ok) return;
  await DB.deleteStage(NavState.formContext.stageEditingId);
  showToast('Etapa excluída.');
  goBack();
  renderStages();
});

/* ============================================================
   TELA: Calendário
   ============================================================ */

const WEEKDAYS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

async function renderCalendar() {
  const { year, month } = NavState.calendar;
  document.getElementById('cal-month-label').textContent = `${MONTHS_PT[month]} ${year}`;

  const records = await DB.getAllRecords();
  const recordDates = new Set(records.map((r) => r.date));
  const today = todayISO();

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  WEEKDAYS_PT.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'calendar-dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i++) {
    const el = document.createElement('div');
    el.className = 'calendar-day empty';
    grid.appendChild(el);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'calendar-day';
    if (recordDates.has(iso)) el.classList.add('has-record');
    if (iso === today) el.classList.add('is-today');
    el.textContent = day;
    if (iso <= today) {
      el.addEventListener('click', () => openRecordForm(iso));
    } else {
      el.style.opacity = '0.35';
      el.style.cursor = 'default';
    }
    grid.appendChild(el);
  }
}

document.getElementById('cal-prev').addEventListener('click', () => {
  NavState.calendar.month--;
  if (NavState.calendar.month < 0) { NavState.calendar.month = 11; NavState.calendar.year--; }
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  NavState.calendar.month++;
  if (NavState.calendar.month > 11) { NavState.calendar.month = 0; NavState.calendar.year++; }
  renderCalendar();
});

/* ============================================================
   TELA: Mais (dados, config, privacidade)
   ============================================================ */

async function renderMore() {
  const defaultDose = await DB.getSetting('currentDoseSuggestion');
  document.getElementById('settings-default-dose').value = defaultDose ?? '';
  const theme = (await DB.getSetting('theme')) || 'system';
  document.getElementById('settings-theme').value = theme;
}

document.getElementById('settings-default-dose').addEventListener('change', async (e) => {
  const v = parseFloat(e.target.value);
  if (!isNaN(v) && v >= 0) {
    await DB.setSetting('currentDoseSuggestion', Math.round(v * 100) / 100);
    showToast('Dose padrão atualizada.');
  }
});

document.getElementById('settings-theme').addEventListener('change', async (e) => {
  await DB.setSetting('theme', e.target.value);
  applyTheme(e.target.value);
});

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

document.getElementById('btn-export-json').addEventListener('click', async () => {
  await ExportImport.exportJSON();
  showToast('Backup JSON exportado.');
});

document.getElementById('btn-export-csv').addEventListener('click', async () => {
  await ExportImport.exportCSV();
  showToast('Arquivo CSV exportado.');
});

document.getElementById('import-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const payload = await ExportImport.readBackupFile(file);
    const nRecords = (payload.records || []).length;
    const nStages = (payload.stages || []).length;
    const ok = await showModal({
      message: `Importar backup com ${nRecords} registro(s) e ${nStages} etapa(s)? Registros com a mesma data serão atualizados; etapas duplicadas serão ignoradas.`,
      confirmLabel: 'Importar',
    });
    if (!ok) { e.target.value = ''; return; }
    const result = await DB.importAll(payload);
    showToast(`Importado: ${result.importedRecords} registro(s), ${result.importedStages} etapa(s).`);
    renderHome();
  } catch (err) {
    showToast(err.message || 'Erro ao importar backup.');
  } finally {
    e.target.value = '';
  }
});

document.getElementById('btn-clear-data').addEventListener('click', async () => {
  const ok = await showModal({
    message: 'Isso apagará permanentemente todos os registros, etapas e configurações deste dispositivo. Esta ação não pode ser desfeita. Deseja continuar?',
    confirmLabel: 'Apagar tudo',
  });
  if (!ok) return;
  const confirmAgain = await showModal({
    message: 'Tem certeza mesmo? Considere exportar um backup antes de continuar.',
    confirmLabel: 'Sim, apagar definitivamente',
  });
  if (!confirmAgain) return;
  await DB.clearAll();
  showToast('Todos os dados foram apagados.');
  showScreen('home', { push: false });
});

/* ============================================================
   Inicialização
   ============================================================ */

async function initApp() {
  const theme = await DB.getSetting('theme');
  if (theme) applyTheme(theme);

  document.getElementById('record-date').max = todayISO();
  showScreen('home', { push: false });

  // Neste app nativo os dados ficam em SQLite (armazenamento privado do
  // app), não em IndexedDB — não há service worker nem storage.persist()
  // a pedir aqui, pois esse mecanismo do navegador não se aplica.
}

initApp();
