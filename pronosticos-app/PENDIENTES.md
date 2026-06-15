# Pendientes — El Juego del Mundial

> Mundial: 11 de junio 2026. Hay usuarios esperando. Prioridad = todo lo que bloquea el acceso real.

---

## 🔴 Crítico — sin esto no hay juego

### 1. Toque Maestro — verificación end-to-end
La pantalla existe pero no se confirmó que el flujo completo funcione.
- Hacer una predicción de campeón/subcampeón/goleador con un usuario real
- Verificar que se guarda en `master_touch_predictions`
- Verificar que el sistema de puntos lo considera cuando corresponda

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

### 7. Verificar horarios de partidos de fase eliminatoria
Cuando se carguen los partidos de Octavos, Cuartos, Semis y Final, comparar los `starts_at` de la DB contra la API de livescore antes de que se jueguen.

**Contexto:** En la fase de grupos se encontraron 5 partidos con `starts_at` incorrecto (el más grave: Australia vs Turkey tenía 15h de diferencia, nunca se sincronizó). El patrón es que los IDs `1850xxx` y `1852xxx` son los más propensos a tener el horario mal cargado.

**Cómo hacerlo (pedirle a Claude):**
> "Compara los `starts_at` de todos los partidos de fase eliminatoria en la DB contra lo que devuelve la API de livescore. Usa `competition_id=362` en el endpoint `/fixtures/matches.json` y cruza por `external_api_id`."

**Cuándo:** Ni bien se carguen los partidos de Octavos de Final (aprox. 30 de junio 2026).

### 8. Partido Egypt vs Russia — ID incorrecto
`external_api_id: '1857143'` no existe en ningún feed de livescore-api. El partido ya pasó sin sincronizarse.
- Buscar el ID correcto en livescore-api, o
- Eliminarlo desde el panel de admin si no tiene pronósticos de usuarios reales

### 8. Equipos de fases eliminatorias
Los partidos de Octavos, Cuartos, etc. hoy dicen "Winner Group A", "Runner-up Group B", etc.
Cuando avance el torneo, verificar que se actualicen automáticamente con los nombres reales de las selecciones.

---

## ✅ Completado

- **Sync automático funcionando end-to-end** (2026-06-12): Edge Function con `--no-verify-jwt` para que el cron pueda llamarla. Puntos calculados vía RPCs SECURITY DEFINER (`edge_get_pending_match_data`, `edge_save_points_batch`, `edge_recalculate_group_standings`) porque el key `sb_secret_...` no bypasea RLS en queries directas. Trigger `validate_prediction_window` corregido para no bloquear updates de puntos.
- **Tabla del mundial actualizada automáticamente** (2026-06-12): `group_standings` se recalcula desde cero al terminar cada partido de fase grupal.
- **Ranking: desempate por marcadores exactos** (2026-06-12): en caso de igualdad de puntos, gana quien tiene más resultados exactos.
- **Google OAuth en producción** (2026-06-11): funciona en `juegomundial.fluxio.cl`. El problema era solo en localhost.
- **Dominio personalizado** (2026-06-10): `juegomundial.fluxio.cl` configurado con Cloudflare CNAME + SSL de Vercel.
- **Home page con datos reales** (2026-06-10): partidos en vivo, próximos y top 3 ranking desde Supabase. CTA de registro para usuarios no logueados.
- **Tema light/dark persistente** (2026-06-10): localStorage + cookie + profiles.theme. ThemeRestorer evita que router.refresh() pise la clase.
- **Admin: gestión de usuarios** (2026-06-10): pestaña Usuarios con dar de baja (invisible para otros, historial conservado) y eliminar con advertencia.
- **Admin: fix borrado de partidos** (2026-06-10): eliminación y recálculo de puntos vía SECURITY DEFINER para evitar problemas de permisos del cliente JS.
- **Deploy en Vercel** (2026-06-02): `predicciones-futbol-alpha.vercel.app`. Middleware sin `@supabase/ssr` (incompatible con edge runtime). Framework Preset debe estar explícitamente en Next.js en settings de Vercel.
- **Seed de jugadores** (2026-06-01): 1247 jugadores migrados. 33 equipos con datos completos de livescore-api (posición, número, external_api_id). 15 equipos con datos de Wikipedia (posición, sin número).
- Sistema de puntos implementado y funcionando
- Tooltips en estadísticas de Mis Pronósticos
- Eventos del partido en MatchCard (finalizados y en vivo), con línea divisoria home/away
- Grace period de 20 min para mostrar partidos recién terminados en "En vivo"
- Toggle "Anteriores" en la sección de partidos finalizados
