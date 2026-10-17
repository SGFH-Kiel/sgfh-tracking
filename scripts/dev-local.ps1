# Local Development Script for Windows PowerShell
# Starts Firebase emulators, seeds test data, optionally restores a backup, and launches the React app
#
# Usage:
#   npm run dev:win
#   npm run dev:win -- -BackupDir backup/2026-05-03T15-16-26   # Testdaten + Backup (nur in den Emulator)
#   npm run dev:win -- -SkipSeed                              # ohne Testdaten

param(
    [string]$BackupDir = "",
    [switch]$SkipRestore,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

function Write-Status($msg) {
    Write-Host "$Green[dev-local]$Reset $msg"
}

function Write-Warning($msg) {
    Write-Host "$Yellow[dev-local]$Reset $msg"
}

function Write-Error($msg) {
    Write-Host "$Red[dev-local]$Reset $msg"
}

# Der Firestore-Emulator braucht Java 11+. Ist nur ein älteres Java im PATH, wird – falls vorhanden –
# das mit Android Studio gelieferte JDK verwendet (nur für diesen Prozess und seine Kindprozesse).
function Get-JavaMajorVersion($javaExe) {
    try {
        $output = & $javaExe -version 2>&1 | Out-String
        if ($output -match 'version "(\d+)(\.(\d+))?') {
            $major = [int]$Matches[1]
            if ($major -eq 1 -and $Matches[3]) { $major = [int]$Matches[3] }
            return $major
        }
    } catch {}
    return 0
}

$javaCandidates = @()
if ($env:JAVA_HOME) { $javaCandidates += (Join-Path $env:JAVA_HOME "bin\java.exe") }
$javaCandidates += "java"
$javaCandidates += (Join-Path $env:ProgramFiles "Android\Android Studio\jbr\bin\java.exe")

$javaOk = $false
foreach ($candidate in $javaCandidates) {
    if ((Get-JavaMajorVersion $candidate) -ge 11) {
        if ($candidate -ne "java") {
            $env:JAVA_HOME = Split-Path (Split-Path $candidate)
            $env:PATH = "$(Join-Path $env:JAVA_HOME 'bin');$env:PATH"
        }
        $javaOk = $true
        break
    }
}
if (-not $javaOk) {
    Write-Error "Java 11 oder neuer wird für den Firestore-Emulator benötigt (JAVA_HOME setzen oder JDK installieren)."
    exit 1
}

# Check if emulators are already running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9099" -Method HEAD -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Warning "Firestore emulator already running on port 9099"
    $emulatorRunning = $true
} catch {
    $emulatorRunning = $false
}

# Start emulators if not running
if (-not $emulatorRunning) {
    Write-Status "Starting Firebase emulators..."
    Start-Process -FilePath "firebase" -ArgumentList "emulators:start", "--only", "firestore,auth", "--project", "sgfh-tracking-test" -WindowStyle Normal
    
    # Wait for Firestore emulator
    Write-Status "Waiting for Firestore emulator on port 9099..."
    $maxAttempts = 30
    $attempts = 0
    $connected = $false
    
    while ($attempts -lt $maxAttempts -and -not $connected) {
        Start-Sleep -Seconds 1
        $attempts++
        try {
            Invoke-WebRequest -Uri "http://localhost:9099" -Method HEAD -TimeoutSec 1 -ErrorAction Stop | Out-Null
            $connected = $true
        } catch {
            Write-Host "." -NoNewline
        }
    }
    
    if (-not $connected) {
        Write-Error "Failed to connect to Firestore emulator"
        exit 1
    }
    
    Write-Status "Firestore emulator is ready!"
    Start-Sleep -Seconds 2
}

# Seed test accounts and data (idempotent). Runs before a restore so restored documents win.
if (-not $SkipSeed) {
    Write-Status "Seeding emulator with test data..."
    npm run seed
}

# Restore backup if specified (always into the emulator, see .env.emulator)
if ($BackupDir -and -not $SkipRestore) {
    if (Test-Path $BackupDir) {
        Write-Status "Restoring backup from $BackupDir..."
        # Uses FIREBASE_PROJECT_ID / USE_EMULATOR / SKIP_WAIT from .env.emulator
        npm run restore -- $BackupDir
    } else {
        Write-Warning "Backup directory not found: $BackupDir"
    }
}

# Start React app
Write-Status "Starting React app..."
Write-Status "App will be available at http://localhost:3000"
Write-Status "Emulator UI available at http://localhost:4000"
Write-Host ""

npm run start:emulator
