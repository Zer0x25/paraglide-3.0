import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../..', import.meta.url));
const guard = `${root}/.agents/scripts/guard-dev-db.mjs`;

function runHook(host, event) {
  const input = typeof event === 'string' ? event : JSON.stringify(event);
  const result = spawnSync(process.execPath, [guard, '--host', host], { input, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '' };
}

function outputOf(result) {
  assert.equal(result.status, 0, result.stderr || 'hook command failed');
  return JSON.parse(result.stdout);
}

test('Antigravity PreToolUse denies the production DB port with its decision contract', () => {
  const result = outputOf(runHook('antigravity', {
    toolCall: { name: 'run_command', args: { CommandLine: 'psql --port 5678' } },
  }));
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /5678/);
});

test('Codex PreToolUse returns its supported denial envelope for the production database', () => {
  const result = outputOf(runHook('codex', {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'psql --dbname=parapente_db' },
  }));
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /parapente_db/);
});

test('Copilot preToolUse parses string toolArgs and returns a top-level denial', () => {
  const result = outputOf(runHook('copilot', {
    toolName: 'bash',
    toolArgs: JSON.stringify({ command: 'psql --host 127.0.0.1 --port 5678' }),
  }));
  assert.equal(result.permissionDecision, 'deny');
  assert.match(result.permissionDecisionReason, /5678/);
});

test('Copilot in VS Code blocks destructive schema statements', () => {
  const result = outputOf(runHook('copilot', {
    toolName: 'bash',
    toolArgs: { command: 'DROP SCHEMA public CASCADE' },
  }));
  assert.equal(result.permissionDecision, 'deny');
  assert.match(result.permissionDecisionReason, /destructiv/i);
});

test('a development database command remains allowed', () => {
  const result = outputOf(runHook('codex', {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'psql --port 5679 --dbname=parapente_dev_db' },
  }));
  assert.deepEqual(result, {});
});

test('malformed input fails closed in each host contract', () => {
  const antigravity = outputOf(runHook('antigravity', '{malformed'));
  assert.equal(antigravity.decision, 'deny');
  const codex = outputOf(runHook('codex', '{malformed'));
  assert.equal(codex.hookSpecificOutput.permissionDecision, 'deny');
  const copilot = outputOf(runHook('copilot', '{malformed'));
  assert.equal(copilot.permissionDecision, 'deny');
});

test('recognized shell calls with missing command fields fail closed', () => {
  const antigravity = outputOf(runHook('antigravity', {
    toolCall: { name: 'run_command', args: {} },
  }));
  assert.equal(antigravity.decision, 'deny');
  const codex = outputOf(runHook('codex', {
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {},
  }));
  assert.equal(codex.hookSpecificOutput.permissionDecision, 'deny');
  const copilot = outputOf(runHook('copilot', { toolName: 'bash', toolArgs: {} }));
  assert.equal(copilot.permissionDecision, 'deny');
});

test('runtime hook registrations point to the shared guard script', () => {
  const antigravity = JSON.parse(readFileSync(`${root}/.agents/hooks.json`, 'utf8'));
  const codex = JSON.parse(readFileSync(`${root}/.codex/hooks.json`, 'utf8'));
  const copilot = JSON.parse(readFileSync(`${root}/.github/hooks/paraglide-db-guard.json`, 'utf8'));
  assert.equal(antigravity['db-safety-guard'].PreToolUse[0].matcher, 'run_command');
  assert.match(antigravity['db-safety-guard'].PreToolUse[0].hooks[0].command, /\.agents\/scripts\/guard-dev-db\.mjs.*--host antigravity/);
  assert.equal(codex.hooks.PreToolUse[0].matcher, '^Bash$');
  assert.match(codex.hooks.PreToolUse[0].hooks[0].command, /\.agents\/scripts\/guard-dev-db\.mjs.*--host codex/);
  assert.equal(copilot.version, 1);
  assert.equal(copilot.hooks.preToolUse[0].matcher, '^[Bb][Aa][Ss][Hh]$');
  assert.match(copilot.hooks.preToolUse[0].command, /\.agents\/scripts\/guard-dev-db\.mjs.*--host copilot/);
});

test('registered commands resolve the guard from a nested workspace and deny a production target', () => {
  const antigravity = JSON.parse(readFileSync(`${root}/.agents/hooks.json`, 'utf8'));
  const codex = JSON.parse(readFileSync(`${root}/.codex/hooks.json`, 'utf8'));
  const copilot = JSON.parse(readFileSync(`${root}/.github/hooks/paraglide-db-guard.json`, 'utf8'));
  const cases = [
    [antigravity['db-safety-guard'].PreToolUse[0].hooks[0].command,
      { toolCall: { name: 'run_command', args: { CommandLine: 'psql --port 5678' } } },
      (out) => out.decision === 'deny'],
    [codex.hooks.PreToolUse[0].hooks[0].command,
      { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'psql --dbname=parapente_db' } },
      (out) => out.hookSpecificOutput?.permissionDecision === 'deny'],
    [copilot.hooks.preToolUse[0].command,
      { toolName: 'bash', toolArgs: { command: 'psql --port 5678' } },
      (out) => out.permissionDecision === 'deny'],
  ];

  for (const [command, payload, denied] of cases) {
    const result = spawnSync('bash', ['-c', command], {
      cwd: `${root}/apps/api`,
      input: JSON.stringify(payload),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(denied(JSON.parse(result.stdout)), `configured hook did not deny: ${command}`);
  }
});
