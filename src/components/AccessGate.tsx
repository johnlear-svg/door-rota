import { Nav } from "@/components/Nav";

export function AccessGate() {
  return (
    <main className="shell">
      <Nav />
      <section className="access-gate" aria-labelledby="access-title">
        <h1 id="access-title">Sign in required</h1>
        <p>
          Door Rota holds staffing and pay rates. Open this app from Cursor as a
          private or team app so your signed-in identity can load your rota. No
          rota data is shown without a verified viewer.
        </p>
      </section>
    </main>
  );
}
