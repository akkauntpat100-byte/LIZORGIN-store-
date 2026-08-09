const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

// =========================================================
// CONFIG
// =========================================================

const CONFIG = {
  reviews: "https://t.me/reviews_lizorgin",
  telegram: "https://t.me/lizorgin_store",
  overview: "https://t.me/lizorgin_store/10",

  // ТВОЙ ПРОФИЛЬ
  owner: "https://t.me/lizorgin",
  ownerId: "8523638381"
};

// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL =
  "https://xmkmfchendnpuzjwnbmx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_zs7Jkd95b4Yyt4p_1FRCgw_xAwEG3LU";

// =========================================================
// STATE
// =========================================================

let products = [];

let cart = JSON.parse(
  localStorage.getItem("lizorgin_cart") || "[]"
);

let activeCat = "Все";
let selected = null;

// =========================================================
// HELPERS
// =========================================================

const $ = (selector) => {
  return document.querySelector(selector);
};

function money(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} грн.`;
}

function toast(text) {
  const el = $("#toast");

  if (!el) {
    console.log(text);
    return;
  }

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

// =========================================================
// TELEGRAM OWNER
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
    console.error("openTelegramLink error:", error);
  }

  window.open(url, "_blank");
}

window.openOwner = openOwner;

// =========================================================
// TELEGRAM LINKS
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
    console.error(error);
  }

  window.open(url, "_blank");
}

// =========================================================
// IMAGE
// =========================================================

function normalizeImage(url) {
  if (!url) {
    return "https://placehold.co/900x900/27415c/ffffff?text=PUBG";
  }

  if (
    typeof url === "string" &&
    (
      url.startsWith("https://") ||
      url.startsWith("http://")
    )
  ) {
    return url;
  }

  return "https://placehold.co/900x900/27415c/ffffff?text=PUBG";
}

// =========================================================
// LOAD PRODUCTS
// =========================================================

async function loadProducts() {
  console.log("Loading products...");

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
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    console.log("Supabase status:", response.status);

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

    console.log("SUPABASE PRODUCTS:", data);

    products = data.map((p) => ({
      id: p.id,
      cat: p.category || "Другое",
      title: p.title || "Аккаунт",
      price: Number(p.price || 0),
      desc: p.description || "",
      img: normalizeImage(p.image_url),
      review: CONFIG.overview
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
// CATEGORIES
// =========================================================

function cats() {
  const categories = [
    "Все",
    ...new Set(
      products.map((p) => p.cat)
    )
  ];

  const categoriesEl = $("#categories");

  if (!categoriesEl) {
    console.error("Не найден #categories");
    return;
  }

  categoriesEl.innerHTML =
    categories.map((category) => `
      <button
        class="cat ${category === activeCat ? "active" : ""}"
        data-c="${category}"
      >
        ${category}
      </button>
    `).join("");

  document
    .querySelectorAll(".cat")
    .forEach((button) => {

      button.onclick = () => {
        activeCat = button.dataset.c;

        cats();
        render();
      };

    });
}

// =========================================================
// RENDER PRODUCTS
// =========================================================

function render() {
  const productsEl = $("#products");

  if (!productsEl) {
    console.error("Не найден #products");
    return;
  }

  const list =
    activeCat === "Все"
      ? products
      : products.filter(
          (p) => p.cat === activeCat
        );

  if (!list.length) {
    productsEl.innerHTML = `
      <div
        class="muted"
        style="padding:30px;text-align:center"
      >
        📦 Товаров пока нет
      </div>
    `;

    updateCartCount();
    return;
  }

  productsEl.innerHTML =
    list.map((p) => `
      <article class="card">

        <img
          class="pic"
          src="${p.img}"
          alt=""
          onerror="
            this.src='https://placehold.co/900x900/27415c/ffffff?text=PUBG'
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

  updateCartCount();
}

// =========================================================
// CART COUNT
// =========================================================

function updateCartCount() {
  const count = $("#cartCount");

  if (count) {
    count.textContent = cart.length;
  }
}

// =========================================================
// ADD TO CART
// =========================================================

window.add = function(id) {
  const exists = cart.some(
    (item) =>
      Number(item) === Number(id)
  );

  if (exists) {
    toast("Товар уже в корзине");
    return;
  }

  cart.push(id);

  saveCart();
  updateCartCount();

  toast("Добавлено в корзину 🛒");
};

// =========================================================
// REMOVE FROM CART
// =========================================================

window.removeFromCart = function(id) {
  cart = cart.filter(
    (item) =>
      Number(item) !== Number(id)
  );

  saveCart();

  updateCartCount();
  renderCart();

  toast("Товар удалён 🗑️");
};

// =========================================================
// PRODUCT VIEW
// =========================================================

window.view = function(id) {
  selected = products.find(
    (p) =>
      Number(p.id) === Number(id)
  );

  if (!selected) {
    toast("Товар не найден");
    return;
  }

  const modalImg = $("#modalImg");
  const modalCat = $("#modalCat");
  const modalTitle = $("#modalTitle");
  const modalDesc = $("#modalDesc");
  const modalPrice = $("#modalPrice");
  const modal = $("#modal");

  if (modalImg) {
    modalImg.src = selected.img;
  }

  if (modalCat) {
    modalCat.textContent = selected.cat;
  }

  if (modalTitle) {
    modalTitle.textContent = selected.title;
  }

  if (modalDesc) {
    modalDesc.textContent = selected.desc;
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
// CLOSE PRODUCT MODAL
// =========================================================

const closeModal = $("#closeModal");

if (closeModal) {
  closeModal.onclick = () => {
    $("#modal")?.classList.add("hidden");
  };
}

// =========================================================
// MODAL CART
// =========================================================

const modalCart = $("#modalCart");

if (modalCart) {
  modalCart.onclick = () => {
    if (!selected) return;

    add(selected.id);

    $("#modal")?.classList.add("hidden");
  };
}

// =========================================================
// MODAL REVIEW
// =========================================================

const modalReview = $("#modalReview");

if (modalReview) {
  modalReview.onclick = () => {
    openTG("overview");
  };
}

// =========================================================
// MODAL OFFER
// =========================================================

const modalOffer = $("#modalOffer");

if (modalOffer) {
  modalOffer.onclick = () => {
    if (!selected) return;

    offerProduct(selected.id);
  };
}

// =========================================================
// OFFER PRICE
// =========================================================

window.offerProduct = function(id) {
  const product = products.find(
    (p) =>
      Number(p.id) === Number(id)
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

  const value = Number(
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

  // Сохраняем предложение локально
  localStorage.setItem(
    "lizorgin_last_offer",
    JSON.stringify({
      product: product.title,
      product_id: product.id,
      price: value
    })
  );

  // Открываем твой профиль
  openOwner();
};

window.offerPrice = window.offerProduct;

// =========================================================
// CART RENDER
// =========================================================

function renderCart() {
  const cartItems = $("#cartItems");
  const cartTotal = $("#cartTotal");

  if (!cartItems) return;

  const rows = cart
    .map((id) =>
      products.find(
        (p) =>
          Number(p.id) === Number(id)
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
    rows.map((p) => `
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
          src="${p.img}"
          onerror="
            this.src='https://placehold.co/900x900/27415c/ffffff?text=PUBG'
          "
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

          <span
            class="muted"
            style="display:block"
          >
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
          🗑️
        </button>

      </div>
    `).join("");

  if (cartTotal) {
    cartTotal.textContent = money(
      rows.reduce(
        (sum, p) =>
          sum + p.price,
        0
      )
    );
  }
}

// =========================================================
// OPEN CART
// =========================================================

const openCartButton = $("#openCart");

if (openCartButton) {
  openCartButton.onclick = () => {
    renderCart();

    $("#cartModal")
      ?.classList
      .remove("hidden");
  };
}

// =========================================================
// CLOSE CART
// =========================================================

const closeCartButton = $("#closeCart");

if (closeCartButton) {
  closeCartButton.onclick = () => {
    $("#cartModal")
      ?.classList
      .add("hidden");
  };
}

// =========================================================
// CHECKOUT
// =========================================================

const checkout = $("#checkout");

if (checkout) {
  checkout.onclick = () => {
    const rows = cart
      .map((id) =>
        products.find(
          (p) =>
            Number(p.id) === Number(id)
        )
      )
      .filter(Boolean);

    if (!rows.length) {
      toast("Корзина пустая");
      return;
    }

    // Открываем твой Telegram
    openOwner();
  };
}

// =========================================================
// SELL ACCOUNT
// =========================================================

const sellBtn = $("#sellBtn");

if (sellBtn) {
  sellBtn.onclick = () => {

    // Если нужна просто ссылка на тебя
    // при нажатии "Предложить аккаунт":
    openOwner();

  };
}

// =========================================================
// SELL MODAL
// =========================================================

const closeSell = $("#closeSell");

if (closeSell) {
  closeSell.onclick = () => {
    $("#sellModal")
      ?.classList
      .add("hidden");
  };
}

// =========================================================
// SEND SELL
// =========================================================

const sendSell = $("#sendSell");

if (sendSell) {
  sendSell.onclick = () => {

    const title =
      $("#sellTitle")
        ?.value
        .trim() || "";

    const price =
      $("#sellPrice")
        ?.value
        .trim() || "";

    const desc =
      $("#sellDesc")
        ?.value
        .trim() || "";

    if (!title || !price) {
      toast(
        "Заполни название и цену"
      );
      return;
    }

    localStorage.setItem(
      "lizorgin_sell_offer",
      JSON.stringify({
        title: title,
        price: price,
        description: desc
      })
    );

    // После заполнения формы
    // открываем твой Telegram
    openOwner();

    $("#sellModal")
      ?.classList
      .add("hidden");
  };
}

// =========================================================
// START
// =========================================================

console.log("LIZORGIN Mini App started");

loadProducts();
