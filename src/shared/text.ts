export function buildSimplePdf(text: string): Uint8Array {
  const safe = text.replace(/[()\\]/g, ' ').slice(0, 80) || 'Sky Vault';
  const content = `BT /F1 18 Tf 72 720 Td (${safe}) Tj ET`;
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n',
    `4 0 obj<</Length ${content.length}>>stream\n${content}\nendstream\nendobj\n`,
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(body + xref + trailer);
}

export function buildTextFile(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function extractSimpleText(bytes: Uint8Array, mimeType: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  if (mimeType.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.csv')) {
    return new TextDecoder().decode(bytes).slice(0, 50_000);
  }
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const raw = new TextDecoder('latin1').decode(bytes);
    const matches = [...raw.matchAll(/\(([^()]{2,160})\)\s*Tj/g)].map((match) => match[1]);
    if (matches.length === 0) {
      return '';
    }
    return matches.join('\n').slice(0, 50_000);
  }
  return '';
}
