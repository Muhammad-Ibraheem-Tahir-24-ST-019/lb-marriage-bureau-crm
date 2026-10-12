"""Verify the actual upload layout with production dependencies and PHP only.

Uses a separate local SQLite database outside the distribution, a random secret,
and a temporary PHP process. No Node server or frontend build process is started.
"""
from pathlib import Path
import base64
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
release=(ROOT/'dist'/sys.argv[1]).resolve()
assert release.parent==(ROOT/'dist').resolve()
private=release/'rishtahub'
public=release/'public_html'
php=ROOT/'.tools/php/php.exe'
db=ROOT/'.tools'/('release-check-'+secrets.token_hex(4)+'.sqlite')
db.touch()
env=os.environ.copy()
env.update(APP_ENV='production',APP_DEBUG='false',APP_KEY='base64:'+base64.b64encode(os.urandom(32)).decode(),APP_URL='http://127.0.0.1:8081',DB_CONNECTION='sqlite',DB_DATABASE=str(db),SESSION_DRIVER='database',SESSION_SECURE_COOKIE='false',CACHE_STORE='database',DEMO_MODE='false',MAIL_MAILER='log')
subprocess.run([str(php),'artisan','migrate','--force','--no-ansi'],cwd=private,env=env,check=True)
log=open(ROOT/'.tools/release-server.log','w')
server=subprocess.Popen([str(php),'-S','127.0.0.1:8081','-t',str(public)],cwd=private,env=env,stdout=log,stderr=log,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
try:
 for attempt in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:8081/up') as r:assert r.status==200
   break
  except OSError:time.sleep(.3)
 with urllib.request.urlopen('http://127.0.0.1:8081/login') as r:
  html=r.read().decode();assert 'build/assets/' in html;assert r.headers['Content-Security-Policy'];assert 'Vite' not in html
 result=subprocess.run(['node',str(ROOT/'app/tests/browser/release-smoke.mjs')],cwd=ROOT/'app',env=env,capture_output=True,text=True)
 if result.returncode:
  print(result.stderr)
  raise RuntimeError('Release browser check failed')
 print(result.stdout)
 print(json.dumps({'release':str(release),'php_only_smoke':'passed','production_mode':True,'demo_seeded':False}))
finally:
 server.terminate();server.wait(timeout=10);log.close()
