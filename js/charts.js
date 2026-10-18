// ============================================================
// charts.js — Gráficos com Chart.js
// ============================================================

const { SETS, sampleSet } = window.FuzzySystem;

const PALETTE = {
  seco:          { line: '#e07b39', fill: 'rgba(224,123,57,0.15)'  },
  intermediario: { line: '#3a9e6b', fill: 'rgba(58,158,107,0.15)' },
  umido:         { line: '#3a7fe0', fill: 'rgba(58,127,224,0.15)' },
  baixa:         { line: '#8b5cf6', fill: 'rgba(139,92,246,0.15)' },
  media:         { line: '#0ea5e9', fill: 'rgba(14,165,233,0.15)' },
  alta:          { line: '#ef4444', fill: 'rgba(239,68,68,0.15)'  },
  curto:         { line: '#3a9e6b', fill: 'rgba(58,158,107,0.18)' },
  medio:         { line: '#0ea5e9', fill: 'rgba(14,165,233,0.18)' },
  longo:         { line: '#e07b39', fill: 'rgba(224,123,57,0.18)' },
  aggregated:    { line: '#6366f1', fill: 'rgba(99,102,241,0.30)' },
  centroid:      '#f43f5e',
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: {
      position: 'top',
      labels: { font: { family: 'Inter', size: 11 }, boxWidth: 14, padding: 10 },
    },
    tooltip: {
      callbacks: {
        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)}`,
      },
    },
  },
  scales: {
    x: {
      type: 'linear',
      grid: { color: 'rgba(148,163,184,0.15)' },
      ticks: { font: { family: 'Inter', size: 10 } },
    },
    y: {
      min: 0, max: 1.05,
      grid: { color: 'rgba(148,163,184,0.15)' },
      ticks: { font: { family: 'Inter', size: 10 }, stepSize: 0.25 },
      title: { display: true, text: 'Pertinência', font: { family: 'Inter', size: 10 } },
    },
  },
};

// ---- helpers ----
function makeDataset(label, points, key, extra = {}) {
  return {
    label,
    data: points.map(p => ({ x: p.x, y: p.y })),
    borderColor: PALETTE[key].line,
    backgroundColor: PALETTE[key].fill,
    fill: true,
    borderWidth: 2,
    pointRadius: 0,
    tension: 0,
    ...extra,
  };
}

function verticalLine(x, yMax, color, label) {
  // Representado como dataset de dois pontos
  return {
    label,
    data: [{ x, y: 0 }, { x, y: yMax }],
    borderColor: color,
    backgroundColor: 'transparent',
    fill: false,
    borderWidth: 2,
    borderDash: [5, 4],
    pointRadius: 0,
    tension: 0,
  };
}

// ============================================================
// Gráfico de Umidade
// ============================================================
let chartUmidade = null;

function buildUmidadeChart(U = null, fuzzyU = null) {
  const ctx = document.getElementById('chartUmidade').getContext('2d');
  if (chartUmidade) chartUmidade.destroy();

  const STEPS = 400;
  const datasets = [
    makeDataset('Seco',          sampleSet(SETS.umidade.seco,          [0,100], STEPS), 'seco'),
    makeDataset('Intermediário', sampleSet(SETS.umidade.intermediario,  [0,100], STEPS), 'intermediario'),
    makeDataset('Úmido',         sampleSet(SETS.umidade.umido,         [0,100], STEPS), 'umido'),
  ];

  if (U !== null) {
    datasets.push(verticalLine(U, 1, '#1e293b', `U = ${U}%`));
  }

  chartUmidade = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      ...JSON.parse(JSON.stringify(CHART_DEFAULTS)),
      plugins: {
        ...JSON.parse(JSON.stringify(CHART_DEFAULTS.plugins)),
        annotation: U !== null && fuzzyU ? {
          annotations: buildMembershipAnnotations(U, fuzzyU, 'umidade', '%'),
        } : {},
      },
      scales: {
        ...JSON.parse(JSON.stringify(CHART_DEFAULTS.scales)),
        x: {
          ...JSON.parse(JSON.stringify(CHART_DEFAULTS.scales.x)),
          min: 0, max: 100,
          title: { display: true, text: 'Umidade (%)', font: { family: 'Inter', size: 10 } },
        },
        y: JSON.parse(JSON.stringify(CHART_DEFAULTS.scales.y)),
      },
    },
  });

  // Atualiza badges de pertinência
  if (fuzzyU) updateBadges('badgeUmidade', fuzzyU);
}

// ============================================================
// Gráfico de Temperatura
// ============================================================
let chartTemp = null;

function buildTempChart(T = null, fuzzyT = null) {
  const ctx = document.getElementById('chartTemp').getContext('2d');
  if (chartTemp) chartTemp.destroy();

  const STEPS = 400;
  const datasets = [
    makeDataset('Baixa', sampleSet(SETS.temperatura.baixa, [10,40], STEPS), 'baixa'),
    makeDataset('Média', sampleSet(SETS.temperatura.media, [10,40], STEPS), 'media'),
    makeDataset('Alta',  sampleSet(SETS.temperatura.alta,  [10,40], STEPS), 'alta'),
  ];

  if (T !== null) {
    datasets.push(verticalLine(T, 1, '#1e293b', `T = ${T}°C`));
  }

  chartTemp = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      ...JSON.parse(JSON.stringify(CHART_DEFAULTS)),
      scales: {
        ...JSON.parse(JSON.stringify(CHART_DEFAULTS.scales)),
        x: {
          ...JSON.parse(JSON.stringify(CHART_DEFAULTS.scales.x)),
          min: 10, max: 40,
          title: { display: true, text: 'Temperatura (°C)', font: { family: 'Inter', size: 10 } },
        },
        y: JSON.parse(JSON.stringify(CHART_DEFAULTS.scales.y)),
      },
    },
  });

  if (fuzzyT) updateBadges('badgeTemp', fuzzyT);
}

// ============================================================
// Gráfico de Saída (conjuntos + agregação + centroide)
// ============================================================
let chartSaida = null;

function buildSaidaChart(activations = null, aggregatedPoints = null, zStar = null, highlightRule = null) {
  const ctx = document.getElementById('chartSaida').getContext('2d');
  if (chartSaida) chartSaida.destroy();

  const STEPS = 600;
  const datasets = [];

  // Conjuntos base (linhas finas)
  datasets.push(makeDataset('Curto', sampleSet(SETS.saida.curto, [0,30], STEPS), 'curto',
    { borderWidth: 1.5, fill: false, borderDash: [3,3] }));
  datasets.push(makeDataset('Médio', sampleSet(SETS.saida.medio, [0,30], STEPS), 'medio',
    { borderWidth: 1.5, fill: false, borderDash: [3,3] }));
  datasets.push(makeDataset('Longo', sampleSet(SETS.saida.longo, [0,30], STEPS), 'longo',
    { borderWidth: 1.5, fill: false, borderDash: [3,3] }));

  // Recorte da regra selecionada (destaque)
  if (activations && highlightRule !== null) {
    const rule = activations[highlightRule];
    if (rule && rule.h > 0) {
      const cutPoints = sampleSet(SETS.saida[rule.outSet], [0,30], STEPS).map(p => ({
        x: p.x, y: Math.min(rule.h, p.y),
      }));
      datasets.push({
        label: `R${highlightRule + 1} recortada`,
        data: cutPoints,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.25)',
        fill: true, borderWidth: 2, pointRadius: 0, tension: 0,
      });
    }
  }

  // Região agregada
  if (aggregatedPoints && aggregatedPoints.length > 0) {
    datasets.push({
      label: 'Área agregada',
      data: aggregatedPoints.map(p => ({ x: p.z, y: p.mu })),
      borderColor: PALETTE.aggregated.line,
      backgroundColor: PALETTE.aggregated.fill,
      fill: true, borderWidth: 2.5, pointRadius: 0, tension: 0,
    });
  }

  // Centroide
  if (zStar !== null) {
    datasets.push(verticalLine(zStar, 1, PALETTE.centroid, `z* = ${zStar.toFixed(2)} min`));
  }

  chartSaida = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      ...JSON.parse(JSON.stringify(CHART_DEFAULTS)),
      scales: {
        ...JSON.parse(JSON.stringify(CHART_DEFAULTS.scales)),
        x: {
          ...JSON.parse(JSON.stringify(CHART_DEFAULTS.scales.x)),
          min: 0, max: 30,
          title: { display: true, text: 'Tempo (min)', font: { family: 'Inter', size: 10 } },
        },
        y: JSON.parse(JSON.stringify(CHART_DEFAULTS.scales.y)),
      },
    },
  });
}

// ============================================================
// Badges de pertinência (indicadores numéricos)
// ============================================================
function updateBadges(containerId, values) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Object.entries(values).map(([k, v]) => {
    const active = v > 0;
    return `<span class="badge ${active ? 'badge-active' : 'badge-zero'}">
      <span class="badge-label">${labelPT(k)}</span>
      <span class="badge-val">${v.toFixed(3)}</span>
    </span>`;
  }).join('');
}

function labelPT(key) {
  const map = {
    seco: 'Seco', intermediario: 'Interm.', umido: 'Úmido',
    baixa: 'Baixa', media: 'Média', alta: 'Alta',
    curto: 'Curto', medio: 'Médio', longo: 'Longo',
  };
  return map[key] || key;
}

function buildMembershipAnnotations(val, fuzzy, type, unit) {
  // Apenas marca horizontal no valor de entrada
  return {};
}

// Exporta
window.Charts = {
  buildUmidadeChart,
  buildTempChart,
  buildSaidaChart,
  updateBadges,
};