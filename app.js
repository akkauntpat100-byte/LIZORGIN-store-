const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

/* =========================================================
   НАСТРОЙКИ
========================================================= */

const CONFIG = {
  // ТВОЙ ПРОФИЛЬ
  profile: "https://t.me/lizorgin",

  // Отзывы
  reviews: "https://t.me/reviews_lizorgin",

  // Пост с обзорами
  overview: "https://t.me/lizorgin_store/10",

  // Telegram-канал
  telegram: "https://t.me/lizorgin_store"
};


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://xmkmfchendnpuzjwnbmx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_zs7Jkd95b4Yyt4p_1FRCgw_xAwEG3LU";


/* =========================================================
   СОСТОЯНИЕ
========================================================= */

let products = [];

let cart = JSON.parse(
  localStorage.getItem("lizorgin_cart") || "[]"
);

let activeCat = "Все";
let selected = null;


/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);


function money(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} грн.`;
}


function toast(text) {

  const el = $("#toast");

  if (!el) return;

  el.textContent = text;
  el.classList.remove("hidden");

  setTimeout(() => {
    el.classList.add("hidden");
  }, 1800);
}


function saveCart() {

  localStorage.setItem(
    "lizorgin_cart",
    JSON.stringify(cart)
  );
}


/* =========================================================
   ОТКРЫТЬ ПРОФИЛЬ LIZORGIN
========================================================= */

function openProfile() {

  if (tg?.openTelegramLink) {

    tg.openTelegramLink(
      CONFIG.profile
    );

  } else {

    window.open(
      CONFIG.profile,
      "_blank"
    );
  }
}


/* =========================================================
   TELEGRAM ССЫЛКИ
========================================================= */

function openTG(kind) {

  const url = CONFIG[kind];

  if (!url) return;

  if (tg?.openTelegramLink) {

    tg.openTelegramLink(url);

  } else {

    window.open(url, "_blank");
  }
}


/* =========================================================
   SUPABASE — ТОВАРЫ
========================================================= */

async function loadProducts() {

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/accounts?select=*&status=eq.available&order=id.desc`,
      {
        method: "GET",

        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );


    if (!response.ok) {

      console.error(
        "SUPABASE ERROR:",
        response.status,
        await response.text()
      );

      $("#products").innerHTML = `
        <div class="muted"
             style="padding:30px;text-align:center">
          ❌ Не удалось загрузить товары
        </div>
      `;

      return;
    }


    const data = await response.json();


    products = data.map(product => ({

      id: product.id,

      cat:
        product.category ||
        "Другое",

      title:
        product.title ||
        "Аккаунт",

      price:
        Number(product.price || 0),

      desc:
        product.description ||
        "",

      img:
        normalizeImage(
          product.image_url
        ),

      review:
        CONFIG.overview

    }));


    // Если товар удалили из Supabase,
    // убираем его и из корзины.
    cart = cart.filter(id =>
      products.some(
        p =>
          Number(p.id) === Number(id)
      )
    );

    saveCart();

    cats();
    render();

  } catch (error) {

    console.error(
      "LOAD PRODUCTS ERROR:",
      error
    );

    $("#products").innerHTML = `
      <div class="muted"
           style="padding:30px;text-align:center">
        ❌ Ошибка загрузки товаров
      </div>
    `;
  }
}


/* =========================================================
   ФОТО
========================================================= */

function normalizeImage(url) {

  if (!url) {

    return "https://placehold.co/900x900/27415c/ffffff?text=PUBG";
  }


  /*
    Если в базе уже нормальная ссылка Supabase Storage,
    оставляем её без изменений.
  */

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {

    return url;
  }


  /*
    Старые telegram_file_id больше не используем.
  */

  if (
    url.startsWith("telegram_file_id:")
  ) {

    return "https://placehold.co/900x900/27415c/ffffff?text=PHOTO";
  }


  return "https://placehold.co/900x900/27415c/ffffff?text=PUBG";
}


/* =========================================================
   КАТЕГОРИИ
========================================================= */

function cats() {

  const list = [
    "Все",
    ...new Set(
      products.map(
        p => p.cat
      )
    )
  ];


  const categories =
    $("#categories");

  if (!categories) return;


  categories.innerHTML =
    list.map(c => `

      <button
        class="cat ${c === activeCat ? "active" : ""}"
        data-c="${escapeHtml(c)}"
      >
        ${escapeHtml(c)}
      </button>

    `).join("");


  document
    .querySelectorAll(".cat")
    .forEach(button => {

      button.onclick = () => {

        activeCat =
          button.dataset.c;

        cats();
        render();
      };

    });
}


/* =========================================================
   ЭКРАН ТОВАРОВ
========================================================= */

function render() {

  const productsEl =
    $("#products");

  if (!productsEl) return;


  const list =
    activeCat === "Все"
      ? products
      : products.filter(
          p =>
            p.cat === activeCat
        );


  if (!list.length) {

    productsEl.innerHTML = `
      <div class="muted"
           style="padding:30px;text-align:center">
        📦 Товаров пока нет
      </div>
    `;

    updateCartCount();

    return;
  }


  productsEl.innerHTML =
    list.map(p => `

      <article class="card">

        <img
          class="pic"
          src="${escapeAttribute(p.img)}"
          alt=""
          onerror="this.src='https://placehold.co/900x900/27415c/ffffff?text=PUBG'"
        >

        <div class="info">

          <div class="tag">
            ${escapeHtml(p.cat)}
          </div>

          <div class="title">
            ${escapeHtml(p.title)}
          </div>

          <div class="price">
            ${money(p.price)}
          </div>

          <div class="buttons">

            <button
              class="primary"
              onclick="add(${Number(p.id)})"
            >
              🛒 В корзину
            </button>

            <button
              class="secondary"
              onclick="view(${Number(p.id)})"
            >
              🎥 Обзор
            </button>

            <button
              class="secondary"
              onclick="offerPrice(${Number(p.id)})"
            >
              💰 Своя цена
            </button>

          </div>

        </div>

      </article>

    `).join("");


  updateCartCount();
}


/* =========================================================
   ДОБАВИТЬ В КОРЗИНУ
========================================================= */

window.add = function(id) {

  id = Number(id);


  if (cart.includes(id)) {

    toast(
      "Товар уже в корзине 🛒"
    );

    return;
  }


  cart.push(id);

  saveCart();

  updateCartCount();

  toast(
    "Добавлено в корзину 🛒"
  );
};


/* =========================================================
   СЧЁТЧИК КОРЗИНЫ
========================================================= */

function updateCartCount() {

  const count =
    $("#cartCount");

  if (count) {

    count.textContent =
      cart.length;
  }
}


/* =========================================================
   УДАЛИТЬ ИЗ КОРЗИНЫ
========================================================= */

window.removeFromCart = function(id) {

  id = Number(id);

  cart =
    cart.filter(
      item =>
        Number(item) !== id
    );


  saveCart();

  openCart();

  updateCartCount();

  toast(
    "Товар удалён из корзины"
  );
};


/* =========================================================
   ПРОСМОТР ТОВАРА
========================================================= */

window.view = function(id) {

  selected =
    products.find(
      p =>
        Number(p.id) === Number(id)
    );


  if (!selected) return;


  $("#modalImg").src =
    selected.img;

  $("#modalCat").textContent =
    selected.cat;

  $("#modalTitle").textContent =
    selected.title;

  $("#modalDesc").textContent =
    selected.desc;

  $("#modalPrice").textContent =
    money(selected.price);


  $("#modal").classList.remove(
    "hidden"
  );
};


/* =========================================================
   ЗАКРЫТЬ ТОВАР
========================================================= */

$("#closeModal").onclick = () => {

  $("#modal").classList.add(
    "hidden"
  );
};


/* =========================================================
   КОРЗИНА ИЗ МОДАЛКИ
========================================================= */

$("#modalCart").onclick = () => {

  if (!selected) return;

  add(selected.id);

  $("#modal").classList.add(
    "hidden"
  );
};


/* =========================================================
   ПРЕДЛОЖИТЬ СВОЮ ЦЕНУ
========================================================= */

window.offerPrice = function(id) {

  const product =
    products.find(
      p =>
        Number(p.id) === Number(id)
    );


  if (!product) return;


  const price =
    prompt(
      `Товар: ${product.title}\n\nКакую цену предлагаете?`
    );


  if (!price) return;


  const cleanPrice =
    price.trim();


  if (!cleanPrice) return;


  /*
    Больше никаких sendData.
    Просто открываем твой Telegram.
  */

  openProfile();
};


/* =========================================================
   КНОПКА "ПРЕДЛОЖИТЬ СВОЮ ЦЕНУ"
   В ОКНЕ ТОВАРА
========================================================= */

$("#modalOffer").onclick = () => {

  if (!selected) return;

  const price =
    prompt(
      `Товар: ${selected.title}\n\nКакую цену предлагаете?`
    );


  if (!price) return;


  openProfile();
};


/* =========================================================
   КНОПКА ОБЗОР
========================================================= */

$("#modalReview").onclick = () => {

  openTG("overview");
};


/* =========================================================
   ОТКРЫТЬ КОРЗИНУ
========================================================= */

$("#openCart").onclick = () => {

  openCart();
};


/* =========================================================
   РЕНДЕР КОРЗИНЫ
========================================================= */

function openCart() {

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
        style="padding:25px 0;text-align:center"
      >
        🛒 Корзина пустая
      </div>

    `;

  } else {

    $("#cartItems").innerHTML =

      rows.map(p => `

        <div class="cart-row">

          <img
            src="${escapeAttribute(p.img)}"
            onerror="this.src='https://placehold.co/300x300/27415c/ffffff?text=PUBG'"
          >

          <div
            style="
              flex:1;
              min-width:0;
            "
          >

            <b>
              ${escapeHtml(p.title)}
            </b>

            <span class="muted">
              ${money(p.price)}
            </span>

            <button
              class="secondary"
              style="margin-top:8px"
              onclick="removeFromCart(${Number(p.id)})"
            >
              🗑️ Удалить
            </button>

          </div>

        </div>

      `).join("");
  }


  $("#cartTotal").textContent =
    rows.length
      ? money(
          rows.reduce(
            (sum, p) =>
              sum + p.price,
            0
          )
        )
      : "";


  $("#cartModal")
    .classList
    .remove("hidden");
}


/* =========================================================
   ЗАКРЫТЬ КОРЗИНУ
========================================================= */

$("#closeCart").onclick = () => {

  $("#cartModal")
    .classList
    .add("hidden");
};


/* =========================================================
   КУПИТЬ / ОФОРМИТЬ ЗАКАЗ
========================================================= */

$("#checkout").onclick = () => {

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
    Просто открываем личку.
    Бот и WebAppData здесь больше не нужны.
  */

  openProfile();
};


/* =========================================================
   ПРЕДЛОЖИТЬ СВОЙ АККАУНТ
========================================================= */

$("#sellBtn").onclick = () => {

  /*
    Вместо формы с sendData
    сразу открываем твой профиль.
  */

  openProfile();
};


/* =========================================================
   СТАРАЯ ФОРМА ПРОДАЖИ
========================================================= */

if ($("#closeSell")) {

  $("#closeSell").onclick = () => {

    $("#sellModal")
      .classList
      .add("hidden");

  };
}


if ($("#sendSell")) {

  $("#sendSell").onclick = () => {

    openProfile();

  };
}


/* =========================================================
   ЗАЩИТА ТЕКСТА
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

  return escapeHtml(value);
}


/* =========================================================
   ЗАПУСК
========================================================= */

loadProducts();
