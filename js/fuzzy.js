// ============================================================
// fuzzy.js — Núcleo do sistema fuzzy Mamdani de irrigação
// ============================================================

// --- Funções de pertinência (trapézio/triângulo linear por partes) ---
function membership(x, a, b, c, d) {
  // Fora do suporte
  if (x < a || x > d) return 0;
  // Plateau central
  if (b <= x && x <= c) return 1;
  // Rampa de subida: a ≤ x < b
  if (x < b) {
    if (a === b) return 1; // intervalo de subida vazio → já é 1
    return (x - a) / (b - a);
  }
  // Rampa de descida: c < x ≤ d
  if (c === d) return 1; // intervalo de descida vazio → já é 1
  return (d - x) / (d - c);
}

// --- Conjuntos fixos ---
const SETS = {
  umidade: {
    seco:          [0,   0,  20,  50],
    intermediario: [20, 50,  50,  80],
    umido:         [50, 80, 100, 100],
  },
  temperatura: {
    baixa: [10, 10, 15, 25],
    media: [15, 25, 25, 35],
    alta:  [25, 35, 40, 40],
  },
  saida: {
    curto: [0,   0,   0,  15],
    medio: [0,  15,  15,  30],
    longo: [15, 30,  30,  30],
  },
};

// --- Base de regras padrão ---
// [umidadeSet, temperaturaSet, saidaSet]
const DEFAULT_RULES = [
  ['seco',          'baixa', 'medio'],  // R1
  ['seco',          'media', 'longo'],  // R2
  ['seco',          'alta',  'longo'],  // R3
  ['intermediario', 'baixa', 'curto'],  // R4
  ['intermediario', 'media', 'medio'],  // R5
  ['intermediario', 'alta',  'longo'],  // R6
  ['umido',         'baixa', 'curto'],  // R7
  ['umido',         'media', 'curto'],  // R8
  ['umido',         'alta',  'curto'],  // R9
];

// ============================================================
// Passo 1 — Fuzzificação
// ============================================================
function fuzzify(U, T) {
  return {
    umidade: {
      seco:          membership(U, ...SETS.umidade.seco),
      intermediario: membership(U, ...SETS.umidade.intermediario),
      umido:         membership(U, ...SETS.umidade.umido),
    },
    temperatura: {
      baixa: membership(T, ...SETS.temperatura.baixa),
      media: membership(T, ...SETS.temperatura.media),
      alta:  membership(T, ...SETS.temperatura.alta),
    },
  };
}

// ============================================================
// Passo 2 — Avaliação das regras (operador E = mínimo)
// ============================================================
function evaluateRules(fuzzyInputs, rules) {
  return rules.map(([uSet, tSet, outSet]) => {
    const muU = fuzzyInputs.umidade[uSet];
    const muT = fuzzyInputs.temperatura[tSet];
    const h   = Math.min(muU, muT);
    return { uSet, tSet, outSet, muU, muT, h };
  });
}

// ============================================================
// Passo 3 — Implicação: recorte do consequente em h
// Passo 4 — Agregação: máximo entre todos os recortes
// Passo 5 — Defuzzificação: centroide por pontos médios
// ============================================================
function inferAndDefuzz(activations, dz) {
  const N    = Math.round(30 / dz);
  let   sumN = 0, sumD = 0;

  // Coleta dos pontos da área agregada para visualização
  const aggregatedPoints = [];

  for (let k = 0; k < N; k++) {
    const z = (k + 0.5) * dz;

    // Agregação: máximo entre os recortes de todas as regras
    let muAgg = 0;
    for (const { outSet, h } of activations) {
      if (h === 0) continue;
      const muConsq = membership(z, ...SETS.saida[outSet]);
      const muCut   = Math.min(h, muConsq);
      muAgg = Math.max(muAgg, muCut);
    }

    aggregatedPoints.push({ z, mu: muAgg });
    sumN += z * muAgg;
    sumD += muAgg;
  }

  if (sumD === 0) return { zStar: null, aggregatedPoints };
  return { zStar: sumN / sumD, aggregatedPoints };
}

// ============================================================
// Função principal de inferência completa
// ============================================================
function runInference(U, T, rules, dz) {
  // Etapa 1
  const fuzzyInputs = fuzzify(U, T);

  // Etapa 2
  const activations = evaluateRules(fuzzyInputs, rules);

  // Etapas 3, 4 e 5
  const { zStar, aggregatedPoints } = inferAndDefuzz(activations, dz);

  return { fuzzyInputs, activations, aggregatedPoints, zStar };
}

// ============================================================
// Utilitários de amostragem de conjuntos para gráficos
// ============================================================
function sampleSet(params, domain, steps = 300) {
  const [min, max] = domain;
  const result = [];
  for (let i = 0; i <= steps; i++) {
    const x = min + (i / steps) * (max - min);
    result.push({ x, y: membership(x, ...params) });
  }
  return result;
}

// Exporta para uso nos outros módulos
window.FuzzySystem = {
  SETS,
  DEFAULT_RULES,
  membership,
  fuzzify,
  evaluateRules,
  inferAndDefuzz,
  runInference,
  sampleSet,
};