import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, render_template
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'store.db')

def get_db():
    return sqlite3.connect(DATABASE)

@app.route('/')
def index():
    return render_template('index.html')

# ========== КАССА (без изменений) ==========
@app.route('/api/cashiers')
def get_cashiers():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id_employee, name, surname 
            FROM employees 
            WHERE id_job = (SELECT id_job FROM jobs_titles WHERE name_job = 'кассир')
        """)
        rows = cursor.fetchall()
    cashiers = [{'id': r[0], 'name': f"{r[1]} {r[2]}"} for r in rows]
    return jsonify(cashiers)

@app.route('/api/categories')
def get_categories():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id_category, name_category FROM categories")
        rows = cursor.fetchall()
    categories = [{'id': r[0], 'name': r[1]} for r in rows]
    return jsonify(categories)

@app.route('/api/products')
def get_products():
    cat_id = request.args.get('category_id', 0, type=int)
    with get_db() as conn:
        cursor = conn.cursor()
        if cat_id == 0:
            cursor.execute("""
                SELECT id_product, name_of_product, price, quantity_at_storage, id_category
                FROM products
                WHERE quantity_at_storage > 0
            """)
        else:
            cursor.execute("""
                SELECT id_product, name_of_product, price, quantity_at_storage, id_category
                FROM products
                WHERE id_category = ? AND quantity_at_storage > 0
            """, (cat_id,))
        rows = cursor.fetchall()
    products = [{'id': r[0], 'name': r[1], 'price': r[2], 'stock': r[3], 'category_id': r[4]} for r in rows]
    return jsonify(products)

@app.route('/api/product/<int:product_id>')
def get_product(product_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id_product, name_of_product, price, quantity_at_storage, id_category
            FROM products
            WHERE id_product = ? AND quantity_at_storage > 0
        """, (product_id,))
        row = cursor.fetchone()
    if row:
        return jsonify({'id': row[0], 'name': row[1], 'price': row[2], 'stock': row[3], 'category_id': row[4]})
    else:
        return jsonify({'error': 'Товар не найден или отсутствует на складе'}), 404

@app.route('/api/purchase', methods=['POST'])
def purchase():
    data = request.get_json()
    cashier_id = data.get('cashier_id')
    items = data.get('items', [])
    if not cashier_id:
        return jsonify({'error': 'Не выбран кассир'}), 400
    if not items:
        return jsonify({'error': 'Корзина пуста'}), 400
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("BEGIN IMMEDIATE")
            for item in items:
                pid = item['product_id']
                qty = item['quantity']
                cursor.execute("SELECT quantity_at_storage FROM products WHERE id_product = ?", (pid,))
                row = cursor.fetchone()
                if not row or row[0] < qty:
                    return jsonify({'error': f'Недостаточно товара: id {pid}'}), 400
            now_ts = datetime.now().timestamp()
            cursor.execute("INSERT INTO receipts (created_at, id_employee) VALUES (?, ?)", (now_ts, cashier_id))
            receipt_id = cursor.lastrowid
            total_sum = 0.0
            for item in items:
                pid = item['product_id']
                qty = item['quantity']
                cursor.execute("SELECT price FROM products WHERE id_product = ?", (pid,))
                price = cursor.fetchone()[0]
                total_sum += price * qty
                cursor.execute("""
                    INSERT INTO sale_items (id_check, id_product, quantity)
                    VALUES (?, ?, ?)
                """, (receipt_id, pid, qty))
                cursor.execute("UPDATE products SET quantity_at_storage = quantity_at_storage - ? WHERE id_product = ?",
                               (qty, pid))
            conn.commit()
            return jsonify({
                'receipt_id': receipt_id,
                'total': total_sum,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500

# ========== СТАТИСТИКА (без изменений) ==========
@app.route('/api/sales')
def sales_stats():
    from_date = request.args.get('from')
    to_date = request.args.get('to')
    cashier_id = request.args.get('cashier_id')
    if not from_date or not to_date:
        return jsonify({'error': 'Укажите from и to даты'}), 400
    try:
        start = datetime.strptime(from_date, '%Y-%m-%d')
        end = datetime.strptime(to_date, '%Y-%m-%d')
        start_ts = start.timestamp()
        end_ts = end.replace(hour=23, minute=59, second=59).timestamp()
    except:
        return jsonify({'error': 'Неверный формат даты'}), 400
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                r.id_check,
                r.created_at,
                e.name || ' ' || e.surname as cashier_name,
                COALESCE(SUM(p.price * si.quantity), 0) as total
            FROM receipts r
            JOIN employees e ON r.id_employee = e.id_employee
            JOIN sale_items si ON r.id_check = si.id_check
            JOIN products p ON si.id_product = p.id_product
            WHERE r.created_at BETWEEN ? AND ?
        """
        params = [start_ts, end_ts]
        if cashier_id and cashier_id != 'all':
            query += " AND r.id_employee = ?"
            params.append(int(cashier_id))
        query += " GROUP BY r.id_check ORDER BY r.created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        receipts = []
        for row in rows:
            receipts.append({
                'id_check': row[0],
                'date': datetime.fromtimestamp(row[1]).strftime('%Y-%m-%d %H:%M:%S'),
                'cashier_name': row[2],
                'total': row[3]
            })
    return jsonify({'receipts': receipts})

@app.route('/api/sales_by_products')
def sales_by_products():
    from_date = request.args.get('from')
    to_date = request.args.get('to')
    category_id = request.args.get('category_id', 0, type=int)
    if not from_date or not to_date:
        return jsonify({'error': 'Укажите from и to даты'}), 400
    try:
        start = datetime.strptime(from_date, '%Y-%m-%d')
        end = datetime.strptime(to_date, '%Y-%m-%d')
        start_ts = start.timestamp()
        end_ts = end.replace(hour=23, minute=59, second=59).timestamp()
    except:
        return jsonify({'error': 'Неверный формат даты'}), 400
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                p.id_product,
                p.name_of_product,
                COALESCE(SUM(si.quantity), 0) as total_quantity,
                COALESCE(SUM(p.price * si.quantity), 0) as total_sum
            FROM sale_items si
            JOIN receipts r ON si.id_check = r.id_check
            JOIN products p ON si.id_product = p.id_product
            WHERE r.created_at BETWEEN ? AND ?
        """
        params = [start_ts, end_ts]
        if category_id != 0:
            query += " AND p.id_category = ?"
            params.append(category_id)
        query += " GROUP BY p.id_product ORDER BY total_quantity DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        items = []
        for row in rows:
            items.append({
                'id': row[0],
                'name': row[1],
                'quantity': row[2],
                'sum': row[3]
            })
    return jsonify({'items': items})

# ========== СКЛАД (новые маршруты) ==========
@app.route('/api/all_products')
def get_all_products():
    """Возвращает все товары (включая с нулевым остатком) для управления складом."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id_product, p.name_of_product, p.price, p.quantity_at_storage, c.name_category
            FROM products p
            JOIN categories c ON p.id_category = c.id_category
            ORDER BY p.id_product
        """)
        rows = cursor.fetchall()
    products = [{
        'id': r[0],
        'name': r[1],
        'price': r[2],
        'stock': r[3],
        'category': r[4]
    } for r in rows]
    return jsonify(products)

@app.route('/api/add_product', methods=['POST'])
def add_product():
    data = request.get_json()
    name = data.get('name')
    price = data.get('price')
    category_id = data.get('category_id')
    quantity = data.get('quantity', 0)
    if not name or price is None or not category_id:
        return jsonify({'error': 'Не все обязательные поля заполнены'}), 400
    try:
        price = float(price)
        quantity = int(quantity)
    except:
        return jsonify({'error': 'Цена должна быть числом, количество – целым'}), 400
    with get_db() as conn:
        cursor = conn.cursor()
        # Проверяем существование категории
        cursor.execute("SELECT id_category FROM categories WHERE id_category = ?", (category_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Категория не найдена'}), 400
        try:
            cursor.execute("""
                INSERT INTO products (name_of_product, price, id_category, quantity_at_storage)
                VALUES (?, ?, ?, ?)
            """, (name, price, category_id, quantity))
            conn.commit()
            new_id = cursor.lastrowid
            return jsonify({'id': new_id, 'message': 'Товар добавлен'})
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Товар с таким ID уже существует'}), 400

@app.route('/api/replenish_stock', methods=['POST'])
def replenish_stock():
    data = request.get_json()
    product_id = data.get('product_id')
    add_quantity = data.get('add_quantity', 0)
    if not product_id:
        return jsonify({'error': 'Не указан товар'}), 400
    if add_quantity <= 0:
        return jsonify({'error': 'Количество для добавления должно быть больше 0'}), 400
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT quantity_at_storage FROM products WHERE id_product = ?", (product_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Товар не найден'}), 404
        new_stock = row[0] + add_quantity
        cursor.execute("UPDATE products SET quantity_at_storage = ? WHERE id_product = ?", (new_stock, product_id))
        conn.commit()
    return jsonify({'message': 'Остаток обновлён', 'new_stock': new_stock})

if __name__ == '__main__':
    app.run(debug=True, port=5001)