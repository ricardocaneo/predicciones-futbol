# Pendientes — El Juego del Mundial

> Mundial: 11 de junio 2026. Hay usuarios esperando. Prioridad = todo lo que bloquea el acceso real.

---

## 🔴 Crítico — sin esto no hay juego

### 2. Google OAuth en producción
El bug del PKCE se arregló pero nunca se probó en un entorno deployado.
- Después del deploy, hacer login con Google desde el dominio real
- Confirmar que el redirect de callback funciona correctamente
- Hay un problema pre-existente en mobile con Google OAuth — verificar si persiste en prod

### 3. Toque Maestro — verificación end-to-end
La pantalla existe pero no se confirmó que el flujo completo funcione.
- Hacer una predicción de campeón/subcampeón/goleador con un usuario real
- Verificar que se guarda en `master_touch_predictions`
- Verificar que el sistema de puntos lo considera cuando corresponda

---

## 🟡 Importante — para la experiencia del juego

### 4. exactResults en el Ranking muestra 0
El campo de marcadores exactos en la tabla de ranking siempre devuelve 0, nunca se terminó de diagnosticar.
- Investigar si el query de ranking calcula `exact_results` correctamente
- Comparar con el cálculo en `mis-pronosticos` (que sí muestra el valor correcto)

### 5. Prueba real del flujo completo de sync
Usar el próximo partido sincronizado como prueba end-to-end:
- Sync automático activa → partido pasa a "live" → puntos se calculan al terminar → ranking se actualiza
- Verificar que `newlyFinished` dispara el cálculo de puntos
- Verificar que `total_points` en `profiles` se actualiza

---

## 🟢 Pendiente / sin urgencia inmediata

### 6. Planteles — completar 15 equipos sin datos completos
Migrados desde Wikipedia con nombre y posición, pero sin `shirt_number` ni `external_api_id`:
Algeria, Australia, Ecuador, Ghana, Iran (25 jug.), Iraq, Jordan, Mexico, Paraguay, Qatar, Saudi Arabia, Senegal, Turkey, Uruguay, Uzbekistan

Cuando la API tenga los datos, usar:
```
GET /competitions/squads.json?competition_id=362&team_id=XXXX
```
Team IDs en livescore-api:
```
Algeria:1528  Australia:1440  Ecuador:1847  Ghana:214
Iran:1436     Iraq:1715       Jordan:1790   Mexico:1450
Paraguay:4040 Qatar:1427      Saudi Arabia:1432  Senegal:1460
Turkey:1744   Uruguay:1434    Uzbekistan:1776
```

### 7. Partido Egypt vs Russia — ID incorrecto
`external_api_id: '1857143'` no existe en ningún feed de livescore-api. El partido ya pasó sin sincronizarse.
- Buscar el ID correcto en livescore-api, o
- Eliminarlo desde el panel de admin si no tiene pronósticos de usuarios reales

### 8. Equipos de fases eliminatorias
Los partidos de Octavos, Cuartos, etc. hoy dicen "Winner Group A", "Runner-up Group B", etc.
Cuando avance el torneo, verificar que se actualicen automáticamente con los nombres reales de las selecciones.

---

## ✅ Completado

- **Deploy en Vercel** (2026-06-02): `predicciones-futbol-alpha.vercel.app`. Middleware sin `@supabase/ssr` (incompatible con edge runtime). Framework Preset debe estar explícitamente en Next.js en settings de Vercel.

- **Seed de jugadores** (2026-06-01): 1247 jugadores migrados. 33 equipos con datos completos de livescore-api (posición, número, external_api_id). 15 equipos con datos de Wikipedia (posición, sin número).
- Sistema de puntos implementado y funcionando
- Sync automático cada 2 minutos (pg_cron + Edge Function)
- Fallback para puntos no calculados (partidos finished con `points_breakdown IS NULL`)
- Eliminación de partidos desde admin con advertencia y recálculo de puntos
- Tooltips en estadísticas de Mis Pronósticos
- Eventos del partido en MatchCard (finalizados y en vivo), con línea divisoria home/away
- Grace period de 20 min para mostrar partidos recién terminados en "En vivo"
- Toggle "Anteriores" en la sección de partidos finalizados
