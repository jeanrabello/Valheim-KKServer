require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const worldsRoot = `C:\\Users\\${process.env.USER}\\AppData\\LocalLow\\IronGate\\Valheim\\worlds_local`;
const sourceFolder = path.join(worldsRoot, process.env.WORLD_NAME);
const repoFolder = path.join("./worlds_local", process.env.WORLD_NAME);

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
      console.log(`Arquivo ${item} copiado para o mundo local.`);
    }
  });
}

execSync(`git pull origin main`);

if (!fs.existsSync(repoFolder)) {
  console.error(`Mundo não encontrado no repositório: ${repoFolder}`);
  console.error("Confira o WORLD_NAME no .env.");
  process.exit(1);
}

copyFolderRecursiveSync(repoFolder, sourceFolder);