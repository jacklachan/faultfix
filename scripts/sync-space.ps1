[CmdletBinding()]
param(
  [string]$SpaceId = "jacklachan/faultfix"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$spacePath = Join-Path $repoRoot "hosted-ranking-space"
$pending = git -C $repoRoot status --porcelain -- hosted-ranking-space

if ($pending) {
  throw "Refusing to deploy uncommitted hosted-ranking-space changes. Commit them first."
}

$revision = (git -C $repoRoot rev-parse --short HEAD).Trim()
$uploadProgram = @'
import sys
from huggingface_hub import HfApi

space_id, folder_path, revision = sys.argv[1:]
HfApi().upload_folder(
    repo_id=space_id,
    repo_type="space",
    folder_path=folder_path,
    ignore_patterns=["__pycache__/**"],
    commit_message=f"Sync Faultfix Space from GitHub {revision}",
)
'@

$uploadProgram | py - $SpaceId $spacePath $revision
Write-Host "Published $SpaceId from Git commit $revision."
