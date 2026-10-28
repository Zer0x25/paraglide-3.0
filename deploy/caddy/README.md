# Exponer Paraglide por HTTPS con Caddy

Caddy termina TLS y envía el tráfico del dominio al servicio Web. El contenedor Web sirve el build estático de Vite+ y su `server.mjs` aplica el fallback SPA y proxyfica `/api/*` hacia la API interna. Así el navegador usa el mismo origen para la aplicación y sus solicitudes API.

## Pasos

1. **DNS:** apuntar el dominio a la IP pública del servidor.
2. **Caddy:** agregar al Caddyfile de `infra-core` el bloque de `deploy/caddy/Caddyfile.example`. Si se usa `caddy-docker-proxy`, el upstream Web escucha en el puerto interno `3000`:
   ```yaml
   labels:
     caddy: parapente.midominio.com
     caddy.reverse_proxy: "{{upstreams 3000}}"
   ```
3. **API interna:** configurar `INTERNAL_API_URL` para que `server.mjs` alcance el servicio API desde la red Docker (por defecto `http://api:3001`). No exponer credenciales de base de datos ni claves de servicio en el cliente.
4. **Variables de entorno:** `PUBLIC_WEB_URL=https://parapente.midominio.com` para links compartidos. Configurar `ALLOWED_ORIGINS` solo si la API se expone directamente bajo otro origen; no se necesita para el proxy del mismo origen.
5. **Aplicar cambios:** usar el procedimiento de despliegue documentado en [`docs/ci-cd.md`](../../docs/ci-cd.md). No construir ni desplegar manualmente sobre producción sin autorización.

## Verificación

```bash
curl -sI https://parapente.midominio.com/login
curl -s https://parapente.midominio.com/api/public/health
```

El health check de despliegue puede seguir comprobando el puerto local del servidor. Caddy renueva automáticamente los certificados cuando el dominio y el acceso externo están configurados correctamente. HTTPS también habilita las APIs del navegador que requieren un contexto seguro.
