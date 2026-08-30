export default function Page() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
      <h1>mail-service</h1>
      <p>Transactional email API. There is no UI here.</p>
      <p>
        <code>POST /api/send</code> · <code>GET /api/health</code>
      </p>
    </main>
  );
}
