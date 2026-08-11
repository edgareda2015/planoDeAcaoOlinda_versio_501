# Documentação do Sistema - Plano de Ação Olinda

## Configuração MCP Supabase

### Projeto Conectado
- **Nome MCP**: supabase-planodeacao
- **PROJECT_REF**: kmdihubvvsmmleswbbrd
- **URL MCP**: https://mcp.supabase.com/mcp?project_ref=kmdihubvvsmmleswbbrd&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching
- **Tipo**: Remoto
- **Status**: Habilitado
- **Modo**: Read-only

### Permissões
- Acesso apenas para leitura
- Sem permissões de escrita, edição ou exclusão
- Autenticação via token de acesso oficial

### Resultado do Teste de Conexão
- **Data do teste**: 2026-08-11
- **Status**: ✅ Conexão estabelecida com sucesso

#### Tabelas Encontradas
- **Total**: 46 tabelas no schema public
- **RLS Habilitado**: 45 tabelas
- **RLS Desabilitado**: 1 tabela (internato_disciplinas)

#### Principais Tabelas
- profiles, user_roles, preceptores, ies, cursos, semestres
- periodos, disciplinas, internatos, locais, setores
- escalas, presencas, calculos, pagamentos
- configuracoes, audit_logs

#### Migrations
- **Total**: 76 migrations aplicadas
- **Última migration**: 039_fix_exclusao_usuario_preservando_auditoria (2026-08-10)

#### Edge Functions
- admin-create-user (v5)
- admin-reset-access (v1)
- admin-delete-user (v2)

#### Advisory de Segurança
- **Severidade**: CRÍTICA
- **Tabela afetada**: internato_disciplinas
- **Problema**: RLS desabilitado
- **Recomendação**: Habilitar RLS e criar políticas de acesso

### Configuração Local
- **Arquivo**: C:\Users\V3L0Z\.config\opencode\opencode.json
- **Backup**: Criado antes da alteração

### Observações
1. Conexão configurada em modo read-only para validação
2. Nenhum dado foi criado, editado ou excluído durante os testes
3. Token de acesso não armazenado em文档ação por segurança
4. Próximo passo: Habilitar RLS na tabela internato_disciplinas