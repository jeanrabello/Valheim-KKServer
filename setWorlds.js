require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const sourceFolder = `C:\\Users\\${process.env.USER}\\AppData\\LocalLow\\IronGate\\Valheim\\worlds_local`;
const repoFolder = `./worlds_local`;

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

execSync(`git pull origin main`);
copyFolderRecursiveSync(repoFolder, sourceFolder);
