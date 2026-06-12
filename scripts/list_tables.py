import sqlite3
con=sqlite3.connect('db.sqlite3')
cur=con.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
rows=sorted([r[0] for r in cur.fetchall()])
for r in rows:
    print(r)
con.close()
