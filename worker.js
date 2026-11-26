export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

    if (url.pathname === "/api/products") {
      if (request.method === "GET") {
        const list = await env.STORE_KV.list({ prefix: "prod:" });
        if (list.keys.length > 0) {
          const items = await Promise.all(list.keys.map((k) => env.STORE_KV.get(k.name, "json")));
          const valid = items.filter(Boolean).sort((a, b) => (b.id || "").localeCompare(a.id || ""));
          return new Response(JSON.stringify(valid), { headers: cors });
        }
        const legacy = await env.STORE_KV.get("products", "json");
        if (Array.isArray(legacy) && legacy.length > 0) {
          await Promise.all(legacy.map((p) => env.STORE_KV.put(`prod:${p.id}`, JSON.stringify(p))));
          return new Response(JSON.stringify(legacy), { headers: cors });
        }
        return new Response("[]", { headers: cors });
      }

      if (request.method === "POST") {
        const payload = await request.json();
        if (Array.isArray(payload)) {
          await Promise.all(payload.map((p) => env.STORE_KV.put(`prod:${p.id}`, JSON.stringify(p))));
        } else if (payload && payload.id) {
          await env.STORE_KV.put(`prod:${payload.id}`, JSON.stringify(payload));
        }
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      }

      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (id) await env.STORE_KV.delete(`prod:${id}`);
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      }
    }

    if (url.pathname === "/api/orders") {
      if (request.method === "GET") {
        const data = await env.STORE_KV.get("orders");
        return new Response(data || "[]", { headers: cors });
      }
      if (request.method === "POST") {
        const body = await request.text();
        const prevRaw = await env.STORE_KV.get("orders");
        const prevList = prevRaw ? JSON.parse(prevRaw) : [];
        const nextList = JSON.parse(body);

        await env.STORE_KV.put("orders", body);

        // Optional instant Telegram alert when a brand-new order is added
        if (
          Array.isArray(nextList) &&
          nextList.length > prevList.length &&
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ) {
          const newest = nextList[0];
          const sym = newest.currency === "EUR" ? "€" : "$";
          const itemLines = (newest.items || [])
            .map((it) => `• ${it.name} x${it.qty} (${sym}${(it.unitPrice * it.qty).toFixed(2)})`)
            .join("\n");
          const msg = [
            `🛍️ *New AMVISAT Order* #${String(newest.id || "").slice(-6).toUpperCase()}`,
            `👤 ${newest.customer_name} (${newest.customer_phone})`,
            `📍 ${newest.city}, ${newest.address}`,
            newest.notes ? `📝 ${newest.notes}` : "",
            ``,
            itemLines,
            ``,
            `💰 *Subtotal:* ${sym}${Number(newest.subtotal || 0).toFixed(2)} (+ delivery)`,
          ]
            .filter(Boolean)
            .join("\n");

          await fetch(`https://telegram.org{env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: env.TELEGRAM_CHAT_ID,
              text: msg,
              parse_mode: "Markdown",
            }),
          }).catch(() => {});
        }

        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      }
    }

    if (url.pathname === "/api/settings") {
      if (request.method === "GET") {
        const data = await env.STORE_KV.get("settings");
        return new Response(data || "{}", { headers: cors });
      }
      if (request.method === "POST") {
        const body = await request.text();
        await env.STORE_KV.put("settings", body);
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
