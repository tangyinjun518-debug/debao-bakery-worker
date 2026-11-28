
const LANGS = ["en","zh","ms","id","th","vi","ar","es"];
const NAMES = {en:"English",zh:"简体中文",ms:"Bahasa Melayu",id:"Bahasa Indonesia",th:"ไทย",vi:"Tiếng Việt",ar:"العربية",es:"Español"};
const DEFAULTS = {
  products: [],
  categories: [],
  config: {
    company: "Guangzhou Depauw Machinery Co., Ltd.",
    about: "We are a factory-direct manufacturer of commercial bakery equipment and food processing machinery in Guangzhou, China.",
    whatsapp: "8618124272578",
    email: "tangyinjun518@gmail.com",
    factoryVideo: "",
    banners: [],
    certificates: []
  }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}});
const html = (s,status=200) => new Response(s,{status,headers:{"content-type":"text/html;charset=utf-8","x-content-type-options":"nosniff"}});
const read = async (env,key,fallback) => {
  try { const v=await env.DB.get(key); return v?JSON.parse(v):fallback; } catch { return fallback; }
};
const save = (env,key,value) => env.DB.put(key,JSON.stringify(value));
const cookieName = "debao_admin";
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function sign(payload,secret) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return b64(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload)));
}
async function token(secret) {
  const p=b64(new TextEncoder().encode(JSON.stringify({exp:Date.now()+86400000})));
  return p+"."+await sign(p,secret);
}
async function authorized(req,env) {
  const c=req.headers.get("Cookie")||"";
  const m=c.match(new RegExp("(?:^|;\\s*)"+cookieName+"=([^;]+)"));
  if(!m||!env.ADMIN_PASSWORD)return false;
  const [p,s]=m[1].split(".");
  if(!p||!s||s!==await sign(p,env.ADMIN_PASSWORD))return false;
  try { return JSON.parse(new TextDecoder().decode(unb64(p))).exp>Date.now(); } catch { return false; }
}
const needAuth = async (req,env) => await authorized(req,env);
async function body(req) { try{return await req.json();}catch{return {};} }
function langFrom(path) {
  const l=path.split("/")[1];
  return LANGS.includes(l)?l:"en";
}
function pathLang(path) {
  const l=langFrom(path);
  return "/"+l+"/";
}
function t(lang,en,zh) { return lang==="zh"?zh:en; }
function pick(obj,lang,field) {
  return obj?.translations?.[lang]?.[field] || obj?.[field] || "";
}
function layout(lang,title,content,config) {
  const rtl=lang==="ar";
  const links=LANGS.map(l=>`<a href="/${l}/">${NAMES[l]}</a>`).join("");
  const wa=(config.whatsapp||"8618124272578").replace(/\D/g,"");
  return `<!doctype html><html lang="${lang}" dir="${rtl?"rtl":"ltr"}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(config.about)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="">
${LANGS.map(l=>`<link rel="alternate" hreflang="${l}" href="/${l}/">`).join("")}
<link rel="alternate" hreflang="x-default" href="/en/">
<style>
*{box-sizing:border-box}body{margin:0;font:16px Arial,sans-serif;color:#202833;background:#fff;line-height:1.6}
a{color:inherit;text-decoration:none}.top{background:#172b43;color:#fff;padding:12px 5%;display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}
.top a{margin:0 7px;font-size:13px}.nav{padding:20px 5%;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;gap:20px;flex-wrap:wrap}
.logo{font-size:22px;font-weight:bold;color:#172b43}.navlinks{display:flex;gap:20px;flex-wrap:wrap}
.hero{padding:65px 6%;background:#edf2f7;text-align:center}.hero h1{font-size:38px;margin:0 0 15px}.hero p{max-width:750px;margin:0 auto 25px;color:#526170}
.btn{display:inline-block;background:#e58b27;color:white;padding:12px 23px;border-radius:4px;font-weight:bold}
.wrap{max-width:1200px;margin:auto;padding:45px 5%}.section-title{text-align:center;margin:0 0 30px;font-size:28px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px}
.card{border:1px solid #e5e8ec;border-radius:7px;overflow:hidden;background:white}.card img{width:100%;height:210px;object-fit:cover;background:#f3f4f6}
.cardbody{padding:17px}.card h3{margin:0 0 8px}.muted{color:#687584;font-size:14px}
.detail{display:grid;grid-template-columns:1fr 1fr;gap:35px}.detail img{max-width:100%;border-radius:6px}.gallery{display:flex;gap:10px;flex-wrap:wrap}.gallery img{width:100px;height:80px;object-fit:cover}
footer{background:#172b43;color:#fff;padding:35px 5%;text-align:center;margin-top:30px}
input,textarea,select,button{font:inherit;padding:10px;border:1px solid #ccd3da;border-radius:4px}
@media(max-width:700px){.detail{grid-template-columns:1fr}.hero h1{font-size:29px}}
</style></head><body>
<div class="top"><span>${esc(config.company)}</span><span><a href="mailto:${esc(config.email)}">${esc(config.email)}</a><a href="https://wa.me/${esc(wa)}">WhatsApp</a></span></div>
<header class="nav"><a class="logo" href="/${lang}/">${esc(config.company)}</a><nav class="navlinks"><a href="/${lang}/">${t(lang,"Home","首页")}</a><a href="/${lang}/#products">${t(lang,"Products","产品中心")}</a><a href="/${lang}/#about">${t(lang,"About Us","关于我们")}</a><a href="/${lang}/#contact">${t(lang,"Contact","联系我们")}</a></nav></header>
<div style="background:#f7f8fa;padding:9px 5%;text-align:center">${links}</div>
${content}
<footer><h3>${esc(config.company)}</h3><p>${esc(config.about)}</p><p>${esc(config.email)}　|　WhatsApp: +${esc(wa)}</p><a class="btn" href="https://wa.me/${esc(wa)}">${t(lang,"Contact us on WhatsApp","通过 WhatsApp 联系我们")}</a></footer>
</body></html>`;
}
function productCard(p,lang) {
  const title=pick(p,lang,"title"),desc=pick(p,lang,"description");
  const img=p.images?.[0]||"";
  return `<article class="card"><a href="/${lang}/product/${encodeURIComponent(p.id)}"><img src="${esc(img)}" alt="${esc(title)}" loading="lazy"></a><div class="cardbody"><h3><a href="/${lang}/product/${encodeURIComponent(p.id)}">${esc(title)}</a></h3><p class="muted">${esc(desc).slice(0,150)}</p><a class="btn" href="/${lang}/product/${encodeURIComponent(p.id)}">${lang==="zh"?"查看详情":"View Details"}</a></div></article>`;
}
async function publicPage(req,env,url) {
  const products=await read(env,"products",[]);
  const cfg={...DEFAULTS.config,...await read(env,"config",DEFAULTS.config)};
  const lang=langFrom(url.pathname);
  const parts=url.pathname.split("/").filter(Boolean);
  if(parts[1]==="product"&&parts[2]) {
    const p=products.find(x=>x.id===decodeURIComponent(parts[2]));
    if(!p)return html("Product not found",404);
    const title=pick(p,lang,"title");
    const images=(p.images||[]).map(i=>`<img src="${esc(i)}" alt="${esc(title)}">`).join("");
    const specs=p.specs||"";
    const content=`<main class="wrap"><div class="detail"><div><img src="${esc(p.images?.[0]||"")}" alt="${esc(title)}"><div class="gallery">${images}</div></div><div><h1>${esc(title)}</h1><p>${esc(p.price||"Contact for price")}</p><p>${esc(pick(p,lang,"description"))}</p><h3>${lang==="zh"?"技术参数":"Specifications"}</h3><div>${esc(specs).replace(/\n/g,"<br>")}</div><p><a class="btn" href="https://wa.me/${esc(cfg.whatsapp)}?text=${encodeURIComponent("I am interested in "+title)}">${lang==="zh"?"询问价格":"Send Inquiry"}</a></p>${p.video?`<p><a href="${esc(p.video)}" target="_blank" rel="noopener">Watch Product Video</a></p>`:""}</div></div></main>`;
    return html(layout(lang,title,content,cfg));
  }
  const cats=await read(env,"categories",[]);
  const banners=cfg.banners||[];
  const banner=banners[0];
  const hero=banner?`<section class="hero" style="${banner.image?`background:linear-gradient(#172b4366,#172b4366),url('${esc(banner.image)}') center/cover;color:white`:""}"><h1>${esc(pick(banner,lang,"title")||"Commercial Bakery Equipment")}</h1><p>${esc(pick(banner,lang,"description")||"Factory-direct bakery machinery and food processing equipment from Guangzhou, China.")}</p><a class="btn" href="#products">${lang==="zh"?"浏览产品":"Explore Products"}</a></section>`:`<section class="hero"><h1>Commercial Bakery & Food Processing Equipment</h1><p>${esc(cfg.about)}</p><a class="btn" href="#products">Explore Products</a></section>`;
  const categoryHtml=cats.length?`<div class="wrap"><h2 class="section-title">${lang==="zh"?"产品分类":"Product Categories"}</h2><div class="cards">${cats.map(c=>`<div class="card"><div class="cardbody"><h3>${esc(pick(c,lang,"name"))}</h3></div></div>`).join("")}</div></div>`:"";
  const content=`${hero}${categoryHtml}<section class="wrap" id="products"><h2 class="section-title">${lang==="zh"?"产品中心":"Our Products"}</h2><div class="cards">${products.map(p=>productCard(p,lang)).join("")||"<p>No products have been added yet. Please visit again soon.</p>"}</div></section><section class="wrap" id="about"><h2 class="section-title">${lang==="zh"?"关于我们":"About Our Factory"}</h2><p>${esc(cfg.about)}</p>${cfg.factoryVideo?`<p><a class="btn" href="${esc(cfg.factoryVideo)}" target="_blank" rel="noopener">Watch Factory Video</a></p>`:""}</section><section class="wrap" id="contact"><h2 class="section-title">${lang==="zh"?"联系我们":"Contact Us"}</h2><p>${esc(cfg.company)}</p><p>${esc(cfg.email)}</p><a class="btn" href="https://wa.me/${esc(cfg.whatsapp)}">WhatsApp</a></section>`;
  return html(layout(lang,cfg.company,content,cfg));
}
function adminPage() {
return html(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Depauw Admin</title><style>
body{font:15px Arial;background:#f3f5f8;margin:0;color:#243244}header{background:#172b43;color:white;padding:18px 4%;display:flex;justify-content:space-between}main{max-width:1100px;margin:25px auto;padding:0 15px}.box{background:white;padding:20px;margin:15px 0;border-radius:8px;box-shadow:0 1px 5px #ddd}input,textarea,select{width:100%;padding:10px;margin:6px 0 12px;border:1px solid #ccd3da;border-radius:4px;box-sizing:border-box}textarea{min-height:85px}button{background:#1769aa;color:white;border:0;padding:10px 17px;border-radius:4px;cursor:pointer;margin:4px}button.red{background:#b83232}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{border-bottom:1px solid #ddd;padding:12px 0}.small{font-size:12px;color:#667}#app{display:none}@media(max-width:650px){.row{grid-template-columns:1fr}}</style></head><body>
<header><b>Guangzhou Depauw Machinery - Admin</b><button onclick="logout()">Log out</button></header><main>
<div id="login" class="box"><h2>Admin Login</h2><input id="pw" type="password" placeholder="Admin password"><button onclick="login()">Log in</button><p id="err"></p></div>
<div id="app">
<div class="box"><h2>Products</h2><div id="products"></div><h3 id="formtitle">Add / Edit Product</h3><input id="pid" type="hidden"><label>Product title</label><input id="ptitle"><label>Price</label><input id="price" placeholder="Contact for price"><label>Category</label><input id="cat"><label>Description</label><textarea id="desc"></textarea><label>Specifications (one line per item)</label><textarea id="specs"></textarea><label>Product images (select multiple)</label><input id="files" type="file" accept="image/*" multiple><label>Existing image URLs (one URL per line)</label><textarea id="images"></textarea><label>Facebook / YouTube video URL</label><input id="video"><button onclick="saveProduct()">Save Product</button><button onclick="clearProduct()">New Product</button></div>
<div class="box"><h2>Categories</h2><div id="categories"></div><input id="catname" placeholder="Category name"><button onclick="addCategory()">Add Category</button></div>
<div class="box"><h2>Website Settings</h2><label>Company name</label><input id="company"><label>Company introduction</label><textarea id="about"></textarea><div class="row"><div><label>WhatsApp number (international format, numbers only)</label><input id="whatsapp"></div><div><label>Email</label><input id="email"></div></div><label>Factory video URL</label><input id="factoryVideo"><button onclick="saveConfig()">Save Settings</button></div>
<div class="box"><h2>Homepage Banners</h2><div id="banners"></div><input id="btitle" placeholder="Banner title"><input id="bdesc" placeholder="Banner description"><input id="bimage" placeholder="Banner image URL"><button onclick="addBanner()">Add Banner</button></div>
<div class="box"><h2>Certificates</h2><div id="certs"></div><input id="ctitle" placeholder="Certificate title"><input id="cimage" placeholder="Certificate image URL"><button onclick="addCert()">Add Certificate</button></div>
<div class="box"><h2>AI Translation</h2><p class="small">Translate product titles and descriptions from English. Machine translations should be checked and edited before publishing.</p><select id="target">${LANGS.filter(l=>l!=="en").map(l=>`<option value="${l}">${NAMES[l]}</option>`).join("")}</select><button onclick="translateAll()">Translate all products</button><p id="transmsg"></p></div>
</div></main><script>
const $=id=>document.getElementById(id);
async function api(path,method="GET",data){let r=await fetch(path,{method,headers:{"content-type":"application/json"},body:data?JSON.stringify(data):undefined});let j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Request failed");return j}
async function login(){try{await api("/api/login","POST",{password:$("pw").value});$("login").style.display="none";$("app").style.display="block";await load()}catch(e){$("err").textContent=e.message}}
async function logout(){await api("/api/logout","POST",{}).catch(()=>{});location.reload()}
async function load(){let d=await api("/api/admin/bootstrap");window.data=d;render();$("company").value=d.config.company||"";$("about").value=d.config.about||"";$("whatsapp").value=d.config.whatsapp||"";$("email").value=d.config.email||"";$("factoryVideo").value=d.config.factoryVideo||""}

function render(){
  $("products").innerHTML = window.data.products.map(p =>
    "<div class=\"item\">" +
    "<b>" + safe(p.title) + "</b> " +
    "<span class=\"small\">" + safe(p.price || "") + "</span>" +
    "<button onclick=\"editProduct('" + p.id + "')\">Edit</button>" +
    "<button class=\"red\" onclick=\"delProduct('" + p.id + "')\">Delete</button>" +
    "</div>"
  ).join("") || "No products yet.";

  $("categories").innerHTML = window.data.categories.map(c =>
    "<div class=\"item\">" +
    safe(c.name) +
    " <button class=\"red\" onclick=\"delCategory('" + c.id + "')\">Delete</button>" +
    "</div>"
  ).join("");

  $("banners").innerHTML = (window.data.config.banners || []).map((b, i) =>
    "<div class=\"item\">" +
    safe(b.title) +
    " <button class=\"red\" onclick=\"delBanner(" + i + ")\">Delete</button>" +
    "</div>"
  ).join("");

  $("certs").innerHTML = (window.data.config.certificates || []).map((b, i) =>
    "<div class=\"item\">" +
    safe(b.title) +
    " <button class=\"red\" onclick=\"delCert(" + i + ")\">Delete</button>" +
    "</div>"
  ).join("");
}
async function apiHandler(req,env,url) {
  const path=url.pathname,method=req.method;
  if(path==="/api/login"&&method==="POST"){
    const b=await body(req);
    if(!env.ADMIN_PASSWORD)return json({error:"ADMIN_PASSWORD secret is not configured"},500);
    if(b.password!==env.ADMIN_PASSWORD)return json({error:"Incorrect password"},401);
    const tok=await token(env.ADMIN_PASSWORD);
    return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json","set-cookie":cookieName+"="+tok+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400"}});
  }
  if(path==="/api/logout")return new Response("{}",{headers:{"content-type":"application/json","set-cookie":cookieName+"=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"}});
  if(!await needAuth(req,env))return json({error:"Unauthorized"},401);
  if(path==="/api/admin/bootstrap")return json({products:await read(env,"products",[]),categories:await read(env,"categories",[]),config:{...DEFAULTS.config,...await read(env,"config",DEFAULTS.config)}});
  if(path==="/api/admin/products"&&method==="POST"){
    const p=await body(req);if(!p.title)return json({error:"Product title is required"},400);
    let a=await read(env,"products",[]),i=a.findIndex(x=>x.id===p.id);
    if(i>=0)a[i]={...a[i],...p};else a.unshift(p);
    await save(env,"products",a);return json({ok:true});
  }
  if(path.startsWith("/api/admin/products/")&&method==="DELETE"){
    const id=decodeURIComponent(path.split("/").pop());let a=await read(env,"products",[]);
    a=a.filter(p=>p.id!==id);await save(env,"products",a);return json({ok:true});
  }
  if(path==="/api/admin/categories"&&method==="POST"){
    const b=await body(req);let a=await read(env,"categories",[]);a.push(b);await save(env,"categories",a);return json({ok:true});
  }
  if(path.startsWith("/api/admin/categories/")&&method==="DELETE"){
    const id=decodeURIComponent(path.split("/").pop());let a=await read(env,"categories",[]);
    await save(env,"categories",a.filter(x=>x.id!==id));return json({ok:true});
  }
  if(path==="/api/admin/config"&&method==="POST"){
    const c=await body(req);await save(env,"config",c);return json({ok:true});
  }
  if(path==="/api/admin/upload"&&method==="POST"){
    if(!env.PRODUCT_IMAGES)return json({error:"R2 binding PRODUCT_IMAGES is missing"},500);
    const form=await req.formData(),file=form.get("file");
    if(!file||!file.size)return json({error:"Please choose an image"},400);
    if(!file.type.startsWith("image/"))return json({error:"Only image files are allowed"},400);
    if(file.size>8*1024*1024)return json({error:"Image must be smaller than 8 MB"},400);
    const ext=(file.type.split("/")[1]||"jpg").replace(/[^a-z0-9]/gi,"");
    const key="uploads/"+crypto.randomUUID()+"."+ext;
    await env.PRODUCT_IMAGES.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
    return json({ok:true,url:"/media/"+key});
  }
  if(path==="/api/admin/translate"&&method==="POST"){
    if(!env.AI)return json({error:"Workers AI binding AI is missing"},500);
    const {lang}=await body(req);if(!LANGS.includes(lang)||lang==="en")return json({error:"Unsupported language"},400);
    const codes={zh:"zh",ms:"ms",id:"id",th:"th",vi:"vi",ar:"ar",es:"es"};
    const a=await read(env,"products",[]);
    for(const p of a){
      p.translations=p.translations||{};
      const tr={};
      for(const field of ["title","description"]){
        const source=p[field]||"";if(!source)continue;
        const out=await env.AI.run("@cf/meta/m2m100-1.2b",{text:source,source_lang:"en",target_lang:codes[lang]});
        tr[field]=out.translated_text||source;
      }
      p.translations[lang]={...(p.translations[lang]||{}),...tr};
    }
    await save(env,"products",a);
    return json({ok:true,message:"Translation completed. Please review and edit the translations before publishing."});
  }
  return json({error:"API endpoint not found"},404);
}
export default {
 async fetch(req,env) {
  try {
    const url=new URL(req.url);
    if(url.pathname.startsWith("/api/"))return await apiHandler(req,env,url);
    if(url.pathname==="/admin"||url.pathname==="/admin/")return adminPage();
    if(url.pathname.startsWith("/media/")){
      if(!env.PRODUCT_IMAGES)return new Response("R2 not configured",{status:500});
      const key=url.pathname.slice(7),obj=await env.PRODUCT_IMAGES.get(key);
      if(!obj)return new Response("Not found",{status:404});
      const h=new Headers();obj.writeHttpMetadata(h);h.set("etag",obj.httpEtag);h.set("cache-control","public, max-age=31536000, immutable");
      return new Response(obj.body,{headers:h});
    }
    if(url.pathname==="/robots.txt")return new Response("User-agent: *\nAllow: /\nSitemap: "+url.origin+"/sitemap.xml",{headers:{"content-type":"text/plain"}});
    if(url.pathname==="/sitemap.xml"){
      const products=await read(env,"products",[]);
      const urls=LANGS.flatMap(l=>[`<url><loc>${url.origin}/${l}/</loc></url>`,...products.map(p=>`<url><loc>${url.origin}/${l}/product/${encodeURIComponent(p.id)}</loc></url>`)]).join("");
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{"content-type":"application/xml"}});
    }
    if(url.pathname==="/")return Response.redirect(url.origin+"/en/",302);
    return await publicPage(req,env,url);
  } catch(e) {
    return new Response("Server error: "+(e?.message||"Unknown error"),{status:500,headers:{"content-type":"text/plain;charset=utf-8"}});
  }
 }
};
