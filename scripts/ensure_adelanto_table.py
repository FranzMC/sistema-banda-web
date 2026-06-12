import sqlite3
con=sqlite3.connect('db.sqlite3')
cur=con.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='gestion_banda_adelanto'")
if cur.fetchone():
    print('gestion_banda_adelanto already exists')
else:
    print('creating gestion_banda_adelanto')
    cur.execute('''
    CREATE TABLE gestion_banda_adelanto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        musico_id INTEGER NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        motivo VARCHAR(200) NOT NULL,
        fecha DATE NOT NULL,
        liquidado BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL
    );
    ''')
    # Create index for musico foreign key
    try:
        cur.execute('CREATE INDEX IF NOT EXISTS gestion_banda_adelanto_musico_id_idx ON gestion_banda_adelanto(musico_id)')
    except Exception:
        pass
    con.commit()
    print('created')
con.close()
