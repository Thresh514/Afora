import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const event = req.headers["x-github-event"];

  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL!;

  if (event === "push") {
    const { commits, repository } = req.body;

    for (const commit of commits) {
      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🚀 ${repository.full_name}\n${commit.message}\n${commit.url}`
        })
      });
    }
  }

  res.status(200).json({ ok: true });
}