# Obsidian Canvas Conversation

A plugin for Obsidian that allows you to create a canvas conversation using ChatGPT.

It works on Canvas Nodes. Right-click a node and "Prompt ChatGPT".

This needs to be configured with User Agent, Session Token, and Clearance token from ChatGPT, which you might need to refresh every 2 hours.

The code is mostly undocumented and messy.

Some improvements to be made:

-   Proper using a streaming mechanism for the chat conversation
-   Refreshing tokens
-   Clean up undocumented APIs/monkey patches when they are available
-   Better error messages
-   Add edges between nodes (no easy way of doing it right now)

# Install

## From BRAT

-   Install BRAT from Obsidian Community Plugins (if you don't have it)
-   Add this repository (AndreBaltazar8/obsidian-canvas-conversation) as a new plugin.

## From Releases

-   Download the latest release. Place the `main.js` and `manifest.json` files inside folder: `{{your_vault}}/.obsidian/plugins/obsidian-canvas-conversation`

## From Source

-   Clone this repository into your vault plugins folder.
-   Run `pnpm install` followed by `pnpm build`

## From Obsidian Community Plugins

** Still pending PR approval **

# Acknowledgments

Took a bit of code for ChatGPT from: https://github.com/transitive-bullshit/chatgpt-api

# License

MIT (see LICENSE)
