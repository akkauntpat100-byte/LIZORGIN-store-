const tg = window.Telegram?.WebApp;

if (tg) {
tg.ready();
tg.expand();
}

// =========================================================
// НАСТРОЙКИ
// =========================================================

const CONFIG = {

reviews: “https://t.me/reviews_lizorgin”,

telegram: “https://t.me/lizorgin_store”,

overview: “https://t.me/lizorgin_store/10”,

// ТВОЙ ПРОФИЛЬ
owner: “https://t.me/lizorgin”,

// ID твоего Telegram
ownerId: “8523638381”
};

let products = [];

let cart = JSON.parse(
localStorage.getItem(“lizorgin_cart”) || “[]”
);

let activeCat = “Все”;

let selected = null;

const $ = (s) =>
document.querySelector(s);

// =========================================================
// ЦЕНА
// =========================================================

function money(n) {

return ${Number(n).toLocaleString("ru-RU")} грн.;
}

// =========================================================
// УВЕДОМЛЕНИЕ
// =========================================================

function toast(text) {

const el = $(”#toast”);

if (!el) return;

el.textContent = text;

el.classList.remove(“hidden”);

setTimeout(() => {

el.classList.add("hidden");

}, 1800);
}

// =========================================================
// СОХРАНЕНИЕ КОРЗИНЫ
// =========================================================

function saveCart() {

localStorage.setItem(
“lizorgin_cart”,
JSON.stringify(cart)
);
}

// =========================================================
// ОТКРЫТЬ ТВОЙ TELEGRAM
// =========================================================

function openOwner() {

/*
Основной вариант.
Именно твой профиль @lizorgin.
*/

const url = CONFIG.owner;

try {

if (tg && typeof tg.openTelegramLink === "function") {
  tg.openTelegramLink(url);
  return;
}

} catch (error) {

console.log(
  "Telegram WebApp link error:",
  error
);

}

/*
Запасной вариант.
*/

window.location.href = url;
}

window.openOwner = openOwner;

// =========================================================
// TELEGRAM ССЫЛКИ
// =========================================================

function openTG(kind) {

const url = CONFIG[kind];

if (!url) return;

try {

if (tg && typeof tg.openTelegramLink === "function") {
  tg.openTelegramLink(url);
  return;
}

} catch (error) {

console.log(error);

}

window.location.href = url;
}

// =========================================================
// ЗАГРУЗКА ТОВАРОВ
// =========================================================

async function loadProducts() {

try {

const SUPABASE_URL =
  "https://xmkmfchendnpuzjwnbmx.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_zs7Jkd95b4Yyt4p_1FRCgw_xAwEG3LU";
const url =
  `${SUPABASE_URL}/rest/v1/accounts` +
  `?select=*` +
  `&status=eq.available` +
  `&order=id.desc`;
const response = await fetch(
  url,
  {
    method: "GET",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization":
        `Bearer ${SUPABASE_KEY}`,
      "Content-Type":
        "application/json"
    }
  }
);
if (!response.ok) {
  console.error(
    "SUPABASE ERROR:",
    response.status,
    await response.text()
  );
  toast(
    "❌ Ошибка загрузки товаров"
  );
  return;
}
const data =
  await response.json();
products =
  data.map(p => ({
    id:
      p.id,
    cat:
      p.category || "Другое",
    title:
      p.title || "Аккаунт",
    price:
      Number(p.price || 0),
    desc:
      p.description || "",
    img:
      normalizeImage(p.image_url),
    review:
      CONFIG.overview
  }));
cats();
render();

}

catch (error) {

console.error(
  "LOAD PRODUCTS ERROR:",
  error
);
toast(
  "❌ Ошибка соединения"
);

}

}

// =========================================================
// КАРТИНКИ
// =========================================================

function normalizeImage(url) {

if (!url) {

return (
  "https://placehold.co/" +
  "900x900/27415c/ffffff?text=PUBG"
);

}

if (
url.startsWith(“https://”) ||
url.startsWith(“http://”)
) {

return url;

}

return (
“https://placehold.co/” +
“900x900/27415c/ffffff?text=PUBG”
);

}

// =========================================================
// КАТЕГОРИИ
// =========================================================

function cats() {

const list = [

"Все",
...new Set(
  products.map(
    p => p.cat
  )
)

];

$(”#categories”).innerHTML =

list.map(c => `
  <button
    class="cat ${
      c === activeCat
        ? "active"
        : ""
    }"
    data-c="${c}"
  >
    ${c}
  </button>
`).join("");

document
.querySelectorAll(”.cat”)
.forEach(button => {

  button.onclick = () => {
    activeCat =
      button.dataset.c;
    cats();
    render();
  };
});

}

// =========================================================
// ТОВАРЫ
// =========================================================

function render() {

const list =

activeCat === "Все"
  ? products
  : products.filter(
      p =>
        p.cat === activeCat
    );

if (!list.length) {

$("#products").innerHTML = `
  <div
    class="muted"
    style="
      padding:30px;
      text-align:center;
    "
  >
    📦 Товаров пока нет
  </div>
`;
$("#cartCount").textContent =
  cart.length;
return;

}

$(”#products”).innerHTML =

list.map(p => `
  <article class="card">
    <img
      class="pic"
      src="${p.img}"
      alt=""
      onerror="
        this.src=
        'https://placehold.co/900x900/27415c/ffffff?text=PUBG'
      "
    >
    <div class="info">
      <div class="tag">
        ${p.cat}
      </div>
      <div class="title">
        ${p.title}
      </div>
      <div class="price">
        ${money(p.price)}
      </div>
      <div
        class="buttons"
        style="
          display:flex;
          flex-direction:column;
          gap:8px;
        "
      >
        <button
          class="primary"
          onclick="add(${p.id})"
        >
          🛒 В корзину
        </button>
        <button
          class="secondary"
          onclick="view(${p.id})"
        >
          🎥 Обзор
        </button>
        <button
          class="secondary"
          onclick="offerProduct(${p.id})"
        >
          💰 Предложить свою цену
        </button>
      </div>
    </div>
  </article>
`).join("");

$(”#cartCount”).textContent =
cart.length;

}

// =========================================================
// ПРЕДЛОЖИТЬ СВОЮ ЦЕНУ
// =========================================================

window.offerProduct = function(id) {

const product =
products.find(
p =>
Number(p.id) ===
Number(id)
);

if (!product) {

toast(
  "Товар не найден"
);
return;

}

const price = prompt(

`💰 ${product.title}\n\n` +
`Цена магазина: ${money(product.price)}\n\n` +
`Введите свою цену в грн.`

);

if (
price === null ||
price.trim() === “”
) {

return;

}

const value =
Number(
price
.replace(”,”, “.”)
.trim()
);

if (
!Number.isFinite(value) ||
value <= 0
) {

toast(
  "❌ Введите правильную цену"
);
return;

}

/*
Здесь НЕ используем sendData.

Просто открываем твой профиль.

*/

openOwner();

/*
Сохраняем информацию локально,
чтобы пользователь не потерял
введённую цену.
*/

localStorage.setItem(

"lizorgin_last_offer",
JSON.stringify({
  product:
    product.title,
  product_id:
    product.id,
  price:
    value
})

);

};

window.offerPrice = window.offerProduct;

// =========================================================
// ДОБАВИТЬ В КОРЗИНУ
// =========================================================

window.add = function(id) {

if (
!cart.some(
item =>
Number(item) ===
Number(id)
)
) {

cart.push(id);
saveCart();
render();
toast(
  "Добавлено в корзину 🛒"
);

} else {

toast(
  "Товар уже в корзине"
);

}

};

// =========================================================
// УДАЛИТЬ ИЗ КОРЗИНЫ
// =========================================================

window.removeFromCart = function(id) {

cart =
cart.filter(
item =>
Number(item) !==
Number(id)
);

saveCart();

render();

renderCart();

toast(
“Товар удалён 🗑️”
);

};

// =========================================================
// ПРОСМОТР
// =========================================================

window.view = function(id) {

selected =
products.find(
p =>
Number(p.id) ===
Number(id)
);

if (!selected) return;

$(”#modalImg”).src =
selected.img;

$(”#modalCat”).textContent =
selected.cat;

$(”#modalTitle”).textContent =
selected.title;

$(”#modalDesc”).textContent =
selected.desc;

$(”#modalPrice”).textContent =
money(selected.price);

$(”#modal”).classList.remove(
“hidden”
);

};

// =========================================================
// ЗАКРЫТЬ MODAL
// =========================================================

$(”#closeModal”).onclick = () => {

$(”#modal”).classList.add(
“hidden”
);

};

// =========================================================
// MODAL — КОРЗИНА
// =========================================================

$(”#modalCart”).onclick = () => {

if (!selected) return;

add(selected.id);

$(”#modal”).classList.add(
“hidden”
);

};

// =========================================================
// MODAL — ОБЗОР
// =========================================================

$(”#modalReview”).onclick = () => {

openTG(“overview”);

};

// =========================================================
// MODAL — СВОЯ ЦЕНА
// =========================================================

$(”#modalOffer”).onclick = () => {

if (!selected) return;

offerProduct(
selected.id
);

};

// =========================================================
// КОРЗИНА
// =========================================================

function renderCart() {

const rows =

cart
  .map(id =>
    products.find(
      p =>
        Number(p.id) ===
        Number(id)
    )
  )
  .filter(Boolean);

if (!rows.length) {

$("#cartItems").innerHTML = `
  <div
    class="muted"
    style="padding:25px 0"
  >
    Корзина пустая
  </div>
`;
$("#cartTotal").textContent = "";
return;

}

$(”#cartItems”).innerHTML =

rows.map(p => `
  <div
    class="cart-row"
    style="
      display:flex;
      align-items:center;
      gap:10px;
    "
  >
    <img
      src="${p.img}"
      style="
        width:55px;
        height:55px;
        object-fit:cover;
        border-radius:10px;
      "
    >
    <div
      style="
        flex:1;
        min-width:0;
      "
    >
      <b>
        ${p.title}
      </b>
      <span class="muted">
        ${money(p.price)}
      </span>
    </div>
    <button
      class="secondary"
      onclick="
        removeFromCart(${p.id})
      "
      style="
        white-space:nowrap;
        padding:8px 10px;
      "
    >
      🗑️
    </button>
  </div>
`).join("");

$(”#cartTotal”).textContent =

money(
  rows.reduce(
    (sum, p) =>
      sum + p.price,
    0
  )
);

}

// =========================================================
// ОТКРЫТЬ КОРЗИНУ
// =========================================================

$(”#openCart”).onclick = () => {

renderCart();

$(”#cartModal”)
.classList
.remove(“hidden”);

};

// =========================================================
// ЗАКРЫТЬ КОРЗИНУ
// =========================================================

$(”#closeCart”).onclick = () => {

$(”#cartModal”)
.classList
.add(“hidden”);

};

// =========================================================
// КУПИТЬ
// =========================================================

$(”#checkout”).onclick = () => {

const rows =

cart
  .map(id =>
    products.find(
      p =>
        Number(p.id) ===
        Number(id)
    )
  )
  .filter(Boolean);

if (!rows.length) {

toast(
  "Корзина пустая"
);
return;

}

/*
Никакого sendData.

Сразу открываем твой профиль.

*/

openOwner();

};

// =========================================================
// ПРОДАЖА СВОЕГО АККАУНТА
// =========================================================

$(”#sellBtn”).onclick = () => {

$(”#sellModal”)
.classList
.remove(“hidden”);

};

$(”#closeSell”).onclick = () => {

$(”#sellModal”)
.classList
.add(“hidden”);

};

$(”#sendSell”).onclick = () => {

const title =
$(”#sellTitle”)
.value
.trim();

const price =
$(”#sellPrice”)
.value
.trim();

const desc =
$(”#sellDesc”)
.value
.trim();

if (!title || !price) {

toast(
  "Заполни название и цену"
);
return;

}

const offer = {

type:
  "sell_account",
title:
  title,
price:
  price,
description:
  desc

};

localStorage.setItem(

"lizorgin_sell_offer",
JSON.stringify(offer)

);

/*
Открываем именно твой профиль.
*/

openOwner();

$(”#sellModal”)
.classList
.add(“hidden”);

};

// =========================================================
// ЗАПУСК
// =========================================================

loadProducts();
