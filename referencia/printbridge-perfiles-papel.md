# PrintBridge — perfiles de papel

| Ancho | Cols (Font A) | Charset default (install nueva) | Logo canvas dots | Reset post-logo |
|-------|---------------|----------------------------------|------------------|-----------------|
| 58 mm | 32 | PC437_USA | 384 | Fuerte (ESC @ + Font A) — clones POS-58 |
| 76 mm | 42 | PC858_EURO | 512 | Suave |
| 80 mm | 48 | PC858_EURO | 512 | Suave (initHardware + charset) |

**Drivers tip:**
- 80mm Epson / genéricas ESC/POS: Generic/Text Only o Epson APD (lo que ya imprimía RAW).
- 58mm POS-58 / ITER04: POS-58 driver o Generic/Text Only con passthrough RAW.

La config guardada en `%APPDATA%\CVallePrintBridge\config.json` **no se pisa** el `characterSet` existente al actualizar.
