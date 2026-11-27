export default {
  async fetch(request, env) {
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "gzdbjx..168";
    const NL = String.fromCharCode(10);
    const url = new URL(request.url);
    const path = url.pathname;

    function isAuthorized(req) {
      const authHeader = req.headers.get("X-Admin-Password") || "";
      const cookieHeader = req.headers.get("Cookie") || "";
      const cookieMatch = cookieHeader.match(/(?:^|;\s*)debao_admin_pwd=([^;]+)/);
      const cookiePwd = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
      return authHeader === ADMIN_PASSWORD || cookiePwd === ADMIN_PASSWORD;
    }

    if (path === "/robots.txt") {
      const robots = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Sitemap: " + url.origin + "/sitemap.xml",
        ""
      ].join(NL);
      return new Response(robots, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (path === "/sitemap.xml") {
      const now = new Date().toISOString().split("T")[0];
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url>",
        "    <loc>" + url.origin + "/</loc>",
        "    <lastmod>" + now + "</lastmod>",
        "    <changefreq>daily</changefreq>",
        "    <priority>1.0</priority>",
        "  </url>",
        "</urlset>"
      ].join(NL);
      return new Response(xml, {
        headers: { "Content-Type": "application/xml; charset=utf-8" }
      });
    }

    if (path === "/api/admin-login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (body.password === ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": "debao_admin_pwd=" + encodeURIComponent(ADMIN_PASSWORD) + "; Path=/; Max-Age=604800; SameSite=Lax"
          }
        });
      }
      return Response.json({ ok: false, error: "管理密码错误" }, { status: 401 });
    }

    const defaultCategories = [
      { id: "line", name: "Bakery Production Line", zh: "烘焙生产线" },
      { id: "oven", name: "Baking Oven", zh: "商业烤箱" },
      { id: "divider", name: "Dough Divider Rounder Machine", zh: "分割滚圆机" },
      { id: "mixer", name: "Dough Mixer Machine", zh: "和面机/搅拌机" },
      { id: "sheeter", name: "Dough Sheeter Machine", zh: "酥皮机/压面机" },
      { id: "moulder", name: "Moulder Machine", zh: "整形机/法棍成型机" },
      { id: "proofer", name: "Dough Proofer", zh: "醒发箱" },
      { id: "tools", name: "Baking Tools", zh: "烘焙工具及烤盘" },
      { id: "fridge", name: "Food Refrigeration Machine", zh: "商用制冷设备" },
      { id: "cake", name: "Cake Cookies Machine", zh: "蛋糕曲奇机" }
    ];

    const defaultSpecTemplate = [
      { label: "Voltage", value: "220V / 380V (50Hz/60Hz)" },
      { label: "Power", value: "1.5 kW" },
      { label: "Capacity", value: "1,000 - 3,000 pcs/h" },
      { label: "Dough Weight Range", value: "30 - 500 g" },
      { label: "Material", value: "Food-grade 304 Stainless Steel" },
      { label: "Dimensions (L×W×H)", value: "1200 × 850 × 1450 mm" },
      { label: "Net / Gross Weight", value: "320 kg / 360 kg" }
    ].map(x => x.label + ": " + x.value).join(NL);

    const defaultProducts = [
      {
        id: "orig_1",
        cat: "mixer",
        title: "20L Commercial Planetary Mixer Machine for Bakery",
        price: "$530 USD",
        desc: "20L commercial planetary mixer with three mixing attachments for different applications. Whisk for eggs and cream, dough hook for dough mixing, and flat beater for fillings and general mixing. Features 3 mixing speeds and a durable stainless steel mixing bowl. Ideal for bakeries, pastry shops, restaurants and food businesses.",
        specs: defaultSpecTemplate,
        imgs: ["https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80"],
        video: ""
      },
      {
        id: "orig_2",
        cat: "mixer",
        title: "75KG Commercial Tilting Dough Mixer Machine for Bakery",
        price: "$5,550 USD",
        desc: "75kg large-capacity dough mixer designed for commercial bakeries and food processing factories. Tilting bowl design makes dough discharge easier and more convenient. Heavy-duty construction for daily commercial production. Ideal for mixing dough for bread, toast and other bakery products.",
        specs: defaultSpecTemplate,
        imgs: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"],
        video: ""
      },
      {
        id: "orig_3",
        cat: "sheeter",
        title: "Commercial Compact Tabletop Dough Sheeter Machine for Bakery & Pastry",
        price: "$1,130 USD",
        desc: "Compact space-saving design, precise thickness adjustment, stainless steel rollers & foldable tables for croissant and puff pastry dough.",
        specs: defaultSpecTemplate,
        imgs: ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80"],
        video: ""
      },
      {
        id: "orig_4",
        cat: "oven",
        title: "Commercial Hot Air Convection Oven (Max 300°C) for Bakery & Pastry",
        price: "$1,130 USD",
        desc: "Up to 300°C max temperature, uniform hot air circulation, stainless steel chamber for bread, pastry, cookies, and roasting.",
        specs: defaultSpecTemplate,
        imgs: ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80"],
        video: ""
      },
      {
        id: "orig_5",
        cat: "sheeter",
        title: "Commercial Heavy-Duty Dough Sheeter Machine for Bakery & Pastry",
        price: "$1,170 USD",
        desc: "Reversible conveyor belt, precise thickness adjustment, food-grade stainless steel rollers for croissant & puff pastry dough.",
        specs: defaultSpecTemplate,
        imgs: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"],
        video: ""
      },
      {
        id: "orig_6",
        cat: "divider",
        title: "Fully Automatic Dough Divider & Rounder Machine (16/26/30/36 Pcs, 220V/380V, 1.8kW)",
        price: "$1,670 USD",
        desc: "Available in 16, 26, 30, and 36 pcs models covering 20–200g dough weights, 220V/380V power, 1.8kW motor, 660×660×1460mm size, and 425kg net weight.",
        specs: defaultSpecTemplate,
        imgs: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"],
        video: ""
      }
    ];

    const defaultSiteConfig = {
      banners: [
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80"
      ],
      about: "Located in the industrial hub of Guangzhou, China, we are a premier manufacturer and global exporter specializing in commercial bakery and food processing machinery. Our state-of-the-art facilities and dedicated R&D team deliver high-performance equipment trusted by bakeries and central kitchens worldwide.",
      video: "https://www.facebook.com/reel/1877287180308552",
      certs: [
        { name: "CE European Standard", img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80" },
        { name: "ISO9001 Quality System", img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80" },
        { name: "Invention Patents", img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80" },
        { name: "Global Export License", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80" }
      ]
    };

    const db = env.DB;

    function sanitizeMedia(v, maxLen = 8000000) {
      if (typeof v !== "string") return "";
      if (v.startsWith("data:") && v.length > maxLen) return "";
      return v;
    }

    async function getData(key, fallback) {
      if (!db) return fallback;
      try {
        const raw = await db.get(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (key === "siteConfig") {
          return {
            banners: Array.isArray(parsed.banners) && parsed.banners.length ? parsed.banners : fallback.banners,
            about: typeof parsed.about === "string" && parsed.about ? parsed.about : fallback.about,
            video: sanitizeMedia(parsed.video) || fallback.video,
            certs: Array.isArray(parsed.certs) && parsed.certs.length ? parsed.certs : fallback.certs
          };
        }
        if (key === "products" && Array.isArray(parsed)) {
          const sourceList = parsed.length ? parsed : fallback;
          return sourceList.map(item => ({
            ...item,
            specs: item.specs || defaultSpecTemplate,
            imgs: Array.isArray(item.imgs) ? item.imgs.slice(0, 5) : [],
            video: sanitizeMedia(item.video)
          }));
        }
        return parsed;
      } catch {
        return fallback;
      }
    }

    if (path === "/api/bootstrap") {
      const [categories, products, siteConfig] = await Promise.all([
        getData("categories", defaultCategories),
        getData("products", defaultProducts),
        getData("siteConfig", defaultSiteConfig)
      ]);
      return Response.json({ categories, products, siteConfig });
    }

    if (path === "/api/products" && request.method === "POST") {
      if (!isAuthorized(request)) {
        return Response.json({ error: "未授权或登录已过期，请刷新输入管理密码" }, { status: 401 });
      }
      if (!db) return Response.json({ error: "KV DB not bound" }, { status: 500 });
      const body = await request.json();
      const products = await getData("products", defaultProducts);
      if (body.action === "add") {
        const newItem = {
          id: "p_" + Date.now(),
          cat: body.cat || "divider",
          title: body.title || "",
          price: body.price || "Contact for Price",
          desc: body.desc || "",
          specs: body.specs || "",
          imgs: Array.isArray(body.imgs) ? body.imgs.slice(0, 5) : [],
          video: sanitizeMedia(body.video)
        };
        products.unshift(newItem);
      } else if (body.action === "update") {
        const idx = products.findIndex(p => p.id === body.id);
        if (idx !== -1) {
          products[idx] = {
            ...products[idx],
            cat: body.cat ?? products[idx].cat,
            title: body.title ?? products[idx].title,
            price: body.price ?? products[idx].price,
            desc: body.desc ?? products[idx].desc,
            specs: body.specs ?? products[idx].specs ?? "",
            imgs: Array.isArray(body.imgs) ? body.imgs.slice(0, 5) : products[idx].imgs,
            video: body.video !== undefined ? sanitizeMedia(body.video) : (products[idx].video || "")
          };
        }
      } else if (body.action === "price") {
        const idx = products.findIndex(p => p.id === body.id);
        if (idx !== -1) products[idx].price = body.price;
      } else if (body.action === "delete") {
        const next = products.filter(p => p.id !== body.id);
        await db.put("products", JSON.stringify(next));
        return Response.json({ ok: true, products: next });
      }
      await db.put("products", JSON.stringify(products));
      return Response.json({ ok: true, products });
    }

    if (path === "/api/site-config" && request.method === "POST") {
      if (!isAuthorized(request)) {
        return Response.json({ error: "未授权或登录已过期，请刷新输入管理密码" }, { status: 401 });
      }
      if (!db) return Response.json({ error: "KV DB not bound" }, { status: 500 });
      const body = await request.json();
      const nextCfg = {
        banners: Array.isArray(body.banners) ? body.banners.filter(Boolean) : [],
        about: typeof body.about === "string" ? body.about : "",
        video: sanitizeMedia(body.video),
        certs: Array.isArray(body.certs) ? body.certs : []
      };
      await db.put("siteConfig", JSON.stringify(nextCfg));
      return Response.json({ ok: true, siteConfig: nextCfg });
    }

    if (path === "/admin") {
      if (!isAuthorized(request)) {
        return new Response(renderLoginHtml(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response(renderAdminHtml(defaultCategories, defaultSpecTemplate, defaultSiteConfig), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    return new Response(renderStoreHtml(defaultCategories, defaultSiteConfig), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};

function renderLoginHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>德堡机械 - 管理后台登录</title>
  <style>
    body { font-family: Arial, sans-serif; background: #111827; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; padding: 32px 28px; border-radius: 12px; width: 100%; max-width: 360px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); }
    h2 { margin: 0 0 8px; font-size: 20px; color: #111827; }
    p { margin: 0 0 18px; font-size: 13px; color: #6b7280; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; margin-bottom: 12px; }
    button { width: 100%; padding: 10px; border: none; border-radius: 8px; background: #ea580c; color: #fff; font-weight: bold; font-size: 15px; cursor: pointer; }
    button:hover { background: #c2410c; }
    .err { color: #dc2626; font-size: 13px; margin-top: 10px; min-height: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔒 德堡机械管理后台</h2>
    <p>请输入管理员密码后进入后台操作</p>
    <form onsubmit="doLogin(event)">
      <input type="password" id="pwd" placeholder="请输入管理密码" required autofocus />
      <button type="submit">登录后台</button>
    </form>
    <div class="err" id="errMsg"></div>
  </div>
  <script>
    async function doLogin(e) {
      e.preventDefault();
      const pwd = document.getElementById("pwd").value;
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd })
      });
      const data = await res.json();
      if (data.ok) {
        location.reload();
      } else {
        document.getElementById("errMsg").textContent = data.error || "密码错误";
      }
    }
  </script>
</body>
</html>`;
}

function renderStoreHtml(categories, defaultSiteConfig) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guangzhou Debao Machinery Co., Ltd. | Commercial Bakery Equipment</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-50 text-gray-800 font-sans">
  <!-- Top Bar -->
  <div class="bg-gray-900 text-gray-300 text-sm py-2 px-4">
    <div class="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
      <div class="flex items-center space-x-4 flex-wrap">
        <span><i class="fas fa-map-marker-alt text-orange-500 mr-1"></i> Guangzhou, China</span>
        <span><i class="fas fa-envelope text-orange-500 mr-1"></i> tangyinjun518@gmail.com</span>
      </div>
      <div class="flex items-center space-x-4">
        <a href="https://wa.me/8618124272578" target="_blank" class="hover:text-orange-400">
          <i class="fab fa-whatsapp text-green-500 mr-1"></i> +86 181-2427-2578
        </a>
        <select id="langSelect" onchange="changeLang(this.value)" class="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-700 focus:outline-none">
          <option value="en">English</option>
          <option value="zh-CN">简体中文 (大陆)</option>
          <option value="zh-TW">繁體中文 (港澳台/馬新)</option>
          <option value="es">Español</option>
          <option value="ar">العربية</option>
          <option value="id">Indonesia</option>
          <option value="ru">Русский</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Navbar -->
  <nav class="bg-white shadow-md sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <a href="#" class="text-2xl font-black tracking-wider text-gray-900">DEBAO <span class="text-orange-600">MACHINERY</span></a>
      <div class="hidden md:flex space-x-8 font-medium">
        <a href="#" class="text-orange-600" data-i18n="home">Home</a>
        <a href="#catalog" class="hover:text-orange-600" data-i18n="products">Bakery Equipment</a>
        <a href="#about" class="hover:text-orange-600" data-i18n="about">About Us</a>
        <a href="#certs" class="hover:text-orange-600" data-i18n="certs">Certifications</a>
        <a href="#shipping" class="hover:text-orange-600" data-i18n="shipping">Shipping & OEM</a>
      </div>
      <a href="https://wa.me/8618124272578" target="_blank" class="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-full font-bold shadow-md transition flex items-center space-x-2">
        <i class="fab fa-whatsapp"></i>
        <span data-i18n="getQuote">Get a Quote</span>
      </a>
    </div>
  </nav>

  <!-- Hero Banner -->
  <header class="relative bg-gray-900 text-white overflow-hidden">
    <div id="heroBg" class="absolute inset-0 bg-cover bg-center opacity-35 transition-all duration-700"></div>
    <div class="relative z-10 max-w-5xl mx-auto py-20 px-4 text-center">
      <span class="bg-orange-600/30 text-orange-300 border border-orange-500/50 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" data-i18n="subtitle">GUANGZHOU FACTORY DIRECT</span>
      <h1 class="text-3xl md:text-5xl font-extrabold mt-6 leading-tight" data-i18n="title">Professional Commercial Bakery & Food Processing Equipment</h1>
      <p class="text-gray-200 mt-4 text-lg max-w-3xl mx-auto" data-i18n="desc">Factory direct supply of dough dividers, rotary ovens, spiral mixers, and complete bakery production lines.</p>
      <div class="mt-8 flex justify-center flex-wrap gap-4">
        <a href="#catalog" class="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition" data-i18n="explore">Explore Products</a>
        <a href="https://wa.me/8618124272578" target="_blank" class="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition flex items-center space-x-2">
          <i class="fab fa-whatsapp"></i>
          <span data-i18n="chatWA">Chat via WhatsApp</span>
        </a>
      </div>
    </div>
  </header>

  <!-- About Us & Factory Video -->
  <section id="about" class="max-w-7xl mx-auto px-4 py-14">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      <div>
        <span class="text-xs font-bold text-orange-600 uppercase tracking-wider" data-i18n="aboutTag">ABOUT DEBAO MACHINERY</span>
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mt-1">Guangzhou Debao Machinery Co., Ltd.</h2>
        <p id="aboutText" class="text-gray-600 mt-4 leading-relaxed"></p>
        <div class="grid grid-cols-3 gap-4 mt-6">
          <div class="bg-orange-50 p-4 rounded-xl text-center">
            <div class="text-2xl font-black text-orange-600">5,000+ ㎡</div>
            <div class="text-xs text-gray-600 mt-1" data-i18n="statArea">Factory Area</div>
          </div>
          <div class="bg-orange-50 p-4 rounded-xl text-center">
            <div class="text-2xl font-black text-orange-600">30+</div>
            <div class="text-xs text-gray-600 mt-1" data-i18n="statCountries">Export Countries</div>
          </div>
          <div class="bg-orange-50 p-4 rounded-xl text-center">
            <div class="text-2xl font-black text-orange-600">24/7</div>
            <div class="text-xs text-gray-600 mt-1" data-i18n="statSupport">Online Support</div>
          </div>
        </div>
      </div>
      <div class="bg-gray-900 rounded-xl p-6 text-white">
        <div class="flex items-center justify-between mb-3">
          <span class="font-bold text-sm">🏭 Factory & Machinery Demo Video</span>
          <span class="text-xs bg-orange-600 px-2 py-0.5 rounded">HD Video</span>
        </div>
        <div id="factoryVideoBox" class="text-sm text-gray-300"></div>
      </div>
    </div>
  </section>

  <!-- Product Catalog -->
  <section id="catalog" class="max-w-7xl mx-auto px-4 py-8">
    <div class="text-center mb-8">
      <span class="text-xs font-bold text-orange-600 uppercase tracking-wider" data-i18n="ourProducts">OUR PRODUCTS</span>
      <h2 class="text-3xl font-bold text-gray-900 mt-1" data-i18n="catTitle">Professional Commercial Bakery Equipment</h2>
    </div>

    <div class="flex flex-wrap justify-center gap-2 mb-8" id="catBar"></div>

    <div class="flex justify-between items-center mb-6">
      <h3 id="catHeading" class="text-xl font-bold text-gray-900">All Products</h3>
      <span id="prodCount" class="text-sm font-semibold text-gray-500"></span>
    </div>

    <div id="prodGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"></div>
  </section>

  <!-- Certifications -->
  <section id="certs" class="max-w-7xl mx-auto px-4 py-14">
    <div class="text-center mb-8">
      <span class="text-xs font-bold text-orange-600 uppercase tracking-wider">QUALITY & QUALIFICATIONS</span>
      <h2 class="text-3xl font-bold text-gray-900 mt-1" data-i18n="certTitle">Our Factory Certifications & Patents</h2>
    </div>
    <div id="certsGrid" class="grid grid-cols-2 md:grid-cols-4 gap-6"></div>
  </section>

  <!-- Shipping & OEM -->
  <section id="shipping" class="bg-white border-t border-gray-200 py-14 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-10">
        <span class="text-xs font-bold text-orange-600 uppercase tracking-wider">SERVICE & DELIVERY</span>
        <h2 class="text-3xl font-bold text-gray-900 mt-1">Customization, Lead Time & Shipping</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-xl bg-gray-50 border border-gray-100">
          <h3 class="font-bold text-lg text-gray-900">Lead Time</h3>
          <p class="text-gray-600 text-sm mt-2">Standard models shipped within 7 days; customized models shipped within 15–20 days.</p>
        </div>
        <div class="p-6 rounded-xl bg-gray-50 border border-gray-100">
          <h3 class="font-bold text-lg text-gray-900">OEM & ODM Support</h3>
          <p class="text-gray-600 text-sm mt-2">Private label, custom logo, voltage customization (110V/220V/380V), and bespoke specs.</p>
        </div>
        <div class="p-6 rounded-xl bg-gray-50 border border-gray-100">
          <h3 class="font-bold text-lg text-gray-900">Global Shipping</h3>
          <p class="text-gray-600 text-sm mt-2">Export-standard fumigation-free wooden crate packaging for safe worldwide sea & air freight.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-gray-400 py-10 px-4 text-center">
    <div class="max-w-7xl mx-auto">
      <div class="text-white font-bold text-lg">Guangzhou Debao Machinery Co., Ltd.</div>
      <div class="text-sm mt-2">WhatsApp: +86 181-2427-2578 | Email: tangyinjun518@gmail.com</div>
      <div class="text-xs text-gray-500 mt-6">Copyright © 2026 Guangzhou Debao Machinery Co., Ltd. All Rights Reserved.</div>
    </div>
  </footer>

  <!-- Product Detail & Specs Modal -->
  <div id="detailModal" class="fixed inset-0 bg-black/60 z-50 hidden items-center justify-center p-4" onclick="if(event.target===this)closeModal()">
    <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
      <button onclick="closeModal()" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">×</button>
      <div id="modalBody"></div>
    </div>
  </div>

  <script>
    const NL = String.fromCharCode(10);
    const fallbackCats = ${JSON.stringify(categories)};
    const fallbackCfg = ${JSON.stringify(defaultSiteConfig)};
    const langData = {
      en: {
        home: "Home", products: "Bakery Equipment", about: "About Us", certs: "Certifications", shipping: "Shipping & OEM",
        getQuote: "Get a Quote", subtitle: "GUANGZHOU FACTORY DIRECT",
        title: "Professional Commercial Bakery & Food Processing Equipment",
        desc: "Factory direct supply of dough dividers, rotary ovens, spiral mixers, and complete bakery production lines.",
        explore: "Explore Products", chatWA: "Chat via WhatsApp",
        aboutTag: "ABOUT DEBAO MACHINERY", statArea: "Factory Area", statCountries: "Export Countries", statSupport: "Online Support",
        ourProducts: "OUR PRODUCTS", catTitle: "Professional Commercial Bakery Equipment",
        certTitle: "Our Factory Certifications & Patents", inquireBtn: "Inquire Now", specsBtn: "Specs & Details", allBtn: "All Products"
      },
      "zh-CN": {
        home: "首页", products: "烘焙设备", about: "关于我们", certs: "资质认证", shipping: "运输与OEM",
        getQuote: "获取报价", subtitle: "广州工厂直销",
        title: "专业商用烘焙及食品加工设备",
        desc: "工厂直接供应面团分割机、旋转烤箱、螺旋搅拌机和完整的烘焙生产线。",
        explore: "浏览产品", chatWA: "通过 WhatsApp 聊天",
        aboutTag: "关于德宝机械", statArea: "工厂面积", statCountries: "出口国家", statSupport: "在线支持",
        ourProducts: "我们的产品", catTitle: "专业商用烘焙设备",
        certTitle: "我们的工厂认证和专利", inquireBtn: "立即咨询", specsBtn: "查看参数", allBtn: "所有产品"
      },
      "zh-TW": {
        home: "首頁", products: "烘焙設備", about: "關於我們", certs: "資質認證", shipping: "運輸與OEM",
        getQuote: "獲取報價", subtitle: "廣州工廠直銷",
        title: "專業商用烘焙及食品加工設備",
        desc: "工廠直接供應麵團分割機、旋轉烤箱、螺旋攪拌機和完整的烘焙生產線。",
        explore: "瀏覽產品", chatWA: "透過 WhatsApp 聊天",
        aboutTag: "關於德寶機械", statArea: "工廠面積", statCountries: "出口國家", statSupport: "在線支援",
        ourProducts: "我們的產品", catTitle: "專業商用烘焙設備",
        certTitle: "我們的工廠認證和專利", inquireBtn: "立即諮詢", specsBtn: "查看參數", allBtn: "所有產品"
      },
      es: {
        home: "Inicio", products: "Equipos", about: "Nosotros", certs: "Certificaciones", shipping: "Envío y OEM",
        getQuote: "Cotizar", subtitle: "DIRECTO DE FÁBRICA GUANGZHOU",
        title: "Equipos Profesionales de Panadería y Procesamiento de Alimentos",
        desc: "Suministro directo de fábrica de divisoras de masa, hornos rotativos, amasadoras espirales y líneas completas.",
        explore: "Explorar Productos", chatWA: "Chatear por WhatsApp",
        aboutTag: "SOBRE DEBAO MACHINERY", statArea: "Área de Fábrica", statCountries: "Países de Exportación", statSupport: "Soporte en Línea",
        ourProducts: "NUESTROS PRODUCTOS", catTitle: "Equipos Comerciales de Panadería",
        certTitle: "Certificaciones y Patentes de Fábrica", inquireBtn: "Consultar Ahora", specsBtn: "Especificaciones", allBtn: "Todos"
      },
      ar: {
        home: "الرئيسية", products: "معدات المخابز", about: "من نحن", certs: "الشهادات", shipping: "الشحن و OEM",
        getQuote: "احصل على عرض سعر", subtitle: "مباشرة من مصنع قوانغتشو",
        title: "معدات المخابز التجارية وتجهيز الأغذية الاحترافية",
        desc: "توريد مباشر من المصنع لقواطع العجين والأفران الدوارة والعجانات الحلزونية وخطوط الإنتاج الكاملة.",
        explore: "استكشف المنتجات", chatWA: "تحدث عبر واتساب",
        aboutTag: "حول ديبو للآلات", statArea: "مساحة المصنع", statCountries: "دول التصدير", statSupport: "دعم فني",
        ourProducts: "منتجاتنا", catTitle: "معدات المخابز التجارية الاحترافية",
        certTitle: "شهادات وبراءات اختراع المصنع", inquireBtn: "استفسر الآن", specsBtn: "المواصفات", allBtn: "جميع المنتجات"
      },
      id: {
        home: "Beranda", products: "Peralatan Roti", about: "Tentang Kami", certs: "Sertifikasi", shipping: "Pengiriman & OEM",
        getQuote: "Minta Penawaran", subtitle: "LANGSUNG PABRIK GUANGZHOU",
        title: "Peralatan Roti Komersial & Pengolahan Makanan Profesional",
        desc: "Pasokan langsung pabrik untuk pembagi adonan, oven rotari, mixer spiral, dan lini produksi roti lengkap.",
        explore: "Jelajahi Produk", chatWA: "Chat via WhatsApp",
        aboutTag: "TENTANG DEBAO MACHINERY", statArea: "Area Pabrik", statCountries: "Negara Ekspor", statSupport: "Dukungan Online",
        ourProducts: "PRODUK KAMI", catTitle: "Peralatan Roti Komersial Profesional",
        certTitle: "Sertifikasi & Paten Pabrik Kami", inquireBtn: "Tanya Sekarang", specsBtn: "Spesifikasi", allBtn: "Semua Produk"
      },
      ru: {
        home: "Главная", products: "Оборудование", about: "О нас", certs: "Сертификаты", shipping: "Доставка и OEM",
        getQuote: "Запросить цену", subtitle: "ПРЯМО С ЗАВОДА В ГУАНЧЖОУ",
        title: "Профессиональное хлебопекарное и пищевое оборудование",
        desc: "Прямые поставки с завода тестоделителей, ротационных печей, спиральных тестомесов и производственных линий.",
        explore: "Смотреть продукты", chatWA: "Чат в WhatsApp",
        aboutTag: "О КОМПАНИИ DEBAO", statArea: "Площадь завода", statCountries: "Стран экспорта", statSupport: "Поддержка 24/7",
        ourProducts: "НАША ПРОДУКЦИЯ", catTitle: "Профессиональное оборудование для пекарен",
        certTitle: "Сертификаты и патенты завода", inquireBtn: "Узнать цену", specsBtn: "Характеристики", allBtn: "Все товары"
      }
    };

    let state = { lang: "en", categories: fallbackCats, products: [], siteConfig: fallbackCfg, activeCat: "all", bannerIdx: 0 };

    function esc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function parseSpecsRows(specsText) {
      return String(specsText || "")
        .split(NL)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const idx = line.indexOf(":");
          const idxZh = line.indexOf("：");
          const splitAt = idx !== -1 ? idx : idxZh;
          if (splitAt > 0) {
            return { k: line.slice(0, splitAt).trim(), v: line.slice(splitAt + 1).trim() };
          }
          return { k: "Specification", v: line };
        });
    }

    function renderSpecsTable(specsText, compact = false) {
      const rows = parseSpecsRows(specsText);
      if (!rows.length) return "";
      const shown = compact ? rows.slice(0, 4) : rows;
      return '<table class="w-full text-xs border border-gray-200 rounded-lg overflow-hidden mt-3">' +
        shown.map((r, i) =>
          '<tr class="' + (i % 2 === 0 ? "bg-gray-50" : "bg-white") + ' border-b border-gray-100">' +
          '<td class="py-1.5 px-2.5 font-semibold text-gray-700 w-2/5">' + esc(r.k) + '</td>' +
          '<td class="py-1.5 px-2.5 text-gray-600">' + esc(r.v) + '</td></tr>'
        ).join("") +
        '</table>';
    }

    function changeLang(lang) {
      state.lang = langData[lang] ? lang : "en";
      const d = langData[state.lang];
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (d[key]) el.textContent = d[key];
      });
      document.documentElement.setAttribute("dir", state.lang === "ar" ? "rtl" : "ltr");
      renderCats();
      renderProducts();
    }

    function updateBanner() {
      const list = (state.siteConfig && state.siteConfig.banners && state.siteConfig.banners.length) ? state.siteConfig.banners : fallbackCfg.banners;
      if (!list.length) return;
      state.bannerIdx = (state.bannerIdx + 1) % list.length;
      document.getElementById("heroBg").style.backgroundImage = "url('" + list[state.bannerIdx] + "')";
    }

    function renderCats() {
      const d = langData[state.lang] || langData.en;
      const bar = document.getElementById("catBar");
      const allActive = state.activeCat === "all";
      const allBtn = '<button onclick="setCat(\'all\')" class="' + (allActive ? "bg-orange-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100") + ' px-4 py-2 rounded-full text-sm font-semibold transition">' + esc(d.allBtn) + ' (' + state.products.length + ')</button>';
      const items = state.categories.map(c => {
        const active = state.activeCat === c.id;
        return '<button onclick="setCat(\'' + c.id + '\')" class="' + (active ? "bg-orange-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100") + ' px-4 py-2 rounded-full text-sm font-semibold transition">' + esc(c.name) + '</button>';
      }).join("");
      bar.innerHTML = allBtn + items;
    }

    function setCat(cat) {
      state.activeCat = cat;
      renderCats();
      renderProducts();
    }

    function renderProducts() {
      const d = langData[state.lang] || langData.en;
      const grid = document.getElementById("prodGrid");
      const list = state.activeCat === "all" ? state.products : state.products.filter(p => p.cat === state.activeCat);
      const catObj = state.categories.find(c => c.id === state.activeCat);
      document.getElementById("catHeading").textContent = catObj ? catObj.name : d.allBtn;
      document.getElementById("prodCount").textContent = list.length + " Products";

      if (!list.length) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No products in this category yet.</div>';
        return;
      }

      grid.innerHTML = list.map(p => {
        const img = (p.imgs && p.imgs[0]) ? p.imgs[0] : "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80";
        const waText = encodeURIComponent("Hello Debao Machinery, I am interested in: " + (p.title || ""));
        const specsPreview = renderSpecsTable(p.specs, true);
        return '<div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition flex flex-col">' +
          '<div class="h-60 bg-gray-100 overflow-hidden relative cursor-pointer" onclick="openModal(\'' + esc(p.id) + '\')">' +
            '<img src="' + esc(img) + '" alt="' + esc(p.title) + '" class="w-full h-full object-cover hover:scale-105 transition duration-300" />' +
            (p.specs ? '<span class="absolute top-3 right-3 bg-gray-900/80 text-white text-xs font-semibold px-2.5 py-1 rounded">Specs Ready</span>' : '') +
          '</div>' +
          '<div class="p-5 flex-1 flex flex-col justify-between">' +
            '<div>' +
              '<h3 class="text-lg font-bold text-gray-900 cursor-pointer hover:text-orange-600" onclick="openModal(\'' + esc(p.id) + '\')">' + esc(p.title) + '</h3>' +
              '<p class="text-gray-600 text-sm mt-2 line-clamp-3">' + esc(p.desc) + '</p>' +
              specsPreview +
            '</div>' +
            '<div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">' +
              '<span class="text-lg font-black text-orange-600">' + esc(p.price || "Contact for Price") + '</span>' +
              '<div class="flex items-center gap-2">' +
                '<button onclick="openModal(\'' + esc(p.id) + '\')" class="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-3 py-2 rounded-lg">' + esc(d.specsBtn) + '</button>' +
                '<a href="https://wa.me/8618124272578?text=' + waText + '" target="_blank" class="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center space-x-1">' +
                  '<i class="fab fa-whatsapp"></i><span>' + esc(d.inquireBtn) + '</span>' +
                '</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    function openModal(id) {
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      const imgsHtml = (p.imgs || []).map(src =>
        '<img src="' + esc(src) + '" class="w-full h-56 object-cover rounded-lg border border-gray-200" />'
      ).join("");
      let videoHtml = "";
      if (p.video) {
        if (p.video.startsWith("data:video/")) {
          videoHtml = '<video src="' + esc(p.video) + '" controls class="w-full rounded-lg mt-4 max-h-72 bg-black"></video>';
        } else {
          videoHtml = '<div class="mt-4"><a href="' + esc(p.video) + '" target="_blank" class="inline-block bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">▶ Watch Machine Video ↗</a></div>';
        }
      }
      const waText = encodeURIComponent("Hello Debao Machinery, please send quotation & full technical parameters for: " + (p.title || ""));
      document.getElementById("modalBody").innerHTML =
        '<h3 class="text-2xl font-bold text-gray-900 pr-8">' + esc(p.title) + '</h3>' +
        '<div class="text-xl font-black text-orange-600 mt-1">' + esc(p.price || "Contact for Price") + '</div>' +
        '<p class="text-gray-600 text-sm mt-3 leading-relaxed">' + esc(p.desc) + '</p>' +
        (p.specs ? '<h4 class="font-bold text-sm text-gray-900 mt-5">Technical Specifications</h4>' + renderSpecsTable(p.specs, false) : '') +
        videoHtml +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">' + imgsHtml + '</div>' +
        '<div class="mt-6 flex justify-end">' +
          '<a href="https://wa.me/8618124272578?text=' + waText + '" target="_blank" class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl flex items-center space-x-2">' +
            '<i class="fab fa-whatsapp text-lg"></i><span>Inquire via WhatsApp (+86 181-2427-2578)</span>' +
          '</a>' +
        '</div>';
      const modal = document.getElementById("detailModal");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }

    function closeModal() {
      const modal = document.getElementById("detailModal");
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }

    function renderCerts() {
      const box = document.getElementById("certsGrid");
      const certs = (state.siteConfig && Array.isArray(state.siteConfig.certs)) ? state.siteConfig.certs : [];
      box.innerHTML = certs.map(c =>
        '<div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-center">' +
          (c.img ? '<img src="' + esc(c.img) + '" alt="' + esc(c.name) + '" class="w-full h-40 object-cover rounded-lg mb-3" />' : '') +
          '<div class="font-bold text-sm text-gray-800">' + esc(c.name || "Certificate") + '</div>' +
        '</div>'
      ).join("");
    }

    function renderFactoryVideo() {
      const v = state.siteConfig && state.siteConfig.video;
      const box = document.getElementById("factoryVideoBox");
      if (!v) {
        box.innerHTML = '<a href="https://wa.me/8618124272578" target="_blank" class="text-orange-400 underline">Contact us on WhatsApp for live factory tour video ↗</a>';
        return;
      }
      if (v.startsWith("data:video/")) {
        box.innerHTML = '<video src="' + esc(v) + '" controls class="w-full rounded-lg max-h-60 bg-black"></video>';
      } else {
        box.innerHTML = '<p class="mb-3">Video link configured:</p>' +
          '<a href="' + esc(v) + '" target="_blank" rel="noopener" class="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-lg">' +
          '<i class="fas fa-play-circle"></i><span>Open Factory Video ↗</span></a>';
      }
    }

    async function init() {
      const res = await fetch("/api/bootstrap");
      const data = await res.json();
      state.categories = data.categories || fallbackCats;
      state.products = data.products || [];
      state.siteConfig = data.siteConfig || fallbackCfg;
      document.getElementById("aboutText").textContent = state.siteConfig.about || "";
      if (state.siteConfig.banners && state.siteConfig.banners[0]) {
        document.getElementById("heroBg").style.backgroundImage = "url('" + state.siteConfig.banners[0] + "')";
      }
      renderFactoryVideo();
      renderCats();
      renderProducts();
      renderCerts();
      setInterval(updateBanner, 5000);
    }
    init();
  </script>
</body>
</html>`;
}

function renderAdminHtml(categories, defaultSpecTemplate, defaultSiteConfig) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>德堡机械 - 独立站全功能管理后台</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f3f4f6; color: #111827; }
    .wrap { max-width: 1120px; margin: 24px auto; padding: 0 16px; }
    .panel { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    label { display: block; font-weight: bold; margin: 12px 0 4px; font-size: 13px; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
    textarea.specs { min-height: 145px; font-family: monospace; line-height: 1.5; }
    button { padding: 8px 14px; border: none; border-radius: 6px; background: #2563eb; color: #fff; cursor: pointer; margin-top: 8px; margin-right: 6px; font-weight: bold; }
    button.secondary { background: #4b5563; }
    button.danger { background: #dc2626; }
    button.success { background: #059669; }
    .item { border-top: 1px solid #e5e7eb; padding: 16px 0; }
    .row-flex { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
    .edit-box { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin-top: 12px; }
    .thumb-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
    .thumb-item { position: relative; width: 84px; height: 64px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
    .thumb-item img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-item button { position: absolute; top: 2px; right: 2px; margin: 0; padding: 1px 6px; background: rgba(220,38,38,0.9); font-size: 11px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="panel" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <div>
        <h2 style="margin:0 0 8px;">🏭 广州德堡机械 - 独立站全功能管理后台</h2>
        <div style="font-size:13px;color:#4b5563;">已开启管理员密码保护 · 支持产品技术参数模板、本地传图传视频与 Sitemap 收录</div>
        <div style="margin-top:8px;">
          <a href="/" target="_blank">查看前台网站 ↗</a> · <a href="/sitemap.xml" target="_blank">查看 Sitemap ↗</a>
        </div>
      </div>
      <button type="button" class="danger" onclick="logoutAdmin()">退出登录</button>
    </div>

    <div class="panel">
      <h3 style="margin-top:0;">🖼️ 首页轮转图、公司介绍、视频与资质证书配置</h3>
      <label>公司英文简介文案</label>
      <textarea id="cfgAbout" rows="3"></textarea>

      <label>工厂演示视频（支持直接上传本地视频或填视频链接）</label>
      <input id="cfgVideo" placeholder="输入视频链接（如 Facebook / YouTube），或下方选择本地视频" />
      <input type="file" accept="video/*" onchange="uploadVideoToInput(this, 'cfgVideo')" style="margin-top:6px;" />

      <label>轮转图管理（支持本地上传图片）</label>
      <div id="bannerThumbs" class="thumb-row"></div>
      <input type="file" accept="image/*" multiple onchange="uploadBannerFiles(this)" />

      <label>工厂资质 / 荣誉证书管理（每行 1 项，格式：证书名称 | 图片链接或Base64）</label>
      <textarea id="cfgCerts" rows="4"></textarea>

      <div>
        <button type="button" class="success" onclick="saveSiteConfig()">💾 保存全部首页及资质配置</button>
      </div>
    </div>

    <div class="panel">
      <h3 style="margin-top:0;">➕ 上架新机器 / 添加产品（多图 + 技术参数模板 + 视频）</h3>
      <label>所属大分类 *</label>
      <select id="newCat">
        ${categories.map(c => `<option value="${c.id}">${c.name} (${c.zh})</option>`).join("")}
      </select>
      <label>展示价格</label>
      <input id="newPrice" value="Contact for Price" />
      <label>英文产品标题 *</label>
      <input id="newTitle" placeholder="例如：Fully Automatic Dough Divider" />
      <label>简短卖点描述（英文）</label>
      <input id="newDesc" placeholder="例如：Stainless steel body, exact weight control." />
      <label>产品技术参数（每行一项，格式 英文参数名: 参数值）</label>
      <textarea id="newSpecs" class="specs" placeholder="点击下方按钮一键填入标准参数模板，再修改数字即可"></textarea>
      <button type="button" class="secondary" onclick="fillNewSpecTpl()">✨ 一键填入标准参数模板</button>

      <label>上传机器实拍照片（可多选，最多 5 张，支持本地直接选图）*</label>
      <input type="file" id="newImgFiles" accept="image/*" multiple />

      <label>该产品演示视频（支持直接上传本地视频或填链接，可选）</label>
      <input id="newVideo" placeholder="输入视频链接，或下方直接选择本地视频" />
      <input type="file" accept="video/*" onchange="uploadVideoToInput(this, 'newVideo')" style="margin-top:6px;" />

      <div style="margin-top:10px;"><button type="button" onclick="addProduct()">确认上架此产品</button></div>
    </div>

    <div class="panel">
      <h3 id="listTitle" style="margin-top:0;">📦 已上架产品列表</h3>
      <div id="prodList"></div>
    </div>
  </div>

  <script>
    const NL = String.fromCharCode(10);
    const categories = ${JSON.stringify(categories)};
    const specTpl = ${JSON.stringify(defaultSpecTemplate)};
    const fallbackCfg = ${JSON.stringify(defaultSiteConfig)};
    let products = [];
    let siteConfig = fallbackCfg;
    let editingId = null;
    let editImgsBuffer = [];

    function logoutAdmin() {
      document.cookie = "debao_admin_pwd=; Path=/; Max-Age=0";
      location.reload();
    }

    function esc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function fillNewSpecTpl() {
      document.getElementById("newSpecs").value = specTpl;
    }

    function fillEditSpecTpl() {
      const el = document.getElementById("editSpecs");
      if (el) el.value = specTpl;
    }

    function fileToCompressedDataUrl(file, maxW = 1000, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(1, maxW / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", quality));
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function uploadVideoToInput(input, targetId) {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 6 * 1024 * 1024) {
        alert("本地视频建议小于 6MB，大视频请直接填写链接更稳定。");
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById(targetId).value = e.target.result;
        alert("本地视频已加载，记得点击保存/上架按钮生效");
      };
      reader.readAsDataURL(file);
    }

    async function uploadBannerFiles(input) {
      const files = Array.from(input.files || []);
      for (const f of files) {
        const url = await fileToCompressedDataUrl(f, 1400, 0.82);
        siteConfig.banners.push(url);
      }
      renderBannerThumbs();
    }

    function removeBanner(idx) {
      siteConfig.banners.splice(idx, 1);
      renderBannerThumbs();
    }

    function renderBannerThumbs() {
      const box = document.getElementById("bannerThumbs");
      box.innerHTML = (siteConfig.banners || []).map((src, idx) =>
        '<div class="thumb-item"><img src="' + esc(src) + '" /><button type="button" onclick="removeBanner(' + idx + ')">×</button></div>'
      ).join("");
    }

    function formatCertsToText(certs) {
      if (!Array.isArray(certs)) return "";
      return certs.map(c => (c.name || "") + " | " + (c.img || "")).join(NL);
    }

    function parseCertsFromText(text) {
      return String(text || "").split(NL).map(l => l.trim()).filter(Boolean).map(line => {
        const idx = line.indexOf("|");
        if (idx !== -1) return { name: line.slice(0, idx).trim(), img: line.slice(idx + 1).trim() };
        return { name: line, img: "" };
      });
    }

    async function loadAll() {
      const res = await fetch("/api/bootstrap");
      const data = await res.json();
      siteConfig = data.siteConfig || fallbackCfg;
      document.getElementById("cfgAbout").value = siteConfig.about || "";
      document.getElementById("cfgVideo").value = siteConfig.video || "";
      document.getElementById("cfgCerts").value = formatCertsToText(siteConfig.certs || []);
      renderBannerThumbs();
      products = data.products || [];
      renderList();
    }

    async function saveSiteConfig() {
      const payload = {
        banners: siteConfig.banners || [],
        about: document.getElementById("cfgAbout").value,
        video: document.getElementById("cfgVideo").value.trim(),
        certs: parseCertsFromText(document.getElementById("cfgCerts").value)
      };
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(data.ok ? "首页及资质配置已保存" : (data.error || "保存失败"));
    }

    function renderList() {
      document.getElementById("listTitle").textContent = "📦 已上架产品列表（共 " + products.length + " 款）";
      const box = document.getElementById("prodList");
      if (!products.length) {
        box.innerHTML = "<p>暂无产品</p>";
        return;
      }
      box.innerHTML = products.map(p => {
        const isEditing = editingId === p.id;
        let editHtml = "";
        if (isEditing) {
          const catOpts = categories.map(c =>
            '<option value="' + esc(c.id) + '" ' + (p.cat === c.id ? "selected" : "") + '>' + esc(c.name) + ' (' + esc(c.zh) + ')</option>'
          ).join("");
          const thumbs = editImgsBuffer.map((src, i) =>
            '<div class="thumb-item"><img src="' + esc(src) + '" /><button type="button" onclick="removeEditImg(' + i + ')">×</button></div>'
          ).join("");
          editHtml = '<div class="edit-box">' +
            '<label>所属大分类</label><select id="editCat">' + catOpts + '</select>' +
            '<label>英文产品标题</label><input id="editTitle" value="' + esc(p.title) + '" />' +
            '<label>展示价格</label><input id="editPrice" value="' + esc(p.price) + '" />' +
            '<label>简短卖点描述（英文）</label><input id="editDesc" value="' + esc(p.desc) + '" />' +
            '<label>产品技术参数（每行一项，格式 英文参数名: 参数值）</label>' +
            '<textarea id="editSpecs" class="specs">' + esc(p.specs || "") + '</textarea>' +
            '<button type="button" class="secondary" onclick="fillEditSpecTpl()">✨ 一键填入标准参数模板</button>' +
            '<label>当前产品图片（最多 5 张，可删除或追加上传）</label>' +
            '<div class="thumb-row">' + thumbs + '</div>' +
            '<input type="file" accept="image/*" multiple onchange="appendEditImgs(this)" />' +
            '<label>产品演示视频链接或本地上传</label>' +
            '<input id="editVideo" value="' + esc(p.video || "") + '" />' +
            '<input type="file" accept="video/*" onchange="uploadVideoToInput(this, \'editVideo\')" style="margin-top:6px;" />' +
            '<div style="margin-top:10px;"><button type="button" class="success" onclick="saveEdit(\'' + p.id + '\')">💾 保存图文与参数修改</button>' +
            '<button type="button" class="secondary" onclick="cancelEdit()">取消</button></div>' +
          '</div>';
        }
        return '<div class="item">' +
          '<div class="row-flex" style="justify-content:space-between;">' +
            '<div><strong>' + esc(p.title) + '</strong> · <span style="color:#dc2626;font-weight:bold;">' + esc(p.price) + '</span> · <span style="font-size:12px;color:#6b7280;">' + (p.imgs ? p.imgs.length : 0) + ' 张图</span></div>' +
            '<div class="row-flex" style="margin:0;">' +
              '<input id="quickPrice_' + p.id + '" style="width:140px;margin:0;" value="' + esc(p.price || "") + '" />' +
              '<button type="button" style="margin:0;" onclick="quickUpdatePrice(\'' + p.id + '\')">改价格</button>' +
              '<button type="button" class="secondary" style="margin:0;" onclick="startEdit(\'' + p.id + '\')">修改图文/参数</button>' +
              '<button type="button" class="danger" style="margin:0;" onclick="delProd(\'' + p.id + '\')">删除</button>' +
            '</div>' +
          '</div>' +
          (p.desc ? '<div style="font-size:13px;color:#374151;margin-top:4px;">' + esc(p.desc) + '</div>' : '') +
          (p.specs ? '<div style="font-size:12px;color:#059669;white-space:pre-line;margin-top:6px;background:#f0fdf4;padding:6px 8px;border-radius:6px;">' + esc(p.specs) + '</div>' : '') +
          editHtml +
        '</div>';
      }).join("");
    }

    function startEdit(id) {
      const p = products.find(x => x.id === id);
      editingId = id;
      editImgsBuffer = p && Array.isArray(p.imgs) ? [...p.imgs] : [];
      renderList();
    }

    function removeEditImg(idx) {
      editImgsBuffer.splice(idx, 1);
      renderList();
    }

    async function appendEditImgs(input) {
      const files = Array.from(input.files || []);
      for (const f of files) {
        if (editImgsBuffer.length >= 5) break;
        const url = await fileToCompressedDataUrl(f, 1000, 0.8);
        editImgsBuffer.push(url);
      }
      renderList();
    }

    function cancelEdit() {
      editingId = null;
      editImgsBuffer = [];
      renderList();
    }

    async function saveEdit(id) {
      const payload = {
        action: "update",
        id,
        cat: document.getElementById("editCat").value,
        title: document.getElementById("editTitle").value.trim(),
        price: document.getElementById("editPrice").value.trim() || "Contact for Price",
        desc: document.getElementById("editDesc").value.trim(),
        specs: document.getElementById("editSpecs").value,
        imgs: editImgsBuffer.slice(0, 5),
        video: document.getElementById("editVideo").value.trim()
      };
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        products = data.products;
        editingId = null;
        renderList();
        alert("产品图文与技术参数已更新");
      } else {
        alert(data.error || "更新失败");
      }
    }

    async function quickUpdatePrice(id) {
      const priceInput = document.getElementById("quickPrice_" + id);
      const price = (priceInput ? priceInput.value : "").trim() || "Contact for Price";
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "price", id, price })
      });
      const data = await res.json();
      if (data.ok) {
        products = data.products;
        renderList();
        alert("价格已更新");
      }
    }

    async function addProduct() {
      const title = document.getElementById("newTitle").value.trim();
      if (!title) return alert("请先填写英文产品标题");
      const files = Array.from(document.getElementById("newImgFiles").files || []).slice(0, 5);
      const imgs = [];
      for (const f of files) {
        imgs.push(await fileToCompressedDataUrl(f, 1000, 0.8));
      }
      const payload = {
        action: "add",
        cat: document.getElementById("newCat").value,
        title,
        price: document.getElementById("newPrice").value.trim() || "Contact for Price",
        desc: document.getElementById("newDesc").value.trim(),
        specs: document.getElementById("newSpecs").value,
        imgs,
        video: document.getElementById("newVideo").value.trim()
      };
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        products = data.products;
        renderList();
        document.getElementById("newTitle").value = "";
        document.getElementById("newDesc").value = "";
        document.getElementById("newSpecs").value = "";
        document.getElementById("newImgFiles").value = "";
        alert("新机器已上架");
      } else {
        alert(data.error || "上架失败");
      }
    }

    async function delProd(id) {
      if (!confirm("确定要删除这款产品吗？")) return;
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id })
      });
      const data = await res.json();
      if (data.ok) {
        products = data.products;
        renderList();
      }
    }

    loadAll();
  </script>
</body>
</html>`;
}
