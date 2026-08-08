const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const CONFIG = {
  reviews: "https://t.me/YOUR_REVIEWS_CHANNEL",
  telegram: "https://t.me/YOUR_TELEGRAM_CHANNEL"
};

const products = [
  {id:1,cat:"PUBG Accounts",title:"PUBG Account #001",price:1450,desc:"Пример карточки. Здесь будет описание аккаунта, ранг, скины и инвентарь.",img:"https://placehold.co/900x900/27415c/ffffff?text=PUBG+ACCOUNT",review:CONFIG.reviews},
  {id:2,cat:"PUBG Accounts",title:"PUBG Account #002",price:2200,desc:"Пример карточки аккаунта с редкими предметами.",img:"https://placehold.co/900x900/3c4d71/ffffff?text=PUBG+ACCOUNT",review:CONFIG.reviews},
  {id:3,cat:"Premium",title:"Premium Account #003",price:3900,desc:"Премиальный аккаунт. Заменишь данные на свои.",img:"https://placehold.co/900x900/4a6474/ffffff?text=PREMIUM",review:CONFIG.reviews},
  {id:4,cat:"Budget",title:"Budget Account #004",price:700,desc:"Недорогой аккаунт для быстрого старта.",img:"https://placehold.co/900x900/36585c/ffffff?text=PUBG",review:CONFIG.reviews}
];

let cart = JSON.parse(localStorage.getItem("lizorgin_cart") || "[]");
let activeCat = "Все", selected = null;
const $ = s => document.querySelector(s);
const money = n => `${Number(n).toLocaleString("ru-RU")} грн.`;

function toast(t){$("#toast").textContent=t;$("#toast").classList.remove("hidden");setTimeout(()=>$("#toast").classList.add("hidden"),1800)}
function save(){localStorage.setItem("lizorgin_cart",JSON.stringify(cart))}
function send(data){
  if(tg?.sendData){tg.sendData(JSON.stringify(data));toast("Заявка отправлена");}
  else {toast("Открой Mini App через Telegram");}
}
function openTG(kind){window.open(CONFIG[kind],"_blank")}
function cats(){
  const list=["Все",...new Set(products.map(p=>p.cat))];
  $("#categories").innerHTML=list.map(c=>`<button class="cat ${c===activeCat?"active":""}" data-c="${c}">${c}</button>`).join("");
  document.querySelectorAll(".cat").forEach(x=>x.onclick=()=>{activeCat=x.dataset.c;cats();render()});
}
function render(){
  const list=activeCat==="Все"?products:products.filter(p=>p.cat===activeCat);
  $("#products").innerHTML=list.map(p=>`
  <article class="card">
    <img class="pic" src="${p.img}" alt="">
    <div class="info">
      <div class="tag">${p.cat}</div>
      <div class="title">${p.title}</div>
      <div class="price">${money(p.price)}</div>
      <div class="buttons">
        <button class="primary" onclick="add(${p.id})">В корзину</button>
        <button class="secondary" onclick="view(${p.id})">Обзор</button>
      </div>
    </div>
  </article>`).join("");
  $("#cartCount").textContent=cart.length;
}
window.add=id=>{if(!cart.includes(id))cart.push(id);save();render();toast("Добавлено в корзину 🛒")};
window.view=id=>{
  selected=products.find(p=>p.id===id);if(!selected)return;
  $("#modalImg").src=selected.img;$("#modalCat").textContent=selected.cat;$("#modalTitle").textContent=selected.title;
  $("#modalDesc").textContent=selected.desc;$("#modalPrice").textContent=money(selected.price);
  $("#modal").classList.remove("hidden");
};
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modalCart").onclick=()=>{add(selected.id);$("#modal").classList.add("hidden")};
$("#modalReview").onclick=()=>openTG("reviews");
$("#modalOffer").onclick=()=>{
  const price=prompt("Какую цену предлагаете?");
  if(price)send({type:"offer_price",product_id:selected.id,product:selected.title,price});
};
$("#openCart").onclick=()=>{
  const rows=cart.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  $("#cartItems").innerHTML=rows.length?rows.map(p=>`<div class="cart-row"><img src="${p.img}"><div><b>${p.title}</b><span class="muted">${money(p.price)}</span></div></div>`).join(""):`<div class="muted" style="padding:25px 0">Корзина пустая</div>`;
  $("#cartTotal").textContent=rows.length?money(rows.reduce((s,p)=>s+p.price,0)):"";
  $("#cartModal").classList.remove("hidden");
};
$("#closeCart").onclick=()=>$("#cartModal").classList.add("hidden");
$("#checkout").onclick=()=>{
  const rows=cart.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  if(!rows.length)return toast("Корзина пустая");
  send({type:"order",items:rows.map(p=>({id:p.id,title:p.title,price:p.price})),total:rows.reduce((s,p)=>s+p.price,0)});
};
$("#sellBtn").onclick=()=>$("#sellModal").classList.remove("hidden");
$("#closeSell").onclick=()=>$("#sellModal").classList.add("hidden");
$("#sendSell").onclick=()=>{
  const title=$("#sellTitle").value.trim(), price=$("#sellPrice").value.trim(), desc=$("#sellDesc").value.trim();
  if(!title||!price)return toast("Заполни название и цену");
  send({type:"sell_account",title,price,description:desc});
  $("#sellModal").classList.add("hidden");
};
cats();render();
