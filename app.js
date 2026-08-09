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

  // ТВОЙ TELEGRAM
  telegram: "https://t.me/lizorgin_store",

  // ОТЗЫВЫ
  reviews: "https://t.me/reviews_lizorgin",

  // ПОСТ С ОБЗОРАМИ
  overview: "https://t.me/lizorgin_store/10",

  // SUPABASE
  supabaseUrl:
    "https://xmkmfchendnpuzjwnbmx.supabase.co",

  supabaseKey:
    "sb_publishable_zs7Jkd95b4Yyt4p_1FRCgw_xAwEG3LU"

};


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
   TELEGRAM
========================================================= */

function openTelegram(url) {

  if (!url) return;

  if (tg?.openTelegramLink) {

    tg.openTelegramLink(url);

  } else {

    window.open(url, "_blank");

  }

}


/*
   Открывает твою личку.

   В сообщение автоматически вставляется информация
   о товаре.
*/

function contactOwner(message) {

  const text = encodeURIComponent(message);

  const url =
    `${CONFIG.profile}?text=${text}`;

  openTelegram(url);

}


/* =========================================================
   ЗАГРУЗКА ТОВАРОВ
========================================================= */

async function loadProducts() {

  try {

    const url =
      `${CONFIG.supabaseUrl}/rest/v1/accounts` +
      `?select=*` +
      `&status=eq.available` +
      `&order=id.desc`;

    const response = await fetch(
      url,
      {
        method: "GET",

        headers: {
          "apikey": CONFIG.supabaseKey,
          "Authorization":
            `Bearer ${CONFIG.supabaseKey}`
        }
      }
    );


    if (!response.ok) {

      console.error(
        "SUPABASE ERROR:",
        response.status,
        await response.text()
      );

      showEmpty(
        "❌ Не удалось загрузить товары"
      );

      return;

    }


    const data =
      await response.json();


    products =
      data.map(product => ({

        id:
          product.id,

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


    cats();

    render();

  } catch (error) {

    console.error(
      "LOAD PRODUCTS ERROR:",
      error
    );

    showEmpty(
      "❌ Ошибка загрузки товаров"
    );

  }

}


/* =========================================================
   ФОТО
========================================================= */

function normalizeImage(image) {

  if (!image) {

    return (
      `${CONFIG.supabaseUrl}` +
      `/storage/v1/object/public/product-images/` +
      `default.jpg`
    );

  }


  let value =
    String(image).trim();


  /*
    Если в базе уже полный URL
  */

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {

    return value;

  }


  /*
    Если в базе:
    product-images/file.jpg
  */

  if (
    value.startsWith("product-images/")
  ) {

    value =
      value.replace(
        "product-images/",
        ""
      );

  }


  /*
    Если просто:
    file.jpg
  */

  return (
    `${CONFIG.supabaseUrl}` +
    `/storage/v1/object/public/` +
    `product-images/` +
    value
  );

}


/* =========================================================
   КАТЕГОРИИ
========================================================= */

function cats() {

  const categories = [

    "Все",

    ...new Set(
      products.map(
        product => product.cat
      )
    )

  ];


  const container =
    $("#categories");


  if (!container) return;


  container.innerHTML =
    categories.map(category => `

      <button
        class="cat ${
          category === activeCat
            ? "active"
            : ""
        }"
        data-c="${escapeHtml(category)}"
      >
        ${escapeHtml(category)}
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
   ТОВАРЫ
========================================================= */

function render() {

  const container =
    $("#products");

  if (!container) return;


  const list =
    activeCat === "Все"

      ? products

      : products.filter(
          product =>
            product.cat === activeCat
        );


  if (!list.length) {

    showEmpty(
      "📦 Товаров пока нет"
    );

    return;

  }


  container.innerHTML =

    list.map(product => `

      <article class="card">

        <img
          class="pic"
          src="${escapeAttribute(product.img)}"
          alt=""
          onerror="this.src='https://placehold.co/900x900/27415c/ffffff?text=PUBG'"
        >

        <div class="info">

          <div class="tag">
            ${escapeHtml(product.cat)}
          </div>

          <div class="title">
            ${escapeHtml(product.title)}
          </div>

          <div class="price">
            ${money(product.price)}
          </div>

          <div class="buttons">

            <button
              class="primary"
              onclick="add(${product.id})"
            >
              🛒 В корзину
            </button>

            <button
              class="secondary"
              onclick="view(${product.id})"
            >
              🎥 Обзор
            </button>

            <button
              class="secondary"
              onclick="offerPrice(${product.id})"
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
   ПУСТОЙ СПИСОК
========================================================= */

function showEmpty(text) {

  const container =
    $("#products");

  if (!container) return;


  container.innerHTML = `

    <div
      class="muted"
      style="
        padding:30px;
        text-align:center;
        width:100%;
      "
    >
      ${text}
    </div>

  `;

}


/* =========================================================
   КОРЗИНА
========================================================= */

function updateCartCount() {

  const counter =
    $("#cartCount");

  if (!counter) return;

  counter.textContent =
    cart.length;

}


window.add = function(id) {

  id = Number(id);


  if (
    !cart.includes(id)
  ) {

    cart.push(id);

    saveCart();

    updateCartCount();

    toast(
      "Добавлено в корзину 🛒"
    );

  } else {

    toast(
      "Товар уже в корзине"
    );

  }

};


/*
   УДАЛЕНИЕ ИЗ КОРЗИНЫ
*/

window.removeFromCart =
  function(id) {

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


function openCart() {

  const rows = cart

    .map(id =>
      products.find(
        product =>
          Number(product.id) ===
          Number(id)
      )
    )

    .filter(Boolean);


  const items =
    $("#cartItems");


  if (!items) return;


  if (!rows.length) {

    items.innerHTML = `

      <div
        class="muted"
        style="padding:25px 0"
      >
        Корзина пустая
      </div>

    `;

  } else {

    items.innerHTML =

      rows.map(product => `

        <div
          class="cart-row"
          style="
            display:flex;
            align-items:center;
            gap:12px;
            margin-bottom:12px;
          "
        >

          <img
            src="${escapeAttribute(product.img)}"
            style="
              width:60px;
              height:60px;
              object-fit:cover;
              border-radius:10px;
            "
            onerror="this.src='https://placehold.co/200x200/27415c/ffffff?text=PUBG'"
          >

          <div
            style="
              flex:1;
              min-width:0;
            "
          >

            <b>
              ${escapeHtml(product.title)}
            </b>

            <span
              class="muted"
              style="
                display:block;
                margin-top:4px;
              "
            >
              ${money(product.price)}
            </span>

          </div>

          <button
            class="secondary"
            onclick="removeFromCart(${product.id})"
            style="
              padding:8px 10px;
              min-width:auto;
            "
          >
            🗑️
          </button>

        </div>

      `).join("");

  }


  const total =
    $("#cartTotal");


  if (total) {

    total.textContent =
      rows.length

        ? money(
            rows.reduce(
              (sum, product) =>
                sum + product.price,
              0
            )
          )

        : "";

  }


  $("#cartModal")
    ?.classList
    .remove("hidden");

}


/* =========================================================
   КУПИТЬ
========================================================= */

function buyProduct(product) {

  if (!product) return;


  contactOwner(
    `Здравствуйте! Хочу купить аккаунт.

📦 ${product.title}
🆔 ID: ${product.id}
💰 Цена: ${product.price} грн.

Отправляю сообщение из LIZORGIN STORE.`
  );

}


/* =========================================================
   СВОЯ ЦЕНА
========================================================= */

window.offerPrice =
  function(id) {

    const product =
      products.find(
        item =>
          Number(item.id) ===
          Number(id)
      );


    if (!product) return;


    const price =
      prompt(
        `Предложите свою цену за "${product.title}":`
      );


    if (
      price === null ||
      !price.trim()
    ) {

      return;

    }


    contactOwner(
      `Здравствуйте! Хочу предложить свою цену.

📦 ${product.title}
🆔 ID: ${product.id}

💰 Моя цена: ${price} грн.

Отправлено из LIZORGIN STORE.`
    );

  };


/* =========================================================
   ПРОСМОТР ТОВАРА
========================================================= */

window.view =
  function(id) {

    selected =
      products.find(
        product =>
          Number(product.id) ===
          Number(id)
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


    $("#modal")
      .classList
      .remove("hidden");

  };


/* =========================================================
   МОДАЛЬНОЕ ОКНО
========================================================= */

$("#closeModal").onclick =
  () => {

    $("#modal")
      .classList
      .add("hidden");

  };


/*
   Кнопка "В корзину"
*/

$("#modalCart").onclick =
  () => {

    if (!selected) return;

    add(selected.id);

    $("#modal")
      .classList
      .add("hidden");

  };


/*
   Кнопка "Смотреть обзор"
*/

$("#modalReview").onclick =
  () => {

    openTelegram(
      selected?.review ||
      CONFIG.overview
    );

  };


/*
   Кнопка "Предложить свою цену"
*/

$("#modalOffer").onclick =
  () => {

    if (!selected) return;

    offerPrice(
      selected.id
    );

  };


/*
   ДОБАВЛЯЕМ КНОПКУ ПОКУПКИ
   В модальное окно.

   Она открывает твою личку.
*/

function setupModalBuyButton() {

  const actions =
    document.querySelector(
      ".actions"
    );


  if (!actions) return;


  if (
    document.getElementById(
      "modalBuy"
    )
  ) return;


  const button =
    document.createElement(
      "button"
    );


  button.id =
    "modalBuy";

  button.className =
    "primary";

  button.textContent =
    "💳 Купить";


  button.onclick =
    () => {

      buyProduct(selected);

    };


  actions.insertBefore(
    button,
    actions.firstChild
  );

}


/* =========================================================
   КОРЗИНА
========================================================= */

$("#openCart").onclick =
  () => {

    openCart();

  };


$("#closeCart").onclick =
  () => {

    $("#cartModal")
      .classList
      .add("hidden");

  };


/*
   Оформление заказа.

   Никакого sendData.
   Просто открываем твою личку.
*/

$("#checkout").onclick =
  () => {

    const rows = cart

      .map(id =>
        products.find(
          product =>
            Number(product.id) ===
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


    const lines =
      rows.map(
        product =>
          `📦 ${product.title}
🆔 ID: ${product.id}
💰 ${product.price} грн.`
      );


    contactOwner(
      `Здравствуйте! Хочу купить аккаунты из корзины.

${lines.join("\n\n")}

💵 Итого: ${
        rows.reduce(
          (sum, product) =>
            sum + product.price,
          0
        )
      } грн.

Отправлено из LIZORGIN STORE.`
    );

  };


/* =========================================================
   ПРОДАЖА СВОЕГО АККАУНТА
========================================================= */

$("#sellBtn").onclick =
  () => {

    $("#sellModal")
      .classList
      .remove("hidden");

  };


$("#closeSell").onclick =
  () => {

    $("#sellModal")
      .classList
      .add("hidden");

  };


$("#sendSell").onclick =
  () => {

    const title =
      $("#sellTitle")
        .value
        .trim();


    const price =
      $("#sellPrice")
        .value
        .trim();


    const desc =
      $("#sellDesc")
        .value
        .trim();


    if (
      !title ||
      !price
    ) {

      toast(
        "Заполни название и цену"
      );

      return;

    }


    contactOwner(
      `Здравствуйте! Хочу предложить свой аккаунт.

📦 Название: ${title}
💰 Цена: ${price} грн.

📝 Описание:
${desc || "Не указано"}

Отправлено через LIZORGIN STORE.`
    );


    $("#sellModal")
      .classList
      .add("hidden");

  };


/* =========================================================
   ССЫЛКИ
========================================================= */

window.openTG =
  function(kind) {

    openTelegram(
      CONFIG[kind]
    );

  };


/* =========================================================
   БЕЗОПАСНЫЙ ВЫВОД
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return escapeHtml(value);

}


/* =========================================================
   ЗАПУСК
========================================================= */

setupModalBuyButton();

loadProducts();
