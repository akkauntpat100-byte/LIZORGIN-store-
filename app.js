const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}


/* =========================================================
   НАСТРОЙКИ
========================================================= */

const CONFIG = {

  // ТВОЯ ЛИЧКА
  profile: "https://t.me/lizorgin",

  // Твой Telegram-канал
  telegram: "https://t.me/lizorgin_store",

  // Пост с обзорами
  overview: "https://t.me/lizorgin_store/10",

  // Отзывы
  reviews: "https://t.me/reviews_lizorgin"
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

  return `${Number(value).toLocaleString("ru-RU")} грн.`;

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
   TELEGRAM LINK
========================================================= */

function openTG(kind, text = "") {

  let url = CONFIG[kind];

  if (!url) return;


  /*
    Добавляем готовый текст сообщения.

    Например:

    https://t.me/lizorgin?text=Здравствуйте...
  */

  if (text) {

    url += "?text=" +
      encodeURIComponent(text);

  }


  if (tg?.openTelegramLink) {

    tg.openTelegramLink(url);

  } else {

    window.open(url, "_blank");

  }

}


/* =========================================================
   ОТКРЫТЬ ЛИЧКУ С ГОТОВЫМ СООБЩЕНИЕМ
========================================================= */

function contactMe(text) {

  openTG(
    "profile",
    text
  );

}


/* =========================================================
   ЗАГРУЗКА ТОВАРОВ
========================================================= */

async function loadProducts() {

  try {

    const response = await fetch(

      `${SUPABASE_URL}/rest/v1/accounts?select=*&status=eq.available&order=id.desc`,

      {

        headers: {

          "apikey": SUPABASE_KEY,

          "Authorization":
            `Bearer ${SUPABASE_KEY}`

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


    const data =
      await response.json();


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
    Старый Telegram file_id браузер показать не может.
    Если такой товар ещё остался — показываем заглушку.
  */

  if (
    String(url).startsWith(
      "telegram_file_id:"
    )
  ) {

    return "https://placehold.co/900x900/27415c/ffffff?text=PHOTO";

  }


  return url;

}


/* =========================================================
   КАТЕГОРИИ
========================================================= */

function cats() {

  const list = [

    "Все",

    ...new Set(
      products.map(p => p.cat)
    )

  ];


  $("#categories").innerHTML =

    list.map(c => `

      <button
        class="cat ${c === activeCat ? "active" : ""}"
        data-c="${c}"
      >
        ${c}
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

  const list =

    activeCat === "Все"

      ? products

      : products.filter(
          p => p.cat === activeCat
        );


  $("#products").innerHTML =

    list.length

      ? list.map(p => `

        <article class="card">

          <img
            class="pic"
            src="${p.img}"
            alt=""
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
                onclick="offerPrice(${p.id})"
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


  $("#cartCount").textContent =
    cart.length;

}


/* =========================================================
   ДОБАВИТЬ В КОРЗИНУ
========================================================= */

window.add = function(id) {

  if (
    !cart.some(
      x => Number(x) === Number(id)
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


/* =========================================================
   УДАЛИТЬ ИЗ КОРЗИНЫ
========================================================= */

window.removeFromCart = function(id) {

  cart = cart.filter(
    x => Number(x) !== Number(id)
  );

  saveCart();

  render();

  openCart();

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
   ОБЗОР
========================================================= */

$("#modalReview").onclick = () => {

  openTG(
    "overview"
  );

};


/* =========================================================
   ПРЕДЛОЖИТЬ СВОЮ ЦЕНУ
========================================================= */

function offerPrice(id) {

  const product =
    products.find(
      p =>
        Number(p.id) === Number(id)
    );


  if (!product) return;


  const price =
    prompt(
      `Товар: ${product.title}\n\n` +
      `Цена магазина: ${money(product.price)}\n\n` +
      `Введите вашу цену:`
    );


  if (!price) return;


  const message =

    `💰 Здравствуйте! Хочу предложить свою цену.\n\n` +

    `📦 Товар: ${product.title}\n` +

    `🆔 ID товара: ${product.id}\n` +

    `🏷 Категория: ${product.cat}\n` +

    `💵 Цена магазина: ${money(product.price)}\n` +

    `💰 Моя цена: ${price} грн.\n\n` +

    `Жду ответа.`;


  contactMe(
    message
  );

}


window.offerPrice =
  offerPrice;


/* =========================================================
   ПРЕДЛОЖИТЬ ЦЕНУ ИЗ МОДАЛКИ
========================================================= */

$("#modalOffer").onclick = () => {

  if (!selected) return;

  offerPrice(
    selected.id
  );

};


/* =========================================================
   ОТКРЫТЬ КОРЗИНУ
========================================================= */

function openCart() {

  const rows = cart

    .map(id =>
      products.find(
        p =>
          Number(p.id) === Number(id)
      )
    )

    .filter(Boolean);


  $("#cartItems").innerHTML =

    rows.length

      ? rows.map(p => `

          <div class="cart-row">

            <img
              src="${p.img}"
              alt=""
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
              onclick="removeFromCart(${p.id})"
              style="
                white-space:nowrap;
                padding:8px 10px;
              "
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


$("#openCart").onclick =
  openCart;


/* =========================================================
   ЗАКРЫТЬ КОРЗИНУ
========================================================= */

$("#closeCart").onclick = () => {

  $("#cartModal")
    .classList
    .add("hidden");

};


/* =========================================================
   КУПИТЬ
========================================================= */

$("#checkout").onclick = () => {

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


  let message =

    "🛒 Здравствуйте! Хочу купить аккаунт(ы).\n\n";


  rows.forEach((p, index) => {

    message +=

      `${index + 1}. ${p.title}\n` +

      `🆔 ID: ${p.id}\n` +

      `🏷 ${p.cat}\n` +

      `💰 ${money(p.price)}\n\n`;

  });


  const total =

    rows.reduce(
      (sum, p) =>
        sum + p.price,
      0
    );


  message +=

    `💵 ИТОГО: ${money(total)}\n\n` +

    "Напишите мне по поводу покупки.";


  contactMe(
    message
  );

};


/* =========================================================
   ПРЕДЛОЖИТЬ СВОЙ АККАУНТ
========================================================= */

$("#sellBtn").onclick = () => {

  $("#sellModal")
    .classList
    .remove("hidden");

};


$("#closeSell").onclick = () => {

  $("#sellModal")
    .classList
    .add("hidden");

};


$("#sendSell").onclick = () => {

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


  if (!title || !price) {

    toast(
      "Заполни название и цену"
    );

    return;

  }


  const message =

    "📤 Здравствуйте! Хочу продать аккаунт.\n\n" +

    `📦 Название: ${title}\n` +

    `💰 Желаемая цена: ${price} грн.\n\n` +

    `📝 Описание:\n${desc || "Не указано"}\n\n` +

    "Жду вашего ответа.";


  contactMe(
    message
  );


  $("#sellModal")
    .classList
    .add("hidden");

};


/* =========================================================
   СТАРТ
========================================================= */

loadProducts();
