# Sistema Fuzzy de Irrigação — Mamdani

## 1. Identificação

| | |
|---|---|
| **Disciplina** | Inteligência Artificial |
| **Instituição** | Universidade Federal do Piauí (UFPI) |
| **Período letivo** | 2026.2 |

**Integrantes do grupo:**

| Nome completo |
|---|
| Monnik Luianne Oliveira Nascimento Veloso Barbosa |
| João Pedro Pereira da Luz |
| Guilherme Ribeiro Nunes Batista |

**Links:**
- Aplicação publicada (GitHub Pages): https://monnikluianne.github.io/simulador-de-um-sistema-fuzzy/
- Repositório público (GitHub): https://github.com/MonnikLuianne/simulador-de-um-sistema-fuzzy

---

## 2. Descrição do Modelo Mamdani

Este projeto implementa um **sistema de inferência fuzzy do tipo Mamdani** que recomenda o tempo de irrigação de um jardim com base em duas variáveis de entrada: a umidade do solo e a temperatura ambiente.

O sistema não simula a dinâmica da água no solo, nem integra sensores ou controla equipamentos físicos. Ele executa as cinco etapas clássicas da inferência fuzzy:

1. **Fuzzificação** — converte os valores numéricos de entrada em graus de pertinência nos conjuntos fuzzy definidos.
2. **Avaliação das regras** — aplica o operador lógico E (mínimo) entre os antecedentes de cada regra para calcular a intensidade de ativação h(r).
3. **Implicação** — recorta o conjunto de saída de cada regra na altura h(r), usando o operador mínimo.
4. **Agregação** — combina todas as saídas recortadas tomando o máximo ponto a ponto, formando a região agregada.
5. **Defuzzificação** — calcula o centroide da região agregada pelo método de pontos médios, produzindo o tempo recomendado em minutos.

### Domínios das variáveis

| Variável | Símbolo | Intervalo |
|---|---|---|
| Umidade do solo | U | 0% a 100% |
| Temperatura ambiente | T | 10 °C a 40 °C |
| Tempo de irrigação | z | 0 a 30 minutos |

---

## 3. Funções de Pertinência

Todas as funções são **trapezoidais/triangulares lineares por partes**, definidas por quatro pontos (a, b, c, d) com a ≤ b ≤ c ≤ d.

**Fórmula:**
- x < a ou x > d → μ(x) = 0
- b ≤ x ≤ c → μ(x) = 1
- a ≤ x < b → μ(x) = (x − a) / (b − a), exceto quando a = b (μ = 1)
- c < x ≤ d → μ(x) = (d − x) / (d − c), exceto quando c = d (μ = 1)

### Umidade do solo (%)

| Conjunto | a | b | c | d | Forma |
|---|---|---|---|---|---|
| Seco | 0 | 0 | 20 | 50 | Trapézio (topo à esquerda) |
| Intermediário | 20 | 50 | 50 | 80 | Triangular |
| Úmido | 50 | 80 | 100 | 100 | Trapézio (topo à direita) |

### Temperatura ambiente (°C)

| Conjunto | a | b | c | d | Forma |
|---|---|---|---|---|---|
| Baixa | 10 | 10 | 15 | 25 | Trapézio (topo à esquerda) |
| Média | 15 | 25 | 25 | 35 | Triangular |
| Alta | 25 | 35 | 40 | 40 | Trapézio (topo à direita) |

### Tempo de irrigação (min) — saída

| Conjunto | a | b | c | d | Forma |
|---|---|---|---|---|---|
| Curto | 0 | 0 | 0 | 15 | Triangular (pico em 0) |
| Médio | 0 | 15 | 15 | 30 | Triangular (pico em 15) |
| Longo | 15 | 30 | 30 | 30 | Triangular (pico em 30) |

### Extremos verificados (sem divisão por zero)

| U | μ(seco) | μ(interm.) | μ(úmido) |
|---|---|---|---|
| 0% | 1 | 0 | 0 |
| 100% | 0 | 0 | 1 |

| T | μ(baixa) | μ(média) | μ(alta) |
|---|---|---|---|
| 10 °C | 1 | 0 | 0 |
| 40 °C | 0 | 0 | 1 |

---

## 4. Base de Regras Padrão

Todas as regras têm dois antecedentes (fixos) ligados por E e um consequente (editável na interface).

| Regra | SE umidade é... | E temperatura é... | ENTÃO tempo é... |
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

**Por que os consequentes são editáveis?** Os antecedentes descrevem a situação do ambiente (fato observável). O consequente representa a decisão do especialista — o que fazer naquela situação. Ao alterar o consequente de uma regra, você está ajustando o comportamento do sistema conforme seu julgamento.

---

## 5. Etapas da Inferência — Explicação Detalhada

### Etapa 1 — Fuzzificação

Converte U e T em seis graus de pertinência (três por variável). Um grau não é probabilidade — os três graus de umidade não precisam somar 1. Eles medem compatibilidade com cada termo linguístico.

**Exemplo:** U = 35%, T = 30 °C
- Umidade: seco = 0,5 | intermediário = 0,5 | úmido = 0
- Temperatura: baixa = 0 | média = 0,5 | alta = 0,5

O solo está simultaneamente 50% seco e 50% intermediário — isso não é contradição, é a essência do fuzzy.

### Etapa 2 — Avaliação das Regras

Cada regra combina dois graus com o operador **E = mínimo**:

> h(r) = min(μ_umidade, μ_temperatura)

Regras com pelo menos um antecedente de grau zero têm h = 0 e não contribuem para a saída.

**Exemplo:** R2 — seco(0,5) E média(0,5) → h = 0,5

### Etapa 3 — Implicação

O conjunto de saída de cada regra ativa é recortado horizontalmente na altura h:

> μ_r(z) = min(h(r), μ_consequente(z))

O recorte limita a contribuição da regra: se h = 0,5, o conjunto "longo" é achatado em 0,5 — tudo acima disso vira 0,5. É o que aparece em amarelo no gráfico ao clicar em uma regra.

### Etapa 4 — Agregação

Todos os recortes são combinados pelo **máximo ponto a ponto**:

> μ_agregada(z) = max(μ_R1(z), ..., μ_R9(z))

Não se somam as contribuições. Três regras com h = 0,5 concluindo "longo" não elevam o teto acima de 0,5. É a área marrom preenchida no gráfico de saída.

### Etapa 5 — Defuzzificação

Calcula o centroide da área agregada pelo método de pontos médios:

- N = 30 / Δz faixas
- z(k) = (k + 0,5) × Δz, com k de 0 até N − 1
- z* = Σ[z(k) × μ_agregada(z(k))] / Σ[μ_agregada(z(k))]

O centroide é o centro de massa da área. Se a área pesa mais à direita, z* será maior — mais tempo de irrigação. É a linha vermelha no gráfico.

---

## 6. Instruções de Execução

### Requisitos
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conexão com internet (para carregar Chart.js e a fonte na primeira vez)
- Nenhuma instalação ou servidor necessário

### Execução local
1. Baixe o arquivo `index.html`
2. Dê dois cliques no arquivo — abre direto no navegador
3. A URL será do tipo: `file:///caminho/para/index.html`

### Execução via GitHub Pages
1. Acesse: https://monnikluianne.github.io/simulador-de-um-sistema-fuzzy/
2. Sem login, sem instalação

### Como usar a interface

| Controle | O que faz |
|---|---|
| Slider / número Umidade | Define U de 0% a 100% (padrão: 35%) |
| Slider / número Temperatura | Define T de 10 °C a 40 °C (padrão: 30 °C) |
| Passo Δz | Escolhe 0,1 / 0,05 / 0,01 min |
| Seletores R1–R9 | Muda o consequente de cada regra |
| ▶ Calcular | Roda toda a inferência de uma vez |
| → Avançar etapa | Roda uma etapa por vez, atualizando gráficos |
| ↺ Restaurar padrão | Volta tudo ao estado inicial |
| Clicar num card de regra ativa | Destaca o recorte daquela regra na aba Saída |

### Entradas inválidas bloqueadas
U < 0, U > 100, T < 10, T > 40, campos vazios e valores não numéricos exibem mensagem de erro e bloqueiam o cálculo. O sistema nunca corrige silenciosamente uma entrada fora do intervalo.

---

## 7. Explicação dos Gráficos

### Aba Umidade
Mostra as três funções de pertinência (Seco, Intermediário, Úmido) sobre o domínio [0%, 100%]. A linha vertical marca o valor de U informado. Os badges abaixo exibem todos os graus numericamente, inclusive os zeros.

**O que observar:** um único valor de U pode pertencer a dois conjuntos ao mesmo tempo, com graus diferentes. Isso é a característica central do fuzzy — fronteiras graduais.

### Aba Temperatura
Mesmo funcionamento para T no domínio [10 °C, 40 °C]. Com T = 30 °C, a linha corta Média em 0,5 e Alta em 0,5 simultaneamente.

### Aba Saída

**Linhas tracejadas** — os conjuntos Curto, Médio e Longo em forma original, sem modificação. São as opções disponíveis de resposta.

**Área marrom preenchida** — a região agregada: resultado de recortar cada conjunto ativado em h e combinar tudo pelo máximo. Representa o conhecimento combinado de todas as regras que dispararam.

**Linha vermelha** — o centroide z*, o centro de massa da área. É o tempo de irrigação final recomendado.

**Destaque amarelo** (ao clicar em um card de regra) — mostra o recorte individual daquela regra, permitindo ver exatamente quanto ela contribuiu para a decisão.

### Pipeline de etapas
A barra no topo (① → ② → ③ → ④ → ⑤) indica qual etapa foi executada por último. "Avançar etapa" percorre cada fase individualmente, atualizando os gráficos e o log progressivamente.

### Log de etapas
Exibe em tempo real: graus de pertinência, ativações de cada regra, pontos de verificação da área agregada e o centroide final com 6 casas decimais de precisão interna.

---

## 8. Resultados dos Testes de Validação

Salvo indicação contrária: base de regras padrão (seção 4) e Δz = 0,1 min. Os valores "obtidos" foram produzidos pela aplicação e conferidos com a tolerância do enunciado (0,000001 para pertinências e ativações; 0,01 min para tempos). Internamente nada é arredondado; só a exibição usa casas decimais.

### 8.1 Pertinências e extremos

| Entrada | Esperado (seco; interm.; úmido) ou (baixa; média; alta) | Obtido | Conclusão |
|---|---|---|---|
| U = 35% | 0,5; 0,5; 0 | 0,5; 0,5; 0 | ✓ |
| T = 30 °C | 0; 0,5; 0,5 | 0; 0,5; 0,5 | ✓ |
| U = 0% | 1; 0; 0 | 1; 0; 0 | ✓ |
| U = 100% | 0; 0; 1 | 0; 0; 1 | ✓ |
| T = 10 °C | 1; 0; 0 | 1; 0; 0 | ✓ |
| T = 40 °C | 0; 0; 1 | 0; 0; 1 | ✓ |

Nenhuma divisão por zero ocorre: o trecho de pertinência 1 é avaliado antes das rampas, e rampas com `a = b` ou `c = d` não são calculadas.

### 8.2 Ativação de uma única regra

| Entrada | Regra ativada | Esperado | Obtido (z*) | Exibido | Conclusão |
|---|---|---|---|---|---|
| U = 20%, T = 35 °C | só R3, h = 1 (longo completo) | ≈ 25,00 min | 24,999889 | 25,00 min | ✓ |
| U = 50%, T = 25 °C | só R5, h = 1 (médio completo) | 15,00 min | 15,000000 | 15,00 min | ✓ |
| U = 80%, T = 25 °C | só R8, h = 1 (curto completo) | ≈ 5,00 min | 5,000111 | 5,00 min | ✓ |

**Conclusão:** os tempos 5 e 25 são os centroides dos triângulos curto e longo (um terço da base a partir do ângulo reto), e não os picos (0 e 30). Por isso, solo úmido não leva a tempo zero neste modelo. A pequena diferença em relação a 5 e 25 vem da aproximação por pontos médios com Δz = 0,1.

### 8.3 Inferência completa com sobreposição

**Entrada:** U = 35%, T = 30 °C, base padrão, Δz = 0,1.

| Etapa | Obtido |
|---|---|
| Fuzzificação | seco = 0,5; intermediário = 0,5; úmido = 0; baixa = 0; média = 0,5; alta = 0,5 |
| Avaliação | R2 = min(0,5; 0,5) = 0,5 → longo; R3 = 0,5 → longo; R5 = 0,5 → médio; R6 = 0,5 → longo; demais = 0 |
| Implicação | médio e longo recortados na altura 0,5 (as três regras que concluem longo não elevam a altura acima de 0,5) |
| Agregação (máximo) | μ(0) = 0; μ(3) = 0,2; μ(7,5) = 0,5; μ(15) = 0,5; μ(30) = 0,5 — ou seja, z/15 em [0; 7,5] e 0,5 em [7,5; 30] |
| Defuzzificação | z* = **16,785683 min**, exibido como **16,79 min** |

**Conclusão:** todos os valores coincidem com a referência. O log da aplicação calcula μ exatamente em cada z conferido.

### 8.4 Simetria, alteração de regras e precisão

| Teste | Esperado | Obtido | Conclusão |
|---|---|---|---|
| U = 35%, T = 20 °C | R1, R2, R4, R5 com h = 0,5; agregação constante 0,5; 15,00 min | R1, R2, R4, R5 = 0,5; agregação 0,5 em todos os pontos; 15,000000 → **15,00 min** | ✓ |
| Todas as regras → curto; U = 50%, T = 25 °C | ≈ 5,00 min | 5,000111 → **5,00 min** | ✓ |
| Restaurar padrão | entradas 35% e 30 °C, Δz = 0,1, base da seção 4 | U = 35, T = 30, Δz = 0,1, regras médio, longo, longo, curto, médio, longo, curto, curto, curto | ✓ |
| Calcular após restaurar | 16,79 min | **16,79 min** | ✓ |

**Efeito do passo Δz** (U = 35%, T = 30 °C; centroide contínuo = 16,785714 min):

| Δz | Esperado | Obtido | Diferença para o contínuo |
|---|---|---|---|
| 0,1 | ≈ 16,785683 | 16,785683 | 0,000031 |
| 0,05 | ≈ 16,785706 | 16,785706 | 0,000008 |
| 0,01 | ≈ 16,785714 | 16,785714 | < 0,000001 |

**Análise:** o método de pontos médios aproxima a integral do centroide por uma soma. O único trecho em que a área agregada não é constante é a rampa z/15 em [0; 7,5], e é ali que surge o erro de discretização. Cada vez que o passo é dividido por 2, o erro cai cerca de 4 vezes (0,000031 → 0,000008), comportamento esperado para pontos médios (erro proporcional a Δz²). Com Δz = 0,01 o resultado já coincide com o contínuo na sexta casa. Com duas casas decimais os três passos exibem 16,79, mas a precisão interna melhora com passos menores.

### 8.5 Validação da interface e determinismo

| Entrada | Comportamento obtido | Conclusão |
|---|---|---|
| U = −1% | "Umidade fora do intervalo: -1% não está em [0, 100]." — cálculo bloqueado | ✓ |
| U = 101% | "Umidade fora do intervalo: 101% não está em [0, 100]." — cálculo bloqueado | ✓ |
| T = 9 °C | "Temperatura fora do intervalo: 9°C não está em [10, 40]." — cálculo bloqueado | ✓ |
| T = 41 °C | "Temperatura fora do intervalo: 41°C não está em [10, 40]." — cálculo bloqueado | ✓ |
| Umidade ou temperatura vazia / não numérica | "… deve ser um número válido." — cálculo bloqueado | ✓ |

Nenhuma entrada é corrigida silenciosamente para o limite mais próximo. Alterar entradas, regras ou Δz limpa o resultado anterior e reinicia a sequência de etapas.

**Determinismo:** repetir a mesma configuração produz os mesmos graus, ativações, área agregada e tempo final. Clicar em **Calcular** ou percorrer as cinco etapas com **Avançar etapa** dá o mesmo resultado (16,79 min no caso 8.3), pois os dois caminhos usam a mesma função de inferência. Os gráficos apenas exibem os valores calculados.

---

## 9. Bibliotecas Utilizadas

| Biblioteca | Versão | Finalidade |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | 4.4.1 | Gráficos das funções de pertinência e área agregada |

Todo o sistema de inferência Mamdani (fuzzificação, avaliação, implicação, agregação e defuzzificação) foi **implementado pelos autores** em JavaScript puro, sem biblioteca de lógica fuzzy.

---

## 10. Estrutura do Repositório

```
simulador-de-um-sistema-fuzzy/
├── index.html    # aplicação completa — HTML, CSS e JavaScript em um único arquivo
└── README.md
```

O núcleo Mamdani (funções `membership`, `fuzzify`, `evaluateRules`, `inferAndDefuzz` e `runInference`) está no início do `<script>` do `index.html`, separado do código dos gráficos e da interface.
