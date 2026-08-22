# 📨 Discord-dm-Announcements-bot

> Bot de Discord para enviar anuncios por mensaje directo (MD) con sistema de consentimiento mediante reacciones. Desarrollado con Discord.js v14.

> Discord bot for sending announcements via direct message (DM) with a consent system through reactions. Developed with Discord.js v14.

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

## ✨ Características

- 📬 **Envío de anuncios por MD** a usuarios que hayan dado su consentimiento.
- ✅ **Sistema de consentimiento por reacción**: los usuarios reaccionan con un emoji (por defecto ✅) en un mensaje embed para aceptar o revocar el consentimiento.
- 🛡️ **Cumplimiento orientado a GDPR**: gestión de consentimientos persistente.
- ⚡ **Discord.js v14**: API moderna y estable.

---

## 📋 Requisitos

| Dependencia | Versión mínima |
|-------------|----------------|
| Node.js     | 18.0.0         |
| pnpm        | 8.0.0          |

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/BlommamPro/discord-dm-announcements-bot.git
cd discord-dm-announcements-bot
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Crear los archivos de configuración

Debes crear los siguientes archivos antes de ejecutar el bot:

#### 🔑 `.env`

Crea un archivo `.env` en la raíz del proyecto con tu token de Discord:

```env
DISCORD_TOKEN=TU_TOKEN_DE_BOT_AQUI
GUILD_ID=ID_DE_TU_SERVIDOR
```

| Variable        | Descripción                                      |
|-----------------|--------------------------------------------------|
| `DISCORD_TOKEN` | Token de tu bot, obtenido en el [Portal de Desarrolladores](https://discord.com/developers/applications). |
| `GUILD_ID`      | ID del servidor de Discord donde operará el bot. |

> ⚠️ **Nunca compartas tu token**. Este archivo está incluido en `.gitignore` por seguridad.

#### ⚙️ `config.json`

Crea un archivo `config.json` en la raíz con la configuración del bot:

```json
{
    "admin_role_id": "0000000000000000000",
    "canal_consentimiento_id": "0000000000000000000",
    "mensaje_consentimiento_id": "0000000000000000000",
    "emoji_consentimiento": "✅"
}
```

| Campo                      | Descripción                                                              |
|----------------------------|--------------------------------------------------------------------------|
| `admin_role_id`            | ID del rol que podrá usar el comando `/anuncio`.                         |
| `canal_consentimiento_id`  | ID del canal donde está el mensaje de consentimiento.                    |
| `mensaje_consentimiento_id`| ID del mensaje **ya existente** al que el bot le añadirá la reacción de consentimiento. |
| `emoji_consentimiento`     | Emoji que los usuarios usarán para aceptar/recibir anuncios (por defecto ✅). |

> 💡 **Nota sobre `mensaje_consentimiento_id`**: este no es un mensaje que el bot cree. Debes crear tú el mensaje embed en Discord (manualmente o con otro bot), copiar su ID y pegarla aquí. El bot solo se encarga de añadir la reacción y escuchar cuando los usuarios interactúan con ella.

#### 📄 `consentidos.json`

Crea un archivo `consentidos.json` vacío. Aquí se almacenarán los IDs de los usuarios que hayan dado su consentimiento:

```json
[]
```

> Este archivo se actualiza automáticamente cuando un usuario reacciona o quita su reacción al mensaje de consentimiento.

---

## ▶️ Ejecución

### Modo desarrollo (con recarga automática)

```bash
pnpm dev
```

### Modo producción

```bash
pnpm start
```

---

## 🎮 Comandos

| Comando    | Descripción                                                | Permisos                  |
|------------|------------------------------------------------------------|---------------------------|
| `/anuncio` | Enviar un anuncio por MD a todos los usuarios que dieron consentimiento. | Rol configurado en `admin_role_id` |
| `/setup`   | Configurar la reacción de consentimiento en el mensaje ya existente. | Dueño del servidor únicamente |

---

## 🔄 Cómo funciona el consentimiento

1. **Crea el mensaje de consentimiento** tú mismo en el canal configurado (puede ser un embed explicando que los usuarios pueden recibir anuncios por MD).
2. Copia la **ID de ese mensaje** y pégala en `config.json` como `mensaje_consentimiento_id`.
3. El **dueño del servidor** ejecuta `/setup` para que el bot añada la reacción (✅) al mensaje.
4. Los usuarios **reaccionan con ✅** (o el emoji configurado) para dar su consentimiento.
5. Si un usuario **quita su reacción**, el bot elimina su consentimiento y dejará de recibir anuncios.
6. Las personas con el rol configurado en `admin_role_id` usan `/anuncio` para enviar mensajes masivos solo a quienes reaccionaron.

> 💡 **Importante**: Los usuarios deben tener los mensajes directos activos en su configuración de privacidad de Discord para que el bot pueda enviarles MD.

---

## 📁 Estructura del proyecto

```
.
├── node_modules/          # Dependencias instaladas por pnpm
├── src/
│   ├── commands/          # Comandos slash (/anuncio, /setup)
│   ├── components/        # Componentes interactivos (botones, selectores, etc.)
│   ├── events/            # Manejadores de eventos de Discord (ready, interactionCreate, etc.)
│   ├── handlers/          # Cargadores dinámicos de comandos y eventos
│   ├── models/            # Modelos de datos y estructuras
│   ├── utils/             # Funciones utilitarias y helpers
│   ├── config.js          # Carga y exporta la configuración del bot
│   └── index.js           # Punto de entrada principal del bot
├── .env                   # Variables de entorno (NO subir a Git)
├── .gitignore             # Archivos ignorados por Git
├── config.json            # Configuración del bot (IDs, roles, etc.)
├── consentidos.json       # Base de datos local de consentimientos
├── LICENSE                # Licencia AGPL-3.0
├── package.json           # Dependencias y scripts del proyecto
├── pnpm-lock.yaml         # Lockfile de pnpm para versiones exactas
└── README.md              # Este archivo
```

---

## 🔐 Seguridad

- El archivo `.env` está en `.gitignore` para evitar filtrar tu token.
- El archivo `consentidos.json` contiene datos personales (IDs de Discord). Considera implementar una base de datos real (SQLite, MongoDB, etc.) para producción a gran escala.


## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si encuentras un error o quieres mejorar el bot:

1. Haz un fork del repositorio.
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza tus cambios y haz commit (`git commit -m 'Agrega nueva funcionalidad'`).
4. Sube la rama (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.

---

## 📬 Contacto

- **Autor:** BlommamPro
- **GitHub:** [BlommamPro](https://github.com/BlommamPro)

<div align="center">
    <img src="https://count.getloli.com/@BlommamPro?name=BlommamPro&theme=booru-lewd&padding=7&offset=0&align=center&scale=1&pixelated=1&darkmode=auto" />
</div>
