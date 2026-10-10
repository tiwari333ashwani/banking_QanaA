param (
    [Parameter(Mandatory=$true)]
    [string]$PdfPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PdfPath)) {
    Write-Error "PDF file not found: $PdfPath"
    exit 1
}

# 1. Initialize WinRT for OCR
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Globalization.Language, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

$lang = New-Object Windows.Globalization.Language("en-US")
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
if (-not $engine) {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}

if (-not $engine) {
    Write-Error "Windows OCR Engine could not be initialized on this machine."
    exit 1
}

# 2. Extract images via Python script into a temporary folder
$tempDir = Join-Path $env:TEMP ("ocr_" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    $pythonExe = Join-Path (Get-Location) "venv\Scripts\python.exe"
    if (-not (Test-Path $pythonExe)) {
        $pythonExe = "python"
    }

    $extractPy = @"
import pypdf, sys, os
pdf_path = sys.argv[1]
out_dir = sys.argv[2]
reader = pypdf.PdfReader(pdf_path)
for i, page in enumerate(reader.pages):
    for j, img in enumerate(page.images):
        out_file = os.path.join(out_dir, f'page_{i+1:03d}_{j+1:02d}.jpg')
        with open(out_file, 'wb') as f:
            f.write(img.data)
"@
    $pyScriptPath = Join-Path $tempDir "extract.py"
    [System.IO.File]::WriteAllText($pyScriptPath, $extractPy, [System.Text.Encoding]::UTF8)

    & $pythonExe $pyScriptPath (Resolve-Path $PdfPath).Path $tempDir | Out-Null

    $imageFiles = Get-ChildItem -Path $tempDir -Filter "*.jpg" | Sort-Object Name
    $extractedText = ""

    foreach ($img in $imageFiles) {
        $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($img.FullName)) ([Windows.Storage.StorageFile])
        $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $ocrResult = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

        if ($ocrResult -and $ocrResult.Text) {
            $extractedText += "`n`n" + $ocrResult.Text
        }
    }

    Write-Output $extractedText.Trim()
}
finally {
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
