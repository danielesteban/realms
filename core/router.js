import { EventDispatcher } from './three.js';

const { location } = document;
const { history } = window;

class Router extends EventDispatcher {
  constructor() {
    super();
    window.addEventListener('popstate', this.update.bind(this));
  }

  init() {
    if (location.hash) {
      history.replaceState({}, '', location.hash.substr(1));
    }
    this.update();
  }

  push(path) {
    if (location.pathname !== path) {
      history.pushState({}, '', path);
      this.update();
    }
  }

  replace(path) {
    if (location.pathname !== path) {
      history.replaceState({}, '', path);
      this.update();
    }
  }

  update() {
    const slug = location.pathname.substr(1).split('/').map((value) => (
      decodeURIComponent(value.trim())
    ))[0];
    this.dispatchEvent({
      type: 'update',
      slug,
    });
  }
}

export default Router;
