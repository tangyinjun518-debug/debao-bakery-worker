export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/robots.txt") {
      const robots = `User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`;
      return new Response(robots, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (path === "/sitemap.xml") {
      const now = new Date().toISOString().split("T")[0];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url.origin}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
      return new Response(xml, {
        headers: { "Content-Type": "application/xml; charset=utf-8" }
      });
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
    ].map(x => `${x.label}: ${x.value}`).join("\n");

    const defaultProducts = [
      {
        id: "p1",
        cat: "divider",
        title: "Fully Automatic Dough Divider and Rounder Machine (30-100g)",
        price: "$1,670 USD",
        desc: "Intelligent PLC control, stainless steel body, exact weight control for bakery & pizza dough.",
        specs: defaultSpecTemplate,
        imgs: [
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80"
        ],
        video: ""
      }
    ];

    const defaultSiteConfig = {
      banners: [
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1600&q=80"
      ],
      about: "Located in the industrial hub of Guangzhou, China, we are a premier manufacturer and global exporter specializing in commercial bakery and food processing machinery. Our state-of-the-art facilities and dedicated R&D team deliver high-performance equipment trusted by bakeries and central kitchens worldwide.",
      video: "",
      certs: [
        { name: "CE European Standard", img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80" },
        { name: "ISO9001 Quality System", img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80" },
        { name: "Invention Patents", img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80" },
        { name: "Global Export License", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80" }
      ]
    };

    const db = env.DB;

    function sanitizeVideo(v) {
      if (typeof v !== "string") return "";
      if (v.startsWith("data:video/") && v.length > 2500000) return "";
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
            video: sanitizeVideo(parsed.video),
            certs: Array.isArray(parsed.certs) ? parsed.certs : fallback.certs
          };
        }
        if (key === "products" && Array.isArray(parsed)) {
          return parsed.map(item => ({
            ...item,
            specs: item.specs || "",
            imgs: Array.isArray(item.imgs) ? item.imgs.slice(0, 5) : [],
            video: sanitizeVideo(item.video)
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
          video: sanitizeVideo(body.video)
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
            video: body.video !== undefined ? sanitizeVideo(body.video) : (products[idx].video || "")
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
      if (!db) return Response.json({ error: "KV DB not bound" }, { status: 500 });
      const body = await request.json();
      const nextCfg = {
        banners: Array.isArray(body.banners) ? body.banners.filter(Boolean) : [],
        about: typeof body.about === "string" ? body.about : "",
        video: sanitizeVideo(body.video),
        certs: Array.isArray(body.certs) ? body.certs : []
      };
      await db.put("siteConfig", JSON.stringify(nextCfg));
      return Response.json({ ok: true, siteConfig: nextCfg });
    }

    if (path === "/admin") {
      return new Response(renderAdminHtml(defaultCategories, defaultSpecTemplate, defaultSiteConfig), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    return new Response(renderStoreHtml(defaultCategories, defaultSiteConfig), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};

function renderStoreHtml(categories, defaultSiteConfig) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Guangzhou Debao Machinery - Commercial Bakery Equipment</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; background: #f7f7f7; color: #222; }
  header { background: #1f2937; color: #fff; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
  .wrap { max-width: 1180px; margin: 20px auto; padding: 0 16px; }
  .banner-box { position: relative; border-radius: 10px; overflow: hidden; background: #111827; margin-bottom: 20px; }
  .banner-box img { width: 100%; height: 320px; object-fit: cover; display: block; }
  .banner-ctrl { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 8px; }
  .banner-ctrl button { background: rgba(0,0,0,0.65); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; padding: 6px 10px; cursor: pointer; }
  .section { background: #fff; border-radius: 10px; padding: 18px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .cats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .cat-btn { padding: 8px 14px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer; }
  .cat-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 18px; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
  .card img { width: 100%; height: 180px; object-fit: cover; border-radius: 6px; background: #eee; }
  .price { color: #dc2626; font-weight: bold; margin: 8px 0; font-size: 16px; }
  .specs-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; font-size: 12px; white-space: pre-line; margin-top: 8px; }
  .certs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
  .cert-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; }
  .cert-card img { width: 100%; height: 150px; object-fit: cover; border-radius: 6px; }
</style>
</head>
<body>
<header>
  <div><strong>Guangzhou Debao Machinery</strong></div>
  <a href="/admin" style="color:#93c5fd;text-decoration:none;">Admin</a>
</header>
<div class="wrap">
  <div class="banner-box" id="bannerBox">
    <img id="bannerImg" src="" alt="Banner" />
    <div class="banner-ctrl">
      <button type="button" onclick="prevBanner()">Prev</button>
      <button type="button" onclick="nextBanner()">Next</button>
    </div>
  </div>

  <div class="section">
    <h2>About Us</h2>
    <p id="aboutText" style="line-height:1.6;margin:0;"></p>
  </div>

  <div class="cats" id="catBar"></div>
  <div class="grid" id="prodGrid"></div>

  <div class="section" style="margin-top:24px;">
    <h2>Factory Certifications</h2>
    <div class="certs-grid" id="certsGrid"></div>
  </div>
</div>
<script>
const fallbackCats = ${JSON.stringify(categories)};
const fallbackCfg = ${JSON.stringify(defaultSiteConfig)};
let state = { categories: fallbackCats, products: [], siteConfig: fallbackCfg, activeCat: "all", bannerIdx: 0 };

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderBanner() {
  const list = (state.siteConfig && state.siteConfig.banners && state.siteConfig.banners.length) ? state.siteConfig.banners : fallbackCfg.banners;
  if (!list.length) {
    document.getElementById("bannerBox").style.display = "none";
    return;
  }
  state.bannerIdx = ((state.bannerIdx % list.length) + list.length) % list.length;
  document.getElementById("bannerBox").style.display = "block";
  document.getElementById("bannerImg").src = list[state.bannerIdx];
}

function prevBanner() { state.bannerIdx -= 1; renderBanner(); }
function nextBanner() { state.bannerIdx += 1; renderBanner(); }

function renderCats() {
  const bar = document.getElementById("catBar");
  const allBtn = '<button class="cat-btn ' + (state.activeCat === "all" ? "active" : "") + '" onclick="setCat(\\'all\\')">All</button>';
  const items = state.categories.map(c =>
    '<button class="cat-btn ' + (state.activeCat === c.id ? "active" : "") + '" onclick="setCat(\\'' + c.id + '\\')">' + esc(c.name) + '</button>'
  ).join("");
  bar.innerHTML = allBtn + items;
}

function setCat(cat) {
  state.activeCat = cat;
  renderCats();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("prodGrid");
  const list = state.activeCat === "all" ? state.products : state.products.filter(p => p.cat === state.activeCat);
  if (!list.length) {
    grid.innerHTML = "<p>No products in this category yet.</p>";
    return;
  }
  grid.innerHTML = list.map(p => {
    const img = (p.imgs && p.imgs[0]) ? p.imgs[0] : "";
    const specsHtml = p.specs ? '<div class="specs-box">' + esc(p.specs) + '</div>' : "";
    const videoHtml = p.video ? '<div style="margin-top:8px;"><a href="' + esc(p.video) + '" target="_blank" rel="noopener">Watch Demo Video ↗</a></div>' : "";
    return '<div class="card">' +
      (img ? '<img src="' + esc(img) + '" alt="" />' : '') +
      '<h3>' + esc(p.title) + '</h3>' +
      '<div class="price">' + esc(p.price || "Contact for Price") + '</div>' +
      '<p>' + esc(p.desc) + '</p>' +
      specsHtml +
      videoHtml +
    '</div>';
  }).join("");
}

function renderCerts() {
  const box = document.getElementById("certsGrid");
  const certs = (state.siteConfig && Array.isArray(state.siteConfig.certs)) ? state.siteConfig.certs : [];
  if (!certs.length) {
    box.innerHTML = "<p>Certifications coming soon.</p>";
    return;
  }
  box.innerHTML = certs.map(c =>
    '<div class="cert-card">' +
      (c.img ? '<img src="' + esc(c.img) + '" alt="' + esc(c.name) + '" />' : '') +
      '<div style="margin-top:8px;font-weight:bold;font-size:13px;">' + esc(c.name || "Certificate") + '</div>' +
    '</div>'
  ).join("");
}

async function init() {
  renderBanner();
  renderCats();
  renderCerts();
  const res = await fetch("/api/bootstrap");
  const data = await res.json();
  state.categories = data.categories || fallbackCats;
  state.products = data.products || [];
  state.siteConfig = data.siteConfig || fallbackCfg;
  document.getElementById("aboutText").textContent = state.siteConfig.about || "";
  renderBanner();
  renderCats();
  renderProducts();
  renderCerts();
  setInterval(nextBanner, 5000);
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
  .panel { background: #fff; border-radius: 8px; padding: 18px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  label { display: block; font-weight: bold; margin: 10px 0 4px; font-size: 13px; }
  input, select, textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
  textarea.specs { min-height: 130px; font-family: monospace; }
  button { padding: 8px 14px; border: none; border-radius: 6px; background: #2563eb; color: #fff; cursor: pointer; margin-top: 8px; margin-right: 6px; }
  button.secondary { background: #4b5563; }
  button.danger { background: #dc2626; }
  button.success { background: #059669; }
  .item { border-top: 1px solid #e5e7eb; padding: 14px 0; }
  .row-flex { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
  .edit-box { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; margin-top: 10px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="panel">
    <h2>🏭 广州德堡机械 - 独立站全功能管理后台</h2>
    <a href="/" target="_blank">查看前台网站 ↗</a> · <a href="/sitemap.xml" target="_blank">查看 Sitemap ↗</a>
  </div>

  <div class="panel">
    <h3>🖼️ 首页轮转图、公司简介与工厂资质证书设置</h3>
    <label>首页轮转图链接（每行 1 张大图 URL）</label>
    <textarea id="cfgBanners" rows="3" placeholder="每行输入一张轮转图链接"></textarea>

    <label>公司简介（英文，展示在前台 About Us）</label>
    <textarea id="cfgAbout" rows="3"></textarea>

    <label>工厂视频链接（可选，填外部视频链接）</label>
    <input id="cfgVideo" placeholder="输入视频链接" />

    <label>工厂资质证书列表（每行 1 项，格式：证书名称 | 图片链接）</label>
    <textarea id="cfgCerts" rows="4" placeholder="例如：CE European Standard | https://example.com/ce.jpg"></textarea>
    <div>
      <button type="button" class="success" onclick="saveSiteConfig()">💾 保存首页轮转图 / 公司简介 / 资质证书</button>
    </div>
  </div>

  <div class="panel">
    <h3>➕ 上架新机器 / 添加产品（多图 + 参数表 + 视频）</h3>
    <label>所属大分类</label>
    <select id="newCat">
      ${categories.map(c => `<option value="${c.id}">${c.name} (${c.zh})</option>`).join("")}
    </select>
    <label>英文产品标题</label>
    <input id="newTitle" placeholder="例如：Fully Automatic Dough Divider" />
    <label>展示价格</label>
    <input id="newPrice" value="Contact for Price" />
    <label>简短卖点描述（英文）</label>
    <input id="newDesc" placeholder="例如：Stainless steel body, exact weight control." />
    <label>产品技术参数（每行一项，例如 Voltage: 220V/380V）</label>
    <textarea id="newSpecs" class="specs"></textarea>
    <button type="button" class="secondary" onclick="fillNewSpecTpl()">✨ 一键填入标准参数模板</button>
    <label>产品图片链接（每行 1 张，最多 5 张）</label>
    <textarea id="newImgs" rows="3" placeholder="粘贴图片 URL，每行一条"></textarea>
    <label>视频链接（可选）</label>
    <input id="newVideo" placeholder="输入视频链接" />
    <div><button type="button" onclick="addProduct()">确认上架此产品</button></div>
  </div>

  <div class="panel">
    <h3 id="listTitle">📦 已上架产品列表</h3>
    <div id="prodList"></div>
  </div>
</div>
<script>
const categories = ${JSON.stringify(categories)};
const specTpl = ${JSON.stringify(defaultSpecTemplate)};
const fallbackCfg = ${JSON.stringify(defaultSiteConfig)};
let products = [];
let editingId = null;

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

function formatCertsToText(certs) {
  if (!Array.isArray(certs)) return "";
  return certs.map(c => (c.name || "") + " | " + (c.img || "")).join("\\n");
}

function parseCertsFromText(text) {
  return String(text || "")
    .split("\\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split("|");
      if (parts.length >= 2) {
        return { name: parts[0].trim(), img: parts.slice(1).join("|").trim() };
      }
      return { name: line, img: "" };
    });
}

async function loadAll() {
  const res = await fetch("/api/bootstrap");
  const data = await res.json();
  const cfg = data.siteConfig || fallbackCfg;
  document.getElementById("cfgBanners").value = (cfg.banners || []).join("\\n");
  document.getElementById("cfgAbout").value = cfg.about || "";
  document.getElementById("cfgVideo").value = cfg.video || "";
  document.getElementById("cfgCerts").value = formatCertsToText(cfg.certs || []);
  products = data.products || [];
  renderList();
}

async function saveSiteConfig() {
  const banners = document.getElementById("cfgBanners").value.split("\\n").map(s => s.trim()).filter(Boolean);
  const about = document.getElementById("cfgAbout").value;
  const video = document.getElementById("cfgVideo").value.trim();
  const certs = parseCertsFromText(document.getElementById("cfgCerts").value);
  const res = await fetch("/api/site-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ banners, about, video, certs })
  });
  const data = await res.json();
  if (data.ok) {
    alert("首页轮转图、公司简介与资质证书已保存");
  } else {
    alert(data.error || "保存失败");
  }
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
      editHtml = '<div class="edit-box">' +
        '<label>所属分类</label><select id="editCat">' + catOpts + '</select>' +
        '<label>英文标题</label><input id="editTitle" value="' + esc(p.title) + '" />' +
        '<label>价格</label><input id="editPrice" value="' + esc(p.price) + '" />' +
        '<label>简短描述</label><input id="editDesc" value="' + esc(p.desc) + '" />' +
        '<label>产品技术参数</label><textarea id="editSpecs" class="specs">' + esc(p.specs || "") + '</textarea>' +
        '<button type="button" class="secondary" onclick="fillEditSpecTpl()">✨ 填入标准参数模板</button>' +
        '<label>图片链接（每行 1 张，最多 5 张）</label><textarea id="editImgs" rows="3">' + esc((p.imgs || []).join("\\n")) + '</textarea>' +
        '<label>视频链接</label><input id="editVideo" value="' + esc(p.video || "") + '" />' +
        '<div><button type="button" class="success" onclick="saveEdit(\\'' + p.id + '\\')">保存修改</button>' +
        '<button type="button" class="secondary" onclick="cancelEdit()">取消</button></div>' +
      '</div>';
    }
    return '<div class="item">' +
      '<div class="row-flex" style="justify-content:space-between;">' +
        '<div><strong>' + esc(p.title) + '</strong> · <span style="color:#dc2626;font-weight:bold;">' + esc(p.price) + '</span></div>' +
        '<div class="row-flex" style="margin:0;">' +
          '<input id="quickPrice_' + p.id + '" style="width:140px;margin:0;" value="' + esc(p.price || "") + '" />' +
          '<button type="button" style="margin:0;" onclick="quickUpdatePrice(\\'' + p.id + '\\')">改价格</button>' +
          '<button type="button" class="secondary" style="margin:0;" onclick="startEdit(\\'' + p.id + '\\')">改图文/参数</button>' +
          '<button type="button" class="danger" style="margin:0;" onclick="delProd(\\'' + p.id + '\\')">删除</button>' +
        '</div>' +
      '</div>' +
      (p.desc ? '<div style="font-size:13px;color:#374151;margin-top:4px;">' + esc(p.desc) + '</div>' : '') +
      (p.specs ? '<div style="font-size:12px;color:#6b7280;white-space:pre-line;margin-top:6px;">' + esc(p.specs) + '</div>' : '') +
      editHtml +
    '</div>';
  }).join("");
}

function startEdit(id) {
  editingId = id;
  renderList();
}

function cancelEdit() {
  editingId = null;
  renderList();
}

async function saveEdit(id) {
  const imgs = document.getElementById("editImgs").value.split("\\n").map(s => s.trim()).filter(Boolean).slice(0, 5);
  const payload = {
    action: "update",
    id,
    cat: document.getElementById("editCat").value,
    title: document.getElementById("editTitle").value.trim(),
    price: document.getElementById("editPrice").value.trim() || "Contact for Price",
    desc: document.getElementById("editDesc").value.trim(),
    specs: document.getElementById("editSpecs").value,
    imgs,
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
    alert("产品图文与参数已更新");
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
  } else {
    alert(data.error || "改价失败");
  }
}

async function addProduct() {
  const title = document.getElementById("newTitle").value.trim();
  if (!title) return alert("请先填写英文产品标题");
  const imgs = document.getElementById("newImgs").value.split("\\n").map(s => s.trim()).filter(Boolean).slice(0, 5);
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
    alert("上架成功");
  } else {
    alert(data.error || "保存失败");
  }
}

async function delProd(id) {
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