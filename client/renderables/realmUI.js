import {
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
  Vector3,
} from '../core/three.js';

// TODO: Make this class extend from the UI class
//       Once I decide how to go about the VR canvas UI

class RealmUI extends Mesh {
  static setupGeometry() {
    RealmUI.geometry = new PlaneBufferGeometry(1, 1);
    RealmUI.geometry.deleteAttribute('normal');
  }

  constructor() {
    if (!RealmUI.geometry) {
      RealmUI.setupGeometry();
    }
    const textureWidth = 128;
    const textureHeight = 128;
    const dom = document.createElement('div');
    dom.className = 'ui';
    document.body.appendChild(dom);
    const renderer = document.createElement('canvas');
    renderer.width = textureWidth;
    renderer.height = textureHeight;
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    super(
      RealmUI.geometry,
      new MeshBasicMaterial({
        map: texture,
        transparent: true,
      })
    );
    this.auxColor = new Color();
    this.context = renderer.getContext('2d');
    this.dom = dom;
    this.pointer = new Vector3();
    this.renderer = renderer;
    this.styles = {
      background: 'rgba(0, 0, 0, .2)',
      color: '#fff',
      font: '700 14px monospace',
      textAlign: 'center',
      textBaseline: 'middle',
    };
    this.texture = texture;

    this.drawList = [];
    this.requests = [];
    this.buttons = new Map();
    this.inputs = new Map();
    this.labels = new Map();
    this.help = [];
    const button = (id, label, isActive) => {
      const div = document.createElement('div');
      div.style.marginBottom = '0.25rem';
      const button = document.createElement('button');
      if (isActive) {
        button.className = 'primary';
      }
      button.style.width = '100%';
      button.innerText = label;
      button.onclick = () => {
        this.dispatchEvent({ type: 'button', id });
      };
      div.appendChild(button);
      this.dom.appendChild(div);
      // TODO: Create canvas counterpart
      const canvas = { todo: 'Button on canvas' };
      this.drawList.push(canvas);
      this.buttons.set(id, { button, canvas });
    };
    const buttonGroup = (id, label, buttons) => {
      const div = document.createElement('div');
      div.style.marginBottom = '0.25rem';
      div.style.display = 'none';
      const name = document.createElement('div');
      name.appendChild(document.createTextNode(label));
      div.appendChild(name);
      const wrapper = document.createElement('div');
      wrapper.style.margin = '0.25rem 0';
      wrapper.style.display = 'flex';
      const group = buttons.map((lines, i) => {
        const button = document.createElement('button');
        button.style.width = '100%';
        let br = '0';
        if (i === 0) br = '4px 0 0 4px';
        else if (i === buttons.length - 1) br = '0 4px 4px 0';
        button.style.borderRadius = br;
        button.style.fontSize = '0.6rem';
        button.style.padding = '0.2rem';
        if (i === 0) {
          button.className = 'primary';
        } else {
          button.style.borderLeft = '1px solid #111';
        }
        button.onclick = () => {
          group.forEach(({ button: b }) => { b.className = ''; });
          button.className = 'primary';
          this.dispatchEvent({ type: 'button', id, index: i });
        };
        lines.forEach((line) => {
          const div = document.createElement('div');
          div.appendChild(document.createTextNode(line));
          button.appendChild(div);
        });
        // TODO: Create canvas counterpart
        const canvas = { todo: 'Button on canvas' };
        this.drawList.push(canvas);
        wrapper.appendChild(button);
        return { button, canvas };
      });
      div.appendChild(wrapper);
      this.dom.appendChild(div);
      this.buttons.set(id, group);
    };
    const input = (id, label, type, options) => {
      const div = document.createElement('div');
      div.style.marginBottom = '0.25rem';
      div.style.display = 'none';
      const name = document.createElement('div');
      name.style.display = 'flex';
      name.appendChild(document.createTextNode(label));
      div.appendChild(name);
      const input = document.createElement('input');
      input.style.width = '100%';
      input.type = type;
      let valueDisplay;
      ['input', 'change'].forEach((type) => (
        input.addEventListener(type, ({ target: { value } }) => {
          switch (input.type) {
            case 'color':
              value = this.auxColor.set(value).getHex();
              break;
            case 'range':
              value = parseFloat(value);
              break;
            default:
              break;
          }
          if (valueDisplay) {
            valueDisplay.innerText = value;
          }
          // TODO: Update canvas counterpart
          this.dispatchEvent({ type, id, value });
        })
      ));
      switch (input.type) {
        case 'color':
          input.value = '#ffffff';
          break;
        case 'range':
          valueDisplay = document.createElement('div');
          valueDisplay.style.marginLeft = 'auto';
          if (options) {
            input.min = options.min;
            input.max = options.max;
            input.step = options.step;
            input.value = options.value;
          }
          valueDisplay.innerText = options.value;
          name.appendChild(valueDisplay);
        default:
          break;
      }
      div.appendChild(input);
      this.dom.appendChild(div);
      // TODO: Create canvas counterpart
      const canvas = { todo: 'Input on canvas' };
      this.drawList.push(canvas);
      this.inputs.set(id, { input, value: valueDisplay, canvas });
    };
    const label = (id, text) => {
      const div = document.createElement('div');
      const name = document.createElement('div');
      name.appendChild(document.createTextNode(text));
      div.appendChild(name);
      const label = document.createElement('div');
      label.style.color = '#999';
      label.style.marginTop = '0.125rem';
      label.innerHTML = '&nbsp;';
      div.appendChild(label);
      this.dom.appendChild(div);
      // TODO: Create canvas counterpart
      const canvas = { todo: 'Label on canvas' };
      this.drawList.push(canvas);
      this.labels.set(id, { label, canvas });
    };
    const help = (text, onlyEdit) => {
      const div = document.createElement('div');
      div.style.display = onlyEdit ? 'none' : '';
      div.style.marginBottom = '0.25rem';
      div.style.color = '#999';
      div.innerText = text;
      this.dom.appendChild(div);
      div.onlyEdit = onlyEdit;
      this.help.push(div);
    };
    const spacer = () => {
      const div = document.createElement('div');
      div.style.height = '1rem';
      this.dom.appendChild(div);
      // TODO: Create canvas counterpart
      const canvas = { todo: 'spacer on canvas' };
      this.drawList.push(canvas);
    };

    input('name', 'TITLE', 'text');
    label('name', 'TITLE', '');
    label('creator', 'CREATOR');

    spacer();

    button('menu', 'Browse realms', true);
    button('fork', 'Make a copy');
    button('create', 'Create new');
    button('session', 'Sign-In');

    spacer();

    input('brushColor', 'BRUSH', 'color');
    input('brushNoise', 'NOISE', 'range', { min: 0, max: 1, step: 0.01, value: 0.2 });
    input('brushSize', 'SIZE', 'range', { min: 1, max: 5, step: 1, value: 1 });
    buttonGroup('brushShape', 'SHAPE', [
      ['BOX'],
      ['SPHERE'],
    ]);
    buttonGroup('blockType', 'TYPE', [
      ['1', 'Block'],
      ['2', 'Light1'],
      ['3', 'Light2'],
      ['4', 'Light3'],
      ['5', 'Light4'],
    ]);

    spacer();

    input('light1', 'LIGHT CHANNEL 1', 'color');
    input('light2', 'LIGHT CHANNEL 2', 'color');
    input('light3', 'LIGHT CHANNEL 3', 'color');
    input('light4', 'LIGHT CHANNEL 4', 'color');
    input('background', 'BACKGROUND', 'color');
    input('ambient', 'AMBIENT LIGHT', 'color');
    
    spacer();

    help('left click: place blocks', true);
    help('right click: remove blocks', true);
    help('middle click: pick block', true);
    help('mouse wheel: set brush size', true);
    help('12345: set brush type', true);
    help('wasd: move around');
    help('spacebar: move up');
    help('shift: move down');

    this.position.set(-0.02, -0.02, 0);
    this.rotation.set(0, Math.PI * -0.5, Math.PI * 0.5);
    this.scale.set(0.3, 0.3, 1);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.draw();
  }

  dispose() {
    const { dom, material, texture } = this;
    document.body.removeChild(dom);
    material.dispose();
    texture.dispose();
  }

  draw() {
    const {
      context: ctx,
      renderer,
      styles,
    } = this;
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = styles.background;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    // TODO!!
    ctx.fillStyle = styles.color;
    ctx.font = styles.font;
    ctx.textAlign = styles.textAlign;
    ctx.textBaseline = styles.textBaseline;
    ctx.fillText('VR UI', renderer.width * 0.5, renderer.height * 0.4);
    ctx.fillText('COMING SOON!', renderer.width * 0.5, renderer.height * 0.6);
  }

  showRequest(request) {
    const { requests } = this;
    if (requests.length) {
      if (!requests.find(({ peer }) => (peer === request.peer))) {
        requests.push(request);
      }
      return;
    }
    requests.push(request);
    this.renderRequest(request);
  }

  renderRequest({ name, onAllow }) {
    const { requests } = this;
    const request = document.createElement('div');
    request.className = 'request';
    const question = document.createElement('div');
    question.className = 'question';
    question.innerText = `${name} wants to edit`;
    request.appendChild(question);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const onClose = () => {
      document.body.removeChild(request);
      requests.shift();
      if (requests.length) {
        this.renderRequest(requests[0]);
      }
    };
    const dismiss = document.createElement('button');
    dismiss.innerText = 'Nope';
    dismiss.addEventListener('click', onClose);
    actions.appendChild(dismiss);
    const allow = document.createElement('button');
    allow.innerText = 'Yep';
    allow.addEventListener('click', () => {
      onAllow();
      onClose();
    });
    actions.appendChild(allow);
    request.appendChild(actions);
    document.body.appendChild(request);
    // TODO: Implement canvas counterpart
  }

  update(meta) {
    const { auxColor, buttons, help, inputs, labels } = this;
    Object.keys(meta).forEach((key) => {
      if (inputs.has(key)) {
        const { input, value/* , canvas */ } = inputs.get(key);
        switch (input.type) {
          case 'color':
            input.value = `#${auxColor.setHex(meta[key]).getHexString()}`;
            break;
          default:
            input.value = meta[key];
            break;
        }
        if (value) {
          value.innerText = meta[key];
        }
        // TODO: Update canvas counterpart
        this.dispatchEvent({
          type: 'input',
          id: key,
          value: meta[key],
        });
      }
      if (labels.has(key)) {
        const { label/* , canvas */ } = labels.get(key);
        label.innerText = meta[key];
        // TODO: Update canvas counterpart
      }
    });
    if (meta.blockType !== undefined) {
      buttons.get('blockType').forEach(({ button/* , canvas */ }, i) => {
        button.className = meta.blockType === i  ? 'primary' : '';
        // TODO: Update canvas counterpart
      });
    }
    if (meta.canEdit !== undefined) {
      [...buttons.entries()].forEach(([id, group]) => {
        if (Array.isArray(group)) {
          const canEdit = id === 'name' ? meta.isCreator : meta.canEdit;
          const button = group[0].button;
          button.parentNode.parentNode.style.display = canEdit ? '' : 'none';
          // TODO: Update canvas counterpart
        }
      });
      [...inputs.entries()].forEach(([id, { input/* , canvas */ }]) => {
        const canEdit = id === 'name' ? meta.isCreator : meta.canEdit;
        input.parentNode.style.display = canEdit ? '' : 'none';
        // TODO: Update canvas counterpart
      });
      {
        const { label/* , canvas */ } = labels.get('name');
        label.parentNode.style.display = meta.isCreator ? 'none' : '';
        // TODO: Update canvas counterpart
      }
      help.forEach((div) => {
        div.style.display = (div.onlyEdit && !meta.canEdit) || (!div.onlyEdit && meta.canEdit) ? 'none' : '';
      });
    }
    if (meta.hasSession !== undefined) {
      const { button/* , canvas */ } = buttons.get('session');
      button.innerText = meta.hasSession ? 'Sign-Out' : 'Sign-In';
      // TODO: Update canvas counterpart
    }
    this.draw();
  }
}

export default RealmUI;
