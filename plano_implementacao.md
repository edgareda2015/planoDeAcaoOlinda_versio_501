# Plano de Implementação: RBAC Multi-Unidade (Clerk + Supabase)

Este documento descreve detalhadamente o passo a passo para evoluir a arquitetura do sistema para suportar autenticação híbrida com hierarquia Multi-Unidade (Regional → Unidade), mantendo total **retrocompatibilidade** e cumprindo a restrição principal de **NÃO quebrar o sistema atual**.

---

## 1. Plano de Implementação Detalhado

O plano seguirá a exata ordem proposta de implementação, focando em inserir a camada Clerk de forma adaptativa no ecossistema já existente:

*   **Fase 1: Preparação do Banco de Dados (Supabase)**
    *   **1.1.** Criar tabelas `regionals` e `units` via execução direta no SQL Editor do Supabase ou via *migration*.
    *   **1.2.** Criar e popular os registros iniciais na base atual: "Regional A" e unidade "UNINASSAU Olinda".
    *   **1.3.** Adaptar a tabela `profiles` já existente para acomodar os novos campos (`role`, `regional_id`, `unit_id`, `ativo`).
    *   **1.4.** Realizar um *update* massivo para que **todos os usuários/perfis atuais** fiquem vinculados (via chave estrangeira) à Regional "Regional A" e Unidade "UNINASSAU Olinda", com a role padrão desejada (provavelmente manter acesso que equivalha ao atual, como `admin` ou `diretor`).
    *   **1.5.** Criar os helper functions (`get_user_role`, `get_user_regional_id`, `get_user_unit_id`) no Postgres.

*   **Fase 2: Instalação e Configuração do Clerk**
    *   **2.1.** Instalar o SDK do Clerk (`@clerk/clerk-react`).
    *   **2.2.** Configurar o painel do Clerk (configuração de chaves e de integração JWT template para o Supabase, para que o Clerk injete tokens verificáveis pelo Supabase).
    *   **2.3.** Substituir provedor original ou envolver o App com o `<ClerkProvider>`.
    *   **2.4.** Ajustar a integração (`src/integrations/supabase/client.ts`) para gerar as conexões com o Supabase de forma dinâmica enviando o token JWT injetado pelo Clerk.

*   **Fase 3: Adaptação de Contextos Existentes (Retrocompatibilidade)**
    *   **3.1.** Atualizar o `AuthContext.tsx`. Em vez de buscar a sessão diretamente do `supabase.auth.getSession()`, ele passará a consumir o endpoint/contextual do Clerk e fará uma query adicional baseada em Supabase em `profiles` para buscar a role, unidade e regional.
    *   **3.2.** Como prometido, os exports originais continuarão presentes e funcionais, mas incrementados com as novas informações (`role`, `regional_id`, `unit_id`).

*   **Fase 4: Controle de Acessos Visuais (UI/UX)**
    *   **4.1.** Criar o componente Wrapper genérico `RoleGuard.tsx` para exibição condicional.
    *   **4.2.** Atualizar o componente de `Sidebar.tsx` ou `Header.tsx` (onde ficam os menus), agrupando a visibilidade em torno da propriedade `role` exposta pelo `AuthContext`.

*   **Fase 5: Módulo Administrativo de Usuários**
    *   **5.1.** Criar Edge Functions (`create-user`, `update-user`, `delete-user`) no backend do Supabase em Deno/TS, que invocarão a `service_role_key` e possivelmente a API Backend do Clerk (se necessário manipular os dois simultaneamente) para manter sincronia sem furar RLS.
    *   **5.2.** Criar a tela Frontend `AdminUsuarios.tsx` onde a diretoria ou admins possam cadastrar e alocar novos diretores em regionais/unidades.

*   **Fase 6: Ativação das Políticas RLS (Gradual)**
    *   **6.1.** Adicionar políticas restritivas *Progressively* às tabelas vitais (`acoes`, `metas`). As tabelas passarão a filtrar as views implicitamente (por `unit_id` ou `regional_id`).
    *   **6.2.** Avaliar e depurar falhas *antes* de fechar o RLS complemente para leitura global.

---

## 2. Arquivos que Serão Criados

| Arquivo                             | Propósito                                                                                   |
| :---------------------------------- | :------------------------------------------------------------------------------------------ |
| `/supabase/migrations/xxxx_init.sql` | Script SQL de migração para tabelas, funções e adaptação de dependências do DB (Opcional, viável fazer via UI). |
| `src/components/auth/RoleGuard.tsx` | Componente de controle para envolver áreas do sistema baseadas em Roles e restringir views. |
| `src/pages/AdminUsuarios.tsx`       | Nova tela de cadastro híbrido (Supabase/Clerk) com validações e seletor da árvore Regional/Unidade. |
| `src/hooks/useAdminUsers.ts`        | Novo hook focado especificamente no gerenciamento dos profiles (chamadas nas Edge Functions). |
| `/supabase/functions/create-user/..`| Edge Function Supabase Deno.                                                                |
| `/supabase/functions/update-user/..`| Edge Function Supabase Deno.                                                                |
| `/supabase/functions/delete-user/..`| Edge Function Supabase Deno.                                                                |
| `src/integrations/clerk/index.ts`   | Arquivo de configuração de inicialização e extração de JWT.                                  |

---

## 3. Arquivos que Serão Modificados

| Arquivo                                | Natureza da Modificação                                                                                                                   |
| :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                         | Adição de `@clerk/clerk-react`.                                                                                                           |
| `src/App.tsx` (ou `main.tsx`)          | Adição do wrapper `<ClerkProvider>` circundando os blocos de rotas.                                                                       |
| `src/contexts/AuthContext.tsx`         | Adição da busca do profile e mapeamento das *props*, extração de autenticação a partir do *hook* do Clerk (mantendo a interface).           |
| `src/integrations/supabase/client.ts`  | Alteração para exportar uma infraestrutura ou fábrica de clientes que aceite injetar os Custom JWTs emitidos pelo painel Clerk.              |
| `src/components/Sidebar.tsx`           | Implementação para checar a role exposta no AuthContext original e renderizar itens apropriadamente.                                      |

---

## 4. Riscos de Quebra da Aplicação Atual e Mitigações

1. **Bloqueio Cego (Race Condition) no RLS:** Ao ligarmos Políticas RLS estritas de acesso à estrutura `acoes` ou `metas`, os itens salvos antes das regras (sem regional/unidade correta atrelada) ficariam bloqueados eternamente.
   - **Mitigação:** Vamos rodar *scripts SQL obrigatórios* antes de criar o fluxo Frontend. Todas as `ações` e `metas` atuais, bem como todos os `profiles` atuais, terão as colunas `unit_id` e `regional_id` recebendo a FK da Regional A / Olinda *por padrão*. O RLS só deve ser ativado *depois* da validação por teste de sanidade (*Dry-Run*).

2. **Incompatibilidade Progressiva de Contexto (`AuthContext`):** Como os hooks atuais (`useGoals`, `useActions`) pegam a *ID* e premissas implícitas do AuthContext que confiava somente no Auth original, se substituirmos a camada superficial, falhas silenciosas derrubarão listagens e queries.
   - **Mitigação:** *Monkey Patching Seguro*. Manteremos os antigos exports intocados (`user`, propriedades comuns do antigo Session). O objeto provido pelo Clerk será adaptado de forma camaleônica dentro do AuthContext para imitar *interfaces antigas*. Diferente de reescrever hooks inteiros, nenhum arquivo em `/hooks` mudará nesse aspecto.

3. **Client JWT Assíncrono (`supabase client`):** Ao introduzir Clerk, o Client via Header `Authorization: Bearer ${token}` torna o objeto supabase "assíncrono".
   - **Mitigação:** Implementação do Supabase Client *Interceptor*. Faremos uso do Hook do `@clerk/clerk-react` interativamente repassando o Token JWT injetado nas requests via headers.

4. **Assimetria entre Perfis (Sincronização):** Criação de um registro no Clerk e disparo tardio nas tabelas Supabase. Os componentes front-end vão logar e tentarão encontrar a row do cara em `profiles` e trarão um erro NULL.
   - **Mitigação:** Uso Estrito de Edge Functions. A tela `AdminUsuarios.tsx` NÃO fará chamadas diretas separadas. O lado servidor da Edge coordena de forma atômica o Clerk e o banco. Retorna 100% pronto.
