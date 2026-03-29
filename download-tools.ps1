# download-tools.ps1
$binDir = Join-Path $PSScriptRoot "resources\bin"
if (!(Test-Path $binDir)) {
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
}

Write-Host "Checking video download tools..." -ForegroundColor Cyan

# 1. Download yt-dlp
$ytDlpPath = Join-Path $binDir "yt-dlp.exe"
if (!(Test-Path $ytDlpPath)) {
    Write-Host "Downloading yt-dlp.exe..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytDlpPath
        Write-Host "yt-dlp downloaded successfully." -ForegroundColor Green
    } catch {
        Write-Error "Failed to download yt-dlp: $_"
        exit 1
    }
} else {
    Write-Host "yt-dlp.exe already exists." -ForegroundColor Green
}

# 2. Download ffmpeg
$ffmpegPath = Join-Path $binDir "ffmpeg.exe"
if (!(Test-Path $ffmpegPath)) {
    Write-Host "Downloading ffmpeg (gyan.dev)..." -ForegroundColor Yellow
    $ffmpegZip = Join-Path $binDir "ffmpeg.zip"
    try {
        # Using gyan.dev as it's a reliable source for Windows builds
        Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $ffmpegZip
        
        Write-Host "Extracting ffmpeg..." -ForegroundColor Yellow
        Expand-Archive -Path $ffmpegZip -DestinationPath $binDir -Force
        
        # Move ffmpeg.exe to bin root
        $extractedFfmpeg = Get-ChildItem -Path $binDir -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
        if ($extractedFfmpeg) {
            Move-Item -Path $extractedFfmpeg.FullName -Destination $ffmpegPath -Force
            Write-Host "ffmpeg extracted successfully." -ForegroundColor Green
        } else {
            Write-Error "Could not find ffmpeg.exe in the downloaded zip."
        }
        
        # Cleanup
        Remove-Item $ffmpegZip -Force
        # Remove extracted folders (folders starting with ffmpeg-)
        Get-ChildItem -Path $binDir -Directory -Filter "ffmpeg-*" | Remove-Item -Recurse -Force
        
    } catch {
        Write-Error "Failed to download/install ffmpeg: $_"
        exit 1
    }
} else {
    Write-Host "ffmpeg.exe already exists." -ForegroundColor Green
}

Write-Host "All tools are ready!" -ForegroundColor Cyan
