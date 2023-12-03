# Orion

```
Orion, once a legendary hunter of ancient myths, now reborn through time as a 
cybernetic entity. Fusing timeless wisdom with futuristic technology, he aids 
modern seekers in their quest for knowledge. His celestial insights and digital 
prowess make him an unparalleled guide in the vast universe of information.
```

This is a Discord bot that runs in Cloudflare Workers, using Cloudflare AI (the
Mistal 7B engine) to generate responses to questions.

It responds to slash commands:

- `/hunt`
- `/invite`

## Secrets

Orion relies on these secrets:

- `DISCORD_TOKEN`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`

Locally, place them in a `.dev.vars` file. When it's time to run in Cloudflare, you
must set them with `wrangler secret put`.

```bash
$ wrangler secret put DISCORD_TOKEN
$ wrangler secret put DISCORD_PUBLIC_KEY
$ wrangler secret put DISCORD_APPLICATION_ID
```

## Development

To register the commands with Discord (in case you change them):

```
npm run register
```

To run locally:

```
npm run dev
```

If you're running locally, use `ngrok` to proxy a URL to your host (this will
give you a URL, which you will need to use in the Discord bot settings to point
Discord at your localhost):

```
npm run ngrok
```

When you've made changes, deploy:

```
npm run deploy
```