# Repositório de backup KKServer

Mundo compartilhado criado pelos integrantes do servidor KK Enterprise.

## Variáveis de Ambiente

Para rodar esse projeto, será necessário criar um arquivo .env e inserir os seguintes atributos:

| Atributo    | Valor                                           |
| ----------- | ----------------------------------------------- |
| USER        | Nome de usuário no caminho de pastas do windows |
| REPO_FOLDER | Caminho da raiz do repositório clonado          |
| AUTHOR      | Seu nome                                        |

## Instalação

1º Abra o Powershell como ⚠️ Administrador

2º Execute o seguinte comando para definir a política de execução:

```bash
  Set-ExecutionPolicy Bypass -Scope Process -Force
```

3º Execute o comando a seguir para instalar o Chocolatey:

```bash
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12;
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
```

4º Verifique se Chocolatey foi instalado corretamente rodando o seguinte comando (tente reiniciar o terminal caso não funcione na primeira tentativa):

```bash
  choco --version
```

5º Instale o NVM, será utilizado para lidar com as versões do Node.

```bash
  choco install nvm -y
```

6º Verifique se NVM foi instalado corretamente rodando o seguinte comando (tente reiniciar o terminal caso não funcione na primeira tentativa):

```bash
  nvm -v
```

7º Instale a versão do node utilizada no projeto executando o seguinte comando:

```bash
  nvm install 20.17.0
```

8º Verifique se Node foi instalado corretamente rodando o seguinte comando (tente reiniciar o terminal caso não funcione na primeira tentativa):

```bash
  node -v
```

9º Instale o Git

```bash
  choco install git
```

10º Configure o Git

```bash
  git config --global user.name "Seu Nome"
  git config --global user.email "seuemail@exemplo.com"
```

11º Clone o repositório

```bash
  git clone https://github.com/jeanrabello/Valheim-KKServer.git
```

12º Navegue até a raiz do projeto e execute o seguinte comando para instalar as dependências

```bash
  cd "caminho/para/raiz/do/projeto"
  npm i
```

## Como realizar o backup

Para subir o mundo atualizado para o repositório basta apenas executar o arquivo `doBackup.bat` que automaticamente os arquivos dentro do caminho padrão dos mundos do valheim serão copiados para o caminho indicado em `REPO_FOLDER`.

## Como aplicar o backup nos arquivos locais

Para aplicar o backup nos arquivos locais de mundos do seu Valheim basta apenas executar o arquivo `setWorlds.bat` que automaticamente os arquivos dentro do caminho indicado em `REPO_FOLDER` serão copiados para a pasta padrão de mundos locais do Valheim.

## Autores

- [@jeanrabello](https://www.github.com/jeanrabello)
- [@anthnydeleon](https://www.github.com/anthnydeleon)
- [@muri-brito](https://www.github.com/muri-brito)
