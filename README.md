# PSN Avatar Bot

A simple CommonJS Discord bot that helps users add PlayStation avatar SKUs to cart from private threads.

## What the bot does

- Lets admins run `/setup` to post a **Create Thread** panel.
- Creates a private thread per user to keep sessions isolated.
- Lets users run `/add-to-cart` with `sku` and `session`.
- Sends the add-to-cart request to PlayStation and returns the result.

## Setup

### 1) Environment

```bash
cp .env.example .env
```

Set your values in `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_app_client_id
GUILD_ID=your_guild_id_optional
```

### 2) Install dependencies

```bash
npm install
```

### 3) Register slash commands

```bash
npm run register-commands
```

### 4) Run the bot

```bash
npm start
```

## How to get `pdccws_p` cookie (from `store.playstation.com`)

1. Open [store.playstation.com](https://store.playstation.com) and sign in.
2. Open browser DevTools.
3. Go to **Application** tab.
4. Go to **Cookies** and select `store.playstation.com`.
5. Find cookie name: `pdccws_p`.
6. Copy the **Value** and use it as the `/add-to-cart` `session`.

Keep this value private. Do not share it in public channels.
### usage:

Gallery: [extract-thr-cookies-junZCVe](https://imgur.com/gallery/extract-thr-cookies-junZCVe)  
![Get cookies](https://i.imgur.com/junZCVe)

## How to use the bot

1. Run `/setup` in a server channel.
2. Click **Create Thread**.
3. Open your private thread.
4. Run `/add-to-cart` with `sku` and `session`.

Example:

```text
/add-to-cart sku:UP9000-CUSA00000_00-AVATAR0000000001 session:YOUR_PDCCWS_P_VALUE
```

## Screenshots

### Create thread

Gallery: [create-thread-Fc5NeVU](https://imgur.com/gallery/create-thread-Fc5NeVU)  
![Create thread](https://i.imgur.com/Fc5NeVU)

### Fill cart command

Gallery: [avatar-command-nD40wd3](https://imgur.com/gallery/avatar-command-nD40wd3)  
![Fill cart command](https://i.imgur.com/nD40wd3)

### Cart success

Gallery: [add-to-cart-success-qogf7bc](https://imgur.com/gallery/add-to-cart-success-qogf7bc)  
![Cart success](https://i.imgur.com/qogf7bc)

