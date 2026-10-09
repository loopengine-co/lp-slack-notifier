import type { ToolDefinition } from 'loopengine'

// Slack's own chat.postMessage always answers HTTP 200, success or
// failure alike — confirmed against Slack's own API reference, not
// assumed: "Callers should always check the value of the ok parameter
// in the response." res.ok (the HTTP layer) tells you nothing here;
// body.ok (Slack's own payload) is the only real signal, with
// body.error carrying what actually went wrong on a failure.
//
// Settings come from ctx.env, not process.env: loopengine resolves them
// per agent (see loopengine.ability.json's `scope`) — both fall back to
// the shared value when an agent hasn't set its own.

export const postToSlack: ToolDefinition = {
  name: 'post_to_slack',
  description:
    'Post a message to a Slack channel from this agent\'s own configured bot — e.g. to relay a summary, a finding, or a notification somewhere a human will actually see it. Not an approval mechanism (actauth\'s own "ask" + a durable httpNotifier already covers that, separately) — this just sends a plain message, with no response or decision expected back.',
  input_schema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The message text — plain text or Slack\'s own lightweight markdown (mrkdwn: *bold*, _italic_, <url|link text>, etc.).',
      },
      channel: {
        type: 'string',
        description: 'Optional — a channel ID (e.g. "C0123ABC456") or name (e.g. "#general") to post to instead of this agent\'s own default channel (SLACK_DEFAULT_CHANNEL). The bot must already be a member of whichever channel this resolves to.',
      },
    },
    required: ['text'],
  },
  execute: async (input, ctx) => {
    const text = String(input.text ?? '')
    if (!text) throw new Error('post_to_slack: text is required')

    const token = ctx.env.require('SLACK_BOT_TOKEN')
    const channel = (typeof input.channel === 'string' && input.channel ? input.channel : undefined) ?? ctx.env.get('SLACK_DEFAULT_CHANNEL')
    if (!channel) {
      throw new Error(`post_to_slack: no channel given, and SLACK_DEFAULT_CHANNEL is not set for agent '${ctx.agentName}'`)
    }

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel, text }),
    })
    const body = (await res.json()) as { ok: boolean; channel?: string; ts?: string; error?: string }
    if (!body.ok) {
      throw new Error(`post_to_slack: Slack API error "${body.error}" — common causes: the bot token lacks chat:write scope, or the bot isn't a member of "${channel}" yet (invite it with /invite @<bot-name> first).`)
    }
    return JSON.stringify({ channel: body.channel, ts: body.ts })
  },
  // Posts a plain notification to an internal Slack channel — visible
  // to whoever's in it, but not public, permanent, or attributed the
  // way a social media post is; see actauth/rules.yml's own comment for
  // why that's allow, not ask, by default.
  safe: true,
}
