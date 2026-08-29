# Aktiviranje produkcijskog SEO worker-a

`public/_worker.js` se kopira u `dist/_worker.js` pri `npm run build`. Cloudflare Pages ga automatski pokreće u Advanced mode-u kada je deploy output direktorijum `dist`.

U Cloudflare Pages projektu za produkciju postaviti sledeće varijable:

- `SITE_URL=https://dajashop.rs`
- `DAJA_API_BASE_URL=https://api.dajashop.rs/api/v1`

Zatim napraviti novi production deploy kroz postojeću Git integraciju ili Pages deploy za `dist` direktorijum.

Nakon objave proveriti:

```powershell
Invoke-WebRequest -UseBasicParsing https://dajashop.rs/product/<slug> -Headers @{ 'User-Agent' = 'Googlebot' }
Invoke-WebRequest -UseBasicParsing https://dajashop.rs/product/nepostojeci-proizvod
```

Prvi odgovor mora sadržati naziv artikla, njegov canonical i `application/ld+json`; drugi mora vratiti HTTP 404. Promenjeni slug mora vratiti HTTP 301 na novi URL.
