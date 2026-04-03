/**
 * Wraps translated HTML body content in a full standalone HTML document
 * with RAX Finance branding, suitable for printing to PDF.
 */
export function wrapTranslationHtml(
  body: string,
  title: string,
  originalFileName: string
): string {
  // Use the app's origin to resolve the logo — works in dev and prod
  const logoUrl = `${window.location.origin}/rax-logo.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --rax-navy: #003B5C;
      --rax-navy-10: #003B5C1A;
      --fg: #1a2a33;
      --fg-secondary: #4a5568;
      --fg-tertiary: #718096;
      --fg-muted: #a0aab4;
      --border: #e2ddd5;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Barlow', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.625;
      color: var(--fg);
      background: #f5f0eb;
      padding: 40px 20px;
    }

    .page {
      max-width: 720px;
      margin: 0 auto 40px;
      background: white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--rax-navy);
      color: white;
    }

    .header-bar h1 {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .header-bar .subtitle {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 2px;
    }

    .header-logo {
      height: 28px;
      filter: brightness(0) invert(1);
    }

    .content {
      padding: 32px 24px;
    }

    .content h1 { font-size: 20px; font-weight: 700; margin: 28px 0 12px; color: var(--rax-navy); }
    .content h2 { font-size: 16px; font-weight: 600; margin: 24px 0 10px; color: var(--rax-navy); }
    .content h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; color: var(--fg); }
    .content h4 { font-size: 13px; font-weight: 600; margin: 16px 0 6px; color: var(--fg-secondary); }

    .content p { margin: 0 0 10px; text-align: justify; }

    .content ul, .content ol {
      margin: 0 0 12px 20px;
    }

    .content li {
      margin: 0 0 4px;
      text-align: justify;
    }

    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px;
      font-size: 12.5px;
    }

    .content th, .content td {
      text-align: left;
      padding: 6px 10px;
      border-bottom: 1px solid var(--border);
    }

    .content th {
      font-weight: 600;
      color: var(--fg-secondary);
      background: var(--rax-navy-10);
      border-bottom: 2px solid var(--border);
    }

    .content td {
      color: var(--fg);
    }

    .content strong { font-weight: 600; }

    .content hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 20px 0;
    }

    .footer {
      padding: 12px 24px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--fg-muted);
      display: flex;
      justify-content: space-between;
    }

    /* Page breaks for print */
    .page-break {
      page-break-before: always;
      margin-top: 32px;
      padding-top: 32px;
      border-top: 1px solid var(--border);
    }

    @media print {
      body { background: white; padding: 0; }
      .page { box-shadow: none; margin: 0; max-width: none; }
      .header-bar { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .content th { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page-break { border-top: none; padding-top: 0; margin-top: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-bar">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">English Translation</div>
      </div>
      <img src="${logoUrl}" alt="RAX Finance" class="header-logo" onerror="this.outerHTML='<span style=\\'font-size:12px;font-weight:600;letter-spacing:0.05em\\'>RAX FINANCE</span>'" />
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <span>Translated from: ${escapeHtml(originalFileName)}</span>
      <span>Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
