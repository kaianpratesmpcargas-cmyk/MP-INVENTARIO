import fs from 'fs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const dir = process.cwd();

async function push() {
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    console.log('\n======================================================');
    console.log('Para realizar o push via Node.js:');
    console.log('Execute: node scripts/git-push.js <SEU_GITHUB_TOKEN>');
    console.log('Ou se você possui o Git CLI instalado no terminal do Windows:');
    console.log('git push -u origin main');
    console.log('======================================================\n');
    return;
  }

  console.log('Enviando código para o repositório GitHub...');
  try {
    const pushResult = await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      onAuth: () => ({ username: token }),
    });
    console.log('Push realizado com sucesso para origin/main!', pushResult);
  } catch (err) {
    console.error('Erro no push:', err.message);
  }
}

push().catch(console.error);
