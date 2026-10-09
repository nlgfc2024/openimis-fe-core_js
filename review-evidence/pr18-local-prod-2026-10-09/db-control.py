import sys
import psycopg2
conn=psycopg2.connect(host='127.0.0.1',port=55432,user='local_auth',dbname='mlatho_auth_validation')
with conn, conn.cursor() as cur:
    if sys.argv[1]=='expire-session':
        key=sys.stdin.read().strip()
        cur.execute('UPDATE django_session SET expire_date = NOW() - INTERVAL \'1 second\' WHERE session_key = %s', [key])
        assert cur.rowcount == 1
        print('Expired one local test session')
