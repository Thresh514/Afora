export async function POST(req: Request) {
  const body = await req.json();
  const event = req.headers.get("x-github-event");

  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL!;

  if (event === "push") {
    const { commits, repository } = body;

    for (const commit of commits) {
      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `🚀 ${repository.full_name}\n${commit.message}\n${commit.url}`,
        }),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}