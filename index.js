const express = require("express");
const crypto = require("crypto");

const app = express();

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const SECRET = process.env.GITHUB_SECRET;

app.get("/", (req, res) => {
  res.send("Repo watcher is running");
});

app.post(
  "/github",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-hub-signature-256"];
      if (!signature) {
        return res.status(401).send("No signature");
      }

      const hmac = crypto.createHmac("sha256", SECRET);
      const digest = "sha256=" + hmac.update(req.body).digest("hex");

      if (signature !== digest) {
        return res.status(403).send("Invalid signature");
      }

      const event = req.headers["x-github-event"];
      const payload = JSON.parse(req.body.toString("utf8"));

      if (event === "repository" && payload.action === "created") {
        const repo = payload.repository;

        const msg =
          `📦 **New Repository Created!**\n\n` +
          `**Name:** ${repo.full_name}\n` +
          `**Description:** ${repo.description || "No description"}\n` +
          `**Private:** ${repo.private ? "Yes" : "No"}\n` +
          `**Created by:** ${repo.owner.login}\n` +
          `**URL:** ${repo.html_url}\n\n` +
          `@here`;

        const discordRes = await fetch(DISCORD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: msg }),
        });

        const discordText = await discordRes.text();

        if (!discordRes.ok) {
          console.error("Discord error:", discordRes.status, discordText);
          return res.status(502).send("Discord forwarding failed");
        }

        console.log("Discord message sent successfully");
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("Webhook handler error:", err);
      return res.status(500).send("Server error");
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port " + PORT));
