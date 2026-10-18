// ============================================================
// ui.js — Interface, controles, validação e stepper
// ============================================================

const { DEFAULT_RULES, runInference, fuzzify, evaluateRules, inferAndDefuzz } = window.FuzzySystem;
const { buildUmidadeChart, buildTempChart, buildSaidaChart, updateBadges } = window.Charts;

// ---- Estado global ----
let state = {
  rules: DEFAULT_RULES.map(r => [...r]),
  result: null,       // resultado completo da inferência
  currentStep: -1,    // -1 = nenhuma etapa rodada
  highlightRule: null,
};

const STEPS = [
  { id: 1, label: 'Fuzzificação',    icon: '①' },
  { id: 2, label: 'Avaliação',       icon: '②' },
  { id: 3, label: 'Implicação',      icon: '③' },
  { id: 4, label: 'Agregação',       icon: '④' },
  { id: 5, label: 'Defuzzificação',  icon: '⑤' },
];

// ---- Leitura de entradas ----
function readInputs() {
  const U   = parseFloat(document.getElementById('inputU').value);
  const T   = parseFloat(document.getElementById('inputT').value);
  const dz  = parseFloat(document.getElementById('inputDz').value);
  return { U, T, dz };
}

// ---- Validação ----
function validate(U, T, dz) {
  if (!isFinite(U) || isNaN(U))        return 'Umidade deve ser um número válido.';
  if (!isFinite(T) || isNaN(T))        return 'Temperatura deve ser um número válido.';
  if (U < 0 || U > 100)               return `Umidade fora do intervalo: ${U}% não está em [0, 100].`;
  if (T < 10 || T > 40)               return `Temperatura fora do intervalo: ${T} °C não está em [10, 40].`;
  if (![0.1, 0.05, 0.01].includes(dz)) return 'Passo Δz inválido.';
  return null;
}

// ---- Sinalizador de resultados desatualizados ----
function markStale() {
  state.result = null;
  state.currentStep = -1;
  state.highlightRule = null;
  document.getElementById('resultBox').classList.add('stale');
  document.getElementById('resultValue').textContent = '—';
  document.getElementById('stepIndicator').querySelectorAll('.step-dot').forEach(d => {
    d.classList.remove('done', 'active');
  });
  clearLog();
}

// ---- Log ao vivo ----
function clearLog() {
  document.getElementById('logPanel').innerHTML =
    '<p class="log-hint">Execute o cálculo ou avance pelas etapas para ver o detalhamento aqui.</p>';
}

function logLine(html) {
  const panel = document.getElementById('logPanel');
  const hint = panel.querySelector('.log-hint');
  if (hint) hint.remove();
  const el = document.createElement('div');
  el.className = 'log-line';
  el.innerHTML = html;
  panel.appendChild(el);
  panel.scrollTop = panel.scrollHeight;
}

function logSection(title) {
  const panel = document.getElementById('logPanel');
  const hint = panel.querySelector('.log-hint');
  if (hint) hint.remove();
  const el = document.createElement('div');
  el.className = 'log-section';
  el.textContent = title;
  panel.appendChild(el);
}

// ---- Renderiza cards de regras ----
function renderRuleCards(activations = null) {
  const container = document.getElementById('ruleCards');
  container.innerHTML = '';

  const labelMap = {
    seco: 'Seco', intermediario: 'Interm.', umido: 'Úmido',
    baixa: 'Baixa', media: 'Média', alta: 'Alta',
    curto: 'Curto', medio: 'Médio', longo: 'Longo',
  };

  state.rules.forEach(([uSet, tSet, outSet], i) => {
    const act = activations ? activations[i] : null;
    const h   = act ? act.h : null;
    const isActive = h !== null && h > 0;
    const isZero   = h !== null && h === 0;

    const card = document.createElement('div');
    card.className = `rule-card ${isActive ? 'rule-active' : ''} ${isZero ? 'rule-zero' : ''}`;
    card.dataset.ruleIdx = i;

    const hBar = h !== null
      ? `<div class="h-bar-track"><div class="h-bar-fill" style="width:${(h * 100).toFixed(1)}%"></div></div>
         <span class="h-val">${h.toFixed(3)}</span>`
      : '';

    card.innerHTML = `
      <div class="rule-header">
        <span class="rule-num">R${i + 1}</span>
        <span class="rule-out tag-${outSet}">${labelMap[outSet]}</span>
      </div>
      <div class="rule-body">
        <span class="rule-ant"><b>${labelMap[uSet]}</b> ∧ <b>${labelMap[tSet]}</b></span>
      </div>
      ${h !== null ? `<div class="rule-activation">${hBar}</div>` : ''}
    `;

    // Seletor de consequente
    const sel = document.createElement('select');
    sel.className = 'rule-sel';
    ['curto', 'medio', 'longo'].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = labelMap[opt];
      if (opt === outSet) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      state.rules[i][2] = sel.value;
      markStale();
      renderRuleCards();
    });
    card.appendChild(sel);

    // Clique para destacar regra no gráfico de saída
    if (isActive) {
      card.addEventListener('click', e => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
        state.highlightRule = (state.highlightRule === i) ? null : i;
        renderRuleCards(state.result?.activations);
        buildSaidaChart(
          state.result?.activations,
          state.result?.aggregatedPoints,
          state.result?.zStar,
          state.highlightRule,
        );
      });
      if (state.highlightRule === i) card.classList.add('rule-highlight');
    }

    container.appendChild(card);
  });
}

// ---- Atualiza indicador de etapas ----
function updateStepIndicator(step) {
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 < step) dot.classList.add('done');
    if (i + 1 === step) dot.classList.add('active');
  });
}

// ---- Executa uma etapa específica ----
function runStep(step, result) {
  const { U, T, dz } = readInputs();
  const { fuzzyInputs, activations, aggregatedPoints, zStar } = result;

  switch (step) {
    case 1: {
      // Fuzzificação
      logSection('① Fuzzificação');
      const fu = fuzzyInputs.umidade;
      const ft = fuzzyInputs.temperatura;
      logLine(`Umidade <b>U = ${U}%</b> → seco = ${fu.seco.toFixed(4)}, intermediário = ${fu.intermediario.toFixed(4)}, úmido = ${fu.umido.toFixed(4)}`);
      logLine(`Temperatura <b>T = ${T} °C</b> → baixa = ${ft.baixa.toFixed(4)}, média = ${ft.media.toFixed(4)}, alta = ${ft.alta.toFixed(4)}`);

      buildUmidadeChart(U, fu);
      buildTempChart(T, ft);
      buildSaidaChart(); // limpa saída
      updateBadges('badgeUmidade', fu);
      updateBadges('badgeTemp', ft);
      break;
    }
    case 2: {
      // Avaliação das regras
      logSection('② Avaliação das regras (E = mínimo)');
      activations.forEach((a, i) => {
        const status = a.h > 0 ? '✓' : '✗';
        logLine(`${status} R${i+1}: min(${a.muU.toFixed(4)}, ${a.muT.toFixed(4)}) = <b>${a.h.toFixed(4)}</b> → ${a.outSet}`);
      });
      renderRuleCards(activations);
      break;
    }
    case 3: {
      // Implicação
      logSection('③ Implicação (recorte dos consequentes)');
      activations.filter(a => a.h > 0).forEach((a, _, arr) => {
        const idx = activations.indexOf(a);
        logLine(`R${idx+1}: consequente <i>${a.outSet}</i> recortado em h = ${a.h.toFixed(4)}`);
      });
      if (activations.every(a => a.h === 0)) {
        logLine('<span style="color:#ef4444">Nenhuma regra ativada — sem saída válida.</span>');
      }
      // Mostra recorte da primeira regra ativa
      const firstActive = activations.findIndex(a => a.h > 0);
      if (firstActive >= 0) {
        state.highlightRule = firstActive;
        renderRuleCards(activations);
      }
      buildSaidaChart(activations, null, null, state.highlightRule);
      break;
    }
    case 4: {
      // Agregação
      logSection('④ Agregação (máximo entre recortes)');
      logLine('Área agregada = max de todos os recortes ativos em cada ponto z.');
      const sample = [0, 3, 7.5, 15, 22.5, 30];
      sample.forEach(z => {
        const pt = aggregatedPoints.find(p => Math.abs(p.z - z) < 0.11);
        if (pt) logLine(`μ(${z}) = ${pt.mu.toFixed(4)}`);
      });
      buildSaidaChart(activations, aggregatedPoints, null, state.highlightRule);
      break;
    }
    case 5: {
      // Defuzzificação
      logSection('⑤ Defuzzificação (centroide)');
      if (zStar === null) {
        logLine('<span style="color:#ef4444">Denominador zero — sem saída agregada válida.</span>');
      } else {
        logLine(`Δz = ${dz} min → N = ${Math.round(30/dz)} pontos`);
        logLine(`Centroide: <b>z* = ${zStar.toFixed(6)} min</b>`);
        logLine(`Exibição: <b>${zStar.toFixed(2)} min</b>`);
        document.getElementById('resultValue').textContent = zStar.toFixed(2);
        document.getElementById('resultBox').classList.remove('stale');
      }
      buildSaidaChart(activations, aggregatedPoints, zStar, state.highlightRule);
      break;
    }
  }
  updateStepIndicator(step);
}

// ---- Calcular tudo de uma vez ----
function calcularTudo() {
  clearLog();
  const { U, T, dz } = readInputs();
  const err = validate(U, T, dz);
  if (err) { showError(err); return; }
  hideError();

  const result = runInference(U, T, state.rules, dz);
  state.result = result;
  state.currentStep = 5;
  state.highlightRule = null;

  // Roda todas as etapas em sequência
  for (let s = 1; s <= 5; s++) runStep(s, result);
}

// ---- Avançar uma etapa ----
function avancarEtapa() {
  const { U, T, dz } = readInputs();
  const err = validate(U, T, dz);
  if (err) { showError(err); return; }
  hideError();

  if (!state.result) {
    state.result = runInference(U, T, state.rules, dz);
    state.currentStep = 0;
  }

  if (state.currentStep >= 5) {
    logSection('— Todas as etapas concluídas. Restaure ou altere as entradas para recalcular. —');
    return;
  }

  state.currentStep++;
  runStep(state.currentStep, state.result);
}

// ---- Restaurar padrão ----
function restaurarPadrao() {
  state.rules = DEFAULT_RULES.map(r => [...r]);
  state.result = null;
  state.currentStep = -1;
  state.highlightRule = null;

  document.getElementById('inputU').value  = 35;
  document.getElementById('sliderU').value = 35;
  document.getElementById('inputT').value  = 30;
  document.getElementById('sliderT').value = 30;
  document.getElementById('inputDz').value = 0.1;

  markStale();
  renderRuleCards();
  buildUmidadeChart();
  buildTempChart();
  buildSaidaChart();
  hideError();
  updateBadges('badgeUmidade', { seco: 0, intermediario: 0, umido: 0 });
  updateBadges('badgeTemp', { baixa: 0, media: 0, alta: 0 });
}

// ---- Mensagens de erro ----
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError() {
  const el = document.getElementById('errorMsg');
  el.style.display = 'none';
}

// ---- Sync sliders ↔ inputs ----
function syncSlider(sliderId, inputId, min, max) {
  const slider = document.getElementById(sliderId);
  const input  = document.getElementById(inputId);

  slider.addEventListener('input', () => {
    input.value = slider.value;
    markStale();
  });
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    if (isFinite(v) && v >= min && v <= max) slider.value = v;
    markStale();
  });
}

// ---- Init ----
function init() {
  syncSlider('sliderU', 'inputU', 0, 100);
  syncSlider('sliderT', 'inputT', 10, 40);

  document.getElementById('inputDz').addEventListener('change', markStale);

  document.getElementById('btnCalcular').addEventListener('click', calcularTudo);
  document.getElementById('btnAvancar').addEventListener('click', avancarEtapa);
  document.getElementById('btnRestaurar').addEventListener('click', restaurarPadrao);

  // Gráficos iniciais (sem dados calculados)
  buildUmidadeChart();
  buildTempChart();
  buildSaidaChart();
  renderRuleCards();
  clearLog();

  // Badges zerados
  updateBadges('badgeUmidade', { seco: 0, intermediario: 0, umido: 0 });
  updateBadges('badgeTemp',    { baixa: 0, media: 0, alta: 0 });
}

document.addEventListener('DOMContentLoaded', init);