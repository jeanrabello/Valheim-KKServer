require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const worldsRoot = `C:\\Users\\${process.env.USER}\\AppData\\LocalLow\\IronGate\\Valheim\\worlds_local`;
const sourceFolder = path.join(worldsRoot, process.env.WORLD_NAME);
const repoFolder = path.join("./worlds_local", process.env.WORLD_NAME);

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const timestamp = String(date.getTime());
  return { day, month, year, hours, minutes, seconds, timestamp };
}

function copyFolderRecursiveSync(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  fs.readdirSync(source).forEach((item) => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderRecursiveSync(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Arquivo ${item} copiado para o repositório.`);
    }
  });
}

function gitCommitAndPush(repoPath) {
  try {
    const { day, month, year, hours, minutes, seconds } = formatDate(new Date());
    const today = `${day}/${month}/${year}`;

    process.chdir(repoPath);
    execSync("git add .");
    const commitMessage = `${process.env.AUTHOR} - Backup automático - ${process.env.WORLD_NAME} - ${today} - ${hours}:${minutes}:${seconds}`;
    execSync(`git commit -m "${commitMessage}"`);
    execSync(`git push origin main`);
    console.log("Backup enviado com sucesso para o repositório remoto.");
  } catch (error) {
    console.error("Erro durante o processo Git:", error.message);
  }
}

if (!fs.existsSync(sourceFolder)) {
  console.error(`Pasta do mundo não encontrada: ${sourceFolder}`);
  console.error("Confira o WORLD_NAME no .env.");
  process.exit(1);
}

const repoRoot = "./worlds_local";
copyFolderRecursiveSync(sourceFolder, repoFolder);
process.chdir(path.resolve(repoRoot, ".."));
execSync(`git pull origin main`);
gitCommitAndPush(path.resolve(repoRoot));