# =============================================================================
# CValle PrintBridge — raw-print.ps1
# Envía un archivo binario como trabajo RAW a una impresora Windows.
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File raw-print.ps1
#         -PrinterName "Tickets" -FilePath "C:\Temp\job.bin"
# =============================================================================
param(
    [Parameter(Mandatory=$true)]  [string]$PrinterName,
    [Parameter(Mandatory=$true)]  [string]$FilePath
)

# Verificar que el archivo existe
if (-not (Test-Path $FilePath)) {
    Write-Error "Archivo no encontrado: $FilePath"
    exit 1
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFO {
        public string pDocName;
        public string pOutputFile;
        public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterW",
        CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool OpenPrinter(
        string szPrinter, out IntPtr hPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW",
        CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern int StartDocPrinter(
        IntPtr hPrinter, int Level, ref DOCINFO pDocInfo);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
    public static extern bool WritePrinter(
        IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
}
"@

$bytes    = [System.IO.File]::ReadAllBytes($FilePath)
$hPrinter = [IntPtr]::Zero

if (-not [RawPrinterHelper]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero)) {
    $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Error "OpenPrinter fallo (error Win32=$err) para '$PrinterName'"
    exit 1
}

try {
    $docInfo             = New-Object RawPrinterHelper+DOCINFO
    $docInfo.pDocName    = "CValle PrintBridge"
    $docInfo.pOutputFile = $null
    $docInfo.pDataType   = "RAW"

    $docId = [RawPrinterHelper]::StartDocPrinter($hPrinter, 1, [ref]$docInfo)
    if ($docId -le 0) {
        $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        throw "StartDocPrinter fallo (error Win32=$err)"
    }

    [RawPrinterHelper]::StartPagePrinter($hPrinter) | Out-Null

    $written = 0
    $ok = [RawPrinterHelper]::WritePrinter($hPrinter, $bytes, $bytes.Length, [ref]$written)
    if (-not $ok) {
        $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        throw "WritePrinter fallo (error Win32=$err)"
    }

    [RawPrinterHelper]::EndPagePrinter($hPrinter) | Out-Null
    [RawPrinterHelper]::EndDocPrinter($hPrinter) | Out-Null

    Write-Output "OK: $written bytes enviados a '$PrinterName'"
} finally {
    [RawPrinterHelper]::ClosePrinter($hPrinter) | Out-Null
}
