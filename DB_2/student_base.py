import sqlite3
import csv

conn = sqlite3.connect('university.db')
cursor = conn.cursor()


def create_data_base():
    """Создает базу данных"""
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS студенты (
            id_студента INTEGER PRIMARY KEY AUTOINCREMENT,
            id_уровня INTEGER,
            id_направления INTEGER,
            id_типа_обучения INTEGER,
            фамилия VARCHAR(50) NOT NULL,
            имя VARCHAR(50) NOT NULL,
            отчество VARCHAR(50),
            средний_балл DECIMAL(3,2),
            FOREIGN KEY (id_уровня) REFERENCES уровень_обучения(id_уровня),
            FOREIGN KEY (id_направления) REFERENCES направления(id_направления),
            FOREIGN KEY (id_типа_обучения) REFERENCES типы_обучения(id_типа_обучения)
        )
        ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS уровень_обучения (
            id_уровня INTEGER PRIMARY KEY AUTOINCREMENT,
            название VARCHAR(50) NOT NULL
        )
        ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS направления (
            id_направления INTEGER PRIMARY KEY AUTOINCREMENT,
            название VARCHAR(50) NOT NULL
        )
        ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS типы_обучения (
            id_типа_обучения INTEGER PRIMARY KEY AUTOINCREMENT,
            название VARCHAR(50) NOT NULL
        )
        ''')


def load_from_csv(filename, table_name):
    """Загружает данные из csv файла"""
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            headers = next(reader)
            
            for row in reader:
                if row and len(row) == len(headers):
                    columns = ','.join(headers)
                    placeholders = ','.join(['?' for _ in headers])
                    sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
                    cursor.execute(sql, row)
            
            conn.commit()
            print(f"Данные загружены из {filename} в таблицу {table_name}")
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"В таблице {table_name} теперь {count} записей")
    except FileNotFoundError:
        print(f"Файл {filename} не найден")


def show_table():
    """Выводит содержимое таблицы"""
    print("\nУровни обучения")
    cursor.execute("SELECT * FROM уровень_обучения")
    for row in cursor.fetchall():
        print(row)

    print("\nНапрвления")
    cursor.execute("SELECT * FROM направления")
    for row in cursor.fetchall():
        print(row)

    print("\nТипы обучения")
    cursor.execute("SELECT * FROM типы_обучения")
    for row in cursor.fetchall():
        print(row)

    print("\nСтуденты")
    cursor.execute("SELECT * FROM студенты")
    for row in cursor.fetchall():
        print(row)


def simple_requests():
    """Выводит 6 простых запросов"""
    # 1
    print("\n1. Количество всех студентов:")
    cursor.execute("SELECT COUNT(*) FROM студенты")
    count = cursor.fetchone()[0]
    print(f"   Всего студентов: {count}")

    # 2
    print("\n2. Количество студентов по направлениям:")
    cursor.execute("""
        SELECT н.название, COUNT(*) as количество
        FROM студенты с
        JOIN направления н ON с.id_направления = н.id_направления
        GROUP BY н.название
        ORDER BY количество DESC
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]}")

    # 3
    print("\n3. Количество студентов по формам обучения:")
    cursor.execute("""
        SELECT т.название, COUNT(*) as количество
        FROM студенты с
        JOIN типы_обучения т ON с.id_типа_обучения = т.id_типа_обучения
        GROUP BY т.название
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]}")

    # 4
    print("\n4. Максимальный, минимальный, средний баллы студентов по направлениям:")
    cursor.execute("""
        SELECT н.название,
            MAX(с.средний_балл) as максимальный,
            MIN(с.средний_балл) as минимальный,
            AVG(с.средний_балл) as средний
        FROM студенты с
        JOIN направления н ON с.id_направления = н.id_направления
        GROUP BY н.название
        ORDER BY средний DESC
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]}:")
        print(f"      Макс: {row[1]}\n      Мин: {row[2]}\n      Средний: {row[3]:.2f}")

    # 5
    print("\n5. Средний балл студентов:")

    print("   По направлениям:")
    cursor.execute("""
        SELECT н.название, AVG(с.средний_балл) as средний_балл
        FROM студенты с
        JOIN направления н ON с.id_направления = н.id_направления
        GROUP BY н.название
        ORDER BY средний_балл DESC
    """)
    for row in cursor.fetchall():
        print(f"      {row[0]}: {row[1]:.2f}")

    print("   По уровням обучения:")
    cursor.execute("""
        SELECT у.название, AVG(с.средний_балл) as средний_балл
        FROM студенты с
        JOIN уровень_обучения у ON с.id_уровня = у.id_уровня
        GROUP BY у.название
        ORDER BY средний_балл DESC
    """)
    for row in cursor.fetchall():
        print(f"      {row[0]}: {row[1]:.2f}")

    print("   По формам обучения:")
    cursor.execute("""
        SELECT т.название, AVG(с.средний_балл) as средний_балл
        FROM студенты с
        JOIN типы_обучения т ON с.id_типа_обучения = т.id_типа_обучения
        GROUP BY т.название
        ORDER BY средний_балл DESC
    """)
    for row in cursor.fetchall():
        print(f"      {row[0]}: {row[1]:.2f}")

    # 6
    print("\n6. 5 лучших студентов направления 'Прикладная Информатика' очной формы обучения:")
    cursor.execute("""
        SELECT с.фамилия, с.имя, с.отчество, с.средний_балл
        FROM студенты с
        JOIN направления н ON с.id_направления = н.id_направления
        JOIN типы_обучения т ON с.id_типа_обучения = т.id_типа_обучения
        WHERE (н.название = 'Прикладная информатика и разработка програмного обеспечения' OR н.название = 'Прикладная информатика и дизайн') AND т.название = 'Очный'
        ORDER BY с.средний_балл DESC
        LIMIT 5
    """)
    students = cursor.fetchall()

    for i, student in enumerate(students, 1):
        fio = f"{student[0]} {student[1]} {student[2]}".strip()
        print(f"   {i}. {fio} - Средний балл: {student[3]}")


def case_requests():
    """Выводит 2 CASE запроса"""
    # CASE запрос 1
    print("\nКатегория студентов на основе среднего балла:")
    cursor.execute("""
        SELECT фамилия, имя, средний_балл,
            CASE
                WHEN средний_балл >= 4.5 THEN 'Отличник'
                WHEN средний_балл >= 3.5 THEN 'Хорошист'
                ELSE 'Троечник'
            END AS категория
        FROM студенты
        ORDER BY средний_балл DESC
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]} {row[1]}: {row[2]} - {row[3]}")

    # CASE запрос 2
    print("\nПриоритет на повышенную стипендию:")
    cursor.execute("""
        SELECT с.фамилия, с.имя, т.название AS форма_обучения, с.средний_балл,
            CASE
                WHEN с.средний_балл > 4.7 AND т.название = 'Очная' THEN 'Высокий приоритет'
                WHEN с.средний_балл > 4.5 AND т.название = 'Очная' THEN 'Средний приоритет'
                WHEN с.средний_балл > 4.0 THEN 'Низкий приоритет'
                ELSE 'Нет приоритета'
            END AS приоритет_стипендии
        FROM студенты с
        JOIN типы_обучения т ON с.id_типа_обучения = т.id_типа_обучения
        ORDER BY приоритет_стипендии DESC, с.средний_балл DESC
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]} {row[1]} ({row[2]}, балл {row[3]}) - {row[4]}")


def subqueries():
    """Выводит 2 подзапроса"""
    # Подзапрос 1
    print("\nСтуденты с баллом выше среднего по своему направлению:")
    cursor.execute("""
        SELECT фамилия, имя, средний_балл, н.название AS направление
        FROM студенты с
        JOIN направления н ON с.id_направления = н.id_направления
        WHERE средний_балл > (
            SELECT AVG(средний_балл)
            FROM студенты с2
            WHERE с2.id_направления = с.id_направления
        )
        ORDER BY н.название, средний_балл DESC
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]} {row[1]} (балл {row[2]}) лучше среднего по {row[3]}")

    # Подзапрос 2
    print("\nСтуденты с баллом выше среднего балла по университету:")
    cursor.execute("""
        SELECT фамилия, имя, средний_балл
        FROM студенты
        WHERE средний_балл > (SELECT AVG(средний_балл) FROM студенты)
        ORDER BY средний_балл DESC
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]} {row[1]} (балл {row[2]})")


def cte_requests():
    """Выводит 2 CTE запроса"""
    # CTE запрос 1
    print("\nОтставание от лучшего студента в каждом направлении:")
    cursor.execute("""
        WITH ranked AS (
            SELECT 
                фамилия,
                имя,
                средний_балл,
                id_направления,
                FIRST_VALUE(средний_балл) OVER (
                    PARTITION BY id_направления 
                    ORDER BY средний_балл DESC
                ) AS best_in_direction
            FROM студенты
        )
        SELECT 
            r.фамилия,
            r.имя,
            r.средний_балл,
            н.название,
            r.best_in_direction,
            ROUND(r.best_in_direction - r.средний_балл, 2) AS difference
        FROM ranked r
        JOIN направления н ON r.id_направления = н.id_направления
        WHERE r.средний_балл < r.best_in_direction  -- не показывать самого лучшего
        ORDER BY н.название, difference
    """)
    for row in cursor.fetchall():
        print(f"   {row[0]} {row[1]}: балл {row[2]} (отстаёт от лидера {row[3]} на {row[5]})")

    # CTE запрос 2
    print("\nТоп-3 студента в каждом направлении по среднему баллу:")
    cursor.execute("""
        WITH ranked_students AS (
            SELECT 
                фамилия, 
                имя, 
                средний_балл,
                id_направления,
                ROW_NUMBER() OVER (PARTITION BY id_направления ORDER BY средний_балл DESC) as rank
            FROM студенты
        )
        SELECT rs.фамилия, rs.имя, rs.средний_балл, н.название, rs.rank
        FROM ranked_students rs
        JOIN направления н ON rs.id_направления = н.id_направления
        WHERE rs.rank <= 3
        ORDER BY н.название, rs.rank
    """)
    for row in cursor.fetchall():
        print(f"   {row[3]}: {row[0]} {row[1]} - балл {row[2]}, место {row[4]}")

create_data_base()

load_from_csv('уровень_обучения.csv', 'уровень_обучения')
load_from_csv('направления.csv', 'направления')
load_from_csv('типы_обучения.csv', 'типы_обучения')
load_from_csv('студенты.csv', 'студенты')

show_table()

simple_requests()

case_requests()

subqueries()

cte_requests()
