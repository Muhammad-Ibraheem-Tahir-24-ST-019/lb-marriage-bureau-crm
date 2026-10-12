$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$phpBinary = Join-Path $projectRoot '.tools\php\php.exe'
$appDirectory = Join-Path $projectRoot 'app'
if (-not (Test-Path -LiteralPath $phpBinary)) { throw 'Portable PHP is missing. Install PHP 8.3+ and run php -S 127.0.0.1:8080 -t public from the app folder.' }
$listening = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
    Start-Process -FilePath $phpBinary -ArgumentList '-d','max_execution_time=120','-d','zend_extension=opcache','-d','opcache.enable_cli=1','-S','127.0.0.1:8080','-t','public' -WorkingDirectory $appDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.tools\preview-output.log') -RedirectStandardError (Join-Path $projectRoot '.tools\preview-error.log')
}
Write-Host 'Rishtahub local preview: http://127.0.0.1:8080/login'
