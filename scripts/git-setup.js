import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const dir = process.cwd();

async function run() {
  console.log('1. Inicializando repositório Git local...');
  try {
    await git.init({ fs, dir, defaultBranch: 'main' });
    console.log('   Repositório inicializado com sucesso.');
  } catch (e) {
    console.log('   Repositório já inicializado ou aviso:', e.message);
  }

  console.log('2. Mapeando e adicionando arquivos ao Git index...');
  
  function getFiles(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(dir, fullPath).replace(/\\/g, '/');

      if (
        entry.name === '.git' ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.oxlintrc.json' ||
        relPath.startsWith('.git/') ||
        relPath.startsWith('node_modules/') ||
        relPath.startsWith('dist/')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        files = files.concat(getFiles(fullPath));
      } else {
        files.push(relPath);
      }
    }
    return files;
  }

  const allFiles = getFiles(dir);
  console.log(`   Adicionando ${allFiles.length} arquivos...`);

  for (const filepath of allFiles) {
    await git.add({ fs, dir, filepath });
  }

  console.log('3. Criando commit inicial na branch main...');
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'Kaian Prates MP CARGAS',
      email: 'kaian@mpcargas.com.br',
    },
    message: 'feat: sistema completo MP CARGAS - Controle de Inventário e Patrimônio por Código de Barras',
  });
  console.log(`   Commit criado com sucesso: ${sha.substring(0, 7)}`);

  console.log('4. Configurando remote origin...');
  const remoteUrl = 'https://github.com/kaianpratesmpcargas-cmyk/MP-INVENTARIO.git';
  try {
    await git.deleteRemote({ fs, dir, remote: 'origin' });
  } catch (e) {}

  await git.addRemote({
    fs,
    dir,
    remote: 'origin',
    url: remoteUrl,
  });
  console.log(`   Remote origin configurado para: ${remoteUrl}`);

  console.log('5. Definindo branch main...');
  try {
    await git.branch({ fs, dir, ref: 'main', checkout: true });
  } catch (e) {
    // Branch já existe
  }

  console.log('\n Repositório Git local configurado e commitado com sucesso!');
  console.log(` Remote: ${remoteUrl}`);
  console.log(' Branch: main');
}

run().catch(console.error);
