# 📚 Documentação do Sistema de Plano de Ação - Olinda (v5.0.1)

Este documento detalha o funcionamento técnico da arquitetura de acesso e gestão de usuários implementada.

## 1. Arquitetura de Autenticação
O sistema utiliza uma arquitetura híbrida entre **Clerk** (Identidade e Autenticação) e **Supabase** (Banco de Dados e Regras de Negócio).

### Fluxo de Login
1.  O usuário se autentica via Clerk (`Login.tsx`).
2.  O `AuthContext.tsx` captura o token JWT do Clerk.
3.  O sistema valida se o usuário possui um perfil na tabela `public.profiles` do Supabase.
4.  **Auto-Provisionamento**: Caso o usuário exista no Clerk mas não no Supabase, o sistema cria o perfil automaticamente, sincronizando e-mail, nomes e metadados.

## 2. Gestão de Níveis de Acesso (Roles)
O sistema possui 3 níveis de acesso definidos:
*   **`admin`**: Acesso total ao sistema, inclusive à aba "Gestão" para criar e editar usuários. Possui visão global de todas as regionais e unidades.
*   **`diretor_regional`**: Acesso consolidado às metas e ações de todas as unidades da sua regional vinculada. Possui acesso ao **Dashboard de Ações**.
*   **`diretor_unidade`**: Acesso restrito apenas às metas e ações da sua unidade específica.

## 3. Gestão Administrativa de Usuários
A tela de **Gestão > Usuários** (`AdminUsuarios.tsx`) permite o controle total da base:

### Ações Disponíveis:
*   **Convidar Usuário**: Envia um convite via Edge Function, criando a conta no Clerk e provisionando o perfil no Supabase instantaneamente.
*   **Sincronizar com Clerk**: Botão de segurança que varre a base do Clerk e traz para o sistema qualquer usuário que tenha sido criado manualmente ou que esteja faltando na lista.
*   **Editar Perfil**: Permite alterar o papel (role), a Regional e a Unidade do usuário.
    *   **Nota Técnica**: O formulário agora suporta valores nulos para Regional e Unidade, permitindo que administradores globais não precisem estar vinculados a uma estrutura específica.

## 4. Dashboards de Monitoramento

### 4.1 Dashboard Principal (Individual)
Focado no desempenho da unidade atual selecionada ou vinculada ao perfil do usuário.

### 4.2 Dashboard de Ações (Consolidado)
Substituiu o antigo "Dashboard de Apoio". Exclusivo para **Administradores** e **Diretores Regionais**.
*   **Rankings**: Ranking de conversões (matrículas concluídas) e ranking de eficiência (% de conclusão).
*   **Alertas de Engajamento**: Identifica unidades com baixo volume de ações ou que ainda não iniciaram cadastros no período.
*   **Visão de Gestor**: Filtra automaticamente os dados com base no vínculo do usuário (Admin vê tudo, Regional vê suas unidades).

## 5. Infraestrutura (Edge Functions)
Localizadas em `supabase/functions/`, estas funções realizam a ponte entre Supabase e Clerk:

1.  **`invite-clerk-user`**: Cria o usuário no Clerk e o perfil no Supabase.
2.  **`update-user`**: Sincroniza as alterações de metadados (Regional/Unidade/Role) feitas no dashboard com o Clerk.
3.  **`delete-user`**: Remove o usuário de ambas as plataformas simultaneamente.
4.  **`sync-clerk-users`**: Realiza o UPSERT em massa de usuários para garantir integridade da base.

## 6. Banco de Dados (Supabase)
*   **Tabela `profiles`**: Centraliza os dados de acesso.
*   **Segurança (RLS)**: 
    *   Utiliza a função auxiliar `is_admin()` para permitir acesso total a administradores.
    *   **Estado Atual**: Atualmente configurado para acesso facilitado via perfil administrativo, garantindo que usuários não "sumam" da lista durante operações de edição complexas.

---
*Documentação atualizada em: 29 de Abril de 2026 às 19:58*
