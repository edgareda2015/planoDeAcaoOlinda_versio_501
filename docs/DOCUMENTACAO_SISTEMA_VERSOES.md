# Documentação Técnica e Projeto de Versionamento

Este documento foi forjado através da Engenharia Reversa profunda do repositório `planoDeAcaoOlinda_versio_501-main`. O objetivo deste artefato estrutural é garantir que a compreensão dos componentes, banco de dados (Supabase) e fluxo de trabalho atual sejam mantidos.
Possui 4 fases: a constatação da realidade (Fase 1 e 2), a resolução teórica de versão (Fase 3), e a migração segura em tempo real (Fase 4).

---

## FASE 1 — ENGENHARIA REVERSA PROFUNDA

### 1. Arquitetura REAL (Snapshot do Sistema Atual)
O sistema foi construído sobre uma arquitetura **BaaS (Backend as a Service) 1-para-1**, sem camada intermediária (BFF – Backend for Frontend).
- **Cliente:** Single Page Application (SPA) baseada em React (v18), React Router DOM (v6), com `@tanstack/react-query` para gerenciamento de stado/cache via requisições HTTP e WebSockets nativos do Supabase.
- **Backend/DB:** Instância gerenciada do Supabase (PostgreSQL + PostgREST provido nativamente).
- **Relacionamento Central Pivotado:** A arquitetura se assenta inteiramente sobre uma base de `sectors` (tipos: `matricula`, `coordenacao` e `administrativo`), da qual todas as ações e metas convergem pelas chaves `sector_id`.

### 2. Fluxo EXECUTÁVEL (Caminho Crítico Padrão)
Quando qualquer usuário visualiza o roteamento raiz `/` que chama `Acoes.tsx`:
1.  **Entrada:** Componente React é montado e invoca o cache global consumindo `useActions()`.
2.  **Cadeia Supabase:** O React Query demanda uma promise resolvida em `src/integrations/supabase/client.ts` (`fetchActions()`), despachando `supabase.from("actions").select("*, sectors(...)")`.
3.  **Transformação Global:** O dado regressado popula a variável de cache sob a key dependente global `["actions"]`.
4.  **Cadeia Crítica Mutável:** Caso o usuário preencha o modal de ação (Ação Form), o hook `useAddAction` comanda um INSERT. A responsabilidade de *Who Am I* no Banco é entregue ao cliente que injeta dinamicamente `await supabase.auth.getUser()?.id`.
5.  **Reatividade (O Fator de Cache):** Um sucesso emite uma purgação: `queryClient.invalidateQueries(["actions"])`. Essa ação unilateral derruba todo o cache e força uma renderização síncrona com toda a database nova.

### 3. A Dissecação do "Plano de Ação" e sua Limitação Temporal
> [!IMPORTANT]  
> O conceito de um **"Plano de Ação Semestral/Mestre" não existe no banco de dados como Entidade**.

- **Onde nasce?** O "plano" não existe como entidade agregadora isolada. O front-end falsamente agrega as entidades `goals` (metas), `actions` (ações em si) e `action_checklist_items` (subtarefas operacionais), baseando-se todas pelo Sector respectivo.
- **Limites do Sistema e porque "Versionamento" Não Existe:** O modelo lógico assumiu *Linearidade Temporal Infinita*. A Query em L45 do `useActions.ts` chama `.order("created_at")`. Este arquivo puxa tudo. Sempre. Assim que ocorrer a mudança para um semestre novo, as centenas de novos registros irão popular nos componentes React com os registros de meses anteriores em uma grande confusão informacional.

### 4. MODELO DE DADOS REAL ENCONTRADO
Tabelas chaves que compõem o estado vital:
- `goals`: (id, sector_id [FK], target_quantity, achieved_quantity, period_type, period_start_date, period_end_date)
- `actions`: (id, goal_id [FK Nullable], sector_id [FK], description, status, evidence_url, ...)
- `action_checklist_items`: (id, action_id [FK], is_completed)
- `key_actions`: Painel extra de (course, target, action_date, expected_enrollments...)
- `daily_achievements`: Acumulador de tráfego com unicidade extrema combinando data e setor.

### 5. ACOPLAMENTO E PONTOS DE RISCO
1.  **Invalidação Genérica Constante:** Se um ano terminar com 5.000 ações, `fetchActions` fará uma busca global despaginada pesadíssima toda vez que o array sofrer mutação (como marcar completado).
2.  **Chave Estrangeira Opcional String-Null Workaround:** O formulário trabalha o Dropdown de relação enviando a 'string' nula caso falso. Isto gera risco de violação de Foreign Key no Postgres que precisou ser evitado via Hardcode Ternário no Update (`dbUpdateData.goal_id = (goalId === 'null' || !goalId) ? null : goalId;`).

---

## FASE 2 — A MAPA DE MÓDULOS DE NEGÓCIO

| Módulo/Hook              | Dependência Postgres | Propósito Principal                          |
|-------------------------|---------------------|---------------------------------------------|
| **Organizacional**      | `sectors`           | Base atômica para alocação de acessos de tela e metas. |
| **Acompanhamento (Goals)** | `goals`             | Objetivos numéricos (`target_quantity`). Atualizações contínuas de cumprimento numérico do polo ou unidade. |
| **Planejamento Diário** | `actions`           | É a carne da aplicação, suportada pelo seu subtarefamento no módulo Checkout (`action_checklist_items`). |
| **Metas de Captura**    | `key_actions`       | Específico para controle e direcionamento (cursos, expectativas de vendas, matrículas, percentual logístico de orçamento). |

---

## FASE 3 — O PROJETO ARQUITETURAL PARA VERSIONAMENTO

**O Requisito:** Suportar que o projeto receba Semestralidade (Ex: 2026.1 / 2026.2), com dados isolados e navegação controlada e rápida.

> [!CAUTION]
> **A REGRA CRÍTICA DE PRODUÇÃO:**
> O Sistema em operação não pode sofrer "Telas Brancas", Refugas de API 400 Bad Request, nem deleção de dados originais.

### A Filosofia de Adição: Shadow Versioning
Evoluiremos as tabelas de forma não-detrutiva utilizando migrações silenciosas de Back-end (Database).

#### Modificações de Banco
Anexar uma coluna "Default" nativa no banco. Daremos ordens ao banco de dados Supabase de que se não for declarada a intenção temporal do Post, aquilo deverá entrar em uma gaveta nomeada (Legacy).

O Cliente atual do React, desconhecedor desse versionamento (mesmo os celulares com o cache da Build antiga ativos) repassarão formulários velhos. A nuvem tratará amigavelmente e o App **não quebra**.

#### Modificações no Front-End 
O front terá a adição de um componente `VersionSelector` flutuante salvando no `LocalStorage`. As requisições `useActions`, `useGoals` e etc serão convertidas como polimórficas (se recebem o número 2026.1 do React, pedem ao supabase `eq("period_version", 2026.1)`). Nenhuma estrutura atual precisa ser explodida.

---

## FASE 4 — PLANO EXECUTÁVEL SEGURO E PASSOS DE MIGRAÇÃO (PLAYBOOK)

Siga este mapeamento passo-a-passo. É imperativo não seguir para o próximo sem validar.

## STATUS FINAL: CONCLUÍDO ✅
A implementação seguiu o plano de **Shadow Versioning**. 
- Todas as tabelas foram migradas.
- O Frontend foi desacoplado para usar o `VersionContext`.
- A UI foi modernizada com cards na página de Gestão.

Consulte o arquivo `DOCUMENTO_LOGICA_VERSOES.md` para o manual de operação atualizado.

#### PASSO 1: Preparação de Banco Constante Subindo em Silêncio (SQL)
- **O que fazer:** Rodar dentro da rotina de Supabase SQL (ou Migration Panel):
```sql
ALTER TABLE actions ADD COLUMN act_version VARCHAR(10) DEFAULT '2025.1' NOT NULL;
ALTER TABLE goals ADD COLUMN act_version VARCHAR(10) DEFAULT '2025.1' NOT NULL;
ALTER TABLE action_checklist_items ADD COLUMN act_version VARCHAR(10) DEFAULT '2025.1' NOT NULL;
ALTER TABLE daily_achievements ADD COLUMN act_version VARCHAR(10) DEFAULT '2025.1' NOT NULL;
ALTER TABLE key_actions ADD COLUMN act_version VARCHAR(10) DEFAULT '2025.1' NOT NULL;
```
- **O que NÃO será afetado:** Absolutamente nenhum ponto do App. Para o app atual, todos os itens que existiam viraram "2025.1". Aqueles que o usuário continuar inserindo hoje sem que o Front tenha sido versionado também serão carimbados adequadamente com 2025.1, impedindo orfanato de dados.
- **Validação:** Entrar no sistema atualmente em produção. Criar uma nova Meta. Entrar no Banco via dashboard e atestar campo novo auto-preenchido.

#### PASSO 2: Tipagens Dinâmicas (App Source Edit)
- **O que fazer:** Modifique o `ActionSchema.ts`, `GoalSchema.ts` nos Zod Objects para aceitarem `act_version?: string` ou apenas atualize os typings exportados `interface Action` para reconhecer o banco de dados. 

#### PASSO 3: Injeção Segura e Isolada de Filtro nas Queries React
- **O que fazer:** No React Query dos `hooks` que vimos, integre o param. 
- **O que será alterado:** (Ex: `src/hooks/useActions.ts`).
```typescript
// Implementação segura "Optional":
const fetchActions = async (version?: string): Promise<Action[]> => {
  let req = supabase.from("actions").select(`*, sectors(...)`);
  
  // A mágica anti-quebra (se version não vier, ele pode ou tratar full ou ser obrigado num contexto):
  if (version && version !== 'ALL') {
     req = req.eq("act_version", version);
  }
  
  const { data, error } = await req.order("created_at", { ascending: false });
  //... returns
```
- **Comportamento:** Funções antigas sem parâmetro não acionam o IF e sobrevivem. 

#### PASSO 4: Virada Visual (Interface) e Teste Controlado
- **O que fazer:** Criar o Componente `AppVersionHeader` que lê e atualiza algo usando Zustand ou Context no topo do roteamento de `App.tsx`. Use a variável state para repassar o argumento.
- **Como validar que nada quebrou:** Acesse usando conta Teste com o seletor em "2026.1". Painel vazios. Crie uma ação de teste. Mude o menu suspenso para "2025.1"; os milhares de dados de produção devem transbordar novamente pois o filtro buscou a fatia antiga do SQL.
- **Como Reverter:** Em caso de catástrofe React, um Git Revert derrubará a passagem por parâmetro de Frontend e o banco repopulará todas as datas. Sendo impossível a perda de dados. NENHUMA linha de Postgres precisa ser dropada.
