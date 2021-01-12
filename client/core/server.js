import { EventDispatcher } from './three.js';

class Server extends EventDispatcher {
  constructor(baseURL) {
    super();
    this.baseURL = baseURL;
    const session = localStorage.getItem('realmsvr::session');
    if (session) {
      this.setSession(session);
      this.request({
        endpoint: 'user',
      })
        .then((session) => this.setSession(session))
        .catch(() => {});
    }
    this.dialogs = {};
    this.setupRegisterDialog();
    this.setupRegisterGoogleDialog();
    this.setupSessionDialog();
  }

  loginWithEmail({ email, password }) {
    if (!email || !password) {
      return;
    }
    this.request({
      endpoint: 'user',
      body: { email, password },
      method: 'PUT',
    })
      .then((session) => {
        this.setSession(session);
        this.closeDialogs();
      })
      .catch(() => {});
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
    const onMessage = ({ origin, data: { firstLogin, session } }) => {
      if (origin === baseURL) {
        window.removeEventListener('message', onMessage);
        clearInterval(watcher);
        watcher = false;
        if (!session) {
          return;
        }
        this.setSession(session);
        this.closeDialogs();
        if (firstLogin) {
          this.dialogs.registerGoogle.nameInput.value = this.profile.name;
          this.showDialog('registerGoogle');
        }
      }
    };
    window.addEventListener('message', onMessage, false);
  }

  logout() {
    this.setSession();
  }

  register({ name, email, password }) {
    if (!name || !email || !password) {
      return;
    }
    this.request({
      endpoint: 'user',
      body: { name, email, password },
      method: 'POST',
    })
      .then((session) => {
        this.setSession(session);
        this.closeDialogs();
      })
      .catch(() => {});
  }

  updateProfile({ name }) {
    if (!name) {
      return;
    }
    this.request({
      endpoint: 'user/profile',
      body: { name },
      method: 'PUT',
    })
      .then((session) => {
        this.setSession(session);
        this.closeDialogs();
      })
      .catch(() => {});
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
        const { status } = res;
        if (status < 200 || status >= 400) {
          throw new Error(status);
        }
        if ((res.headers.get('content-type') || '').indexOf('application/json') === 0) {
          return res.json();
        }
        return res.arrayBuffer();
      });
  }

  setSession(session) {
    const previous = this.profile && this.profile._id;
    this.session = session;
    if (session) {
      const { iat, exp, ...profile } = JSON.parse(atob(session.split('.')[1]));
      this.profile = profile;
      localStorage.setItem('realmsvr::session', session);
    } else {
      delete this.profile;
      localStorage.removeItem('realmsvr::session', session);
    }
    if (previous !== (this.profile && this.profile._id)) {
      this.dispatchEvent({ type: 'session' });
    }
  }

  setupRegisterDialog() {
    // This is maybe nuts.. but I'm feeling nostalgic today.
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    const close = document.createElement('div');
    close.className = 'close';
    close.innerText = '×';
    close.addEventListener('click', () => this.closeDialogs());
    wrapper.appendChild(close);

    const form = document.createElement('form');
    const nameLabel = document.createElement('label');
    nameLabel.innerText = 'Name';
    form.appendChild(nameLabel);
    const name = document.createElement('input');
    name.type = 'text';
    form.appendChild(name);
    const emailLabel = document.createElement('label');
    emailLabel.innerText = 'Email';
    form.appendChild(emailLabel);
    const email = document.createElement('input');
    email.type = 'email';
    form.appendChild(email);
    const passwordLabel = document.createElement('label');
    passwordLabel.innerText = 'Password';
    form.appendChild(passwordLabel);
    const password = document.createElement('input');
    password.type = 'password';
    form.appendChild(password);
    const confirmPasswordLabel = document.createElement('label');
    confirmPasswordLabel.innerText = 'Confirm password';
    form.appendChild(confirmPasswordLabel);
    const confirmPassword = document.createElement('input');
    confirmPassword.type = 'password';
    form.appendChild(confirmPassword);
    const submitWrapper = document.createElement('div');
    submitWrapper.className = 'submit';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.innerText = 'Create an account';
    submitWrapper.appendChild(submit);
    form.appendChild(submitWrapper);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (password.value !== confirmPassword.value) {
        return;
      }
      this.register({
        name: name.value,
        email: email.value,
        password: password.value,
      });
    });
    wrapper.appendChild(form);

    dialog.appendChild(wrapper);
    document.body.appendChild(dialog);
    this.dialogs.register = dialog;
  }

  setupRegisterGoogleDialog() {
    // This is maybe nuts.. but I'm feeling nostalgic today.
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    const close = document.createElement('div');
    close.className = 'close';
    close.innerText = '×';
    close.addEventListener('click', () => this.closeDialogs());
    wrapper.appendChild(close);

    const form = document.createElement('form');
    const nameLabel = document.createElement('label');
    nameLabel.innerText = 'Name';
    form.appendChild(nameLabel);
    const name = document.createElement('input');
    name.type = 'text';
    form.appendChild(name);
    dialog.nameInput = name;
    const submitWrapper = document.createElement('div');
    submitWrapper.className = 'submit';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.innerText = 'Save';
    submitWrapper.appendChild(submit);
    form.appendChild(submitWrapper);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateProfile({
        name: name.value,
      });
    });
    wrapper.appendChild(form);

    dialog.appendChild(wrapper);
    document.body.appendChild(dialog);
    this.dialogs.registerGoogle = dialog;
  }

  setupSessionDialog() {
    // This is maybe nuts.. but I'm feeling nostalgic today.
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    const close = document.createElement('div');
    close.className = 'close';
    close.innerText = '×';
    close.addEventListener('click', () => this.closeDialogs());
    wrapper.appendChild(close);

    const spacer = () => {
      const spacer = document.createElement('div');
      spacer.style.marginTop = '1.5rem';
      const or = document.createElement('div');
      or.innerText = 'or';
      spacer.appendChild(or);
      spacer.className = 'spacer';
      wrapper.appendChild(spacer);
    };

    const googleWrapper = document.createElement('div');
    googleWrapper.className = 'submit';
    const google = document.createElement('button');
    google.style.fontSize = '1.25em';
    google.innerText = 'Sign-In with Google';
    google.addEventListener('click', () => this.loginWithGoogle());
    googleWrapper.appendChild(google);
    wrapper.appendChild(googleWrapper);

    spacer();

    const form = document.createElement('form');
    const emailLabel = document.createElement('label');
    emailLabel.innerText = 'Email';
    form.appendChild(emailLabel);
    const email = document.createElement('input');
    email.type = 'email';
    form.appendChild(email);
    const passwordWrapper = document.createElement('div');
    passwordWrapper.style.display = 'none';
    email.addEventListener('input', () => {
      passwordWrapper.style.display = email.value.trim() ? '' : 'none';
    });
    const passwordLabel = document.createElement('label');
    passwordLabel.innerText = 'Password';
    passwordWrapper.appendChild(passwordLabel);
    const password = document.createElement('input');
    password.type = 'password';
    passwordWrapper.appendChild(password);
    form.appendChild(passwordWrapper);
    const submitWrapper = document.createElement('div');
    submitWrapper.className = 'submit';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.innerText = 'Sign-In with Email';
    submitWrapper.appendChild(submit);
    form.appendChild(submitWrapper);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.loginWithEmail({
        email: email.value,
        password: password.value,
      });
    });
    wrapper.appendChild(form);

    spacer();

    const registerWrapper = document.createElement('div');
    registerWrapper.className = 'submit';
    const register = document.createElement('div');
    register.style.color = '#aaa';
    register.style.cursor = 'pointer';
    register.style.textDecoration = 'underline';
    register.innerText = 'Create an account';
    register.addEventListener('click', () => this.showDialog('register'));
    registerWrapper.appendChild(register);
    wrapper.appendChild(registerWrapper);

    dialog.appendChild(wrapper);
    document.body.appendChild(dialog);
    this.dialogs.session = dialog;
  }

  closeDialogs() {
    const { dialogs } = this;
    Object.keys(dialogs).forEach((key) => (
      dialogs[key].classList.remove('open')
    ));
  }

  showDialog(dialog) {
    const { dialogs } = this;
    this.closeDialogs();
    dialogs[dialog].classList.add('open');
  }
}

export default Server;
