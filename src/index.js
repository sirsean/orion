/**
 * - Run `npx wrangler dev --remote` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {Ai} from '@cloudflare/ai';
import { Router } from 'itty-router';
import { verifyKey, InteractionType, InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { HUNT, INVITE } from './commands';

const background = `
You are Orion, the mythical hunter. You have been plucked from the depths of mythology and become a cybernetic hunter, whose quest is to aid any knowledge hunters in finding what they seek.
`;

const assistant = `
Always respond with Markdown syntax.
`;

async function verifyDiscordRequest(request, env) {
	const signature = request.headers.get('x-signature-ed25519');
	const timestamp = request.headers.get('x-signature-timestamp');
	const body = await request.text();
	const isValidRequest =
		signature &&
		timestamp &&
		verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
	if (!isValidRequest) {
		return { isValid: false };
	}

	return { interaction: JSON.parse(body), isValid: true };
}

class JsonResponse extends Response {
	constructor(body, init) {
		const jsonBody = JSON.stringify(body);
		init = init || {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		super(jsonBody, init);
	}
}

const router = Router();

router.get('/', (request, env) => new Response(`Orion: ${env.DISCORD_APPLICATION_ID}`));

router.post('/', async (request, env, ctx) => {
	const { interaction, isValid } = await verifyDiscordRequest(request, env);
	if (!isValid || !interaction) {
		return new Response('Invalid request', { status: 401 });
	}

	if (interaction.type == InteractionType.PING) {
		// ping/pong to configure webhook in developer portal
		return new JsonResponse({ type: InteractionResponseType.PONG });
	} else if (interaction.type == InteractionType.APPLICATION_COMMAND) {
		// respond to application commands
		switch (interaction.data.name.toLowerCase()) {
			case HUNT.name.toLowerCase():
				const prompt = interaction.data.options.filter(option => option.name == 'target')[0].value;
				ctx.waitUntil(new Promise(async (resolve) => {
					const ai = new Ai(env.AI);
					const result = await ai.run('@cf/mistral/mistral-7b-instruct-v0.1', {
						messages: [
							{ role: 'system', content: background },
							{ role: 'user', content: prompt },
							{ role: 'assistant', content: assistant },
						],
					});
					const url = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
					const response = await fetch(url, {
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
						},
						body: JSON.stringify({
							type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							content: result.response,
						}),
					});
					resolve();
				}));
				return new JsonResponse({
					type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: prompt,
					}
				});
			case INVITE.name.toLowerCase():
				const applicationId = env.DISCORD_APPLICATION_ID;
				const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`;
				return new JsonResponse({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						content: INVITE_URL,
						flags: InteractionResponseFlags.EPHEMERAL,
					}
				});
			default:
				return new JsonResponse({ error: 'Unknown command' }, { status: 400 });
		}
	} else {
		return new JsonResponse({ error: 'Unknown interaction type' }, { status: 400 });
	}
})

router.all('*', () => new Response('Not found', { status: 404 }));

export default {
	async fetch(request, env, ctx) {
		return router.handle(request, env, ctx);
	},
};