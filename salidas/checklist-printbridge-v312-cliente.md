# Checklist PrintBridge v3.1.2 — PC de caja

**Fecha:** ___________  
**Cliente / PC:** ___________  

## Si el exe dice "escuchando" pero el navegador no abre

1. [ ] Abrí **exactamente** `http://127.0.0.1:9100/` (no solo `localhost` si falla).
2. [ ] Probá también `http://localhost:9100/` — con v3.1.2 ambos deben andar (listen en todas las interfaces locales).
3. [ ] `http://127.0.0.1:9100/status` → JSON con `"version":"3.1.2"`.
4. [ ] `http://127.0.0.1:9100/config` en navegador redirige al panel (HTML); no es la UI de config.
5. [ ] Task Manager: un solo PrintBridge / sin `node server.js` viejo en el puerto 9100.
6. [ ] Startup: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CValle PrintBridge.bat` apunta al exe nuevo.
7. [ ] Firewall / antivirus no bloquea el exe.

## Impresión

8. [ ] Panel → Probar ticket (80mm ESC/POS).
9. [ ] Panel → Probar etiqueta (ESC/POS o TSPL según config).
10. [ ] Ticket desde POS con logo: logo + texto completo.

## Notas

_______________________________________________
