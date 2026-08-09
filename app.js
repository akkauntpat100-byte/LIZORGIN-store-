const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const CONFIG = {
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

/*
  Отправка заявки боту.
  Важно: Mini App должен быть открыт именно
  через кнопку Web App в Telegram.
*/
function send(data) {
  if (!tg?.sendData) {
    toast("Открой магазин через Telegram");
    return false;
  }

  try {
    tg.sendData(JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("SEND DATA ERROR:", error);
    toast("Ошибка отправки заявки");
    return false;
  }
}

function openTG(kind) {
  const url = CONFIG[kind];

  if (!url) return;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, "_blank");
  }
}


/* =====================================================
   SUPABASE
===================================================== */

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
        "SUPABASE ERROR:",
        response.status,
        await response.text()
      );

      toast("Не удалось загрузить товары");
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

    /*
      Если товар был удалён из базы,
      удаляем его и из локальной корзины.
    */
    const productIds = products.map(
      (p) => Number(p.id)
    );

    cart = cart.filter((id) =>
      productIds.includes(Number(id))
    );

    saveCart();

    cats();
    render();

  } catch (error) {
    console.error(
      "LOAD PRODUCTS ERROR:",
      error
    );

    toast("Ошибка загрузки магазина");
  }
}


/* =====================================================
   IMAGES
===================================================== */

function normalizeImage(url) {
  if (!url) {
    return "https://placehold.co/900x900/27415c/ffffff?text=PUBG";
  }

  /*
    Telegram file_id пока не является URL картинки.
    Поэтому такие изображения показываем как placeholder.
  */
  if (
    url.startsWith("telegram_file_id:")
  ) {
    return "https://placehold.co/900x900/27415c/ffffff?text=PHOTO";
  }

  return url;
}


/* =====================================================
   CATEGORIES
===================================================== */

function cats() {
  const list = [
    "Все",
    ...new Set(
      products.map((p) => p.cat)
    )
  ];

  $("#categories").innerHTML =
    list.map((c) => `
      <button
        class="cat ${c === activeCat ? "active" : ""}"
        data-c="${c}"
      >
        ${c}
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


/* =====================================================
   PRODUCTS
===================================================== */

function render() {
  const list =
    activeCat === "Все"
      ? products
      : products.filter(
          (p) => p.cat === activeCat
        );

  $("#products").innerHTML =
    list.length

      ? list.map((p) => `
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


/* =====================================================
   CART
===================================================== */

window.add = function(id) {
  id = Number(id);

  if (!cart.some((x) => Number(x) === id)) {

    cart.push(id);

    saveCart();
    render();

    toast("Добавлено в корзину 🛒");

  } else {

    toast("Товар уже в корзине");
  }
};


/*
  НОВОЕ:
  Удаление одного товара из корзины.
*/
window.removeFromCart = function(id) {
  id = Number(id);

  cart = cart.filter(
    (itemId) => Number(itemId) !== id
  );

  saveCart();

  renderCart();

  render();

  toast("Товар удалён из корзины 🗑️");
};


/*
  Рисуем содержимое корзины отдельно,
  чтобы её можно было обновлять без закрытия окна.
*/
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

      ? rows.map((p) => `

          <div
            class="cart-row"
            style="
              display:flex;
              align-items:center;
              gap:10px;
              margin-bottom:12px;
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

              <span
                class="muted"
                style="
                  display:block;
                  margin-top:4px;
                "
              >
                ${money(p.price)}
              </span>

            </div>

            <button
              class="secondary"
              onclick="removeFromCart(${p.id})"
              style="
                padding:8px 10px;
                min-width:auto;
              "
            >
              🗑️
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
}


/* =====================================================
   PRODUCT MODAL
===================================================== */

window.view = function(id) {

  selected =
    products.find(
      (p) =>
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

  $("#modal")
    .classList
    .remove("hidden");
};


$("#closeModal").onclick = () => {
  $("#modal")
    .classList
    .add("hidden");
};


$("#modalCart").onclick = () => {

  if (!selected) return;

  add(selected.id);

  $("#modal")
    .classList
    .add("hidden");
};


/* =====================================================
   ОБЗОР
===================================================== */

$("#modalReview").onclick = () => {

  if (selected?.review) {
    openTG("overview");
  } else {
    openTG("overview");
  }

};


/* =====================================================
   ПРЕДЛОЖИТЬ ЦЕНУ
===================================================== */

$("#modalOffer").onclick = () => {

  if (!selected) return;

  const price = prompt(
    `Какую цену предлагаете за "${selected.title}"?`
  );

  if (!price) return;

  const sent = send({

    type: "offer_price",

    product_id:
      selected.id,

    product:
      selected.title,

    price:
      price

  });

  if (sent) {
    toast("Предложение отправлено ✅");
  }
};


/* =====================================================
   OPEN CART
===================================================== */

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


/* =====================================================
   CHECKOUT
===================================================== */

$("#checkout").onclick = () => {

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


  const sent = send({

    type: "order",

    items:
      rows.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price
      })),

    total:
      rows.reduce(
        (sum, p) =>
          sum + p.price,
        0
      )

  });


  if (sent) {

    /*
      Очищаем корзину после отправки заказа.
    */
    cart = [];

    saveCart();

    render();

    renderCart();

    toast("Заказ отправлен ✅");
  }
};


/* =====================================================
   SELL ACCOUNT
===================================================== */

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


  const sent = send({

    type: "sell_account",

    title: title,

    price: price,

    description: desc

  });


  if (sent) {

    $("#sellTitle").value = "";
    $("#sellPrice").value = "";
    $("#sellDesc").value = "";

    $("#sellModal")
      .classList
      .add("hidden");

    toast("Предложение отправлено ✅");
  }
};


/* =====================================================
   START
===================================================== */

loadProducts();
