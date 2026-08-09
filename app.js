const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

// =========================================================
// НАСТРОЙКИ
// =========================================================

const CONFIG = {
  reviews: "https://t.me/reviews_lizorgin",
  telegram: "https://t.me/lizorgin_store",
  overview: "https://t.me/lizorgin_store/10",

  // ТВОЙ ПРОФИЛЬ
  owner: "https://t.me/lizorgin",

  // ТВОЙ TELEGRAM ID
  ownerId: "8523638381"
};

const SUPABASE_URL =
  "https://xmkmfchendnpuzjwnbmx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_zs7Jkd95b4Yyt4p_1FRCgw_xAwEG3LU";

// =========================================================
// СОСТОЯНИЕ
// =========================================================

let products = [];

let cart = JSON.parse(
  localStorage.getItem("lizorgin_cart") || "[]"
);

let activeCat = "Все";
let selected = null;

const $ = (selector) =>
  document.querySelector(selector);

// =========================================================
// ЦЕНА
// =========================================================

function money(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} грн.`;
}

// =========================================================
// УВЕДОМЛЕНИЕ
// =========================================================

function toast(text) {
  const el = $("#toast");

  if (!el) return;

  el.textContent = text;
  el.classList.remove("hidden");

  setTimeout(() => {
    el.classList.add("hidden");
  }, 1800);
}

// =========================================================
// КОРЗИНА
// =========================================================

function saveCart() {
  localStorage.setItem(
    "lizorgin_cart",
    JSON.stringify(cart)
  );
}

window.add = function (id) {
  const exists = cart.some(
    item => Number(item) === Number(id)
  );

  if (exists) {
    toast("Товар уже в корзине");
    return;
  }

  cart.push(id);
  saveCart();
  render();

  toast("Добавлено в корзину 🛒");
};

window.removeFromCart = function (id) {
  cart = cart.filter(
    item => Number(item) !== Number(id)
  );

  saveCart();

  render();
  renderCart();

  toast("Товар удалён 🗑️");
};

// =========================================================
// TELEGRAM — ТВОЙ ПРОФИЛЬ
// =========================================================

function openOwner() {
  const url = CONFIG.owner;

  try {
    if (
      tg &&
      typeof tg.openTelegramLink === "function"
    ) {
      tg.openTelegramLink(url);
      return;
    }
  } catch (error) {
    console.error(
      "Telegram openOwner error:",
      error
    );
  }

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
    if (
      tg &&
      typeof tg.openTelegramLink === "function"
    ) {
      tg.openTelegramLink(url);
      return;
    }
  } catch (error) {
    console.error(
      "Telegram link error:",
      error
    );
  }

  window.location.href = url;
}

// =========================================================
// ЗАГРУЗКА ТОВАРОВ ИЗ SUPABASE
// =========================================================

async function loadProducts() {
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/accounts` +
      `?select=*` +
      `&status=eq.available` +
      `&order=id.desc`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "SUPABASE ERROR:",
        response.status,
        errorText
      );

      toast("❌ Не удалось загрузить товары");
      return;
    }

    const data = await response.json();

    console.log(
      "SUPABASE PRODUCTS:",
      data
    );

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

    cats();
    render();

  } catch (error) {
    console.error(
      "LOAD PRODUCTS ERROR:",
      error
    );

    toast("❌ Ошибка соединения с магазином");
  }
}

// =========================================================
// КАРТИНКА
// =========================================================

function normalizeImage(url) {
  if (!url) {
    return (
      "https://placehold.co/" +
      "900x900/27415c/ffffff?text=PUBG"
    );
  }

  const value = String(url).trim();

  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  return (
    "https://placehold.co/" +
    "900x900/27415c/ffffff?text=PUBG"
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
        product => product.cat
      )
    )
  ];

  const categories = $("#categories");

  if (!categories) return;

  categories.innerHTML =
    list.map(category => `
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

// =========================================================
// ТОВАРЫ
// =========================================================

function render() {
  const productsContainer =
    $("#products");

  if (!productsContainer) return;

  const list =
    activeCat === "Все"
      ? products
      : products.filter(
          product =>
            product.cat === activeCat
        );

  if (!list.length) {
    productsContainer.innerHTML = `
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

    updateCartCount();
    return;
  }

  productsContainer.innerHTML =
    list.map(product => `
      <article class="card">

        <img
          class="pic"
          src="${escapeAttribute(product.img)}"
          alt=""
          onerror="
            this.onerror=null;
            this.src='https://placehold.co/900x900/27415c/ffffff?text=PUBG';
          "
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
              onclick="add(${Number(product.id)})"
            >
              🛒 В корзину
            </button>

            <button
              class="secondary"
              onclick="view(${Number(product.id)})"
            >
              🎥 Обзор
            </button>

            <button
              class="secondary"
              onclick="offerProduct(${Number(product.id)})"
            >
              💰 Предложить свою цену
            </button>

          </div>

        </div>

      </article>
    `).join("");

  updateCartCount();
}

// =========================================================
// СЧЁТЧИК КОРЗИНЫ
// =========================================================

function updateCartCount() {
  const count = $("#cartCount");

  if (count) {
    count.textContent =
      cart.length;
  }
}

// =========================================================
// ПРОСМОТР ТОВАРА
// =========================================================

window.view = function (id) {
  selected =
    products.find(
      product =>
        Number(product.id) ===
        Number(id)
    );

  if (!selected) {
    toast("Товар не найден");
    return;
  }

  const modalImg =
    $("#modalImg");

  const modalCat =
    $("#modalCat");

  const modalTitle =
    $("#modalTitle");

  const modalDesc =
    $("#modalDesc");

  const modalPrice =
    $("#modalPrice");

  const modal =
    $("#modal");

  if (modalImg) {
    modalImg.src =
      selected.img;

    modalImg.onerror = () => {
      modalImg.src =
        "https://placehold.co/900x900/27415c/ffffff?text=PUBG";
    };
  }

  if (modalCat) {
    modalCat.textContent =
      selected.cat;
  }

  if (modalTitle) {
    modalTitle.textContent =
      selected.title;
  }

  if (modalDesc) {
    modalDesc.textContent =
      selected.desc;
  }

  if (modalPrice) {
    modalPrice.textContent =
      money(selected.price);
  }

  if (modal) {
    modal.classList.remove("hidden");
  }
};

// =========================================================
// ПРЕДЛОЖИТЬ СВОЮ ЦЕНУ
// =========================================================

window.offerProduct = function (id) {
  const product =
    products.find(
      item =>
        Number(item.id) ===
        Number(id)
    );

  if (!product) {
    toast("Товар не найден");
    return;
  }

  const price = prompt(
    `💰 ${product.title}\n\n` +
    `Цена магазина: ${money(product.price)}\n\n` +
    `Введите свою цену в грн.`
  );

  if (
    price === null ||
    price.trim() === ""
  ) {
    return;
  }

  const value =
    Number(
      price
        .replace(",", ".")
        .trim()
    );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    toast("❌ Введите правильную цену");
    return;
  }

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

  /*
    Здесь специально НЕТ tg.sendData().
    Открываем твою личку.
  */

  openOwner();
};

window.offerPrice =
  window.offerProduct;

// =========================================================
// MODAL
// =========================================================

const closeModal =
  $("#closeModal");

if (closeModal) {
  closeModal.onclick = () => {
    $("#modal")
      ?.classList
      .add("hidden");
  };
}

const modalCart =
  $("#modalCart");

if (modalCart) {
  modalCart.onclick = () => {
    if (!selected) return;

    add(selected.id);

    $("#modal")
      ?.classList
      .add("hidden");
  };
}

const modalReview =
  $("#modalReview");

if (modalReview) {
  modalReview.onclick = () => {
    openTG("overview");
  };
}

const modalOffer =
  $("#modalOffer");

if (modalOffer) {
  modalOffer.onclick = () => {
    if (!selected) return;

    offerProduct(
      selected.id
    );
  };
}

// =========================================================
// КОРЗИНА
// =========================================================

function renderCart() {
  const cartItems =
    $("#cartItems");

  const cartTotal =
    $("#cartTotal");

  if (!cartItems) return;

  const rows =
    cart
      .map(id =>
        products.find(
          product =>
            Number(product.id) ===
            Number(id)
        )
      )
      .filter(Boolean);

  if (!rows.length) {
    cartItems.innerHTML = `
      <div
        class="muted"
        style="padding:25px 0"
      >
        Корзина пустая
      </div>
    `;

    if (cartTotal) {
      cartTotal.textContent = "";
    }

    return;
  }

  cartItems.innerHTML =
    rows.map(product => `
      <div
        class="cart-row"
        style="
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:10px;
        "
      >

        <img
          src="${escapeAttribute(product.img)}"
          alt=""
          style="
            width:55px;
            height:55px;
            object-fit:cover;
            border-radius:10px;
          "
          onerror="
            this.onerror=null;
            this.src='https://placehold.co/900x900/27415c/ffffff?text=PUBG';
          "
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
              margin-top:3px;
            "
          >
            ${money(product.price)}
          </span>
        </div>

        <button
          class="secondary"
          onclick="removeFromCart(${Number(product.id)})"
          style="
            white-space:nowrap;
            padding:8px 10px;
          "
        >
          🗑️
        </button>

      </div>
    `).join("");

  if (cartTotal) {
    cartTotal.textContent =
      money(
        rows.reduce(
          (sum, product) =>
            sum +
            Number(product.price || 0),
          0
        )
      );
  }
}

// =========================================================
// ОТКРЫТЬ КОРЗИНУ
// =========================================================

const openCart =
  $("#openCart");

if (openCart) {
  openCart.onclick = () => {
    renderCart();

    $("#cartModal")
      ?.classList
      .remove("hidden");
  };
}

// =========================================================
// ЗАКРЫТЬ КОРЗИНУ
// =========================================================

const closeCart =
  $("#closeCart");

if (closeCart) {
  closeCart.onclick = () => {
    $("#cartModal")
      ?.classList
      .add("hidden");
  };
}

// =========================================================
// КУПИТЬ
// =========================================================

const checkout =
  $("#checkout");

if (checkout) {
  checkout.onclick = () => {
    const rows =
      cart
        .map(id =>
          products.find(
            product =>
              Number(product.id) ===
              Number(id)
          )
        )
        .filter(Boolean);

    if (!rows.length) {
      toast("Корзина пустая");
      return;
    }

    /*
      Никакого sendData().
      Покупатель просто переходит к тебе.
    */

    openOwner();
  };
}

// =========================================================
// ПРОДАЖА СВОЕГО АККАУНТА
// =========================================================

const sellBtn =
  $("#sellBtn");

if (sellBtn) {
  sellBtn.onclick = () => {
    $("#sellModal")
      ?.classList
      .remove("hidden");
  };
}

const closeSell =
  $("#closeSell");

if (closeSell) {
  closeSell.onclick = () => {
    $("#sellModal")
      ?.classList
      .add("hidden");
  };
}

const sendSell =
  $("#sendSell");

if (sendSell) {
  sendSell.onclick = () => {
    const title =
      ($("#sellTitle")?.value || "")
        .trim();

    const price =
      ($("#sellPrice")?.value || "")
        .trim();

    const desc =
      ($("#sellDesc")?.value || "")
        .trim();

    if (!title || !price) {
      toast(
        "Заполни название и цену"
      );
      return;
    }

    const value =
      Number(
        price.replace(",", ".")
      );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      toast(
        "❌ Введи правильную цену"
      );
      return;
    }

    const offer = {
      type:
        "sell_account",

      title:
        title,

      price:
        value,

      description:
        desc
    };

    localStorage.setItem(
      "lizorgin_sell_offer",
      JSON.stringify(offer)
    );

    /*
      Открываем именно твою личку.
    */

    openOwner();

    $("#sellModal")
      ?.classList
      .add("hidden");
  };
}

// =========================================================
// ЭКРАНИРОВАНИЕ HTML
// =========================================================

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

// =========================================================
// ЗАПУСК
// =========================================================

console.log(
  "LIZORGIN STORE APP STARTED"
);

loadProducts();
