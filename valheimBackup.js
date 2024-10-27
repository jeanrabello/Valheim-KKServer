require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sourceFolder = `C:\\Users\\${process.env.USER}\\AppData\\LocalLow\\IronGate\\Valheim\\worlds_local`;
const repoFolder = `./worlds_local`;

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Meses são indexados em 0
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const timestamp = String(date.getTime());
  return {
    day,
    month,
    year,
    hours,
    minutes,
    seconds,
    timestamp,
  };
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
      if (item.includes("KKServer")) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Arquivo ${item} copiado para o repositório.`);
      }
    }
  });
}

function gitCommitAndPush(repoPath) {
  try {
    const { day, month, year, hours, minutes, seconds, timestamp } = formatDate(
      new Date()
    );
    const today = `${day}/${month}/${year}`;

    // ⚠️ TODO: Pipelines to merge branchs into main
    // const branch = `${today}-${timestamp}`;

    process.chdir(repoPath);
    // execSync(`git checkout -b ${branch}`);
    execSync("git add .");
    const commitMessage = `${process.env.AUTHOR} - Backup automático - ${today} - ${hours}:${minutes}:${seconds}`;
    execSync(`git commit -m "${commitMessage}"`);
    execSync(`git push origin main`);
    // execSync(`git push origin ${branch}`);
    // execSync(`git checkout main`);
    console.log("Backup enviado com sucesso para o repositório remoto.");
  } catch (error) {
    console.error("Erro durante o processo Git:", error.message);
  }
}

copyFolderRecursiveSync(sourceFolder, repoFolder);
execSync(`git pull origin main`);
gitCommitAndPush(repoFolder);
