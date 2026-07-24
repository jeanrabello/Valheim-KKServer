# Painel de backup do Valheim (interface local)

Interface simples em HTML/CSS/JS, servida por um servidor Node local, para
fazer **backup** (mundo local → repositório) e **restauração** (repositório →
mundo local) do mundo compartilhado. Substitui o uso direto dos scripts por
uma tela com botões e log ao vivo.

## O que mudou em relação ao projeto original

- O filtro de arquivos deixou de ser fixo no código (`item.includes("tonidigo")`)
  e passou a ser a variável **`WORLD_NAME`**. Você define qual mundo entra no
  backup pela tela ou pelo `.env`.
- A lógica de backup/restauração foi centralizada em `lib/` e é usada tanto
  pela interface quanto pelos scripts de linha de comando.

## Como colocar no repositório

Copie o conteúdo desta pasta para a **raiz do repositório de backup** (onde
ficam a pasta `worlds_local` e o `.git`). A estrutura fica assim:

```
Valheim-KKServer/
├── .git/
├── worlds_local/          <- mundos versionados (já existente)
├── public/                <- interface (html/css/js)
├── lib/                   <- lógica de config, filtro e tarefas
├── server.js              <- servidor local do painel
├── backup-cli.js          <- backup por linha de comando
├── restore-cli.js         <- restauração por linha de comando
├── start.bat / build.bat  <- lançadores
└── .env                   <- sua configuração (não versionar)
```

## Configuração (`.env`)

Copie `.env.example` para `.env` e ajuste. Ou preencha tudo pela tela.

| Variável               | Para que serve                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `WORLD_NAME`           | Nome do mundo que entra no backup (ex.: `KKEnterprise`).              |
| `WINDOWS_USER`         | Usuário do Windows, para achar a pasta de mundos do Valheim.          |
| `AUTHOR`               | Seu nome — assina o commit.                                           |
| `VALHEIM_WORLDS_PATH`  | (opcional) Caminho manual da pasta `worlds_local` do Valheim.         |
| `INCLUDE_AUTO_BACKUPS` | Incluir os backups automáticos do jogo? Padrão `false`.              |
| `INCLUDE_TEX_CACHE`    | Incluir os caches de mapa? Padrão `false`.                           |
| `PORT`                 | Porta do painel (padrão `4173`).                                     |

> O `.env` fica na sua máquina e **não deve ser versionado** — o `.gitignore`
> já cuida disso.

## Rodando (modo simples, precisa do Node 18+)

Dê dois cliques em **`start.bat`**. Ele instala as dependências na primeira vez,
sobe o servidor e abre `http://localhost:4173` no navegador.

Pela linha de comando:

```bash
npm install
npm start          # abre o painel
npm run backup     # backup sem interface
npm run restore    # restauração sem interface
```

## Gerando um executável (.exe)

Para não depender do Node instalado, gere um único `.exe`:

```bash
npm run build      # ou dê dois cliques em build.bat
```

Isso cria `dist/Valheim-Backup.exe` com o Node embutido. Dois cliques no `.exe`
abrem o painel no navegador.

> Observação: o `.exe` embute o Node, mas **o Git ainda precisa estar
> instalado** na máquina, porque o backup usa `git pull/commit/push`.

## Segurança e comportamento

- A restauração **sobrescreve** o mundo local; a tela pede confirmação antes.
  Feche o Valheim antes de restaurar.
- Por padrão o backup guarda só o mundo atual (`.db`/`.fwl` e seus `.old`),
  mantendo o repositório leve. Ligue os backups automáticos/caches na tela se
  quiser guardá-los também.
- O painel roda só na sua máquina (`localhost`) e não expõe nada para fora.
