import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function independentRequest(url, options) {
  const dir = await mkdtemp(join(tmpdir(), 'tl-http-'));
  const headersFile = join(dir, 'headers');
  const bodyFile = join(dir, 'body');
  const config = Object.entries(options.headers ?? {}).map(([name, value]) =>
    'header = ' + JSON.stringify(name + ': ' + value));
  if (options.body) config.push('data-binary = ' + JSON.stringify(options.body));
  try {
    const child = spawn('curl', [
      '--disable', '--config', '-', '--silent', '--show-error', '--http1.1',
      '--max-time', '9', '--request', options.method, '--dump-header', headersFile,
      '--output', bodyFile, '--write-out', '%{json}', url,
    ], { stdio: ['pipe', 'pipe', 'ignore'] });
    child.stdin.on('error', () => {});
    child.stdin.end(config.join('\n') + '\n');
    let output = '';
    child.stdout.setEncoding('utf8').on('data', data => { output += data; });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    const observed = JSON.parse(output);
    const timing = Object.fromEntries([
      'http_code', 'http_version', 'num_connects', 'time_namelookup', 'time_connect', 'time_appconnect',
      'time_pretransfer', 'time_posttransfer', 'time_starttransfer', 'time_total', 'size_upload',
    ].map(key => [key, observed[key]]));
    const rawHeaders = await readFile(headersFile, 'utf8').catch(() => '');
    const headers = new Headers();
    for (const line of rawHeaders.split(/\r?\n/)) {
      const sep = line.indexOf(':');
      if (sep > 0) headers.append(line.slice(0, sep), line.slice(sep + 1).trim());
    }
    if (code !== 0) {
      const error = new Error('independent HTTP request failed');
      error.transport = { code, timing, ray: headers.get('cf-ray') };
      throw error;
    }
    return { status: observed.http_code, headers, timing,
      raw: await readFile(bodyFile, 'utf8') };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
