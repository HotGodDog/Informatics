let cart = [];
let currentProduct = null;
let allProductsStock = []; // для хранения списка товаров на складе

// Элементы DOM – общие
const modeCashBtn = document.getElementById('mode-cash-btn');
const modeStockBtn = document.getElementById('mode-stock-btn');
const cashMode = document.getElementById('cash-mode');
const stockMode = document.getElementById('stock-mode');
const cashierSelectContainer = document.getElementById('cashier-select-container');

// Элементы для кассы (остаются те же)
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

// Статистика
const statsDateFrom = document.getElementById('stats-date-from');
const statsDateTo = document.getElementById('stats-date-to');
const statsCashierSelect = document.getElementById('stats-cashier-select');
const loadStatsChecksBtn = document.getElementById('load-stats-checks');
const statsChecksResult = document.getElementById('stats-checks-result');
const statsProductsDateFrom = document.getElementById('stats-products-date-from');
const statsProductsDateTo = document.getElementById('stats-products-date-to');
const statsCategorySelect = document.getElementById('stats-category-select');
const loadStatsProductsBtn = document.getElementById('load-stats-products');
const statsProductsResult = document.getElementById('stats-products-result');

// Элементы для склада
const newProductName = document.getElementById('new-product-name');
const newProductCategory = document.getElementById('new-product-category');
const newProductPrice = document.getElementById('new-product-price');
const newProductStock = document.getElementById('new-product-stock');
const addProductBtn = document.getElementById('add-product-btn');
const addProductMessage = document.getElementById('add-product-message');
const stockSearch = document.getElementById('stock-search');
const stockTableContainer = document.getElementById('stock-table-container');

// ---- Вспомогательная функция ошибок ----
function showError(element, message) {
    element.innerHTML = `<span style="color:red;">${message}</span>`;
    setTimeout(() => {
        if (element.innerHTML === `<span style="color:red;">${message}</span>`) {
            element.innerHTML = '';
        }
    }, 4000);
}

// ---- ЗАГРУЗКА ДАННЫХ ДЛЯ КАССЫ ----
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

async function loadCategories() {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    categorySelect.innerHTML = '<option value="0">Все категории</option>';
    statsCategorySelect.innerHTML = '<option value="0">Все категории</option>';
    newProductCategory.innerHTML = '<option value="">-- Выберите категорию --</option>';
    categories.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        categorySelect.appendChild(option);
        const optionStat = document.createElement('option');
        optionStat.value = c.id;
        optionStat.textContent = c.name;
        statsCategorySelect.appendChild(optionStat);
        const optionStock = document.createElement('option');
        optionStock.value = c.id;
        optionStock.textContent = c.name;
        newProductCategory.appendChild(optionStock);
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

// ---- СТАТИСТИКА (без изменений) ----
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
    let html = `<h3>Продажи с ${dateFrom} по ${dateTo}</h3><table class="stats-table"><thead><tr><th>ID чека</th><th>Дата</th><th>Кассир</th><th>Сумма чека</th></tr></thead><tbody>`;
    let totalSum = 0;
    data.receipts.forEach(r => {
        totalSum += r.total;
        html += `<tr><td>${r.id_check}</td><td>${r.date}</td><td>${r.cashier_name}</td><td>${r.total.toFixed(2)} руб.</td></tr>`;
    });
    html += `</tbody></table><div class="stats-total">Общая сумма чеков: ${totalSum.toFixed(2)} руб.</div>`;
    statsChecksResult.innerHTML = html;
}
loadStatsChecksBtn.addEventListener('click', loadChecksStats);

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
    let html = `<h3>Проданные товары с ${dateFrom} по ${dateTo}</h3><table class="stats-table"><thead><tr><th>ID товара</th><th>Наименование</th><th>Количество</th><th>Сумма</th></tr></thead><tbody>`;
    let totalSum = 0;
    data.items.forEach(item => {
        totalSum += item.sum;
        html += `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.quantity}</td><td>${item.sum.toFixed(2)} руб.</td></tr>`;
    });
    html += `</tbody></table><div class="stats-total">Общая выручка: ${totalSum.toFixed(2)} руб.</div>`;
    statsProductsResult.innerHTML = html;
}
loadStatsProductsBtn.addEventListener('click', loadProductsStats);

function initStatsTabs() {
    const tabs = document.querySelectorAll('.stats-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.stats-tab-content').forEach(content => content.classList.remove('active'));
            if (tabId === 'checks') {
                document.getElementById('checks-stats').classList.add('active');
            } else {
                document.getElementById('products-stats').classList.add('active');
            }
        });
    });
}

function setDefaultDates() {
    const today = new Date().toISOString().slice(0,10);
    statsDateFrom.value = today;
    statsDateTo.value = today;
    statsProductsDateFrom.value = today;
    statsProductsDateTo.value = today;
}

// ---- СКЛАД: загрузка всех товаров, добавление, пополнение ----
async function loadAllProductsForStock() {
    const res = await fetch('/api/all_products');
    const products = await res.json();
    allProductsStock = products;
    renderStockTable(products);
}

function renderStockTable(products) {
    const searchTerm = stockSearch.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
        stockTableContainer.innerHTML = '<p>Товары не найдены.</p>';
        return;
    }
    let html = `<table class="stats-table">
        <thead><tr><th>ID</th><th>Название</th><th>Категория</th><th>Цена</th><th>Остаток</th><th>Пополнить</th></tr></thead>
        <tbody>`;
    filtered.forEach(p => {
        html += `<tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.price}</td>
            <td>${p.stock}</td>
            <td><input type="number" id="replenish-qty-${p.id}" value="1" min="1" style="width:70px;">
                <button class="replenish-btn" data-id="${p.id}">Добавить</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    stockTableContainer.innerHTML = html;
    // Вешаем обработчики на кнопки пополнения
    document.querySelectorAll('.replenish-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = btn.dataset.id;
            const qtyInput = document.getElementById(`replenish-qty-${productId}`);
            let addQty = parseInt(qtyInput.value);
            if (isNaN(addQty) || addQty < 1) addQty = 1;
            const res = await fetch('/api/replenish_stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, add_quantity: addQty })
            });
            const data = await res.json();
            if (res.ok) {
                showError(addProductMessage, `Остаток обновлён. Новый остаток: ${data.new_stock}`);
                loadAllProductsForStock();
            } else {
                showError(addProductMessage, `Ошибка: ${data.error}`);
            }
        });
    });
}

stockSearch.addEventListener('input', () => renderStockTable(allProductsStock));

addProductBtn.addEventListener('click', async () => {
    const name = newProductName.value.trim();
    const categoryId = newProductCategory.value;
    const price = parseFloat(newProductPrice.value);
    const stock = parseInt(newProductStock.value);
    if (!name) {
        showError(addProductMessage, 'Введите название товара');
        return;
    }
    if (!categoryId) {
        showError(addProductMessage, 'Выберите категорию');
        return;
    }
    if (isNaN(price) || price <= 0) {
        showError(addProductMessage, 'Введите корректную цену (>0)');
        return;
    }
    if (isNaN(stock) || stock < 0) stock = 0;
    const res = await fetch('/api/add_product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category_id: categoryId, price, quantity: stock })
    });
    const data = await res.json();
    if (res.ok) {
        showError(addProductMessage, `Товар "${name}" добавлен (ID ${data.id})`);
        newProductName.value = '';
        newProductPrice.value = '';
        newProductStock.value = '0';
        loadAllProductsForStock();
        const catId = categorySelect.value;
        loadProductsByCategory(catId);
    } else {
        showError(addProductMessage, `Ошибка: ${data.error}`);
    }
});

// ---- ПЕРЕКЛЮЧЕНИЕ МЕЖДУ КАССОЙ И СКЛАДОМ ----
function switchMode(mode) {
    if (mode === 'cash') {
        cashMode.classList.add('active');
        stockMode.classList.remove('active');
        modeCashBtn.classList.add('active');
        modeStockBtn.classList.remove('active');
        cashierSelectContainer.style.display = 'flex';
    } else {
        cashMode.classList.remove('active');
        stockMode.classList.add('active');
        modeCashBtn.classList.remove('active');
        modeStockBtn.classList.add('active');
        cashierSelectContainer.style.display = 'none';
        loadAllProductsForStock(); // загружаем таблицу при первом открытии
    }
}
modeCashBtn.addEventListener('click', () => switchMode('cash'));
modeStockBtn.addEventListener('click', () => switchMode('stock'));

// ---- ИНИЦИАЛИЗАЦИЯ ----
setDefaultDates();
initStatsTabs();
loadCashiers();
loadCategories();