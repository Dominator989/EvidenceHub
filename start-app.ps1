$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Require-Command([string]$Name, [string]$InstallHint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Error "$Name was not found. $InstallHint"
    }
}

Require-Command "node" "Install Node.js 20 or newer from https://nodejs.org/ and try again."
Require-Command "npm" "Install Node.js, which includes npm, from https://nodejs.org/ and try again."

$nodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 20) {
    Write-Error "EvidenceHub requires Node.js 20 or newer. Found Node.js $nodeMajor."
}

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm ci
}

Write-Host "Starting EvidenceHub at http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor DarkGray
npm run dev
