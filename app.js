const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const CONFIG = {
  owner: "https://t.me/lizorgin",
  reviews: "https://t.me/reviews_lizorgin",
  telegram: "https://t.me/lizorgin_store",
  overview: "https://t.me/lizorgin_store/10"
};

let products = [];

let cart = JSON.parse(
  localStorage.getItem("lizorgin_cart") || "[]"
);

let activeCat = "Все";
let selected = null;

const $ = (s) => document.querySelector(s);

function money(n) {
  return `${Number(n).toLocaleString("ru-RU")} грн.`;
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

function openTG(url) {
  if (!url) return;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, "_blank");
  }
}

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
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      console.error(
        "Supabase error:",
        response.status,
        await response.text()
      );
      return;
    }

    const data = await response.json();

    products = data.map((p) => ({
      id: p.id,
      cat: p.category || "Другое",
      title: p.title || "Аккаунт",
      price: Number(p.price || 0),
      desc: p.description || "",
      img: normalizeImage(p.image_url),
      review: CONFIG.overview
    }));

    // Удаляем из корзины товары,
    // которых больше нет в продаже.
    cart = cart.filter((id) =>
      products.some(
        (p) => Number(p.id) === Number(id)
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
  }
}

function normalizeImage(url) {
  if (!url) {
    return "https://placehold.co/900x900/27415c/ffffff?text=PUBG";
  }

  // Старые товары с telegram_file_id
  // показываем как заглушку.
  if (
    url.startsWith("telegram_file_id:")
  ) {
    return "https://placehold.co/900x900/27415c/ffffff?text=PHOTO";
  }

  return url;
}

function cats() {
  const list = [
    "Все",
    ...new Set(
      products.map((p) => p.cat)
    )
  ];

  $("#categories").innerHTML =
    list
      .map(
        (c) => `
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
        `
      )
      .join("");

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

function render() {
  const list =
    activeCat === "Все"
      ? products
      : products.filter(
          (p) => p.cat === activeCat
        );

  $("#products").innerHTML =
    list.length
      ? list
          .map(
            (p) => `
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
                      В корзину
                    </button>

                    <button
                      class="secondary"
                      onclick="view(${p.id})"
                    >
                      Обзор
                    </button>

                  </div>

                </div>

              </article>
            `
          )
          .join("")
      : `
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

window.removeFromCart = function(id) {
  cart = cart.filter(
    (item) =>
      Number(item) !== Number(id)
  );

  saveCart();

  renderCart();

  toast(
    "Товар удалён из корзины 🗑️"
  );
};

function renderCart() {
  const rows = cart
    .map((id) =>
      products.find(
        (p) =>
          Number(p.id) === Number(id)
      )
    )
    .filter(Boolean);

  $("#cartItems").innerHTML =
    rows.length
      ? rows
          .map(
            (p) => `
              <div class="cart-row">

                <img
                  src="${p.img}"
                  onerror="this.src='https://placehold.co/200x200/27415c/ffffff?text=PUBG'"
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
            `
          )
          .join("")
      : `
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
}

window.view = function(id) {
  selected =
    products.find(
      (p) =>
        Number(p.id) ===
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

  $("#modal").classList.remove(
    "hidden"
  );
};

$("#closeModal").onclick = () => {
  $("#modal").classList.add(
    "hidden"
  );
};

$("#modalCart").onclick = () => {
  if (!selected) return;

  add(selected.id);

  $("#modal").classList.add(
    "hidden"
  );
};

$("#modalReview").onclick = () => {
  openTG(CONFIG.overview);
};

$("#modalOffer").onclick = () => {
  if (!selected) return;

  // Просто открываем твою личку.
  openTG(CONFIG.owner);
};

$("#openCart").onclick = () => {
  renderCart();

  $("#cartModal")
    .classList
    .remove("hidden");
};

$("#closeCart").onclick = () => {
  $("#cartModal")
    .classList
    .add("hidden");
};

$("#checkout").onclick = () => {
  const rows = cart
    .map((id) =>
      products.find(
        (p) =>
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

  // Теперь покупка просто
  // открывает твою личку.
  openTG(CONFIG.owner);
};

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

  // Вместо заявки через бота
  // открываем твою личку.
  openTG(CONFIG.owner);

  $("#sellModal")
    .classList
    .add("hidden");
};

loadProducts();
