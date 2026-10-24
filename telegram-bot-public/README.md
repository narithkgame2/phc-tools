# @Nick_Cambodia_Bot (public bot, Phase 1: clients only)

Japanese first, then English and Khmer. Hands every conversation to Nick on the official LINE. No PHC, no listing database yet (Nick prepares the three options by hand).

- Start: `node index.js` (token is read from `~/.phc-secrets/nick-cambodia-bot.env`, never from this folder)
- Test: `npm test` (28 checks, no network)
- Screens: `config/flow.json`, built from the Studio export in `config/phase1.source.json` with `node config/build-flow.cjs`
- Blueprint: Nick Cambodia Bot Studio and Map (claude.ai artifacts)
- Staff and agent features are not in Phase 1. Add the role check before any are added.
