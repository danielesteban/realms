class Server {
  constructor(baseURL) {
    this.baseURL = baseURL;
    const session = localStorage.getItem('realmsvr::session');
    if (session) {
      this.setSession(session);
      this.request({
        endpoint: 'user',
      })
        .then((session) => this.setSession(session));
    }
  }

  loginWithGoogle() {
    const { baseURL } = this;
    const w = 512;
    const h = 512;
    const left = (window.screen.width / 2) - w / 2;
    const top = (window.screen.height / 2) - h / 2;
    const win = window.open(
      `${baseURL}/user/google`,
      'login',
      `width=${w},height=${h},top=${top},left=${left}`
    );
    if (!win) {
      return;
    }
    let watcher = setInterval(() => {
      if (!win.window) {
        if (watcher) {
          clearInterval(watcher);
        }
        return;
      }
      win.postMessage(true, baseURL);
    }, 100);
    const onMessage = ({ origin, data: { session } }) => {
      if (origin === baseURL) {
        window.removeEventListener('message', onMessage);
        clearInterval(watcher);
        watcher = false;
        if (!session) {
          return;
        }
        this.setSession(session);
      }
    };
    window.addEventListener('message', onMessage, false);
  }

  logout() {
    this.setSession();
  }

  request({
    endpoint,
    body,
    method = 'GET',
  }) {
    const { baseURL, session } = this;
    return fetch(`${baseURL}/${endpoint}`, {
      headers: {
        ...(session ? { Authorization: `Bearer ${session}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      method,
    })
      .then((res) => {
        if ((res.headers.get('content-type') || '').indexOf('application/json') === 0) {
          return res.json();
        }
        return res.arrayBuffer();
      });
  }

  setSession(session) {
    this.session = session;
    if (session) {
      const { _id, iat, exp, ...profile } = JSON.parse(atob(session.split('.')[1]));
      this.profile = profile;
      localStorage.setItem('realmsvr::session', session);
    } else {
      delete this.profile;
      localStorage.removeItem('realmsvr::session', session);
    }
  }
}

export default Server;
