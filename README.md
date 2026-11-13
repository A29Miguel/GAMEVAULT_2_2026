# GameVault Frontend

Frontend web de demostración para el sistema de registro de ventas y productos de una tienda de videojuegos.

## Tecnologías
- React: componentes e interfaz.
- Vite: servidor de desarrollo y compilación.
- Tailwind CSS: integración del framework de estilos (junto con CSS personalizado).
- Lucide React: iconos.
- Supabase JS: cliente preparado para conectar con Supabase.
- Vercel: opción de despliegue.

## Requisitos
- Node.js 20.19+ o 22.12+
- npm

## Ejecutar localmente
1. Descomprime el proyecto.
2. Abre una terminal en la carpeta `gamevault-frontend`.
3. Ejecuta:

```bash
npm install
npm run dev
```

4. Abre la dirección local que muestre Vite (normalmente http://localhost:5173).

## Funcionalidades de demostración
- Panel principal con indicadores.
- Registro, edición, eliminación y búsqueda de productos.
- Consulta de inventario y alertas visuales de stock bajo.
- Carrito y registro de ventas.
- Descuento automático del stock al registrar una venta.
- Historial de ventas.
- Vista demostrativa de usuarios.

Los datos de demostración se guardan en `localStorage` del navegador. No representan todavía datos persistidos en Supabase.

## Conectar Supabase
1. En Supabase abre Project Settings > API.
2. Copia Project URL y la clave publishable (o anon legacy).
3. Crea un archivo `.env.local` a partir de `.env.example`.
4. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. Reinicia el servidor de Vite.

**Importante:** el cliente Supabase está preparado en `src/lib/supabase.js`, pero las operaciones CRUD de esta primera entrega todavía utilizan almacenamiento local del navegador. La conexión real requiere implementar políticas RLS y adaptar las operaciones a las tablas `usuarios`, `productos` y `ventas`. Nunca coloques una `service_role` o clave secreta en el frontend.

## Estructura
- `src/App.jsx`: pantallas y lógica de la interfaz.
- `src/index.css`: estilos responsive.
- `src/lib/storage.js`: persistencia local de demostración.
- `src/lib/supabase.js`: inicialización del cliente Supabase.

## Compilar
```bash
npm run build
```
El resultado se genera en `dist/`, listo para desplegar en Vercel.
