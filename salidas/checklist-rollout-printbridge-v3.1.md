# Checklist rollout PrintBridge v3.1.0

**Fecha:** ___________  
**Tienda / PC:** ___________  
**Operador:** ___________

## Pre-requisitos

- [ ] Migración Supabase `20260620100001_payload_tickets_logo.sql` aplicada (si se espera logo)
- [ ] Logo subido y "Mostrar logo en ticket" activo (opcional)
- [ ] Backup del exe PrintBridge actual

## Antes del swap

- [ ] Anotar versión actual: `GET http://localhost:9100/status` → `version`: _______
- [ ] Anotar impresora: `printerName`: _______
- [ ] Reproducir bug si aplica (vale con Total / sin logo térmico)

## Swap

- [ ] Cerrar PrintBridge
- [ ] Copiar `CValle-PrintBridge-v3.1.0.exe` sobre el anterior (misma carpeta)
- [ ] Iniciar nuevo exe
- [ ] **Sin** reconfigurar en localhost:9100

## Después del swap

- [ ] `/status` → `version: 3.1.0`
- [ ] `/status` → misma `printerName` que antes
- [ ] Configuración → Ticket en web: badge verde + v3.1.0
- [ ] Ticket venta POS: precios OK, logo si corresponde
- [ ] Vale POS: **sin** Total, ticket N° destacado
- [ ] Devolución: sin regresión
- [ ] Etiqueta producto: impresora etiqueta OK (si estaba configurada)
- [ ] Apagar PrintBridge → web imprime con diálogo (fallback OK)

## Casos especiales

| Escenario | Resultado esperado |
|-----------|-------------------|
| v2 → v3.1 primera vez | Config migrada desde `CValle PrintBridge` |
| v3.0 → v3.1 | Config v3 intacta |
| Solo exe nuevo, misma config | Impresora sin cambios |

## Notas

_______________________________________________
