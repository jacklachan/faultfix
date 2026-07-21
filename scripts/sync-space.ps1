[CmdletBinding()]
param(
  [string]$SpaceId = "jacklachan/faultfix",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$spacePath = Join-Path $repoRoot "hosted-ranking-space"
$approvedSpaceFiles = @("README.md", "app.py", "faultfix_policy.py", "requirements.txt")
$remoteCleanupPatterns = @(
  "__pycache__/**", "**/__pycache__/**", "*.pyc", "**/*.pyc", "*.egg-info/**", "**/*.egg-info/**",
  ".env", ".env.*", "**/.env", "**/.env.*"
)

if (-not (Test-Path -LiteralPath $spacePath -PathType Container)) {
  throw "Space source directory does not exist: $spacePath"
}

$pending = git -C $repoRoot status --porcelain --untracked-files=all -- hosted-ranking-space
if ($LASTEXITCODE -ne 0) {
  throw "Could not inspect the Git status for hosted-ranking-space."
}
if ($pending) {
  throw "Refusing to deploy uncommitted hosted-ranking-space changes. Commit them first."
}

$localFiles = @(
  Get-ChildItem -LiteralPath $spacePath -Force -Recurse -File |
    ForEach-Object {
      $_.FullName.Substring($spacePath.Length).TrimStart([char[]]@('\', '/')) -replace "\\", "/"
    }
)

if ($localFiles | Where-Object { $_ -match "(^|/)\.env($|\.)" }) {
  throw "Refusing to deploy while a local .env file exists in hosted-ranking-space. It will not be uploaded."
}

$unexpectedLocalFiles = @(
  $localFiles | Where-Object {
    ($_ -notin $approvedSpaceFiles) -and ($_ -notmatch "^__pycache__/.*\.pyc$") -and ($_ -notmatch "(^|/)[^/]+\.egg-info/.*$")
  }
)
if ($unexpectedLocalFiles) {
  throw "Refusing to deploy unexpected hosted-ranking-space files: $($unexpectedLocalFiles -join ', ')"
}

foreach ($relativePath in $approvedSpaceFiles) {
  $sourcePath = Join-Path $spacePath $relativePath
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Required Space source file is missing: $relativePath"
  }
  if (((Get-Item -LiteralPath $sourcePath).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "Refusing to deploy a linked Space source file: $relativePath"
  }

  git -C $repoRoot ls-files --error-unmatch -- "hosted-ranking-space/$relativePath" *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Required Space source file is not tracked by Git: $relativePath"
  }
}

$revision = (git -C $repoRoot rev-parse --verify HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or -not $revision) {
  throw "Could not resolve the current Git commit."
}

$allowArgument = $approvedSpaceFiles -join ","
$cleanupArgument = $remoteCleanupPatterns -join ","
$dryRunValue = $DryRun.ToString().ToLowerInvariant()
$uploadProgram = @'
import sys
from fnmatch import fnmatch

from huggingface_hub import HfApi

space_id, folder_path, revision, dry_run, allow_argument, cleanup_argument = sys.argv[1:]
allow_patterns = allow_argument.split(",")
delete_patterns = cleanup_argument.split(",")
api = HfApi()
parent_commit = api.repo_info(space_id, repo_type="space").sha
if not parent_commit:
    raise RuntimeError("The Space did not return a commit SHA; refusing an unguarded deploy.")

if dry_run == "true":
    remote_files = api.list_repo_files(space_id, repo_type="space", revision=parent_commit)
    stale_files = sorted(
        path for path in remote_files if any(fnmatch(path, pattern) for pattern in delete_patterns)
    )
    print(f"Would sync {space_id} from Git {revision} against Hub commit {parent_commit}.")
    print("Upload allowlist: " + ", ".join(allow_patterns))
    print("Delete stale remote files: " + (", ".join(stale_files) or "none"))
    sys.exit(0)

commit = api.upload_folder(
    repo_id=space_id,
    repo_type="space",
    folder_path=folder_path,
    allow_patterns=allow_patterns,
    delete_patterns=delete_patterns,
    parent_commit=parent_commit,
    commit_message=f"Sync Faultfix Space from GitHub {revision[:12]}",
    commit_description=f"Source Git commit: {revision}",
)
print(f"Published {space_id} from Git {revision} (Hub commit {commit.oid}).")
'@

$uploadProgram | py - $SpaceId $spacePath $revision $dryRunValue $allowArgument $cleanupArgument
if ($LASTEXITCODE -ne 0) {
  throw "Space sync failed. The Hub may have changed concurrently; inspect it and run the script again."
}
