# W'Fraganc listo para GitHub

Este proyecto ya quedó preparado para subirlo a un repositorio de GitHub como una app Node.js completa.

## Qué incluye

- login y registro
- base de datos SQLite
- aviso por correo al administrador cuando alguien se registra
- catálogo protegido por sesión
- usuario admin inicial: `admi`
- contraseña inicial: `admi`
- video, catálogo y diseño ya integrados
- `.gitignore` listo
- `.env.example` listo
- `Dockerfile` listo
- carpeta `data/` preparada sin subir la base real al repositorio

## Importante sobre GitHub Pages

Esta versión **sí es compatible con GitHub como repositorio**, pero **no funciona en GitHub Pages** porque GitHub Pages publica archivos estáticos, mientras que esta web necesita Node.js, sesiones, envío de correo y SQLite en el servidor.

## Archivos principales

- `server.js` → backend
- `package.json` → dependencias y scripts
- `public/auth.html` → login y registro
- `public/catalog.html` → catálogo privado
- `.env.example` → variables de entorno
- `.gitignore` → evita subir archivos sensibles
- `Dockerfile` → opción para desplegar en servidor compatible con contenedores

## Cómo probarlo localmente

1. Instala Node.js 20 o superior.
2. Abre la carpeta en terminal.
3. Instala dependencias:

```bash
npm install
```

4. Crea tu archivo `.env` desde el ejemplo:

```bash
cp .env.example .env
```

5. Edita `.env` y coloca tu App Password de Gmail en `SMTP_PASS`.
6. Inicia el proyecto:

```bash
npm start
```

7. Abre:

```text
http://localhost:3000
```

## Cómo subirlo a GitHub

### Opción 1: desde tu computadora

```bash
git init
git add .
git commit -m "Primer commit W'Fraganc"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

### Opción 2: subirlo manualmente

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de esta carpeta.
3. No subas el archivo `.env` real.
4. No subas la base `data/wfraganc.sqlite`.

## Variables de entorno

Crea un archivo `.env` basado en `.env.example`.

Valores importantes:

- `SESSION_SECRET` → cambia esto por una clave larga y privada
- `DEFAULT_ADMIN_USERNAME` → usuario inicial del admin
- `DEFAULT_ADMIN_PASSWORD` → contraseña inicial del admin
- `ADMIN_NOTIFY_EMAIL` → correo que recibirá avisos de registro
- `SMTP_USER` y `SMTP_PASS` → datos de Gmail para enviar avisos

## Recomendación antes de publicar

Antes de subirlo o desplegarlo:

- cambia el usuario `admi`
- cambia la contraseña `admi`
- cambia `SESSION_SECRET`
- usa una App Password de Gmail, no tu contraseña normal

## Nota sobre la base de datos

La base SQLite se crea automáticamente en:

```text
data/wfraganc.sqlite
```

Ese archivo no debe subirse a GitHub. Por eso ya está cubierto en `.gitignore`.
