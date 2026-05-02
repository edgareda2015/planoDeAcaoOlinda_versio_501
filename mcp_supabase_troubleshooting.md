# Contexto da Correção do Supabase MCP (Atualização de Arquitetura)

## A Falsa Premissa Anterior
Anteriormente, tentamos forçar a inicialização do Supabase MCP usando a linha de comando `npx.cmd @supabase/mcp` e um token pessoal (PAT - Token de Acesso). Descobrimos que este pacote **não existe mais no NPM**. A arquitetura do MCP do Supabase foi fortemente atualizada para um modelo Cloud.

## O Novo Estado Estável
1. Ajustamos a configuração do arquivo `mcp_config.json` de volta para o padrão remoto para não corromper o processo raiz da sua aba de MCP:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "serverUrl": "https://mcp.supabase.com/mcp"
       }
     }
   }
   ```
2. **Nova Autenticação:** A inicialização agora acontece de forma Server-Sent Events (SSE) autenticada exclusivamente o **Fluxo OAuth 2.0 pelo seu navegador**, processo este que é ativado pela interface da IDE ao se instalar/habilitar a ferramenta pela tela da "MCP Store".

## 🛠️ Solução Oficial: Lidando com o Erro "Unauthorized"
Como a conexão depende do fluxo da tela ao invés de linha de comando:
1. Vá até a interface "MCP Store".
2. No card do "Supabase", mude a seleção suspensa de `Disabled` para **`Enabled`**.
3. Clique em **`Refresh`**.
4. **Verifique seu navegador de internet** para garantir que a IDE não acionou a página de autorização de integração do Supabase em segundo plano. Autentique para resolver o acesso.
5. Se nada acontecer ou o erro persistir, desinstale (remova) o Supabase da MCP Store do editor e adicione-o novamente, para forçar o pop-up de permissão.

---

## 🚨 PROMPT DE CONTINGÊNCIA - CASO DÊ ERRO NOVAMENTE
Se você enfrentar problemas do Supabase MCP no futuro ou o erro voltar mesmo após aceitar via navegador, **copie o bloco exato abaixo e me cole para resgatar este contexto estrutural imediato:**

> **MCP Supabase Travado:** "O fluxo de "serverUrl" / Auth do Supabase parou de funcionar e continua marcando erro OAuth / Disabled na MCP Store da IDE."
> *[Lembrete de Contexto MCP para a IA]*: IA, já estabelecemos no passado que não existe mais `npx @supabase/mcp` local. Todo erro atual provém do provedor Auth Cloud `"serverUrl": "https://mcp.supabase.com/mcp"`. Portanto, não me peça para tentar criar variáveis CLI "SUPABASE_ACCESS_TOKEN" via JSON. Precisamos analisar como debugar falhas do sistema Auth Interno da IDE ou se faremos conexões manuais através de CURL se os tokens da sessão MCP Store travarem. Por favor inicie o isolamento do problema a partir daqui.
