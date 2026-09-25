[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$testingDirectory = Split-Path -Parent $PSScriptRoot
$projectDirectory = Split-Path -Parent $testingDirectory
$solutionPath = Join-Path $projectDirectory "Shopera.slnx"

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw ".NET SDK was not found. Install the .NET 10 SDK first."
}

Write-Host "Restoring Shopera packages..."
dotnet restore $solutionPath

Write-Host "Building Shopera..."
dotnet build $solutionPath --no-restore

Write-Host "Running Shopera tests..."
dotnet test $solutionPath --no-build

Write-Host "All build and test commands completed successfully."
