# Manual de Lógica de Versionamento (Semestralidade)

Este documento descreve o funcionamento do sistema de isolamento de dados por semestre (ex: 2026.1, 2026.2) implementado em Abril de 2026.

## 1. O Conceito: Shadow Versioning
O sistema utiliza uma abordagem de "Versionamento Silencioso". Todos os dados no banco possuem uma coluna `period_version` que identifica a qual período letivo aquele registro pertence. Isso permite que um único banco de dados contenha anos de histórico sem que os dados se misturem na interface.

## 2. Estrutura do Banco de Dados (Supabase)
As seguintes tabelas foram atualizadas com a coluna `period_version` (VARCHAR 10):
- `actions`
- `goals`
- `action_checklist_items`
- `daily_achievements`
- `key_actions`
- `action_plans`

**Dados Legados:** Todo dado criado antes da implementação foi automaticamente migrado para a versão `2026.1` para garantir continuidade.

## 3. Fluxo de Estado (Frontend)
### Gerenciamento de Versão: `VersionContext.tsx`
O estado da versão ativa (`activeVersion`) é gerenciado globalmente. 
- **Persistência:** O semestre selecionado é salvo no `localStorage` do navegador com a chave `app_version`.
- **Início:** O sistema inicia por padrão em `2026.1`.

### Filtragem Automática: Hooks (`useActions`, `useGoals`, etc)
Todos os hooks de busca de dados (React Query) agora aceitam a `activeVersion` como parte da `queryKey`. Isso significa que:
1. Quando você troca o semestre, o React Query percebe a mudança de chave.
2. Ele invalida o cache antigo e dispara uma nova requisição ao Supabase.
3. A requisição inclui o filtro `.eq("period_version", activeVersion)`.

## 4. Interface de Usuário (UI/UX)
### Central de Comando: `Admin.tsx`
A troca de semestres foi removida das barras laterais de navegação para evitar erros. Agora, ela reside exclusivamente na aba **Configurações** da página de **Gestão**.
- **Cards Visuais:** Cada semestre é representado por um card interativo.
- **Vista Geral:** Existe uma opção especial "Ver Tudo" que ignora o filtro de versão, útil para auditorias completas.

### Barra Lateral (`Sidebar.tsx`)
Exibe apenas um display estático informativo do semestre atual, com um indicador visual (pulse) para confirmar que o sistema está operando no período correto.

## 5. Identidade Visual Dinâmica
### Lógica de Cores: O "Ângulo de Ouro"
Para evitar que semestres sequenciais tenham cores parecidas, o sistema utiliza a constante matemática de **137.508° (Golden Angle)**.
- **Fórmula:** `hue = (numVersao * 137.508) % 360`
- **Resultado:** Cada novo semestre (2026.1, 2026.2, 2027.1...) ganha uma cor visualmente distinta e contrastante de forma automática.
- **Implementação:** As cores são injetadas dinamicamente como variáveis CSS (`--primary`) através do `VersionContext.tsx`.

### Branding (Identity)
- **Logo:** O sistema utiliza a logo oficial da **UNINASSAU** na Sidebar.
- **Favicon:** Atualizado para o brasão oficial no `index.html`.
- **Estética:** O fundo do ícone na Sidebar é branco para garantir legibilidade contra as cores dinâmicas do tema.

## 6. Configurações de Deploy (Vercel)
O projeto inclui um arquivo `vercel.json` na raiz que configura **Rewrites**. Isso garante que, se o usuário atualizar a página em uma rota interna (como `/dashboard`), o servidor redirecione para o `index.html`, evitando o erro 404.

## 7. Manutenção Futura
Para adicionar novos anos à lista de seleção (ex: pós 2035), basta alterar a constante `SEMESTERS` no arquivo `Admin.tsx`. 
- **Sem Manutenção de Cores:** Não é necessário definir cores para novos anos; o algoritmo do Ângulo de Ouro cuidará disso infinitamente.

---
**Status da Implementação:** CONCLUÍDO e PUBLICADO (GitHub/Vercel - Abril/2026)
