import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('../..', import.meta.url);
const repositoryRoot = fileURLToPath(root);
const releaseWorkflow = readFileSync(
  join(repositoryRoot, '.github/workflows/release-please.yml'),
  'utf8',
);
const rcWorkflow = readFileSync(join(repositoryRoot, '.github/workflows/rc-images.yml'), 'utf8');

function jobBlock(workflow, name) {
  const start = workflow.search(new RegExp(`^  ${name}:\\s*$`, 'm'));
  assert.notEqual(start, -1, `No existe el job ${name}.`);
  const tail = workflow.slice(start);
  const next = tail.search(/\n(?=  [A-Za-z0-9_-]+:\s*$)/m);
  return tail.slice(0, next === -1 ? undefined : next);
}

test('Release Please llama al flujo de imágenes RC sin un workflow de despliegue', () => {
  assert.equal(existsSync(join(repositoryRoot, '.github/workflows/deploy.yml')), false);
  assert.match(
    releaseWorkflow,
    /publish-rc-images:\s*\n[\s\S]*?uses:\s*\.\/\.github\/workflows\/rc-images\.yml/,
  );
  assert.doesNotMatch(releaseWorkflow, /stage-rc|deploy\.yml/);
});

test('el flujo de RC no depende de una VM ni de un runner self-hosted', () => {
  const testJob = jobBlock(rcWorkflow, 'test');
  const stagingScript = readFileSync(join(repositoryRoot, 'scripts/ci/staging.mjs'), 'utf8');

  assert.doesNotMatch(rcWorkflow, /self-hosted|srv-hp-vm|staging-deployment\.json/);
  assert.match(testJob, /runs-on: ubuntu-24\.04/);
  assert.match(testJob, /node scripts\/ci\/staging\.mjs up/);
  assert.match(stagingScript, /if \(command === 'up'\)/);
});

test('el tag de release se publica solo después de que pasen las pruebas hospedadas', () => {
  const images = jobBlock(rcWorkflow, 'images');
  const publish = jobBlock(rcWorkflow, 'publish');

  assert.match(
    images,
    /tags:\s*\$\{\{ needs\.resolve\.outputs\.image_base \}\}-(?:api|web):candidate-\$\{\{ github\.run_id \}\}/,
  );
  assert.doesNotMatch(
    images,
    /tags:\s*\$\{\{ needs\.resolve\.outputs\.image_base \}\}-(?:api|web):\$\{\{ needs\.resolve\.outputs\.tag \}\}/,
  );
  assert.match(publish, /needs:\s*\[[^\]]*\btest\b[^\]]*\]/);
  assert.match(publish, /needs\.test\.result\s*==\s*'success'/);
  assert.ok(publish.includes('target="${IMAGE_BASE}-${service}:${RC_TAG}"'));
  assert.match(publish, /docker buildx imagetools create/);
  assert.match(publish, /--prefer-index=false/);
  assert.match(publish, /expected_digest/);
  assert.match(publish, /current_digest/);
  assert.match(publish, /no se sobrescribe/);
});

test('la verificación del manifiesto recibe RC_MANIFEST dentro del mismo paso', () => {
  const publish = jobBlock(rcWorkflow, 'publish');
  const downloadStep = publish.slice(
    publish.indexOf('- name: Descargar y validar el manifiesto de imágenes probadas'),
    publish.indexOf('- name: Aplicar el tag RC a los digests aprobados'),
  );

  assert.match(
    downloadStep,
    /\n        env:\n          RC_MANIFEST: \$\{\{ runner\.temp \}\}\/rc-manifest\.json/,
  );
});
