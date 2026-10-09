# lp-slack-notifier

A [loopengine](https://github.com/loopengine-co/loopengine) ability: a
`post_to_slack` tool that sends a plain message to a Slack channel from
a configured bot — relaying a summary, finding, or notification
somewhere a human will actually see it, independent of actauth's own
approval-notification mechanism — plus a skill on how to use it well.

## What's in it

- **Tool** — `post_to_slack(text, channel?)`. Posts `text` (plain text
  or Slack's own `mrkdwn`) to `channel`, or `SLACK_DEFAULT_CHANNEL` if
  omitted. Returns `{ channel, ts }` (Slack's own message timestamp —
  the closest thing it has to a message id) on success. A failure
  surfaces Slack's own `error` code plainly (most commonly a missing
  `chat:write` scope, or the bot not yet invited into the target
  channel) — Slack's own API always answers HTTP 200 regardless of
  success or failure, so this checks the response body's own `ok`
  field, not the HTTP status, to actually tell the difference.
- **Skill** — `slack-notifying`: when this is the right tool versus
  just answering in the current conversation, why it's unrelated to
  actauth's own "ask" approval mechanism (a live or durable approval
  request is a different, built-in framework concern, not something
  this ability provides), and what makes a notification actually
  useful to read at a glance in a channel.
- **actauth rule** — `decision: allow`. Posting to an internal Slack
  channel is visible to whoever's in it, but not public or permanent
  the way a social post is — see the rule's own comment for when to
  tighten this instead.

## Auth

A Slack bot token (`xoxb-...`) with the `chat:write` scope, from a
Slack app's own **OAuth & Permissions** page, installed to your
workspace. If you've already set up a Slack approval notifier (this
repo's own `SlackNotifier`/`SlackChatApprover`), the *same* bot token
works here too — same scope requirement, same app, no second Slack app
needed.

- `SLACK_BOT_TOKEN` (secret).
- `SLACK_DEFAULT_CHANNEL` — a channel ID (`"C0123ABC456"`) or name
  (`"#general"`) to post to when a call doesn't specify one.

**The bot must be invited into every channel it posts to** — Slack
scopes a bot's own visibility to channels it's an explicit member of,
the same as a human user would need to be added. `/invite @<bot-name>`
in that channel first, or every call targeting it fails with Slack's
own `not_in_channel`/`channel_not_found` error.

No npm dependency needed — a single `fetch()` call against Slack's
`chat.postMessage` Web API endpoint, no SDK.

## Install

```
npx loopengine add-ability lp-slack-notifier --agent <your-agent>
```

Then set `SLACK_BOT_TOKEN` and `SLACK_DEFAULT_CHANNEL` (see "Auth"
above). No `npm install` step — this ability has no dependencies of
its own.

## Upgrading

```
npx loopengine upgrade-ability lp-slack-notifier --agent <your-agent>
```

See loopengine's own `ABILITIES.md` for how abilities, installs, and
upgrades work in general — and remember that upgrading only rewrites
files on disk; the server process itself needs restarting afterward to
actually run the new code.
