/**
 * RAX Finance — Restore Script
 *
 * Restores the system from a backup zip file created by backup.mjs.
 * This script is also bundled INSIDE every backup zip so it can be run
 * from a fresh machine without cloning the repo first.
 *
 * Usage:
 *   node scripts/restore.mjs                                         # Interactive
 *   node scripts/restore.mjs --file path/to/backup.zip               # Direct
 *   node scripts/restore.mjs --db-only --file path.zip               # Database only
 *   node scripts/restore.mjs --code-only --file path.zip             # Code only
 *   node scripts/restore.mjs --dry-run --file path.zip               # Preview
 *   node scripts/restore.mjs --db-url "postgresql://..." --file .    # From extracted zip
 *
 * Environment:
 *   DATABASE_URL — from .env.local or --db-url flag
 *   BACKUP_ONEDRIVE_PATH — for listing available backups (interactive mode)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Helpers ──

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ── Parse args ──

const args = process.argv.slice(2);
let filePath = null;
let dbUrl = null;
let dbOnly = false;
let codeOnly = false;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) filePath = args[++i];
  else if (args[i] === '--db-url' && args[i + 1]) dbUrl = args[++i];
  else if (args[i] === '--db-only') dbOnly = true;
  else if (args[i] === '--code-only') codeOnly = true;
  else if (args[i] === '--dry-run') dryRun = true;
  else if (!args[i].startsWith('--')) filePath = args[i];
}

// ── Load env (try project root, then current dir) ──

const projectRoot = fs.existsSync(path.join(__dirname, '..', 'package.json'))
  ? path.resolve(__dirname, '..')
  : process.cwd();

loadEnvFile(path.join(projectRoot, '.env'));
loadEnvFile(path.join(projectRoot, '.env.local'));

// ── Main ──

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n── RAX Finance Restore ──\n');

  // Resolve DATABASE_URL
  const resolvedDbUrl = dbUrl || process.env.DATABASE_URL;

  // Check psql is available
  if (!codeOnly) {
    try {
      execSync('psql --version', { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      console.error('psql is not installed. Install it with: scoop install postgresql');
      process.exit(1);
    }
  }

  // Resolve backup file
  if (!filePath) {
    // Interactive mode: list available backups
    const onedrivePath = process.env.BACKUP_ONEDRIVE_PATH;
    if (!onedrivePath || !fs.existsSync(onedrivePath)) {
      console.error('No --file specified and BACKUP_ONEDRIVE_PATH not set or not found.');
      console.error('Usage: node restore.mjs --file path/to/backup.zip');
      process.exit(1);
    }

    const backups = fs.readdirSync(onedrivePath)
      .filter(f => f.startsWith('rax-backup-') && f.endsWith('.zip'))
      .map(f => ({
        name: f,
        path: path.join(onedrivePath, f),
        stat: fs.statSync(path.join(onedrivePath, f)),
      }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    if (backups.length === 0) {
      console.error(`No backups found in ${onedrivePath}`);
      process.exit(1);
    }

    console.log('Available backups:\n');
    backups.forEach((b, i) => {
      const date = b.stat.mtime.toISOString().slice(0, 16).replace('T', ' ');
      console.log(`  ${i + 1}. ${b.name}  (${formatBytes(b.stat.size)}, ${date})`);
    });

    const choice = await ask(rl, `\nSelect backup [1-${backups.length}]: `);
    const idx = parseInt(choice, 10) - 1;
    if (idx < 0 || idx >= backups.length) {
      console.error('Invalid selection.');
      process.exit(1);
    }
    filePath = backups[idx].path;
  }

  // Resolve the file/directory
  const resolvedPath = path.resolve(filePath);
  const isDirectory = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory();
  const isZip = resolvedPath.endsWith('.zip');

  let workDir;
  let needsCleanup = false;

  if (isDirectory) {
    // Already extracted
    workDir = resolvedPath;
  } else if (isZip && fs.existsSync(resolvedPath)) {
    // Extract zip
    console.log(`Extracting ${path.basename(resolvedPath)}...`);
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rax-restore-'));
    needsCleanup = true;
    execSync(
      `powershell -Command "Expand-Archive -Path '${resolvedPath}' -DestinationPath '${workDir}' -Force"`,
      { stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 }
    );
  } else {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Read manifest
  const manifestPath = path.join(workDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('manifest.json not found in backup. Is this a valid RAX backup?');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  console.log('\n── Backup Summary ──');
  console.log(`  Timestamp:  ${manifest.timestamp}`);
  console.log(`  Git commit: ${manifest.gitCommit} (${manifest.gitBranch})`);
  console.log(`  Schema:     ${formatBytes(manifest.files.schema)}`);
  console.log(`  Data:       ${formatBytes(manifest.files.data)}`);
  console.log(`  Bundle:     ${manifest.files.bundle === 'skipped' ? 'skipped (no new commits)' : formatBytes(manifest.files.bundle)}`);
  console.log(`  Verified:   schema=${manifest.verification.schemaValid}, data=${manifest.verification.dataValid}, bundle=${manifest.verification.bundleValid}`);

  if (dryRun) {
    console.log('\n-- Dry run complete. No changes made. --\n');
    rl.close();
    if (needsCleanup) fs.rmSync(workDir, { recursive: true, force: true });
    return;
  }

  // Confirm
  if (!codeOnly) {
    if (!resolvedDbUrl) {
      console.error('\nDATABASE_URL not found. Provide it via --db-url or .env.local');
      process.exit(1);
    }

    console.log(`\n  Target DB:  ${resolvedDbUrl.replace(/:([^@:]+)@/, ':***@')}`);
  }

  console.log('');
  const mode = dbOnly ? 'DATABASE ONLY' : codeOnly ? 'CODE ONLY' : 'FULL (database + code)';
  console.log(`  Restore mode: ${mode}`);

  const confirm = await ask(rl, '\nThis will OVERWRITE your current data. Type RESTORE to confirm: ');
  if (confirm.trim() !== 'RESTORE') {
    console.log('Aborted.');
    rl.close();
    if (needsCleanup) fs.rmSync(workDir, { recursive: true, force: true });
    return;
  }

  // ── Database restore ──
  if (!codeOnly) {
    const schemaFile = path.join(workDir, 'schema.sql');
    const dataFile = path.join(workDir, 'data.sql');

    if (!fs.existsSync(schemaFile)) {
      console.error('schema.sql not found in backup');
      process.exit(1);
    }
    if (!fs.existsSync(dataFile)) {
      console.error('data.sql not found in backup');
      process.exit(1);
    }

    console.log('\nRestoring database schema...');
    try {
      execSync(`psql "${resolvedDbUrl}" -f "${schemaFile}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
      });
      console.log('  Schema restored.');
    } catch (e) {
      console.error(`  Schema restore warning: ${e.stderr?.toString().slice(0, 500) || e.message}`);
      const cont = await ask(rl, '  Continue with data restore? [y/N]: ');
      if (cont.trim().toLowerCase() !== 'y') {
        console.log('Aborted.');
        rl.close();
        if (needsCleanup) fs.rmSync(workDir, { recursive: true, force: true });
        return;
      }
    }

    console.log('Restoring database data...');
    try {
      execSync(`psql "${resolvedDbUrl}" -f "${dataFile}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000,
      });
      console.log('  Data restored.');
    } catch (e) {
      console.error(`  Data restore error: ${e.stderr?.toString().slice(0, 500) || e.message}`);
    }
  }

  // ── Code restore ──
  if (!dbOnly) {
    const bundleFile = path.join(workDir, 'repo.bundle');

    if (!fs.existsSync(bundleFile)) {
      console.log('\nNo repo.bundle in backup (git bundle was skipped). Code restore skipped.');
    } else {
      const defaultDir = path.join(process.cwd(), 'loantool-restored');
      const targetDir = await ask(rl, `\nRestore code to [${defaultDir}]: `);
      const codeDir = targetDir.trim() || defaultDir;

      console.log(`Cloning repo to ${codeDir}...`);
      execSync(`git clone "${bundleFile}" "${codeDir}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000,
      });
      console.log('  Code restored.');

      // Install dependencies
      const installDeps = await ask(rl, 'Run npm install? [Y/n]: ');
      if (installDeps.trim().toLowerCase() !== 'n') {
        console.log('Installing dependencies...');
        execSync('npm install', { cwd: codeDir, stdio: 'inherit', timeout: 120000 });
      }

      // Redeploy Edge Functions
      const fnDir = path.join(codeDir, 'supabase', 'functions');
      if (fs.existsSync(fnDir)) {
        const deploy = await ask(rl, 'Redeploy Edge Functions? [Y/n]: ');
        if (deploy.trim().toLowerCase() !== 'n') {
          const functions = fs.readdirSync(fnDir)
            .filter(d => !d.startsWith('_') && fs.statSync(path.join(fnDir, d)).isDirectory());

          console.log(`Deploying ${functions.length} Edge Functions...`);
          for (const fn of functions) {
            try {
              execSync(`supabase functions deploy ${fn}`, {
                cwd: codeDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 60000,
              });
              console.log(`  ${fn}: deployed`);
            } catch (e) {
              console.error(`  ${fn}: FAILED — ${e.stderr?.toString().slice(0, 200) || e.message}`);
            }
          }
        }
      }
    }
  }

  // ── Config restore ──
  if (!dbOnly && !codeOnly) {
    const envDir = path.join(workDir, 'env');
    if (fs.existsSync(envDir)) {
      console.log('\nConfig files available in backup:');
      const envFiles = fs.readdirSync(envDir);
      for (const f of envFiles) {
        console.log(`  env/${f}`);
      }
      console.log('Note: .env.local has secrets REDACTED. You will need to re-enter them.');
    }
  }

  console.log('\n── Restore complete ──\n');
  rl.close();

  if (needsCleanup) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch(e => {
  console.error(`\nRestore failed: ${e.message || e}`);
  process.exit(1);
});
