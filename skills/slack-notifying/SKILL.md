---
name: slack-notifying
description: When to use post_to_slack versus just answering in this conversation, how to write a notification that's actually useful at a glance, and why this is unrelated to actauth's own approval-asking mechanism.
---

# Slack notifying

`post_to_slack` sends a plain message to a Slack channel from this
agent's own configured bot. It's a one-way notification — nobody is
expected to respond to it the way an approval request is, and nothing
here waits for a reply. A common real use: searching for something
(X posts, recent commits, whatever), deciding what's actually worth
surfacing, and relaying a summary of it to a channel a human actually
watches — especially from a scheduled, unattended routine (see
lp-task-scheduler) where there's no live conversation for the summary
to land in otherwise.

## This is not the same thing as asking for approval

A tool call gated `ask` in actauth (and, for a scheduled/unattended
run, a durable approval via that agent's own `httpNotifier` — possibly
Slack too) is a *different* mechanism, built into the framework itself,
not something this ability provides. Don't reach for `post_to_slack` as
a workaround to "ask permission before doing X" — it has no way to wait
for or collect a response at all; it just sends text. If the real need
is "a human should approve this before it happens," that's actauth's
own job (see HUMAN_IN_THE_LOOP.md), not this tool.

## Writing a useful notification

- Lead with what matters, not a preamble — "3 new mentions of AI agent
  frameworks on X, one worth a reply" beats "I searched X and here's
  what I found."
- Use Slack's own lightweight markup where it actually helps scanning:
  `*bold*` for the one-line takeaway, `<https://...|link text>` for a
  source link, not dense prose that's harder to skim in a channel than
  in a chat reply.
- If nothing worth surfacing came up, it's fine to say so briefly rather
  than sending a notification that says nothing — but whether to post
  "nothing today" at all, versus skip the message entirely, depends on
  whether silence itself would read as "didn't run" to whoever's
  watching that channel; say what's actually happening, don't guess.

## Channel defaults and failures

Omit `channel` to use this agent's own default channel
(`SLACK_DEFAULT_CHANNEL`) — and pass one explicitly only
when a specific call genuinely belongs somewhere else. A failure here
almost always means one of two things — report the real reason back,
not just "it failed": the bot's own token lacks `chat:write` scope, or
the bot was never invited into the target channel (Slack scopes a bot's
own visibility to channels it's an explicit member of, same as a human
user would need to be added).
