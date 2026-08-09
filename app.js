const tg = window.Telegram?.WebApp;

if (tg) {
tg.ready();
tg.expand();
}

const CONFIG = {
reviews: “https://t.me/reviews_lizorgin”,
telegram: “https://t.me/lizorgin_store”,
overview: “https://t.me/lizorgin_store/10”,

// ТВОЙ ПРОФИЛЬ
owner: “https://t.me/lizorgin”
};

let products = [];

let cart = JSON.parse(
localStorage.getItem(“lizorgin_cart”) || “[]”
);

let activeCat = “Все”;
let selected = null;

const $ = (s) => document.querySelector(s);

function money(n) {
return ${Number(n).toLocaleString("ru-RU")} грн.;
}

function toast(text) {
const el = $(”#toast”);

if (!el) return;

el.textContent = text;
el.classList.remove(“hidden”);

setTimeout(() => {
el.classList.add(“hidden”);
}, 1800);
}

function saveCart() {
localStorage.setItem(
“lizorgin_cart”,
JSON.stringify(cart)
);
}

// =========================================================
// ПЕРЕХОД В TELEGRAM
// =========================================================

function openTG(kind) {

const url = CONFIG[kind];

if (!url) return;

if (tg?.openTelegramLink) {
tg.openTelegramLink(url);
} else {
window.open(url, “_blank”);
}
}

// =========================================================
// ПРЕДЛОЖИТЬ СВОЮ ЦЕНУ
// =========================================================

function offerPrice(product) {

if (!product) return;

const price = prompt(
Предложите свою цену за:\n${product.title}\n\nВведите цену в грн.
);

if (!price) return;

const cleanPrice = price
.replace(”,”, “.”)
.trim();

const numberPrice = Number(cleanPrice);

if (
!Number.isFinite(numberPrice) ||
numberPrice <= 0
) {

toast("❌ Введите правильную цену");
return;

}

/*
Открываем личный профиль владельца.
Пользователь сможет сразу написать тебе.
*/

openTG(“owner”);

toast(
Цена ${numberPrice} грн. — напиши владельцу магазина
);
}

window.offerPrice = offerPrice;

// =========================================================
// ЗАГРУЗКА ТОВАРОВ
// =========================================================

async function loadProducts() {

try {

const SUPABASE_URL =
  "https://xmkmfchendnpuzjwnbmx.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_zs7Jkd95b4Yyt4p_1FRCgw_xAwEG3LU";
const response = await fetch(
  `${SUPABASE_URL}/rest/v1/accounts?select=*&status=eq.available&order=id.desc`,
  {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    }
  }
);
if (!response.ok) {
  console.error(
    "Supabase error:",
    response.status,
    await response.text()
  );
  toast("❌ Не удалось загрузить товары");
  return;
}
const data = await response.json();
products = data.map(p => ({
  id: p.id,
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

} catch (error) {

console.error(
  "LOAD PRODUCTS ERROR:",
  error
);
toast("❌ Ошибка загрузки товаров");

}
}

// =========================================================
// КАРТИНКИ
// =========================================================

function normalizeImage(url) {

if (!url) {

return "https://placehold.co/900x900/27415c/ffffff?text=PUBG";

}

/*
Если картинка уже находится в Supabase Storage,
просто используем её.
*/

if (
url.startsWith(“http://”) ||
url.startsWith(“https://”)
) {

return url;

}

return “https://placehold.co/900x900/27415c/ffffff?text=PUBG”;
}

// =========================================================
// КАТЕГОРИИ
// =========================================================

function cats() {

const list = [
“Все”,
…new Set(
products.map(p => p.cat)
)
];

$(”#categories”).innerHTML =
list.map(c => <button class="cat ${c === activeCat ? "active" : ""}" data-c="${c}" > ${c} </button>).join(””);

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
// ОТОБРАЖЕНИЕ ТОВАРОВ
// =========================================================

function render() {

const list =
activeCat === “Все”
? products
: products.filter(
p => p.cat === activeCat
);

$(”#products”).innerHTML =

list.length
  ? list.map(p => `
    <article class="card">
      <img
        class="pic"
        src="${p.img}"
        alt=""
        onerror="this.src='https://placehold.co/900x900/27415c/ffffff?text=PUBG'"
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
        <div class="buttons">
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
            💰 Своя цена
          </button>
        </div>
      </div>
    </article>
  `).join("")
  :
  `
    <div
      class="muted"
      style="padding:30px;text-align:center"
    >
      📦 Товаров пока нет
    </div>
  `;

$(”#cartCount”).textContent =
cart.length;
}

// =========================================================
// ПРЕДЛОЖЕНИЕ ЦЕНЫ ИЗ КАРТОЧКИ
// =========================================================

window.offerProduct = function(id) {

const product =
products.find(
p => Number(p.id) === Number(id)
);

if (!product) return;

offerPrice(product);
};

// =========================================================
// КОРЗИНА
// =========================================================

window.add = function(id) {

if (!cart.includes(id)) {

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
// УДАЛЕНИЕ ИЗ КОРЗИНЫ
// =========================================================

window.removeFromCart = function(id) {

cart = cart.filter(
itemId =>
Number(itemId) !== Number(id)
);

saveCart();

renderCart();

render();

toast(“Товар удалён из корзины 🗑️”);
};

// =========================================================
// ПРОСМОТР ТОВАРА
// =========================================================

window.view = function(id) {

selected =
products.find(
p => Number(p.id) === Number(id)
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
// MODAL
// =========================================================

$(”#closeModal”).onclick = () => {

$(”#modal”).classList.add(
“hidden”
);
};

$(”#modalCart”).onclick = () => {

if (!selected) return;

add(selected.id);

$(”#modal”).classList.add(
“hidden”
);
};

$(”#modalReview”).onclick = () => {

if (selected?.review) {

if (tg?.openTelegramLink) {
  tg.openTelegramLink(
    selected.review
  );
} else {
  window.open(
    selected.review,
    "_blank"
  );
}

} else {

openTG("overview");

}
};

// =========================================================
// СВОЯ ЦЕНА В MODAL
// =========================================================

$(”#modalOffer”).onclick = () => {

if (!selected) return;

offerPrice(selected);
};

// =========================================================
// КОРЗИНА
// =========================================================

function renderCart() {

const rows = cart

.map(id =>
  products.find(
    p =>
      Number(p.id) === Number(id)
  )
)
.filter(Boolean);

$(”#cartItems”).innerHTML =

rows.length
  ? rows.map(p => `
      <div class="cart-row">
        <img
          src="${p.img}"
          onerror="this.src='https://placehold.co/150x150/27415c/ffffff?text=PUBG'"
        >
        <div style="flex:1">
          <b>
            ${p.title}
          </b>
          <span class="muted">
            ${money(p.price)}
          </span>
        </div>
        <button
          class="secondary"
          onclick="removeFromCart(${p.id})"
          style="white-space:nowrap"
        >
          🗑️ Удалить
        </button>
      </div>
    `).join("")
  :
    `
      <div
        class="muted"
        style="padding:25px 0"
      >
        Корзина пустая
      </div>
    `;

$(”#cartTotal”).textContent =
rows.length

  ? money(
      rows.reduce(
        (sum, p) =>
          sum + p.price,
        0
      )
    )
  : "";

}

$(”#openCart”).onclick = () => {

renderCart();

$(”#cartModal”)
.classList
.remove(“hidden”);
};

$(”#closeCart”).onclick = () => {

$(”#cartModal”)
.classList
.add(“hidden”);
};

// =========================================================
// ПОКУПКА
// =========================================================

$(”#checkout”).onclick = () => {

const rows = cart

.map(id =>
  products.find(
    p =>
      Number(p.id) === Number(id)
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
Вместо sendData теперь сразу
открываем твой профиль.
*/

openTG(“owner”);

toast(
“Напиши владельцу магазина для покупки”
);
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

/*
Сейчас никаких запросов к боту
или sendData нет.

Просто открываем твой профиль.

*/

openTG(“owner”);

toast(
“Напиши владельцу магазина о своём аккаунте”
);

$(”#sellModal”)
.classList
.add(“hidden”);
};

// =========================================================
// СТАРТ
// =========================================================

loadProducts();
