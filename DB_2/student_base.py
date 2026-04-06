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
    except Exception as e:
        print(f"Ошибка: {e}")


# create_data_base()

# load_from_csv('уровень_обучения.csv', 'уровень_обучения')
# load_from_csv('направления.csv', 'направления')
# load_from_csv('типы_обучения.csv', 'типы_обучения')
# load_from_csv('студенты.csv', 'студенты')

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
