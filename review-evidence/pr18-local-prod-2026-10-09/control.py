import os, signal, subprocess, sys, time
from pathlib import Path
root=Path('/tmp/mlatho-local-prod')
mode=sys.argv[1]
pidfile=root/'backend.pid'
if mode == 'stop':
    if pidfile.exists():
        pid=int(pidfile.read_text())
        try:
            cmd=Path(f'/proc/{pid}/cmdline').read_bytes()
            assert b'manage.py' in cmd and b'127.0.0.1:18000' in cmd
            os.kill(pid, signal.SIGTERM)
        except FileNotFoundError: pass
        pidfile.unlink()
    print('Local test backend stopped')
elif mode == 'start':
    assert not pidfile.exists(), 'Backend already has a recorded PID'
    env=os.environ.copy()
    if len(sys.argv)>2 and sys.argv[2]=='short-jwt':
        env['DJANGO_SETTINGS_MODULE']='openIMIS.settings'
        env['LOCAL_AUTH_JWT_SECONDS']='180'
    else:
        env['DJANGO_SETTINGS_MODULE']='openIMIS.settings'
        env.pop('LOCAL_AUTH_JWT_SECONDS',None)
    with (root/'logs/backend-server.log').open('a') as log:
        p=subprocess.Popen(['bash',str(root/'run-backend.sh'),'manage.py','runserver','127.0.0.1:18000','--noreload'],stdout=log,stderr=log,env=env,start_new_session=True)
    pidfile.write_text(str(p.pid))
    print('Local test backend starting:',p.pid)
else:
    raise ValueError(mode)
