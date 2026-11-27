export default {
  async fetch(request, env) {
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "gzdbjx..168";
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
      const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: \${url.origin}/sitemap.xml\n`;
      return new Response(robots, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (path === "/sitemap.xml") {
      const now = new Date().toISOString().split("T")[0];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>\${url.origin}/</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
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
            "Set-Cookie": `debao_admin_pwd=\${encodeURIComponent(ADMIN_PASSWORD)}; Path=/; Max-Age=604800; SameSite=Lax`
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
    ].map(x => `${x.label}:${x.value}`).join("\n");

    const defaultProducts = [];

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
            banners: Array.isArray(parsed.banners) ? parsed.banners : fallback.banners,
            about: typeof parsed.about === "string" ? parsed.about : fallback.about,
            video: sanitizeMedia(parsed.video),
            certs: Array.isArray(parsed.certs) ? parsed.certs : fallback.certs
          };
        }
        if (key === "products" && Array.isArray(parsed)) {
          return parsed.map(item => ({
            ...item,
            specs: item.specs || "",
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
    const fallbackCats = \${JSON.stringify(categories)};
    const fallbackCfg = \${JSON.stringify(defaultSiteConfig)};
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
        .split(/\r?\n/)
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
      document.getElementById
