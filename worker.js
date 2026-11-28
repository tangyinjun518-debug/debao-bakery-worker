const DEFAULT_CATEGORIES = [
  {id:'line',name:'Bakery Production Line',zh:'烘焙生产线'},
  {id:'divider',name:'Dough Divider & Rounder',zh:'面团分割滚圆机'},
  {id:'mixer',name:'Dough Mixer',zh:'和面机'},
  {id:'moulder',name:'Bread Moulder',zh:'吐司/面包整形机'},
  {id:'oven',name:'Commercial Oven',zh:'商用烤箱'},
  {id:'proofer',name:'Dough Proofer',zh:'醒发箱'},
  {id:'sheeter',name:'Dough Sheeter',zh:'压面机'},
  {id:'food',name:'Food Processing Equipment',zh:'食品加工设备'}
];

const DEFAULT_CONFIG = {
  about:'Guangzhou Depauw Machinery Co., Ltd. is a factory-direct supplier of commercial bakery and food processing machinery in Guangzhou, China. We supply practical equipment for bakeries, food factories and distributors worldwide. Contact us for machine details, factory prices and customized solutions.',
  banners:[],
  factoryVideo:'',
  email:'tangyinjun518@gmail.com',
  whatsapp:'8618124272578'
};

const json = (data,status=200,headers={}) =>
  new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      ...headers
    }
  });

const html = (body,status=200,headers={}) =>
  new Response(body,{
    status,
    headers:{
      'content-type':'text/html; charset=utf-8',
      ...headers
    }
  });

const safe = v => typeof v === 'string' ? v.trim() : '';

const validUrl = value => {
  try {
    const u=new URL(value);
    return ['http:','https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  const path=url.pathname;
  const db=env.DEBAO_DB || env.DB;
  const cors={'cache-control':'no-store'};

  const get=async(key,fallback)=>{
    if(!db)return fallback;
    try{
      const v=await db.get(key);
      return v?JSON.parse(v):fallback;
    }catch{
      return fallback;
    }
  };

  const put=async(key,value)=>{
    if(!db)throw new Error('KV binding missing: DEBAO_DB');
    await db.put(key,JSON.stringify(value));
  };

  const cfg=await get('siteConfig',DEFAULT_CONFIG);
  const cats=await get('categories',DEFAULT_CATEGORIES);
  const products=await get('products',[]);

  async function sign(payload){
   const secret=env.SESSION_SECRET || env.ADMIN_PASSWORD;
   if(!secret) throw new Error('Set SESSION_SECRET in Worker Secrets');

   const key=await crypto.subtle.importKey(
     'raw',
     new TextEncoder().encode(secret),
     {name:'HMAC',hash:'SHA-256'},
     false,
     ['sign']
   );

   const sig=await crypto.subtle.sign(
     'HMAC',
     key,
     new TextEncoder().encode(payload)
   );

   return btoa(String.fromCharCode(...new Uint8Array(sig)))
     .replace(/\+/g,'-')
     .replace(/\//g,'_')
     .replace(/=+$/,'');
  }

  const cookieVal=request.headers.get('Cookie')||'';

  async function loggedIn(){
   const m=cookieVal.match(/(?:^|; )db_admin=([^;]+)/);
   if(!m)return false;

   const token=decodeURIComponent(m[1]);
   const parts=token.split('.');
   if(parts.length!==2)return false;

   try{
     return await sign(parts[0])===parts[1] &&
       Number(parts[0])>Date.now();
   }catch{
     return false;
   }
  }

  const requireAdmin=async()=>
    await loggedIn() ? null : json({error:'Unauthorized'},401,cors);

  if(path==='/robots.txt'){
    return new Response(
      `User-agent: *
Allow: /
Sitemap: ${url.origin}/sitemap.xml
`,
      {headers:{'content-type':'text/plain; charset=utf-8'}}
    );
  }

  if(path==='/sitemap.xml'){
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`,
      {headers:{'content-type':'application/xml; charset=utf-8'}}
    );
  }

  if(path==='/api/login' && request.method==='POST'){
   if(!env.ADMIN_PASSWORD){
     return json({
       error:'Please set ADMIN_PASSWORD in Cloudflare Worker Secrets.'
     },500);
   }

   let body={};
   try{
     body=await request.json();
   }catch{}

   if(typeof body.password!=='string' ||
      body.password!==env.ADMIN_PASSWORD){
     return json({error:'Password is incorrect.'},401);
   }

   const exp=String(Date.now()+8*60*60*1000);
   const token=exp+'.'+await sign(exp);

   return json(
     {ok:true},
     200,
     {
       'set-cookie':`db_admin=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
       'cache-control':'no-store'
     }
   );
  }

  if(path==='/api/logout' && request.method==='POST'){
    return json(
      {ok:true},
      200,
      {
        'set-cookie':'db_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      }
    );
  }

  if(path==='/api/bootstrap'){
    return json({
      categories:cats,
      products,
      siteConfig:cfg
    },200,cors);
  }

  if(path.startsWith('/uploads/')){
   if(!env.PRODUCT_IMAGES){
     return new Response('Image storage is not configured',{status:503});
   }

   const key=decodeURIComponent(path.slice('/uploads/'.length));

   if(!/^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(key)){
     return new Response('Not found',{status:404});
   }

   const obj=await env.PRODUCT_IMAGES.get(key);
   if(!obj)return new Response('Not found',{status:404});

   const h=new Headers();
   obj.writeHttpMetadata(h);
   h.set('etag',obj.httpEtag);
   h.set('cache-control','public, max-age=31536000, immutable');

   return new Response(obj.body,{headers:h});
  }

  if(path==='/api/admin/status'){
    const ok=await loggedIn();
    return json({authenticated:ok});
  }

  if(path.startsWith('/api/admin/')){
    const denied=await requireAdmin();
    if(denied)return denied;
  }

  if(path==='/api/admin/upload' && request.method==='POST'){
   if(!env.PRODUCT_IMAGES){
     return json({error:'R2 binding PRODUCT_IMAGES is missing.'},503);
   }

   const form=await request.formData();
   const files=form.getAll('images');

   if(!files.length){
     return json({error:'Choose at least one image.'},400);
   }

   const urls=[];

   for(const file of files){
    if(!(file instanceof File))continue;

    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){
      return json({
        error:'Only JPG, PNG, WEBP and GIF images are allowed.'
      },400);
    }

    if(file.size>8*1024*1024){
      return json({
        error:'Each image must be 8MB or smaller.'
      },400);
    }

    const ext=({
      'image/jpeg':'jpg',
      'image/png':'png',
      'image/webp':'webp',
      'image/gif':'gif'
    })[file.type];

    const key=`products/${crypto.randomUUID()}.${ext}`;

    await env.PRODUCT_IMAGES.put(
      key,
      file.stream(),
      {httpMetadata:{contentType:file.type}}
    );

    urls.push(`${url.origin}/uploads/${key}`);
   }

   return json({ok:true,urls});
  }

  if(path==='/api/admin/products' && request.method==='POST'){
   let b;

   try{
     b=await request.json();
   }catch{
     return json({error:'Invalid JSON'},400);
   }

   let list=await get('products',[]);

   if(b.action==='delete'){
     list=list.filter(p=>p.id!==b.id);
   }else if(b.action==='add'||b.action==='update'){
    const item={
      id:b.action==='add'?'p_'+crypto.randomUUID():safe(b.id),
      cat:safe(b.cat)||'divider',
      title:safe(b.title),
      price:safe(b.price)||'Contact for Price',
      desc:safe(b.desc),
      specs:safe(b.specs),
      imgs:Array.isArray(b.imgs)
        ? b.imgs.map(validUrl).filter(Boolean).slice(0,8)
        : [],
      video:validUrl(b.video)
    };

    if(!item.title){
      return json({error:'Product title is required.'},400);
    }

    if(b.action==='add'){
      list.unshift(item);
    }else{
      const i=list.findIndex(p=>p.id===item.id);
      if(i<0)return json({error:'Product not found'},404);
      list[i]=item;
    }
   }else{
     return json({error:'Unknown action'},400);
   }

   await put('products',list);
   return json({ok:true,products:list});
  }

  if(path==='/api/admin/config' && request.method==='POST'){
   let b;

   try{
     b=await request.json();
   }catch{
     return json({error:'Invalid JSON'},400);
   }

   const next={
     ...cfg,
     about:safe(b.about),
     banners:Array.isArray(b.banners)
       ? b.banners.map(validUrl).filter(Boolean).slice(0,6)
       : [],
     factoryVideo:validUrl(b.factoryVideo),
     email:safe(b.email),
     whatsapp:safe(b.whatsapp).replace(/\D/g,'')
   };

   await put('siteConfig',next);
   return json({ok:true,siteConfig:next});
  }

  if(path==='/admin'){
    return html(adminPage());
  }

  return html(storePage());
 }
};

function storePage(){
return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guangzhou Depauw Machinery | Commercial Bakery Equipment Manufacturer</title>
<meta name="description" content="Factory-direct commercial bakery and food processing machinery from Guangzhou, China. Dough divider rounders, mixers, ovens, proofers and bread moulders.">
<meta name="robots" content="index,follow">

<style>
:root{
  --navy:#10243a;
  --blue:#1769aa;
  --gold:#e5a83b;
  --ink:#182433;
  --muted:#687789;
  --bg:#f4f6f8
}
*{box-sizing:border-box}
body{
  margin:0;
  font-family:Arial,sans-serif;
  color:var(--ink);
  background:white
}
a{color:inherit}
.top{
  background:var(--navy);
  color:#fff;
  padding:13px 5%;
  display:flex;
  justify-content:space-between;
  gap:15px;
  align-items:center;
  font-size:13px
}
.top a{color:#fff;text-decoration:none}
.nav{
  padding:20px 5%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid #e7ebef
}
.brand{
  font-size:21px;
  font-weight:800;
  color:var(--navy)
}
.brand span{color:var(--gold)}
.nav small{
  display:block;
  color:var(--muted);
  font-size:11px;
  letter-spacing:2px;
  margin-top:4px
}
.hero{
  background:
    linear-gradient(100deg,rgba(8,28,48,.94),rgba(8,28,48,.48)),
    url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1800&q=85') center/cover;
  color:#fff;
  padding:100px 7%;
  min-height:410px
}
.hero h1{
  font-size:clamp(32px,5vw,54px);
  max-width:760px;
  line-height:1.08;
  margin:0 0 20px
}
.hero p{
  max-width:650px;
  color:#e1e8ef;
  line-height:1.7;
  font-size:17px
}
.btn{
  display:inline-block;
  background:var(--gold);
  color:#142438;
  padding:14px 22px;
  text-decoration:none;
  font-weight:700;
  border-radius:3px;
  margin:12px 8px 0 0
}
.btn.alt{
  background:transparent;
  border:1px solid #fff;
  color:#fff
}
.wrap{
  max-width:1200px;
  margin:auto;
  padding:65px 22px
}
.eyebrow{
  color:#b17a19;
  font-weight:700;
  letter-spacing:2px;
  font-size:12px
}
.heading{
  font-size:32px;
  margin:9px 0 15px;
  color:var(--navy)
}
.about{
  max-width:850px;
  color:var(--muted);
  line-height:1.8
}
.filters{
  display:flex;
  flex-wrap:wrap;
  gap:9px;
  margin:28px 0
}
.filter{
  border:1px solid #d9e0e7;
  background:white;
  padding:10px 15px;
  border-radius:3px;
  cursor:pointer
}
.filter.active{
  background:var(--navy);
  color:white;
  border-color:var(--navy)
}
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(255px,1fr));
  gap:22px
}
.product{
  border:1px solid #e5e9ed;
  background:#fff;
  transition:.2s
}
.product:hover{
  box-shadow:0 12px 30px #13283c16;
  transform:translateY(-3px)
}
.product img{
  width:100%;
  height:220px;
  object-fit:cover;
  background:#eef1f4
}
.pbody{padding:18px}
.product h3{
  font-size:17px;
  line-height:1.4;
  margin:0 0 10px
}
.price{
  font-weight:800;
  color:#b87919
}
.desc{
  color:var(--muted);
  font-size:13px;
  line-height:1.6;
  min-height:42px
}
.spec{
  white-space:pre-line;
  font-size:12px;
  color:#5d6b78;
  background:#f6f8fa;
  padding:10px;
  margin-top:12px
}
.video{
  display:inline-block;
  margin-top:12px;
  color:var(--blue);
  font-size:13px;
  font-weight:bold;
  text-decoration:none
}
.contact{
  background:var(--navy);
  color:#fff
}
.contact .heading{color:#fff}
.contact p{
  color:#d3dde7;
  line-height:1.8
}
.footer{
  background:#0b1928;
  color:#b8c3ce;
  padding:25px 5%;
  font-size:12px;
  display:flex;
  justify-content:space-between;
  gap:15px;
  flex-wrap:wrap
}
@media(max-width:650px){
  .top{display:block;line-height:2}
  .nav{align-items:flex-start}
  .hero{padding:70px 22px}
  .wrap{padding:45px 18px}
}
</style>
</head>

<body>
<div class="top">
  <span>Factory-direct bakery & food processing machinery · Guangzhou, China</span>
  <span>
    <a href="mailto:tangyinjun518@gmail.com">tangyinjun518@gmail.com</a>
    |
    <a href="https://wa.me/8618124272578" target="_blank" rel="noopener">
      WhatsApp: +86 181 2427 2578
    </a>
  </span>
</div>

<div class="nav">
  <div class="brand">
    DEPAUW <span>MACHINERY</span>
    <small>BAKERY EQUIPMENT MANUFACTURER</small>
  </div>
  <a class="btn" href="https://wa.me/8618124272578" target="_blank" rel="noopener">
    GET A QUOTE
  </a>
</div>

<section class="hero">
  <div class="eyebrow" style="color:#f0bd5c">GUANGZHOU · CHINA</div>
  <h1>Reliable Bakery Equipment. Direct from Our Factory.</h1>
  <p>
    Practical machinery for bakeries, food factories and distributors.
    Tell us what you need and we will help you choose the right machine.
  </p>
  <a class="btn" href="https://wa.me/8618124272578" target="_blank" rel="noopener">
    Contact on WhatsApp
  </a>
  <a class="btn alt" href="#products">Explore Products</a>
</section>

<section class="wrap">
  <div class="eyebrow">ABOUT DEPAUW</div>
  <h2 class="heading">Your Bakery Machinery Partner in China</h2>
  <p class="about" id="about"></p>
</section>

<section class="wrap" id="products" style="background:#f7f9fb;max-width:none">
  <div style="max-width:1200px;margin:auto">
    <div class="eyebrow">OUR MACHINERY</div>
    <h2 class="heading">Products & Equipment</h2>
    <div class="filters" id="filters"></div>
    <div class="grid" id="productsGrid"></div>
  </div>
</section>

<section class="contact">
  <div class="wrap">
    <div class="eyebrow" style="color:#f0bd5c">LET'S TALK</div>
    <h2 class="heading">Looking for Bakery Equipment?</h2>
    <p>
      Contact us with your machine requirements, production capacity and
      destination country. We will get back to you with details and a quotation.
    </p>
    <a class="btn" href="https://wa.me/8618124272578" target="_blank" rel="noopener">
      WhatsApp +86 181 2427 2578
    </a>
    <a class="btn alt" href="mailto:tangyinjun518@gmail.com">Send Email</a>
    <p>Guangzhou Depauw Machinery Co., Ltd.<br>Guangzhou, Guangdong, China</p>
  </div>
</section>

<footer class="footer">
  <span>© <span id="year"></span> Guangzhou Depauw Machinery Co., Ltd.</span>
  <a href="/admin">Admin</a>
</footer>

<script>
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

let all=[],cats=[],active='all';

async function init(){
  document.getElementById('year').textContent=new Date().getFullYear();

  try{
    const r=await fetch('/api/bootstrap');
    const d=await r.json();

    all=d.products||[];
    cats=d.categories||[];

    document.getElementById('about').textContent=
      d.siteConfig?.about||'';

    drawFilters();
    drawProducts();
  }catch(e){
    document.getElementById('productsGrid').textContent=
      'Products are temporarily unavailable.';
  }
}

function drawFilters(){
  document.getElementById('filters').innerHTML=
    '<button class="filter '+(active==='all'?'active':'')+
    '" onclick="setCat(\\'all\\')">All Products</button>'+
    cats.map(c=>
      '<button class="filter '+
      (active===c.id?'active':'')+
      '" onclick="setCat(\\''+esc(c.id)+'\\')">'+
      esc(c.name)+'</button>'
    ).join('');
}

function setCat(id){
  active=id;
  drawFilters();
  drawProducts();
}

function drawProducts(){
  let list=active==='all'
    ? all
    : all.filter(p=>p.cat===active);

  document.getElementById('productsGrid').innerHTML=
    list.length
    ? list.map(p=>
      '<article class="product">'+
      (p.imgs?.[0]
        ? '<img loading="lazy" src="'+esc(p.imgs[0])+
          '" alt="'+esc(p.title)+'">'
        : '<div style="height:220px;background:#e9eef2"></div>'
      )+
      '<div class="pbody">'+
      '<h3>'+esc(p.title)+'</h3>'+
      '<div class="price">'+esc(p.price||'Contact for Price')+'</div>'+
      '<p class="desc">'+esc(p.desc)+'</p>'+
      (p.specs
        ? '<div class="spec">'+esc(p.specs)+'</div>'
        : ''
      )+
      (p.video
        ? '<a class="video" href="'+esc(p.video)+
          '" target="_blank" rel="noopener noreferrer">WATCH FACEBOOK VIDEO ↗</a>'
        : ''
      )+
      '<p><a class="video" href="https://wa.me/8618124272578?text='+
      encodeURIComponent('Hello, I am interested in '+p.title)+
      '" target="_blank" rel="noopener">ASK FOR DETAILS →</a></p>'+
      '</div></article>'
    ).join('')
    : '<p>No products listed in this category yet.</p>';
}

init();
</script>
</body>
</html>`;
}

function adminPage(){
return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Depauw 管理后台</title>

<style>
*{box-sizing:border-box}
body{
  margin:0;
  background:#f2f5f8;
  color:#182433;
  font-family:Arial,sans-serif
}
.shell{
  max-width:1100px;
  margin:35px auto;
  padding:0 16px
}
.panel{
  background:white;
  border:1px solid #e3e8ed;
  border-radius:8px;
  padding:22px;
  margin-bottom:18px;
  box-shadow:0 3px 14px #14283b08
}
h1{font-size:23px;margin:0 0 8px}
.muted{color:#687789;font-size:13px}
label{
  display:block;
  font-weight:700;
  font-size:13px;
  margin:13px 0 6px
}
input,textarea,select{
  width:100%;
  padding:11px;
  border:1px solid #cfd8e1;
  border-radius:5px;
  font:14px Arial
}
textarea{min-height:90px}
button{
  border:0;
  border-radius:5px;
  padding:11px 16px;
  background:#1769aa;
  color:white;
  cursor:pointer;
  font-weight:700;
  margin:8px 6px 0 0
}
.secondary{background:#687789}
.danger{background:#bd3b3b}
.success{background:#18845c}
.hidden{display:none!important}
.cols{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px
}
.item{
  padding:15px 0;
  border-top:1px solid #e8edf1
}
.itemhead{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center
}
.thumbs{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:10px
}
.thumbs img{
  width:75px;
  height:65px;
  object-fit:cover;
  border-radius:4px
}
.login{
  max-width:420px;
  margin:12vh auto
}
.notice{
  padding:10px;
  background:#edf5fb;
  border-radius:5px;
  color:#315a78;
  font-size:13px
}
@media(max-width:650px){
  .cols{grid-template-columns:1fr}
  .itemhead{display:block}
}
</style>
</head>

<body>
<main class="shell">

<section id="login" class="panel login">
  <h1>DEPAUW 管理后台</h1>
  <p class="muted">请登录后管理网站产品和首页内容。</p>
  <label>管理员密码</label>
  <input id="password" type="password" autocomplete="current-password" placeholder="输入后台密码">
  <button onclick="login()">登录后台</button>
  <p id="loginMsg" class="muted"></p>
</section>

<div id="app" class="hidden">

<section class="panel">
  <div class="itemhead">
    <div>
      <h1>广州德堡机械 · 网站管理</h1>
      <div class="muted">产品上架、图片上传、Facebook 视频链接和首页资料</div>
    </div>
    <button class="secondary" onclick="logout()">退出登录</button>
  </div>
  <p>
    <a href="/" target="_blank">打开网站前台 ↗</a>
    <a href="/sitemap.xml" target="_blank">Sitemap ↗</a>
  </p>
</section>

<section class="panel">
  <h2>首页资料</h2>

  <label>公司英文介绍</label>
  <textarea id="about"></textarea>

  <label>首页横幅图片（电脑选择图片，可多选）</label>
  <input id="banners" type="file" accept="image/jpeg,image/png,image/webp" multiple>
  <div id="bannerPreview" class="thumbs"></div>

  <label>首页工厂视频 Facebook 链接（可选）</label>
  <input id="factoryVideo" placeholder="https://www.facebook.com/..."/>

  <div class="cols">
    <div>
      <label>联系邮箱</label>
      <input id="email" value="tangyinjun518@gmail.com">
    </div>
    <div>
      <label>WhatsApp（国际格式数字）</label>
      <input id="whatsapp" value="8618124272578">
    </div>
  </div>

  <button class="success" onclick="saveConfig()">保存首页资料</button>
</section>

<section class="panel">
  <h2 id="formTitle">添加新产品</h2>

  <input id="editId" type="hidden">

  <div class="cols">
    <div>
      <label>产品分类</label>
      <select id="cat"></select>
    </div>
    <div>
      <label>产品价格</label>
      <input id="price" placeholder="例如：USD 1,950 / Contact for Price">
    </div>
  </div>

  <label>英文产品名称</label>
  <input id="title" placeholder="Fully Automatic Dough Divider and Rounder">

  <label>产品卖点 / 简短介绍</label>
  <textarea id="desc" placeholder="Write a short product introduction..."></textarea>

  <label>技术参数（每行一项）</label>
  <textarea id="specs" placeholder="Voltage: 220V / 380V
Power: ..."></textarea>

  <label>产品图片（从电脑选择，可多选，最多 8 张）</label>
  <input id="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple>
  <div id="imagePreview" class="thumbs"></div>

  <label>Facebook 视频链接（前台点击后跳转 Facebook）</label>
  <input id="video" placeholder="https://www.facebook.com/reel/... 或视频链接">

  <div>
    <button class="success" onclick="saveProduct()">保存并上架</button>
    <button class="secondary" onclick="resetForm()">清空 / 取消编辑</button>
  </div>

  <p id="formMsg" class="muted"></p>
</section>

<section class="panel">
  <h2>已上架产品</h2>
  <div id="list"></div>
</section>

</div>
</main>

<script>
let products=[],categories=[],cfg={},currentImgs=[];

const $=id=>document.getElementById(id);

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

async function api(path,options={}){
  const r=await fetch(path,{
    ...options,
    headers:{
      ...(options.body instanceof FormData
        ? {}
        : {'Content-Type':'application/json'}
      ),
      ...(options.headers||{})
    }
  });

  let d={};
  try{
    d=await r.json();
  }catch{}

  if(!r.ok)throw Error(d.error||'Request failed');
  return d;
}

async function login(){
  try{
    await api('/api/login',{
      method:'POST',
      body:JSON.stringify({password:$('password').value})
    });

    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');

    await load();
  }catch(e){
    $('loginMsg').textContent=e.message;
  }
}

async function logout(){
  await fetch('/api/logout',{method:'POST'});
  location.reload();
}

async function load(){
  const d=await api('/api/bootstrap');

  products=d.products||[];
  categories=d.categories||[];
  cfg=d.siteConfig||{};

  $('cat').innerHTML=categories.map(c=>
    '<option value="'+esc(c.id)+'">'+
    esc(c.name)+' / '+esc(c.zh)+'</option>'
  ).join('');

  $('about').value=cfg.about||'';
  $('factoryVideo').value=cfg.factoryVideo||'';
  $('email').value=cfg.email||'tangyinjun518@gmail.com';
  $('whatsapp').value=cfg.whatsapp||'8618124272578';

  renderList();
}

async function upload(input){
  const files=[...input.files];

  if(!files.length)return [];

  if(files.length>8){
    throw Error('最多一次选择 8 张图片');
  }

  const fd=new FormData();
  files.forEach(f=>fd.append('images',f));

  const d=await api('/api/admin/upload',{
    method:'POST',
    body:fd
  });

  return d.urls||[];
}

function previews(input,box){
  box.innerHTML=[...input.files].map(f=>
    '<img src="'+URL.createObjectURL(f)+'">'
  ).join('');
}

$('images').addEventListener('change',()=>
  previews($('images'),$('imagePreview'))
);

$('banners').addEventListener('change',()=>
  previews($('banners'),$('bannerPreview'))
);

async function saveProduct(){
  try{
    const title=$('title').value.trim();

    if(!title)throw Error('请填写产品名称');

    let imgs=currentImgs.slice();

    if($('images').files.length){
      imgs=await upload($('images'));
    }

    const body={
      action:$('editId').value?'update':'add',
      id:$('editId').value,
      cat:$('cat').value,
      title,
      price:$('price').value,
      desc:$('desc').value,
      specs:$('specs').value,
      imgs,
      video:$('video').value.trim()
    };

    const d=await api('/api/admin/products',{
      method:'POST',
      body:JSON.stringify(body)
    });

    products=d.products;
    renderList();
    resetForm();

    $('formMsg').textContent='保存成功';
  }catch(e){
    $('formMsg').textContent=e.message;
  }
}

function editProduct(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;

  $('editId').value=p.id;
  $('formTitle').textContent='编辑产品';
  $('cat').value=p.cat;
  $('title').value=p.title;
  $('price').value=p.price;
  $('desc').value=p.desc;
  $('specs').value=p.specs;
  $('video').value=p.video||'';

  currentImgs=p.imgs||[];

  $('imagePreview').innerHTML=currentImgs.map(u=>
    '<img src="'+esc(u)+'">'
  ).join('');

  $('formTitle').scrollIntoView({behavior:'smooth'});
}

function resetForm(){
  ['editId','title','desc','specs','video'].forEach(id=>{
    $(id).value='';
  });

  $('price').value='Contact for Price';
  $('images').value='';
  $('imagePreview').innerHTML='';
  $('formTitle').textContent='添加新产品';
  currentImgs=[];
}

async function delProduct(id){
  if(!confirm('确定删除这款产品？'))return;

  try{
    const d=await api('/api/admin/products',{
      method:'POST',
      body:JSON.stringify({action:'delete',id})
    });

    products=d.products;
    renderList();
  }catch(e){
    alert(e.message);
  }
}

function renderList(){
  $('list').innerHTML=products.length
    ? products.map(p=>
      '<div class="item">'+
      '<div class="itemhead">'+
      '<div><b>'+esc(p.title)+'</b>'+
      '<div class="muted">'+esc(p.price)+
      ' · '+
      esc(categories.find(c=>c.id===p.cat)?.name||p.cat)+
      '</div></div>'+
      '<div>'+
      '<button onclick="editProduct(\\''+esc(p.id)+'\\')">编辑</button>'+
      '<button class="danger" onclick="delProduct(\\''+esc(p.id)+'\\')">删除</button>'+
      '</div></div>'+
      '<div class="thumbs">'+
      (p.imgs||[]).map(u=>
        '<img src="'+esc(u)+'">'
      ).join('')+
      '</div></div>'
    ).join('')
    : '<p class="muted">目前还没有产品，请在上方添加。</p>';
}

async function saveConfig(){
  try{
    let banners=cfg.banners||[];

    if($('banners').files.length){
      banners=await upload($('banners'));
    }

    const body={
      about:$('about').value,
      banners,
      factoryVideo:$('factoryVideo').value,
      email:$('email').value,
      whatsapp:$('whatsapp').value
    };

    const d=await api('/api/admin/config',{
      method:'POST',
      body:JSON.stringify(body)
    });

    cfg=d.siteConfig;
    alert('首页资料已保存');
  }catch(e){
    alert(e.message);
  }
}

api('/api/admin/status').then(d=>{
  if(d.authenticated){
    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    load();
  }
}).catch(()=>{});
</script>
</body>
</html>`;
}
