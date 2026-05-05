# 📚 Documentação do Sistema de Plano de Ação - Olinda (v5.1.0)

Este documento detalha o funcionamento técnico da arquitetura de acesso e gestão de usuários implementada.

## 1. Arquitetura de Autenticação
O sistema utiliza uma arquitetura híbrida entre **Clerk** (Identidade e Autenticação) e **Supabase** (Banco de Dados e Regras de Negócio).

### 1.1 Localização e Comunicação
*   **Interface em Português**: O front-end utiliza `@clerk/localizations` (pt-BR) para garantir que todos os componentes de autenticação estejam no idioma nativo.
*   **E-mails Personalizados e Premium**: Todos os e-mails automáticos do Clerk (Redefinição de senha, Códigos de verificação, Confirmação de alteração, Convites) foram traduzidos e redesenhados com um padrão visual de alta qualidade. Utiliza-se **Inline CSS** para garantir que o design (cabeçalhos coloridos, boxes de código destacados) seja renderizado corretamente em todos os clientes de e-mail (Gmail, Outlook, etc).

### 1.2 Fluxo de Login Simplificado
1.  O usuário se autentica via Clerk (`Login.tsx`).
2.  **Acesso Direto**: Para garantir a agilidade operacional exigida pela rede, o fluxo de Segundo Fator (2FA/MFA) foi removido do processo de login padrão, permitindo entrada imediata com e-mail e senha.
3.  **Recuperação de Senha**: O sistema mantém o fluxo de segurança apenas para casos de esquecimento de senha, enviando códigos de verificação via e-mail.
4.  O `AuthContext.tsx` captura o token JWT do Clerk.
5.  O sistema valida se o usuário possui um perfil na tabela `public.profiles` do Supabase.
6.  **Auto-Provisionamento**: Caso o usuário exista no Clerk mas não no Supabase, o sistema cria o perfil automaticamente, sincronizando e-mail, nomes e metadados.

## 2. Gestão de Níveis de Acesso (Roles) e Isolamento
O sistema possui 3 níveis de acesso definidos:
*   **`admin`**: Acesso total ao sistema, inclusive à aba "Gestão" para criar e editar usuários. Possui visão global de todas as regionais e unidades.
*   **`diretor_regional`**: Acesso consolidado às metas e ações de todas as unidades da sua regional vinculada. Possui acesso ao **Dashboard de Ações**.
*   **`diretor_unidade`**: Acesso restrito apenas às metas e ações da sua unidade específica.

### 2.1 Isolamento de Dados por Unidade
O sistema foi projetado para garantir que dados de uma unidade jamais sejam acessados por outra.
*   **Ações e Metas**: Isoladas por `unit_id`.
*   **Links Úteis**: Isolados nativamente. Cada unidade possui sua própria lista de links úteis. A tela lê a unidade ativa e bloqueia a visualização e cadastro de links de outras localidades (Garantindo que a unidade OLINDA só veja os links de OLINDA, por exemplo).

## 3. Gestão Administrativa de Usuários
A tela de **Gestão > Usuários** (`AdminUsuarios.tsx`) permite o controle total da base:

### Ações Disponíveis:
*   **Convidar Usuário**: Envia um convite via Edge Function, criando a conta no Clerk e provisionando o perfil no Supabase instantaneamente.
*   **Sincronizar com Clerk**: Botão de segurança que varre a base do Clerk e traz para o sistema qualquer usuário que tenha sido criado manualmente ou que esteja faltando na lista.
*   **Editar Perfil**: Permite alterar o papel (role), a Regional e a Unidade do usuário. Suporta valores nulos para Regional e Unidade para administradores globais.
*   **Exclusão Robusta**: Botão de lixeira acoplado a um `AlertDialog` nativo do sistema que remove o usuário completamente de ambas as bases de dados (Clerk e Supabase Profiles) via Edge Function, garantindo limpeza sem deixar rastros.

## 4. Padronização Operacional e UI/UX
*   **Renomeação do Setor Comercial**: O setor anteriormente identificado como "Matrícula" foi renomeado em todo o sistema para **"Comercial / QG"**, alinhando a nomenclatura digital à terminologia usada fisicamente nas unidades.
*   **Modais e Alertas Customizados**: Uso extensivo de componentes Radix/Shadcn UI (`AlertDialog`, `Dialog`) para substituir popups de navegador antigos (`window.confirm`), garantindo imersão e estética premium.
*   **Kanban Board**: Sistema Drag-and-Drop robusto para gestão visual de status das ações (`A FAZER`, `FAZENDO`, `CANCELADO`, `FINALIZADO`), com as cores dos cabeçalhos perfeitamente sincronizadas com a identidade das colunas para melhor ergonomia visual.

## 5. Dashboards de Monitoramento

### 5.1 Dashboard Principal (Individual)
Focado no desempenho da unidade atual selecionada ou vinculada ao perfil do usuário.

### 5.2 Dashboard de Ações (Funil de Vendas)
Exclusivo para **Administradores** e **Diretores Regionais**, o dashboard foi atualizado para um modelo de 3 camadas:
1.  **Lead Esperado**: Meta inicial de captação.
2.  **Lead Real**: Volume de interessados captados durante a ação.
3.  **Matrícula Efetivada**: Resultado final de conversão (venda concluída).

*   **Rankings de Performance**: O ranking principal agora é baseado nas **Matrículas Efetivadas**, premiando as unidades que convertem melhor os leads em alunos reais.
*   **Taxa de Conversão**: Calculada dinamicamente como `Matrículas Efetivadas / Lead Esperado`.
*   **Alertas de Engajamento**: Identifica unidades com baixo volume de ações ou que ainda não iniciaram cadastros no período.

## 6. Infraestrutura (Edge Functions)
Localizadas em `supabase/functions/`, estas funções realizam a ponte entre Supabase e Clerk:

1.  **`invite-clerk-user`**: Cria o usuário no Clerk e o perfil no Supabase.
2.  **`update-user`**: Sincroniza as alterações de metadados (Regional/Unidade/Role) feitas no dashboard com o Clerk.
3.  **`delete-user`**: Remove o usuário de ambas as plataformas simultaneamente.
4.  **`sync-clerk-users`**: Realiza o UPSERT em massa de usuários para garantir integridade da base.

## 7. Banco de Dados (Supabase)
*   **Estrutura Central**: Tabelas como `profiles`, `actions`, `goals` e `useful_links` formam a base.
*   **Sincronização Automática (Dia a Dia -> Metas)**: Implementada uma **Trigger SQL** (`trigger_update_goal_achieved_quantity`) que monitora a tabela `daily_achievements`. Sempre que um lançamento diário é inserido, editado ou excluído, o sistema recalcula automaticamente a soma e atualiza o campo `achieved_quantity` na tabela `goals` correspondente ao setor, unidade e período. Isso elimina a necessidade de dupla digitação pelo usuário.
*   **Status Padronizado**: As ações possuem status rigorosamente tipados (`planning`, `partial`, `completed`, `cancelled`).
*   **Segurança (RLS)**: Preparado para implementação futura de regras rigorosas, com funções auxiliares como `is_admin()`.

---
*Documentação atualizada em: 05 de Maio de 2026*
