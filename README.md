# DIMACO - Vendedores

PWA (Progressive Web App) para que los vendedores de DIMACO armen pedidos desde el celular y los compartan como PDF por WhatsApp. Funciona en Android e iOS, sinstores ni Mac: se abre un link y queda instalada.

## Qué hace la app

Formulario en pantalla táctil con:

- **Cliente** (texto libre)
- **Condición**: selector A / M
- **Productos dinámicos**: nombre + cantidad por fila, con botones para agregar/quitar
- **Checkbox "Incluye transporte"**: al marcarlo pide datos del chofer (nombre y apellido), DNI y patentes
- **Descuento 1 y Descuento 2** (porcentajes, opcionales)
- **Observaciones** (textarea, opcional; se imprime al final del PDF)

Al tocar **"Compartir por WhatsApp"**:

1. Genera un PDF (`pedido-<cliente>.pdf`) con encabezado PEDIDO/DIMACO, datos del cliente, tabla de producto/cantidad, descuentos cargados y fecha
2. Abre la hoja de compartir del sistema con el PDF adjunto para elegir WhatsApp

## Comportamiento por navegador

| Navegador | Resultado |
|---|---|
| Chrome Android / iOS 15+ | Share sheet nativa → WhatsApp → PDF adjuntado en el chat |
| Firefox Android u otro sin soporte de archivos | El PDF se descarga a "Descargas" + se abre WhatsApp con texto listo para pegar (hay que adjuntar el PDF a mano) |

WhatsApp no permite adjuntar archivos por link (`wa.me`), por eso el fallback descarga el documento.

## Offline y auto-actualización

Es una PWA instalable: en la primera visita (con internet) el service worker pre-cachea todos los assets y desde ahí la app arranca y funciona sin conexión. El borrador del pedido en curso se guarda automáticamente en el dispositivo (localStorage), así que un reinicio del navegador no lo pierde. No hay historial ni datos en la nube: todo queda en el celular del vendedor.

Al ingresar (cada vez que la app abre con internet, y cada 10 minutos mientras esté en uso) chequea si hay una versión nueva publicada. Si existe, el service worker la descarga y activa, y la app se recarga sola mostrando la versión nueva — no hace falta borrar datos del navegador ni reenviar el link. Sin internet sigue funcionando con la última versión que tenga cacheada.

## Cómo correrla en desarrollo

Requisitos: Node.js (v18 o superior).

```bash
npm install
npm run dev          # abre en http://localhost:5173
```

## Cómo buildear

```bash
npm run build        # genera la carpeta dist/
```

`dist/` es lo único que se publica. Incluye la app + manifest + service worker.

## Cómo desplegar

La forma más rápida: arrastrar la carpeta `dist/` a [Netlify Drop](https://app.netlify.com/drop) — da un link https al toque. Alternativas: Vercel, Cloudflare Pages, o deploy automatic desde este repo conectando Netlify/Vercel al branch main.

El hosting debe servir con **HTTPS** (Netlify y cia lo hacen por defecto), es requisito para que la PWA se instale y se comparta archivos.

## Instalación en el celular (usuarios finales)

1. Abrir el link publicado en Chrome (Android) o Safari (iPhone)
2. Menú del navegador → **"Agregar a pantalla de inicio"**
3. Queda instalada como app "DIMACO" con su ícono y arranca a pantalla completa, sin barra del navegador

## Stack

- **React + Vite** — app y build
- **vite-plugin-pwa** (Workbox) — manifest + service worker offline
- **jsPDF** — generación del PDF 100% en el dispositivo
- **Web Share API** — compartir a WhatsApp con adjunto

## Estructura

```
src/
  App.jsx      # formulario, PDF y lógica de compartir
  index.css    # estilos mobile-first
  main.jsx     # bootstrap
public/        # íconos PWA
vite.config.js # configuración de vite-plugin-pwa
```

La versión visible de la app está en la constante `VERSION` de `src/App.jsx` (se muestra al pie de la pantalla para saber qué build tiene cargado cada celular).
