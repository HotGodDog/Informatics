let cart = [];
let currentProduct = null;

// Элементы DOM
const cashierSelect = document.getElementById('cashier-select');
const categorySelect = document.getElementById('category-select');
const productSelect = document.getElementById('product-select');
const productIdInput = document.getElementById('product-id-input');
const loadProductBtn = document.getElementById('load-product-btn');
const quantityInput = document.getElementById('quantity-input');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const productInfo = document.getElementById('product-info');
const cartItemsDiv = document.getElementById('cart-items');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutResult = document.getElementById('checkout-result');

// Для статистики по чекам
const statsDateFrom = document.getElementById('stats-date-from');
const statsDateTo = document.getElementById('stats-date-to');
const statsCashierSelect = document.getElementById('stats-cashier-select');
const loadStatsChecksBtn = document.getElementById('load-stats-checks');
const statsChecksResult = document.getElementById('stats-checks-result');

// Для статистики по товарам
const statsProductsDateFrom = document.getElementById('stats-products-date-from');
const statsProductsDateTo = document.getElementById('stats-products-date-to');
const statsCategorySelect = document.getElementById('stats-category-select');
const loadStatsProductsBtn = document.getElementById('load-stats-products');
const statsProductsResult = document.getElementById('stats-products-result');

// --- Вспомогательная функция показа ошибок ---
function showError(element, message) {
    element.innerHTML = `<span style="color:red;">${message}</span>`;
    setTimeout(() => {
        if (element.innerHTML === `<span style="color:red;">${message}</span>`) {
            element.innerHTML = '';
        }
    }, 4000);
}

// --- Загрузка кассиров ---
async function loadCashiers() {
    const res = await fetch('/api/cashiers');
    const cashiers = await res.json();
    cashierSelect.innerHTML = '<option value="">-- Выберите кассира --</option>';
    statsCashierSelect.innerHTML = '<option value="all">Все кассиры</option>';
    cashiers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        cashierSelect.appendChild(option);
        const optionStat = document.createElement('option');
        optionStat.value = c.id;
        optionStat.textContent = c.name;
        statsCashierSelect.appendChild(optionStat);
    });
}

// --- Загрузка категорий (для выбора товара и для фильтра статистики) ---
async function loadCategories() {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    // для выбора товара
    categorySelect.innerHTML = '<option value="0">Все категории</option>';
    // для фильтра статистики по товарам
    statsCategorySelect.innerHTML = '<option value="0">Все категории</option>';
    categories.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        categorySelect.appendChild(option);
        const optionStat = document.createElement('option');
        optionStat.value = c.id;
        optionStat.textContent = c.name;
        statsCategorySelect.appendChild(optionStat);
    });
    categorySelect.addEventListener('change', () => loadProductsByCategory(categorySelect.value));
    loadProductsByCategory(0);
}

async function loadProductsByCategory(categoryId) {
    const url = categoryId == 0 ? '/api/products' : `/api/products?category_id=${categoryId}`;
    const res = await fetch(url);
    const products = await res.json();
    productSelect.innerHTML = '<option value="">-- Выберите товар --</option>';
    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (${p.price} руб., ост.: ${p.stock})`;
        option.dataset.price = p.price;
        option.dataset.stock = p.stock;
        option.dataset.name = p.name;
        productSelect.appendChild(option);
    });
    productSelect.addEventListener('change', () => {
        const selected = productSelect.options[productSelect.selectedIndex];
        if (selected.value) {
            currentProduct = {
                id: parseInt(selected.value),
                name: selected.dataset.name,
                price: parseFloat(selected.dataset.price),
                stock: parseInt(selected.dataset.stock)
            };
            productInfo.innerHTML = `<span style="color:green;">Выбран: ${currentProduct.name}, цена: ${currentProduct.price} руб., доступно: ${currentProduct.stock}</span>`;
        } else {
            currentProduct = null;
            productInfo.innerHTML = '';
        }
    });
}

// --- Загрузка товара по ID (исправлено: выводит зелёную надпись) ---
loadProductBtn.addEventListener('click', async () => {
    const productId = productIdInput.value;
    if (!productId) {
        showError(productInfo, 'Введите ID товара');
        return;
    }
    const res = await fetch(`/api/product/${productId}`);
    if (res.ok) {
        const product = await res.json();
        currentProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock
        };
        productInfo.innerHTML = `<span style="color:green;">Товар найден: ${currentProduct.name}, цена: ${currentProduct.price} руб., остаток: ${currentProduct.stock}</span>`;
        productIdInput.value = '';
    } else {
        const err = await res.json();
        showError(productInfo, err.error || 'Товар не найден');
        currentProduct = null;
    }
});

// --- Добавление в корзину ---
addToCartBtn.addEventListener('click', () => {
    if (!currentProduct) {
        showError(productInfo, 'Сначала выберите товар');
        return;
    }
    let qty = parseInt(quantityInput.value);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > currentProduct.stock) {
        showError(productInfo, `Недостаточно на складе. Доступно: ${currentProduct.stock}`);
        return;
    }
    const existing = cart.find(item => item.id === currentProduct.id);
    if (existing) {
        if (existing.quantity + qty > currentProduct.stock) {
            showError(productInfo, `Суммарное количество превышает остаток (${currentProduct.stock})`);
            return;
        }
        existing.quantity += qty;
    } else {
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            quantity: qty
        });
    }
    renderCart();
    currentProduct = null;
    productInfo.innerHTML = '';
    productSelect.value = '';
    productIdInput.value = '';
});

function renderCart() {
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Корзина пуста</p>';
        return;
    }
    let html = '<div class="cart-list">';
    cart.forEach((item, idx) => {
        const itemTotal = item.price * item.quantity;
        html += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>${item.quantity} шт. × ${item.price} руб.</span>
                <span>${itemTotal} руб.</span>
                <button class="remove-item" data-index="${idx}">Удалить</button>
            </div>
        `;
    });
    html += '</div>';
    cartItemsDiv.innerHTML = html;
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.index);
            cart.splice(idx, 1);
            renderCart();
        });
    });
}

// --- Оформление покупки ---
checkoutBtn.addEventListener('click', async () => {
    const cashierId = cashierSelect.value;
    if (!cashierId) {
        showError(checkoutResult, 'Выберите кассира');
        return;
    }
    if (cart.length === 0) {
        showError(checkoutResult, 'Корзина пуста');
        return;
    }
    const items = cart.map(item => ({ product_id: item.id, quantity: item.quantity }));
    const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashier_id: parseInt(cashierId), items })
    });
    const data = await res.json();
    if (res.ok) {
        checkoutResult.innerHTML = `<span style="color:green;">Чек №${data.receipt_id} на сумму ${data.total} руб. создан<br>Время: ${data.timestamp}</span>`;
        cart = [];
        renderCart();
        const catId = categorySelect.value;
        loadProductsByCategory(catId);
        setTimeout(() => {
            if (checkoutResult.innerHTML.includes('создан')) checkoutResult.innerHTML = '';
        }, 5000);
    } else {
        showError(checkoutResult, `Ошибка: ${data.error}`);
    }
});

// --- СТАТИСТИКА ПО ЧЕКАМ ---
async function loadChecksStats() {
    const dateFrom = statsDateFrom.value;
    const dateTo = statsDateTo.value;
    const cashierId = statsCashierSelect.value;
    if (!dateFrom || !dateTo) {
        showError(statsChecksResult, 'Выберите период дат');
        return;
    }
    let url = `/api/sales?from=${dateFrom}&to=${dateTo}`;
    if (cashierId !== 'all') {
        url += `&cashier_id=${cashierId}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        showError(statsChecksResult, data.error || 'Ошибка загрузки');
        return;
    }
    if (!data.receipts || data.receipts.length === 0) {
        statsChecksResult.innerHTML = `<div class="no-sales">За выбранный период продаж не найдено.</div>`;
        return;
    }
    let html = `<h3>Продажи с ${dateFrom} по ${dateTo}</h3>`;
    html += `<table class="stats-table">
                <thead>
                    <tr><th>ID чека</th><th>Дата</th><th>Кассир</th><th>Сумма чека</th></tr>
                </thead>
                <tbody>`;
    let totalSum = 0;
    data.receipts.forEach(r => {
        totalSum += r.total;
        html += `<tr><td>${r.id_check}</td><td>${r.date}</td><td>${r.cashier_name}</td><td>${r.total.toFixed(2)} руб.</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<div class="stats-total">Общая сумма чеков: ${totalSum.toFixed(2)} руб.</div>`;
    statsChecksResult.innerHTML = html;
}

loadStatsChecksBtn.addEventListener('click', loadChecksStats);

// --- СТАТИСТИКА ПО ТОВАРАМ ---
async function loadProductsStats() {
    const dateFrom = statsProductsDateFrom.value;
    const dateTo = statsProductsDateTo.value;
    const categoryId = statsCategorySelect.value;
    if (!dateFrom || !dateTo) {
        showError(statsProductsResult, 'Выберите период дат');
        return;
    }
    let url = `/api/sales_by_products?from=${dateFrom}&to=${dateTo}&category_id=${categoryId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        showError(statsProductsResult, data.error || 'Ошибка загрузки');
        return;
    }
    if (!data.items || data.items.length === 0) {
        statsProductsResult.innerHTML = `<div class="no-sales">За выбранный период продаж товаров не найдено.</div>`;
        return;
    }
    let html = `<h3>Проданные товары с ${dateFrom} по ${dateTo}</h3>`;
    html += `<table class="stats-table">
                <thead>
                    <tr><th>ID товара</th><th>Наименование</th><th>Количество</th><th>Сумма</th></tr>
                </thead>
                <tbody>`;
    let totalSum = 0;
    data.items.forEach(item => {
        totalSum += item.sum;
        html += `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.quantity}</td><td>${item.sum.toFixed(2)} руб.</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<div class="stats-total">Общая выручка: ${totalSum.toFixed(2)} руб.</div>`;
    statsProductsResult.innerHTML = html;
}

loadStatsProductsBtn.addEventListener('click', loadProductsStats);

// --- Переключение вкладок статистики ---
function initStatsTabs() {
    const tabs = document.querySelectorAll('.stats-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            // переключить активный класс у кнопок
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // скрыть все контенты
            document.querySelectorAll('.stats-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            // показать выбранный контент
            if (tabId === 'checks') {
                document.getElementById('checks-stats').classList.add('active');
            } else {
                document.getElementById('products-stats').classList.add('active');
            }
        });
    });
}

// --- Установка сегодняшней даты по умолчанию ---
function setDefaultDates() {
    const today = new Date().toISOString().slice(0,10);
    statsDateFrom.value = today;
    statsDateTo.value = today;
    statsProductsDateFrom.value = today;
    statsProductsDateTo.value = today;
}

// --- Инициализация ---
setDefaultDates();
initStatsTabs();
loadCashiers();
loadCategories();