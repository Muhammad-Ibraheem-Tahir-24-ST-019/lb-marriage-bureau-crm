"""Create a PHP-only Hostinger distribution with precompiled React assets.

Run from the repository root after `npm run build` and the test suites pass.
No frontend build, Composer install, or Node runtime is required on the host.
"""
from pathlib import Path
import datetime
import json
import shutil
import subprocess
import zipfile
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'app'
STAMP = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
RELEASE = (ROOT / 'dist' / (sys.argv[1] if len(sys.argv)>1 else 'hostinger-' + STAMP)).resolve()
assert RELEASE.parent == (ROOT / 'dist').resolve() and RELEASE.name.startswith('hostinger-')
PRIVATE = RELEASE / 'rishtahub'
PUBLIC = RELEASE / 'public_html'
PHP = ROOT / '.tools/php/php.exe'
COMPOSER = ROOT / '.tools/composer.phar'

assert (SOURCE / 'public/build/manifest.json').exists(), 'Build frontend assets first.'
reuse_deps = (PRIVATE / 'vendor/autoload.php').exists() and (PRIVATE / 'composer.lock').read_bytes() == (SOURCE / 'composer.lock').read_bytes()
PRIVATE.mkdir(parents=True, exist_ok=len(sys.argv)>1)
for name in ['app', 'config', 'routes']:
    shutil.copytree(SOURCE / name, PRIVATE / name, dirs_exist_ok=True)
shutil.copytree(SOURCE / 'bootstrap', PRIVATE / 'bootstrap', ignore=shutil.ignore_patterns('cache'), dirs_exist_ok=True)
(PRIVATE / 'bootstrap/cache').mkdir(exist_ok=True)
shutil.copytree(SOURCE / 'database/migrations', PRIVATE / 'database/migrations', dirs_exist_ok=True)
(PRIVATE / 'database/seeders').mkdir(exist_ok=True)
shutil.copytree(SOURCE / 'resources/views', PRIVATE / 'resources/views', dirs_exist_ok=True)
for name in ['app/private', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs']:
    (PRIVATE / 'storage' / name).mkdir(parents=True, exist_ok=True)
for name in ['artisan', 'composer.json', 'composer.lock', '.env.example']:
    shutil.copy2(SOURCE / name, PRIVATE / name)
shutil.copytree(SOURCE / 'public', PUBLIC, ignore=shutil.ignore_patterns('hot', 'storage'), dirs_exist_ok=True)
index = (PUBLIC / 'index.php').read_text(encoding='utf-8-sig')
index = index.replace("__DIR__.'/../storage", "__DIR__.'/../rishtahub/storage")
index = index.replace("__DIR__.'/../vendor", "__DIR__.'/../rishtahub/vendor")
index = index.replace("__DIR__.'/../bootstrap", "__DIR__.'/../rishtahub/bootstrap")
index = index.replace('$app->handleRequest', '$app->usePublicPath(__DIR__);\n\n$app->handleRequest')
(PUBLIC / 'index.php').write_text(index, encoding='utf-8')
# The source dependency lock is reused. Development packages and demo data are excluded.
if not reuse_deps:
    subprocess.run([str(PHP), str(COMPOSER), 'install', '--no-dev', '--prefer-dist', '--optimize-autoloader', '--no-interaction', '--no-scripts'], cwd=PRIVATE, check=True)
subprocess.run([str(PHP), 'artisan', 'package:discover', '--no-ansi'], cwd=PRIVATE, check=True)
shutil.copy2(ROOT / 'HOSTINGER-SETUP.md', RELEASE / 'START-HERE.md')
shutil.copy2(ROOT / 'VERIFICATION.md', RELEASE / 'VERIFICATION.md')
for p in PRIVATE.rglob('*.php'):
    if 'vendor' in p.parts:
        continue
    # PowerShell 5 creates UTF-8 BOMs; PHP sources must not emit a BOM before headers.
    raw=p.read_bytes()
    if raw.startswith(b'\xef\xbb\xbf'):
        p.write_bytes(raw[3:])
assert not (PRIVATE / '.env').exists()
assert not list(PRIVATE.rglob('*.sqlite'))
assert not (PRIVATE / 'node_modules').exists()
manifest = json.loads((PUBLIC / 'build/manifest.json').read_text())
for entry in manifest.values():
    assert (PUBLIC / 'build' / entry['file']).is_file()
    for css in entry.get('css', []):
        assert (PUBLIC / 'build' / css).is_file()
archive = ROOT / 'dist' / 'Rishtahub-Hostinger.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for file in RELEASE.rglob('*'):
        if file.is_file():
            relative=file.relative_to(RELEASE).as_posix()
            if relative.startswith('rishtahub/storage/'):
                continue
            if relative.startswith('public_html/build/') and not (SOURCE/'public'/file.relative_to(PUBLIC)).exists():
                continue
            z.write(file, file.relative_to(RELEASE).as_posix())
        elif not any(file.iterdir()):
            z.writestr(file.relative_to(RELEASE).as_posix() + '/', '')
    for name in ['app/private', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs']:
        entry='rishtahub/storage/'+name+'/'
        if entry not in z.namelist():
            z.writestr(entry,'')
print(json.dumps({'release':str(RELEASE),'zip':str(archive),'bytes':archive.stat().st_size}))
