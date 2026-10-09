import { agentScopedEnvVarName, inferAgentNameFromToolUrl } from 'loopengine'
import type { ToolDefinition } from 'loopengine'

// Slack's own chat.postMessage always answers HTTP 200, success or
// failure alike — confirmed against Slack's own API reference, not
// assumed: "Callers should always check the value of the ok parameter
// in the response." res.ok (the HTTP layer) tells you nothing here;
// body.ok (Slack's own payload) is the only real signal, with
// body.error carrying what actually went wrong on a failure.
function requireEnv(name: string, action: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${action}: ${name} must be set`)
  return value
}

// Resolved once at module load, same as lp-task-scheduler's own
// inferAgentName — there's exactly one .env/process.env for the whole
// project (see loopengine's own env-admin.ts), so two agents both
// installing this ability and relying on the bare SLACK_DEFAULT_CHANNEL
// would otherwise always post to the same channel. undefined when this
// file isn't actually at the expected agents/<name>/tools/ depth (a
// test harness loading it from elsewhere) — the fallback chain below
// just skips the per-agent override entirely in that case.
const AGENT_NAME = inferAgentNameFromToolUrl(import.meta.url)

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
        description: 'Optional — a channel ID (e.g. "C0123ABC456") or name (e.g. "#general") to post to instead of this agent\'s own default channel (its own <AGENT_NAME>_SLACK_DEFAULT_CHANNEL override if set, else the shared SLACK_DEFAULT_CHANNEL). The bot must already be a member of whichever channel this resolves to.',
      },
    },
    required: ['text'],
  },
  execute: async (input) => {
    const text = String(input.text ?? '')
    if (!text) throw new Error('post_to_slack: text is required')

    const token = requireEnv('SLACK_BOT_TOKEN', 'post_to_slack')
    const scopedChannel = AGENT_NAME ? process.env[agentScopedEnvVarName(AGENT_NAME, 'SLACK_DEFAULT_CHANNEL')] : undefined
    const channel = (typeof input.channel === 'string' && input.channel ? input.channel : undefined) ?? scopedChannel ?? process.env.SLACK_DEFAULT_CHANNEL
    if (!channel) {
      throw new Error(
        `post_to_slack: no channel given, and neither ${AGENT_NAME ? `${agentScopedEnvVarName(AGENT_NAME, 'SLACK_DEFAULT_CHANNEL')} nor ` : ''}SLACK_DEFAULT_CHANNEL is set`,
      )
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
