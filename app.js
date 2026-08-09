const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}


// =====================================================
// НАСТРОЙКИ
// =====================================================

const CONFIG = {

  // Пост с обзорами
  reviews:
    "https://t.me/lizorgin_store/10",

  // Наш Telegram
  telegram:
    "https://t.me/lizorgin_store",

  // Отзывы
  feedback:
    "https://t.me/reviews_lizorgin",

  // Supabase
  supabaseUrl:
    "https://xmkmfchendnpuzjwnbmx.supabase.co",

  // Publishable key
  supabaseKey:
    "sb_publishable_zs7Jkd95b4Yyt4p_1FRCgw_xAwEG3LU"
};


// =====================================================
// СОСТОЯНИЕ
// =====================================================

let products = [];

let cart = JSON.parse(
  localStorage.getItem("lizorgin_cart") || "[]"
);

let activeCat = "Все";

let selected = null;


// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================

const $ = selector =>
  document.querySelector(selector);


const money = value =>
  `${Number(value || 0).toLocaleString("ru-RU")} грн.`;


// =====================================================
// УВЕДОМЛЕНИЕ
// =====================================================

function toast(text) {

  const element = $("#toast");

  if (!element) return;

  element.textContent = text;

  element.classList.remove("hidden");

  setTimeout(() => {
    element.classList.add("hidden");
  }, 1800);
}


// =====================================================
// КОРЗИНА
// =====================================================

function saveCart() {

  localStorage.setItem(
    "lizorgin_cart",
    JSON.stringify(cart)
  );
}


// =====================================================
// ОТПРАВКА ЗАЯВКИ В TELEGRAM
// =====================================================

function send(data) {

  if (tg?.sendData) {

    tg.sendData(
      JSON.stringify(data)
    );

    toast("Заявка отправлена ✅");

  } else {

    toast(
      "Открой Mini App через Telegram"
    );
  }
}


// =====================================================
// TELEGRAM ССЫЛКИ
// =====================================================

function openTG(type) {

  if (!CONFIG[type]) return;

  window.open(
    CONFIG[type],
    "_blank"
  );
}


// =====================================================
// КАТЕГОРИИ
// =====================================================

function formatCategory(category) {

  const map = {

    budget: "Бюджет",
    Budget: "Бюджет",

    premium: "Премиум",
    Premium: "Премиум",

    vip: "VIP",

    "PUBG Accounts":
      "PUBG Accounts"

  };

  return (
    map[category] ||
    category ||
    "Другие"
  );
}


// =====================================================
// ФОТО
// =====================================================

function productImage(image) {

  if (!image) {

    return (
      "https://placehold.co/900x900/" +
      "27415c/ffffff?text=LIZORGIN"
    );
  }

  return image;
}


// =====================================================
// ЗАГРУЗКА ТОВАРОВ ИЗ SUPABASE
// =====================================================

async function loadProducts() {

  try {

    const url =
      CONFIG.supabaseUrl +
      "/rest/v1/accounts" +
      "?select=*" +
      "&status=eq.available" +
      "&order=id.desc";


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {

            "apikey":
              CONFIG.supabaseKey,

            "Authorization":
              `Bearer ${CONFIG.supabaseKey}`,

            "Content-Type":
              "application/json"

          }
        }
      );


    if (!response.ok) {

      const error =
        await response.text();

      console.error(
        "SUPABASE ERROR:",
        error
      );

      $("#products").innerHTML = `

        <div
          class="muted"
          style="
            padding:35px 0;
            text-align:center;
          "
        >
          Не удалось загрузить товары.
        </div>

      `;

      return;
    }


    const data =
      await response.json();


    console.log(
      "SUPABASE PRODUCTS:",
      data
    );


    products =
      data.map(item => ({

        id:
          item.id,

        cat:
          formatCategory(
            item.category
          ),

        title:
          item.title ||
          "Аккаунт",

        price:
          Number(item.price) || 0,

        desc:
          item.description ||
          "Описание отсутствует.",

        img:
          productImage(
            item.image_url
          )

      }));


    activeCat = "Все";

    cats();

    render();


  } catch (error) {

    console.error(
      "PRODUCT LOAD ERROR:",
      error
    );

    $("#products").innerHTML = `

      <div
        class="muted"
        style="
          padding:35px 0;
          text-align:center;
        "
      >
        Ошибка подключения к магазину.
      </div>

    `;
  }
}


// =====================================================
// КАТЕГОРИИ НА ЭКРАНЕ
// =====================================================

function cats() {

  const categories = [

    "Все",

    ...new Set(
      products.map(
        product =>
          product.cat
      )
    )

  ];


  $("#categories").innerHTML =

    categories
      .map(
        category => `

          <button
            class="cat ${
              category === activeCat
                ? "active"
                : ""
            }"
            data-c="${category}"
          >
            ${category}
          </button>

        `
      )
      .join("");


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


// =====================================================
// ОТОБРАЖЕНИЕ ТОВАРОВ
// =====================================================

function render() {

  const list =

    activeCat === "Все"

      ? products

      : products.filter(
          product =>
            product.cat === activeCat
        );


  if (!list.length) {

    $("#products").innerHTML = `

      <div
        class="muted"
        style="
          padding:35px 0;
          text-align:center;
        "
      >

        Пока нет товаров.

      </div>

    `;

  } else {

    $("#products").innerHTML =

      list
        .map(
          product => `

            <article class="card">

              <img
                class="pic"
                src="${product.img}"
                alt=""
              >

              <div class="info">

                <div class="tag">
                  ${product.cat}
                </div>

                <div class="title">
                  ${product.title}
                </div>

                <div class="price">
                  ${money(product.price)}
                </div>

                <div class="buttons">

                  <button
                    class="primary"
                    onclick="add(${product.id})"
                  >
                    В корзину
                  </button>

                  <button
                    class="secondary"
                    onclick="view(${product.id})"
                  >
                    Обзор
                  </button>

                </div>

              </div>

            </article>

          `
        )
        .join("");
  }


  $("#cartCount").textContent =
    cart.length;
}


// =====================================================
// ДОБАВИТЬ В КОРЗИНУ
// =====================================================

window.add = id => {

  if (!cart.includes(id)) {

    cart.push(id);

    saveCart();

    render();

    toast(
      "Добавлено в корзину 🛒"
    );

  } else {

    toast(
      "Этот товар уже в корзине"
    );
  }
};


// =====================================================
// ОТКРЫТЬ ОБЗОР ТОВАРА
// =====================================================

window.view = id => {

  selected =
    products.find(
      product =>
        product.id === id
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


// =====================================================
// ЗАКРЫТЬ ОБЗОР
// =====================================================

$("#closeModal").onclick = () => {

  $("#modal").classList.add(
    "hidden"
  );
};


// =====================================================
// В КОРЗИНУ
// =====================================================

$("#modalCart").onclick = () => {

  if (!selected) return;

  add(selected.id);

  $("#modal").classList.add(
    "hidden"
  );
};


// =====================================================
// СМОТРЕТЬ ОБЗОР В TELEGRAM
// =====================================================

$("#modalReview").onclick = () => {

  openTG("reviews");
};


// =====================================================
// ПРЕДЛОЖИТЬ ЦЕНУ
// =====================================================

$("#modalOffer").onclick = () => {

  if (!selected) return;


  const price =
    prompt(
      "Какую цену предлагаете?"
    );


  if (!price) return;


  send({

    type:
      "offer_price",

    product_id:
      selected.id,

    product:
      selected.title,

    price:
      price

  });
};


// =====================================================
// ОТКРЫТЬ КОРЗИНУ
// =====================================================

$("#openCart").onclick = () => {

  const rows =

    cart
      .map(
        id =>
          products.find(
            product =>
              product.id === id
          )
      )
      .filter(Boolean);


  $("#cartItems").innerHTML =

    rows.length

      ? rows
          .map(
            product => `

              <div class="cart-row">

                <img
                  src="${product.img}"
                >

                <div>

                  <b>
                    ${product.title}
                  </b>

                  <span class="muted">
                    ${money(product.price)}
                  </span>

                </div>

              </div>

            `
          )
          .join("")

      : `

          <div
            class="muted"
            style="
              padding:25px 0
            "
          >
            Корзина пустая
          </div>

        `;


  $("#cartTotal").textContent =

    rows.length

      ? money(
          rows.reduce(
            (sum, product) =>
              sum + product.price,
            0
          )
        )

      : "";


  $("#cartModal").classList.remove(
    "hidden"
  );
};


// =====================================================
// ЗАКРЫТЬ КОРЗИНУ
// =====================================================

$("#closeCart").onclick = () => {

  $("#cartModal").classList.add(
    "hidden"
  );
};


// =====================================================
// ОФОРМИТЬ ЗАКАЗ
// =====================================================

$("#checkout").onclick = () => {

  const rows =

    cart
      .map(
        id =>
          products.find(
            product =>
              product.id === id
          )
      )
      .filter(Boolean);


  if (!rows.length) {

    toast(
      "Корзина пустая"
    );

    return;
  }


  send({

    type:
      "order",

    items:

      rows.map(
        product => ({

          id:
            product.id,

          title:
            product.title,

          price:
            product.price

        })
      ),

    total:

      rows.reduce(
        (sum, product) =>
          sum + product.price,
        0
      )

  });
};


// =====================================================
// ПРЕДЛОЖИТЬ СВОЙ АККАУНТ
// =====================================================

$("#sellBtn").onclick = () => {

  $("#sellModal").classList.remove(
    "hidden"
  );
};


$("#closeSell").onclick = () => {

  $("#sellModal").classList.add(
    "hidden"
  );
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

  const description =
    $("#sellDesc")
      .value
      .trim();


  if (!title || !price) {

    toast(
      "Заполни название и цену"
    );

    return;
  }


  send({

    type:
      "sell_account",

    title,

    price,

    description

  });


  $("#sellModal").classList.add(
    "hidden"
  );
};


// =====================================================
// ЗАПУСК
// =====================================================

cats();

render();

loadProducts();
