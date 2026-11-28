// A standalone callback document: no SiteShell, third-party assets or app session.
// The OAuth response is sent only to the initiating same-origin channel.
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Dylan Grand Hotel · Google sign-in</title>
</head>
<body>
  <p id="message">Returning to Dylan Grand Hotel. You can close this window.</p>
  <script>
    (() => {
      const params = new URLSearchParams(location.search);
      const state = params.get('state');
      const code = params.get('code');
      const error = params.get('error');
      history.replaceState(null, '', location.pathname);
      if (!state || !/^[a-f0-9]{64}$/.test(state) || (!code && !error)) {
        document.getElementById('message').textContent = 'Invalid sign-in response. Close this window and try again.';
        return;
      }
      try {
        const channel = new BroadcastChannel('dylan-google-' + state);
        channel.postMessage({ state, code, error });
        setTimeout(() => { channel.close(); window.close(); }, 250);
      } catch {
        document.getElementById('message').textContent = 'Could not return to the sign-in page. Close this window and try again.';
      }
    })();
  </script>
</body>
</html>`;

export function GET() {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; script-src 'sha256-aGVV8fXWcxucEaHjS3KYvcFRyj6wSaEgW+wydLe+6F4='; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
