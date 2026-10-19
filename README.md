# Aprova IF

Aplicação web de simulados para preparação para o ingresso no Instituto Federal Catarinense (IFC).

## Requisitos

- [Bun](https://bun.sh/) instalado.
- Node não é necessário para executar o servidor; o projeto usa `bun:sqlite` e `Bun.password`.

## Como executar

Na pasta raiz do projeto:

```bash
bun install
bun run dev
```

Abra http://localhost:3000 no navegador. As páginas de cadastro e login ficam em `/cadastro` e `/login`.

## Cadastro e login

- Cadastro exige nome, e-mail válido e senha com pelo menos 8 caracteres.
- O servidor normaliza e-mail para minúsculas, valida os dados e rejeita e-mails já cadastrados.
- Senhas são armazenadas como hash usando `Bun.password.hash` e verificadas com `Bun.password.verify`; a senha original não é salva.
- Login retorna dados básicos do usuário, sem a senha/hash.
- O navegador guarda apenas `id`, `nome` e `email` em `localStorage` para compatibilidade com as telas existentes.

**Nota de segurança:** o armazenamento no `localStorage` serve para manter compatibilidade com a interface atual, mas não equivale a uma sessão segura no servidor. Antes de publicar na internet, implemente sessões com cookie `HttpOnly`, `Secure` e `SameSite`, proteção CSRF e autorização no servidor para rotas que alteram dados.

## Banco de dados

O SQLite é criado/lido em `database.sqlite`, na raiz do projeto.


## Cadastro de provas

A tela de cadastro de provas fica em `http://localhost:3000/cadastrar-prova`.
Ela permite cadastrar provas personalizadas ou oficiais, adicionar questões de múltipla escolha e marcar uma alternativa correta por questão.

### Configurar administrador para provas oficiais

1. Crie uma conta normal no Aprova IF e confirme que consegue entrar.
2. Na raiz do projeto, crie um arquivo chamado `.env` (há um exemplo em `.env.example`).
3. Defina `ADMIN_EMAIL` com o e-mail exato da conta que será administradora, por exemplo `ADMIN_EMAIL=admin@exemplo.com`.
4. Reinicie o servidor (`Ctrl+C` e depois `bun run dev`).
5. Ao cadastrar uma prova oficial, informe o e-mail e a senha dessa conta. O servidor valida as credenciais; não confia apenas em um campo de administrador enviado pelo navegador.

Não publique o arquivo `.env` nem compartilhe a senha de administrador. A senha é verificada no servidor e não é salva pela tela de cadastro.


## Tela de Provas

A página pública de provas está em `http://localhost:3000/simulados`. Ela lista provas oficiais, simulados e provas personalizadas; permite filtrar por tipo, ano, curso e campus; abre questões de múltipla escolha; calcula a pontuação no servidor e guarda o histórico de visitantes no SQLite sem exigir cadastro.

- O cadastro de prova aceita os campos opcionais `curso` e `campus`.
- A criação de simulado personalizado seleciona questões existentes no banco por matéria e dificuldade. Se ainda não houver questões cadastradas, o sistema informa isso em vez de criar uma prova vazia.
- Os resultados de visitantes ficam na tabela `resultados_visitantes`, associados a um identificador salvo no `localStorage` do navegador. Limpar os dados do navegador pode fazer o visitante perder acesso ao histórico anterior, embora os registros permaneçam no banco.
- Ao iniciar uma versão anterior do banco, o servidor adiciona as colunas `curso` e `campus` automaticamente, sem remover as provas já existentes.


### Imagens nas questões

No cadastro de provas, cada questão pode incluir uma imagem PNG, JPG, WEBP ou GIF de até 5 MB. A imagem é enviada ao servidor e guardada em `aprova-if/public/assets/images/questions/`; o caminho é salvo no SQLite e a imagem aparece automaticamente ao responder à prova. Mantenha essa pasta ao fazer cópias de segurança do projeto.
