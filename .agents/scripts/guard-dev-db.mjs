#!/usr/bin/env node
/**
 * Shared database guard adapter for Antigravity, Codex, and Copilot hooks.
 * Keep this deterministic and fail closed when a matched shell payload is unreadable.
 * This is a pattern-based guardrail, not a substitute for host permissions or isolation.
 */

const HOSTS = new Set(['antigravity', 'codex', 'copilot']);
const hostIndex = process.argv.indexOf('--host');
const host = hostIndex >= 0 ? process.argv[hostIndex + 1] : undefined;

function emit(decision, reason) {
  let output;
  if (host === 'antigravity') {
    output = decision === 'deny' ? { decision, reason } : { decision: 'allow' };
  } else if (host === 'codex') {
    output = decision === 'deny'
      ? {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
          },
        }
      : {};
  } else {
    output = decision === 'deny'
      ? { permissionDecision: 'deny', permissionDecisionReason: reason }
      : {};
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

function deny(reason) {
  emit('deny', reason);
  process.exitCode = 0;
}

function allow() {
  emit('allow');
  process.exitCode = 0;
}

function asObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function readCopilotArgs(value) {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error('Invalid Copilot toolArgs JSON');
    }
  }
  return asObject(value, 'Copilot toolArgs');
}

function extractCommand(payload) {
  if (host === 'antigravity') {
    const call = payload.toolCall;
    if (!call || typeof call.name !== 'string') throw new Error('Missing Antigravity toolCall');
    if (call.name !== 'run_command') return { matched: false };
    const args = asObject(call.args, 'Antigravity toolCall.args');
    if (typeof args.CommandLine !== 'string') throw new Error('Missing Antigravity CommandLine');
    return { matched: true, command: args.CommandLine };
  }

  if (host === 'codex') {
    if (payload.hook_event_name && payload.hook_event_name !== 'PreToolUse') return { matched: false };
    if (typeof payload.tool_name !== 'string') throw new Error('Missing Codex tool_name');
    if (payload.tool_name !== 'Bash') return { matched: false };
    const args = asObject(payload.tool_input, 'Codex tool_input');
    if (typeof args.command !== 'string') throw new Error('Missing Codex Bash command');
    return { matched: true, command: args.command };
  }

  if (host === 'copilot') {
    if (typeof payload.toolName !== 'string') throw new Error('Missing Copilot toolName');
    if (payload.toolName.toLowerCase() !== 'bash') return { matched: false };
    const args = readCopilotArgs(payload.toolArgs);
    if (typeof args.command !== 'string') throw new Error('Missing Copilot Bash command');
    return { matched: true, command: args.command };
  }

  throw new Error('Unsupported hook host');
}

function violation(command) {
  const normalized = command.toLowerCase();
  if (/(^|[^0-9])5678(?![0-9])/.test(command)) {
    return 'Bloqueado: el puerto 5678 está reservado para la base de datos de producción.';
  }
  if (/(^|[^a-z0-9_])parapente_db($|[^a-z0-9_])/.test(normalized)) {
    return 'Bloqueado: el comando referencia la base de datos de producción parapente_db.';
  }
  if (/\bdrop\s+database\b/i.test(command) || /\bdrop\s+schema\s+public\s+cascade\b/i.test(command)) {
    return 'Bloqueado: DROP DATABASE y DROP SCHEMA public CASCADE son operaciones destructivas.';
  }
  return null;
}

async function main() {
  if (!HOSTS.has(host)) {
    process.stderr.write('Uso: guard-dev-db.mjs --host antigravity|codex|copilot\n');
    process.exitCode = 2;
    return;
  }

  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;

  let payload;
  try {
    payload = asObject(JSON.parse(raw), 'hook payload');
  } catch {
    deny('Guardia en modo seguro: el payload del hook no es JSON válido.');
    return;
  }

  try {
    const extracted = extractCommand(payload);
    if (!extracted.matched) {
      allow();
      return;
    }
    const reason = violation(extracted.command);
    if (reason) deny(reason);
    else allow();
  } catch {
    deny('Guardia en modo seguro: no se pudo interpretar el comando de shell.');
  }
}

await main();
