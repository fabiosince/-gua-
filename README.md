# Água Condomínio V2

V2 preparada para GitHub Pages + Supabase.

## O que entra nesta V2
- login por e-mail e senha;
- banco online;
- 80 unidades + Unidade Principal;
- leitura mensal e cálculo de consumo;
- histórico;
- alertas de leitura inconsistente;
- foto preparada para a próxima camada;
- PWA instalável.

## Configuração
1. Crie um projeto em Supabase.
2. SQL Editor: execute `supabase-schema.sql`.
3. Copie Project URL e chave pública para `config.js`.
4. Crie um usuário pelo aplicativo.
5. No SQL Editor, transforme o usuário em admin:
`update public.profiles set role='admin' where id='UUID_DO_USUARIO';`
6. Envie estes arquivos para o mesmo repositório GitHub e aguarde o GitHub Pages atualizar.

Nunca coloque a chave `service_role` no GitHub.
