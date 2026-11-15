import { packager } from '@electron/packager';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const { name, productName, description, version, main } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const releases = path.join(root, 'releases', `v${version}`);
const electronVersion = '45.3.3';
const targets = ['mac-arm64', 'mac-x64', 'windows-x64', 'windows-arm64'];
const requested = process.argv.slice(2);
const selected = requested.length ? [...new Set(requested)] : targets;

if (process.platform !== 'darwin' || selected.some(target => !targets.includes(target))) {
  console.error(`Depuis macOS, utilisez npm run dist -- [${targets.join(' | ')}]. Sans argument, les quatre archives sont générées.`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} a échoué (${result.status ?? result.signal}).`);
}

const work = await mkdtemp(path.join(tmpdir(), 'chickenwing-build-'));
try {
  const source = path.join(work, 'source');
  await mkdir(source);
  await writeFile(path.join(source, 'package.json'), JSON.stringify({ name, productName, description, version, main }));
  for (const entry of ['index.html', 'src', 'public', 'desktop/main.cjs']) {
    const destination = path.join(source, entry);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, entry), destination, {
      recursive: true,
      filter: file => !path.basename(file).startsWith('.')
    });
  }
  await mkdir(releases, { recursive: true });
  const staged = new Set();

  for (const target of selected) {
    const [os, arch] = target.split('-');
    const mac = os === 'mac';
    const [build] = await packager({
      dir: source,
      out: path.join(work, 'builds'),
      name: productName,
      appVersion: version,
      platform: mac ? 'darwin' : 'win32',
      arch,
      electronVersion,
      asar: true,
      icon: path.join(root, 'desktop', `ChickenWing.${mac ? 'icns' : 'ico'}`),
      appBundleId: 'app.chickenwing.desktop',
      appCategoryType: 'public.app-category.music',
      ...(mac ? { osxSign: {
        identity: '-',
        identityValidation: false,
        preAutoEntitlements: false,
        preEmbedProvisioningProfile: false,
        optionsForFile: () => ({ hardenedRuntime: false, timestamp: 'none' }),
        continueOnError: false
      } } : { win32metadata: { CompanyName: productName } })
    });
    const archive = `${productName}-${version}-${target}.zip`;
    const stagedArchive = path.join(work, archive);
    const app = path.join(build, `${productName}.app`);
    if (mac) run('codesign', ['--verify', '--deep', '--strict', app]);
    run('ditto', ['-c', '-k', '--norsrc', '--keepParent', mac ? app : build, stagedArchive]);
    staged.add(archive);
  }

  const existing = await readdir(releases);
  const archives = targets.map(target => `${productName}-${version}-${target}.zip`)
    .filter(file => staged.has(file) || existing.includes(file)).sort();
  const checksums = [];
  for (const file of archives) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path.join(staged.has(file) ? work : releases, file))) hash.update(chunk);
    checksums.push(`${hash.digest('hex')}  ${file}`);
  }
  const stagedChecksums = path.join(work, 'SHA256SUMS.txt');
  await writeFile(stagedChecksums, `${checksums.join('\n')}\n`);
  for (const archive of staged) {
    const destination = path.join(releases, archive);
    await rename(path.join(work, archive), destination);
    console.log(destination);
  }
  await rename(stagedChecksums, path.join(releases, 'SHA256SUMS.txt'));
} finally {
  await rm(work, { recursive: true, force: true });
}
