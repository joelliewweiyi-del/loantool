/**
 * RAX Finance — Daily Backup Script
 *
 * Creates a single zip file containing:
 *   - schema.sql    (full DB schema via supabase db dump)
 *   - data.sql      (all data via supabase db dump --data-only)
 *   - repo.bundle   (complete git repo + history, skipped if HEAD unchanged)
 *   - env/          (.env files, service role key redacted)
 *   - restore.mjs   (self-contained restore script)
 *   - RESTORE.md    (plain-text restore instructions)
 *   - manifest.json (metadata + verification results)
 *
 * Usage:
 *   node scripts/backup.mjs
 *
 * Environment variables (from .env.local):
 *   DATABASE_URL          — Supabase direct connection string
 *   BACKUP_ONEDRIVE_PATH  — Destination folder (e.g. C:/Users/joel_/OneDrive/RAX-Backups)
 *   BACKUP_RETENTION_DAYS — Days to keep old backups (default 30)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── Load env ──

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
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile(path.join(PROJECT_ROOT, '.env'));
loadEnvFile(path.join(PROJECT_ROOT, '.env.local'));

// ── Config ──

const DATABASE_URL = process.env.DATABASE_URL;
const ONEDRIVE_PATH = process.env.BACKUP_ONEDRIVE_PATH;
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const LAST_BACKUP_FILE = path.join(PROJECT_ROOT, 'last-successful-backup.json');
const FAILED_FILE = path.join(PROJECT_ROOT, 'BACKUP_FAILED.txt');

function fail(msg) {
  console.error(`\n✗ BACKUP FAILED: ${msg}`);
  fs.writeFileSync(FAILED_FILE, `Backup failed at ${new Date().toISOString()}\n\n${msg}\n`);
  process.exit(1);
}

// ── Validate ──

if (!DATABASE_URL) fail('DATABASE_URL not set. Add it to .env.local');
if (!ONEDRIVE_PATH) fail('BACKUP_ONEDRIVE_PATH not set. Add it to .env.local');

// Ensure OneDrive path exists
if (!fs.existsSync(ONEDRIVE_PATH)) {
  fs.mkdirSync(ONEDRIVE_PATH, { recursive: true });
  console.log(`Created backup directory: ${ONEDRIVE_PATH}`);
}

// ── Main ──

async function main() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const zipFilename = `rax-backup-${timestamp}.zip`;

  console.log(`\n── RAX Finance Backup ──`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Destination: ${ONEDRIVE_PATH}`);

  // Create temp dir
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rax-backup-'));
  console.log(`Temp dir: ${tmpDir}\n`);

  try {
    // 1. Schema dump
    console.log('1/7 Dumping database schema...');
    const schemaFile = path.join(tmpDir, 'schema.sql');
    execSync(
      `supabase db dump --db-url "${DATABASE_URL}" -f "${schemaFile}"`,
      { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }
    );
    const schemaSize = fs.statSync(schemaFile).size;
    console.log(`     schema.sql: ${(schemaSize / 1024).toFixed(1)} KB`);

    // 2. Data dump
    console.log('2/7 Dumping database data...');
    const dataFile = path.join(tmpDir, 'data.sql');
    execSync(
      `supabase db dump --data-only --db-url "${DATABASE_URL}" -f "${dataFile}"`,
      { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'], timeout: 300000 }
    );
    const dataSize = fs.statSync(dataFile).size;
    console.log(`     data.sql: ${(dataSize / 1024).toFixed(1)} KB`);

    // 3. Git bundle (skip if HEAD unchanged since last backup)
    console.log('3/7 Creating git bundle...');
    const gitCommit = execSync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();

    let bundleSkipped = false;
    let bundleSize = 0;
    const bundleFile = path.join(tmpDir, 'repo.bundle');

    let lastBackup = null;
    if (fs.existsSync(LAST_BACKUP_FILE)) {
      try { lastBackup = JSON.parse(fs.readFileSync(LAST_BACKUP_FILE, 'utf8')); } catch {}
    }

    if (lastBackup && lastBackup.gitCommit === gitCommit) {
      console.log(`     Skipped (HEAD ${gitCommit} unchanged since last backup)`);
      bundleSkipped = true;
    } else {
      execSync(
        `git bundle create "${bundleFile}" --all`,
        { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }
      );
      bundleSize = fs.statSync(bundleFile).size;
      console.log(`     repo.bundle: ${(bundleSize / 1024).toFixed(1)} KB`);
    }

    // 4. Copy env files
    console.log('4/7 Copying config files...');
    const envDir = path.join(tmpDir, 'env');
    fs.mkdirSync(envDir);

    const envFile = path.join(PROJECT_ROOT, '.env');
    if (fs.existsSync(envFile)) {
      fs.copyFileSync(envFile, path.join(envDir, '.env'));
    }

    const envLocalFile = path.join(PROJECT_ROOT, '.env.local');
    if (fs.existsSync(envLocalFile)) {
      let content = fs.readFileSync(envLocalFile, 'utf8');
      // Redact sensitive keys
      content = content.replace(
        /(SUPABASE_SERVICE_ROLE_KEY\s*=\s*).*/g,
        '$1***REDACTED***'
      );
      content = content.replace(
        /(DATABASE_URL\s*=\s*postgresql:\/\/[^:]+:)[^@]*/g,
        '$1***REDACTED***'
      );
      fs.writeFileSync(path.join(envDir, '.env.local'), content);
    }

    // 5. Copy restore script + instructions
    console.log('5/7 Bundling restore tools...');
    const restoreScript = path.join(PROJECT_ROOT, 'scripts', 'restore.mjs');
    if (fs.existsSync(restoreScript)) {
      fs.copyFileSync(restoreScript, path.join(tmpDir, 'restore.mjs'));
    }
    const restoreMd = path.join(PROJECT_ROOT, 'scripts', 'RESTORE.md');
    if (fs.existsSync(restoreMd)) {
      fs.copyFileSync(restoreMd, path.join(tmpDir, 'RESTORE.md'));
    }

    // 6. Verify
    console.log('6/7 Verifying backup integrity...');
    const verification = { schemaValid: false, dataValid: false, bundleValid: false };

    if (schemaSize < 1024) fail('schema.sql is suspiciously small (< 1KB)');
    verification.schemaValid = true;

    if (dataSize < 1024) fail('data.sql is suspiciously small (< 1KB)');
    verification.dataValid = true;

    if (!bundleSkipped) {
      try {
        execSync(`git bundle verify "${bundleFile}"`, { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
        verification.bundleValid = true;
      } catch (e) {
        fail(`git bundle verify failed: ${e.message}`);
      }
    } else {
      verification.bundleValid = 'skipped';
    }
    console.log('     All checks passed');

    // 7. Write manifest
    const manifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      gitCommit,
      gitBranch,
      files: {
        schema: schemaSize,
        data: dataSize,
        bundle: bundleSkipped ? 'skipped' : bundleSize,
      },
      verification,
      retentionDays: RETENTION_DAYS,
    };
    fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // 8. Create zip
    console.log('7/7 Creating zip archive...');
    const localZipPath = path.join(tmpDir, zipFilename);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(localZipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      archive.file(path.join(tmpDir, 'manifest.json'), { name: 'manifest.json' });
      archive.file(schemaFile, { name: 'schema.sql' });
      archive.file(dataFile, { name: 'data.sql' });
      if (!bundleSkipped) {
        archive.file(bundleFile, { name: 'repo.bundle' });
      }
      archive.directory(envDir, 'env');
      if (fs.existsSync(path.join(tmpDir, 'restore.mjs'))) {
        archive.file(path.join(tmpDir, 'restore.mjs'), { name: 'restore.mjs' });
      }
      if (fs.existsSync(path.join(tmpDir, 'RESTORE.md'))) {
        archive.file(path.join(tmpDir, 'RESTORE.md'), { name: 'RESTORE.md' });
      }

      archive.finalize();
    });

    const zipSize = fs.statSync(localZipPath).size;
    console.log(`     ${zipFilename}: ${(zipSize / 1024 / 1024).toFixed(2)} MB`);

    // 9. Copy to OneDrive
    const destPath = path.join(ONEDRIVE_PATH, zipFilename);
    fs.copyFileSync(localZipPath, destPath);
    console.log(`\nCopied to: ${destPath}`);

    // 10. Cleanup old backups
    const files = fs.readdirSync(ONEDRIVE_PATH)
      .filter(f => f.startsWith('rax-backup-') && f.endsWith('.zip'));
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deleted = 0;
    for (const f of files) {
      const fullPath = path.join(ONEDRIVE_PATH, f);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
        deleted++;
      }
    }
    if (deleted > 0) console.log(`Cleaned up ${deleted} old backup(s)`);

    // 11. Update last-successful-backup marker
    fs.writeFileSync(LAST_BACKUP_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      gitCommit,
      filename: zipFilename,
      sizeBytes: zipSize,
    }, null, 2));

    // 12. Remove failure marker if it exists
    if (fs.existsSync(FAILED_FILE)) {
      fs.unlinkSync(FAILED_FILE);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n── Backup complete (${duration}s) ──\n`);

  } finally {
    // Cleanup temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch(e => {
  fail(e.message || String(e));
});
