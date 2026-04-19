const express = require("express");

const app = express();
app.use(express.json());

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const SECRET = process.env.GITHUB_SECRET;

app.post("/github", async (req, res) => {
  // Verify GitHub secret
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return res.status(401).send("No signature");

  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", SECRET);
  const digest = "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");

  if (signature !== digest) {
    return res.status(403).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];

  // Only handle repo creation
  if (event === "repository" && req.body.action === "created") {
    const repo = req.body.repository;

    const msg =
      `📦 **New Repository Created!**\n\n` +
      `**Name:** ${repo.full_name}\n` +
      `**Description:** ${repo.description || "No description"}\n` +
      `**Private:** ${repo.private ? "Yes" : "No"}\n` +
      `**Created by:** ${repo.owner.login}\n` +
      `**URL:** ${repo.html_url}\n\n` +
      `@here`;

    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msg }),
    });
  }

  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  res.send("Repo watcher is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port " + PORT));
