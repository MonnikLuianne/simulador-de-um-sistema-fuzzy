# Sistema Fuzzy de Irrigação — Mamdani

**Disciplina:** Inteligência Artificial · UFPI · 2026.2  
**Aplicação:** [GitHub Pages (preencher após publicar)]  
**Repositório:** [GitHub (preencher)]

---

## Autores

*(preencher com nome e matrícula de cada integrante)*

---

## Descrição do Modelo Mamdani

Sistema de inferência fuzzy que recomenda o **tempo de irrigação (0–30 min)** com base em:

- **Umidade do solo U** (0–100%)
- **Temperatura ambiente T** (10–40 °C)

### Funções de pertinência (trapézio/triângulo)

Definidas por quatro pontos `(a, b, c, d)`. μ(x) = 1 quando b ≤ x ≤ c; rampa de subida em [a,b); rampa de descida em (c,d].

| Variável | Conjunto | a | b | c | d |
|---|---|---|---|---|---|
| Umidade (%) | Seco | 0 | 0 | 20 | 50 |
| Umidade (%) | Intermediário | 20 | 50 | 50 | 80 |
| Umidade (%) | Úmido | 50 | 80 | 100 | 100 |
| Temperatura (°C) | Baixa | 10 | 10 | 15 | 25 |
| Temperatura (°C) | Média | 15 | 25 | 25 | 35 |
| Temperatura (°C) | Alta | 25 | 35 | 40 | 40 |
| Tempo (min) | Curto | 0 | 0 | 0 | 15 |
| Tempo (min) | Médio | 0 | 15 | 15 | 30 |
| Tempo (min) | Longo | 15 | 30 | 30 | 30 |

### Base de regras padrão

| Regra | Umidade | Temperatura | Saída |
|---|---|---|---|
| R1 | Seco | Baixa | Médio |
| R2 | Seco | Média | Longo |
| R3 | Seco | Alta | Longo |
| R4 | Intermediário | Baixa | Curto |
| R5 | Intermediário | Média | Médio |
| R6 | Intermediário | Alta | Longo |
| R7 | Úmido | Baixa | Curto |
| R8 | Úmido | Média | Curto |
| R9 | Úmido | Alta | Curto |

### Operadores

- **E (AND):** mínimo
- **Implicação:** recorte (min)
- **Agregação:** máximo
- **Defuzzificação:** centroide por pontos médios (método especificado na atividade)

---

## Instruções de uso

1. Ajuste **Umidade** e **Temperatura** pelos sliders ou campos numéricos.
2. Escolha o **passo Δz** (0,1 / 0,05 / 0,01 min).
3. Clique **▶ Calcular** para inferência completa, ou **→ Avançar etapa** para acompanhar passo a passo.
4. Alterne entre as abas **Umidade / Temperatura / Saída** para ver os gráficos.
5. Clique em um **card de regra ativa** para destacar seu recorte no gráfico de saída.
6. **↺ Restaurar padrão** repõe todas as configurações iniciais.

---

## Bibliotecas auxiliares

| Biblioteca | Versão | Finalidade |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | 4.4.1 | Gráficos dos conjuntos fuzzy e área agregada |

> A inferência Mamdani (fuzzificação, avaliação, implicação, agregação, defuzzificação) foi implementada inteiramente pelos autores em `js/fuzzy.js`, sem uso de biblioteca de lógica fuzzy.

---

## Resultados dos testes de validação

### 6.1 — Pertinências e extremos

| Entrada | Seco | Interm. | Úmido | Baixa | Média | Alta |
|---|---|---|---|---|---|---|
| U=35%, T=30°C | 0,5 | 0,5 | 0 | — | — | — |
| T=30°C | — | — | — | 0 | 0,5 | 0,5 |
| U=0% | 1 | 0 | 0 | — | — | — |
| U=100% | 0 | 0 | 1 | — | — | — |
| T=10°C | — | — | — | 1 | 0 | 0 |
| T=40°C | — | — | — | 0 | 0 | 1 |

**Conclusão:** valores conferidos, sem divisão por zero nos extremos.

### 6.2 — Ativação de regra única

| Entrada | Regra ativa | h | Tempo esperado | Obtido |
|---|---|---|---|---|
| U=20%, T=35°C | R3 (longo) | 1 | ≈25,00 min | *(preencher)* |
| U=50%, T=25°C | R5 (médio) | 1 | 15,00 min | *(preencher)* |
| U=80%, T=25°C | R8 (curto) | 1 | ≈5,00 min | *(preencher)* |

### 6.3 — Inferência completa com sobreposição

**Entrada:** U=35%, T=30°C, base padrão, Δz=0,1

- R2→longo h=0,5; R3→longo h=0,5; R5→médio h=0,5; R6→longo h=0,5
- μagregada: z/15 em [0,7,5]; 0,5 em [7,5,30]
- Tempo esperado: **16,79 min** | Obtido: *(preencher)*

### 6.4 — Simetria e alteração de regras

| Configuração | Resultado esperado | Obtido |
|---|---|---|
| U=35%, T=20°C (padrão) | 15,00 min | *(preencher)* |
| Todas as regras → curto; U=50%, T=25°C | ≈5,00 min | *(preencher)* |
| Após Restaurar padrão; U=35%, T=30°C | 16,79 min | *(preencher)* |

**Efeito do passo Δz (U=35%, T=30°C):**

| Δz | Resultado | Diferença do contínuo (16,785714) |
|---|---|---|
| 0,1 | ≈16,785683 | 0,000031 |
| 0,05 | ≈16,785706 | 0,000008 |
| 0,01 | ≈16,785714 | <0,000001 |

**Análise:** passos menores aproximam o somatório discreto da integral contínua, reduzindo o erro de discretização do centroide.

### 6.5 — Validação da interface

| Entrada inválida | Comportamento esperado | ✓/✗ |
|---|---|---|
| U=−1% | Erro exibido, cálculo bloqueado | *(preencher)* |
| U=101% | Erro exibido, cálculo bloqueado | *(preencher)* |
| T=9°C | Erro exibido, cálculo bloqueado | *(preencher)* |
| T=41°C | Erro exibido, cálculo bloqueado | *(preencher)* |
| Campo vazio | Erro exibido | *(preencher)* |
| Valor não numérico | Erro exibido | *(preencher)* |

---

## Estrutura do repositório

```
fuzzy-irrigation/
├── index.html        # página principal
├── css/
│   └── style.css     # estilos
├── js/
│   ├── fuzzy.js      # núcleo Mamdani (pertinências, regras, inferência)
│   ├── charts.js     # gráficos via Chart.js
│   └── ui.js         # interface, validação, stepper, log
└── README.md
```