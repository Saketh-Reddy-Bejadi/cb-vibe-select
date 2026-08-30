import { auth } from "@/auth";
import { processQueue } from "@/lib/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // long drains; fine on a long-running host (Render).

// SSE: drives the queue and streams progress to the admin. Cookie-authed (EventSource sends cookies).
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "OWNER" && role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await processQueue({ signal: req.signal, onProgress: send });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "worker failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
