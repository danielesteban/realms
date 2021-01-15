import {
  Color,
} from '../core/three.js';
import ColorPicker from './colorpicker.js';
import UI from './ui.js';

class RealmUI extends UI {
  constructor() {
    super({});

    this.auxColor = new Color();

    const dom = document.createElement('div');
    dom.className = 'ui';
    document.body.appendChild(dom);
    this.dom = dom;

    this.map = new Map();
    this.tabs = new Map();
    this.tabsGraphics = [
      ({ ctx }) => {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 256, 32);
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(0, 32);
        ctx.lineTo(256, 32);
        ctx.stroke();
      },
    ];
    this.tabButtons = [
      { id: 'meta', name: 'INFO' },
      { id: 'brush', name: 'BRUSH' },
      { id: 'lighting', name: 'LIGHTS' },
    ].map(({ id, name }, i) => ({
      x: i * 85,
      y: 0,
      width: 85 + (i === 2 ? 1 : 0),
      height: 32,
      label: name,
      tab: id,
      onPointer: () => this.setTab(id),
    }));
    this.tabs.set('colorpicker', new ColorPicker(this));

    const lineHeight = 26;

    const add = (tabId, id, nodes, render) => {
      const current = this.map.get(id) || {};
      this.map.set(id, { ...current, ...nodes });
      let tab = this.tabs.get(tabId);
      if (!tab) {
        tab = {
          dom: document.createElement('div'),
          buttons: [],
          graphics: [],
          labels: [],
          sliders: [],
          line: lineHeight * 1.5,
        };
        tab.dom.style.marginBottom = '1.5rem';
        if (tabId !== 'meta') {
          tab.dom.style.display = 'none';
        }
        this.dom.appendChild(tab.dom);
        this.tabs.set(tabId, tab);
      }
      tab.dom.appendChild(render.dom);
      const left = 16;
      const center = this.renderer.width * 0.5;
      if (render.graphics) {
        render.graphics.forEach((graphic) => {
          tab.graphics.push(graphic);
        });
      }
      if (render.labels) {
        render.labels.forEach((label) => {
          if (label.textAlign === 'left') {
            label.x = left;
          } else {
            label.x = center;
          }
          label.y = tab.line + lineHeight * 0.5;
          tab.labels.push(label);
          tab.line += lineHeight;
        });
      }
      if (render.buttons) {
        render.buttons.forEach((button) => {
          button.x = left;
          button.y = tab.line;
          button.width = 224;
          button.height = lineHeight;
          tab.buttons.push(button);
          tab.line += lineHeight * (button.lineHeight || 1);
        });
      }
      if (render.buttonGroups) {
        render.buttonGroups.forEach((buttons) => {
          const size = (this.renderer.width - left * 2) / buttons.length;
          buttons.forEach((button, i) => {
            button.x = left + i * size;
            button.y = tab.line;
            button.width = size;
            button.height = lineHeight;
            tab.buttons.push(button);
          });
          tab.line += lineHeight;
        });
      }
      if (render.sliders) {
        render.sliders.forEach((slider) => {
          slider.x = left;
          slider.y = tab.line;
          slider.width = 224;
          slider.height = lineHeight;
          tab.sliders.push(slider);
          tab.line += lineHeight;
        });
      }
    };

    const info = (tab, id, label, value) => {
      const w = document.createElement('div');
      w.style.marginBottom = '0.25rem';
      const l = document.createElement('div');
      l.appendChild(document.createTextNode(label));
      w.appendChild(l);
      const v = document.createElement('div');
      v.style.color = '#999';
      v.style.marginTop = '0.125rem';
      v.appendChild(document.createTextNode(value));
      w.appendChild(v);
      const dom = { wrapper: w, label: l, value: v };
      const canvas = {
        label: {
          text: label,
          textAlign: 'left',
        },
        value: {
          text: value,
          color: '#999',
          textAlign: 'left',
        },
      };
      add(tab, id, { info: { dom, canvas } }, { dom: w, labels: [canvas.label, canvas.value] });
    };

    const button = (tab, id, label, isActive) => {
      const onPointer = () => (
        this.dispatchEvent({ type: 'button', id })
      );
      const w = document.createElement('div');
      w.style.marginBottom = '0.25rem';
      const b = document.createElement('button');
      if (isActive) {
        b.className = 'primary';
      }
      b.style.width = '100%';
      b.appendChild(document.createTextNode(label));
      b.addEventListener('click', onPointer, false);
      w.appendChild(b);
      const dom = { wrappper: w, button: b };
      const canvas = {
        button: {
          label,
          isActive,
          onPointer,
        },
      };
      add(tab, id, { button: { dom, canvas } }, { dom: w, buttons: [canvas.button] });
    };

    const buttonGroup = (tab, id, label, buttons, value, options = {}) => {
      const w = document.createElement('div');
      w.style.marginBottom = '0.25rem';
      const l = document.createElement('div');
      l.appendChild(document.createTextNode(label));
      w.appendChild(l);
      const b = document.createElement('div');
      b.style.margin = '0.25rem 0';
      b.style.display = 'flex';
      const group = { dom: [], canvas: [] };
      buttons.forEach(({ label, key }, i) => {
        const button = document.createElement('button');
        button.key = key;
        button.style.width = '100%';
        if (key === value) {
          button.className = 'primary';
        }
        let br = '0';
        if (i === 0) br = '4px 0 0 4px';
        else if (i === buttons.length - 1) br = '0 4px 4px 0';
        button.style.borderRadius = br;
        button.style.fontSize = '0.6rem';
        button.style.padding = '0.2rem';
        if (i > 0) {
          button.style.borderLeft = '1px solid #111';
        }
        label.forEach((line) => {
          const div = document.createElement('div');
          div.appendChild(document.createTextNode(line));
          button.appendChild(div);
        });
        b.appendChild(button);
        group.dom.push(button);
        const onClick = () => {
          group.dom.forEach((b, i) => {
            b.className = '';
            if (!options.noCanvas) {
              group.canvas[i].isActive = false;
            }
          });
          button.className = 'primary';
          if (!options.noCanvas) {
            group.canvas[i].isActive = true;
            this.draw();
          }
          ['input', 'change'].forEach((event) => (
            this.dispatchEvent({ type: event, id, value: button.key })
          ));
        };
        button.addEventListener('click', onClick);
        if (!options.noCanvas) {
          group.canvas.push({
            label: label[label.length - 1],
            font: '700 10px monospace',
            isActive: key === value,
            onPointer: onClick,
          });
        }
      });
      w.appendChild(b);
      const dom = { wrapper: w, buttons: group.dom, label: l };
      let canvas = false;
      if (!options.noCanvas) {
        canvas = {
          buttons: group.canvas,
          label: {
            text: label,
            textAlign: 'left',
          },
        };
      }
      add(
        tab, id, { input: { dom, canvas } },
        !canvas ? { dom: w } : {
          dom: w,
          buttonGroups: [canvas.buttons],
          labels: [canvas.label],
        }
      );
    };

    const input = (tab, id, label, type, value, options = {}) => {
      const w = document.createElement('div');
      w.style.marginBottom = '0.25rem';
      if (options.hidden) {
        w.style.display = 'none';
      }
      const l = document.createElement('div');
      l.style.display = 'flex';
      l.appendChild(document.createTextNode(label));
      w.appendChild(l);
      const i = document.createElement('input');
      i.style.width = '100%';
      i.type = type;
      let d;
      switch (type) {
        case 'color':
          i.value = `#${this.auxColor.setHex(value).getHexString()}`;
          break;
        case 'range':
          d = document.createElement('div');
          d.style.marginLeft = 'auto';
          d.innerText = value;
          l.appendChild(d);
          i.value = value;
          if (options) {
            i.min = options.min;
            i.max = options.max;
            i.step = options.step;
          }
          break;
        default:
          i.value = value;
          break;
      }
      w.appendChild(i);
      const dom = {
        wrapper: w,
        label: l,
        input: i,
        display: d,
      };
      let canvas = false;
      if (!options.noCanvas) {
        switch (type) {
          case 'color': {
            const graphic = ({ ctx }) => {
              const { x, y, height } = canvas.button;
              ctx.fillStyle = i.value;
              ctx.fillRect(x + 1, y + 1, height - 2, height - 2);
            };
            graphic.order = 'post';
            canvas = {
              button: {
                label,
                textAlign: 'left',
                textOffsetX: 36,
                lineHeight: 1.2,
                onPointer: () => {
                  this.setTab('colorpicker', { tab, id, value: i.value });
                },
              },
              color: graphic,
            };
            break;
          }
          case 'range': {
            const scaleValue = (value) => {
              let v = (value * (options.max - options.min));
              v -= v % options.step;
              v += options.min;
              v = Math.floor(v * 100) / 100;
              return v;
            };
            canvas = {
              label: {
                text: label,
                textAlign: 'left',
              },
              slider: {
                value: (i.value - options.min) / (options.max - options.min),
                onChange: (value) => {
                  const v = scaleValue(value);
                  i.value = v;
                  onUpdate({ type: 'change', value: v });
                },
                onInput: (value) => {
                  const v = scaleValue(value);
                  i.value = v;
                  onUpdate({ type: 'input', value: v });
                },
              },
            };
            break;
          }
          default:
            canvas = {
              label: {
                text: label,
                textAlign: 'left',
              },
              value: {
                text: i.value,
                color: '#999',
                textAlign: 'left',
              },
            };
            break;
        }
      }
      const onUpdate = ({ type, value }) => {
        if (d) {
          d.innerText = value;
        }
        switch (i.type) {
          case 'color':
            value = this.auxColor.set(value).getHex();
            break;
          case 'range':
            value = parseFloat(value);
            break;
          default:
            break;
        }
        if (canvas) {
          if (canvas.slider) {
            canvas.slider.value = (value - options.min) / (options.max - options.min);
          }
          if (canvas.value) {
            canvas.value.text = `${value}`;
          }
          this.draw();
        }
        this.dispatchEvent({ type, id, value });
      };
      ['input', 'change'].forEach((type) => (
        i.addEventListener(type, ({ target: { value } }) => onUpdate({ type, value }), false)
      ));
      add(
        tab, id, { input: { dom, canvas } },
        !canvas ? { dom: w } : {
          dom: w,
          buttons: [...(canvas.button ? [canvas.button] : [])],
          graphics: [...(canvas.color ? [canvas.color] : [])],
          labels: [
            ...(canvas.label ? [canvas.label] : []),
            ...(canvas.value ? [canvas.value] : []),
          ],
          sliders: [...(canvas.slider ? [canvas.slider] : [])],
        }
      );
    };

    this.help = [];
    const help = (text, onlyEdit) => {
      const div = document.createElement('div');
      div.style.display = onlyEdit ? 'none' : '';
      div.style.marginBottom = '0.25rem';
      div.style.color = '#999';
      div.appendChild(document.createTextNode(text));
      this.dom.appendChild(div);
      div.onlyEdit = onlyEdit;
      this.help.push(div);
    };

    input('meta', 'name', 'TITLE', 'text', '···', { hidden: true, noCanvas: true });
    info('meta', 'name', 'TITLE', '···');
    info('meta', 'creator', 'CREATOR', '···');

    button('meta', 'menu', 'Browse realms', true);
    button('meta', 'fork', 'Make a copy');
    button('meta', 'create', 'Create new');
    button('meta', 'session', 'Sign-In');

    input('brush', 'brushColor', 'COLOR', 'color', 0xFFFFFF);
    input('brush', 'brushNoise', 'NOISE', 'range', 0.15, { min: 0, max: 1, step: 0.01 });
    input('brush', 'brushSize', 'SIZE', 'range', 1, { min: 1, max: 5, step: 1, noCanvas: true });
    buttonGroup('brush', 'brushShape', 'SHAPE', [
      { label: ['BOX'], key: 'box' },
      { label: ['SPHERE'], key: 'sphere' },
    ], 'box', { noCanvas: true });
    buttonGroup('brush', 'blockType', 'TYPE', [
      { label: ['1', 'Block'], key: 0 },
      { label: ['2', 'Light1'], key: 1 },
      { label: ['3', 'Light2'], key: 2 },
      { label: ['4', 'Light3'], key: 3 },
      { label: ['5', 'Light4'], key: 4 },
    ], 0);

    input('lighting', 'light1', 'LIGHT CHANNEL 1', 'color', 0);
    input('lighting', 'light2', 'LIGHT CHANNEL 2', 'color', 0);
    input('lighting', 'light3', 'LIGHT CHANNEL 3', 'color', 0);
    input('lighting', 'light4', 'LIGHT CHANNEL 4', 'color', 0);
    input('lighting', 'background', 'BACKGROUND', 'color', 0);
    input('lighting', 'ambient', 'AMBIENT LIGHT', 'color', 0);

    help('left click: place blocks', true);
    help('right click: remove blocks', true);
    help('middle click: pick block', true);
    help('12345: set brush type', true);
    help('wasd: move around');
    help('spacebar: move up');
    help('shift: move down');

    this.setTab('meta');

    this.onKeyDown = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.onKeyDown, false);

    this.position.set(-0.02, -0.02, 0);
    this.rotation.set(0, Math.PI * -0.5, Math.PI * 0.5);
    this.scale.set(0.3, 0.3, 1);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
  }

  dispose() {
    const { dom } = this;
    super.dispose();
    document.body.removeChild(dom);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown({ keyCode, repeat }) {
    const { map } = this;
    if (repeat) return;
    switch (keyCode) {
      case 49:
      case 50:
      case 51:
      case 52:
      case 53: {
        const { input: { dom } } = map.get('blockType');
        dom.buttons[keyCode - 49].click();
        break;
      }
      default:
        break;
    }
  }

  setTab(tabId, options) {
    const { tabs, tabButtons, tabsGraphics } = this;
    const tab = tabs.get(tabId);
    if (tab.setup) {
      tab.setup(options);
    }
    const {
      buttons,
      graphics,
      labels,
      sliders,
    } = tab;
    tabButtons.forEach((button) => {
      button.isActive = button.tab === tabId;
    });
    this.buttons = [
      ...tabButtons,
      ...buttons,
    ];
    this.graphics = [...tabsGraphics, ...graphics];
    this.labels = labels;
    this.sliders = sliders;
    this.draw();
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
    const {
      auxColor,
      map,
      tabs,
      tabButtons,
      help,
    } = this;
    Object.keys(meta).forEach((key) => {
      const value = meta[key];
      if (map.has(key)) {
        const { info, input } = map.get(key);
        if (info) {
          info.dom.value.innerText = value;
          info.canvas.value.text = value;
        }
        if (input) {
          if (input.dom.display) {
            input.dom.display.innerText = value;
          }
          if (input.dom.input) {
            switch (input.dom.input.type) {
              case 'color':
                input.dom.input.value = `#${auxColor.setHex(value).getHexString()}`;
                break;
              default:
                input.dom.input.value = value;
                break;
            }
            if (input.canvas && input.canvas.value) {
              input.canvas.value.text = input.dom.input.value;
            }
          }
          if (input.dom.buttons) {
            input.dom.buttons.forEach((button, i) => {
              const isActive = button.key === value;
              button.className = isActive ? 'primary' : '';
              if (input.canvas && input.canvas.buttons) {
                input.canvas.buttons[i].isActive = isActive;
              }
            });
          }
          this.dispatchEvent({
            type: 'input',
            id: key,
            value: meta[key],
          });
        }
      }
      if (key === 'canEdit') {
        const editTabs = ['brush', 'lighting'];
        editTabs.forEach((tab) => {
          const { dom } = tabs.get(tab);
          dom.style.display = !value ? 'none' : '';
        });
        tabButtons.forEach((button) => {
          button.isDisabled = !value && editTabs.includes(button.tab);
        });
        help.forEach((div) => {
          div.style.display = (!value && div.onlyEdit) || (value && !div.onlyEdit) ? 'none' : '';
        });
      }
      if (key === 'hasSession') {
        const { button } = map.get('session');
        const text = meta.hasSession ? 'Sign-Out' : 'Sign-In';
        button.dom.button.innerText = text;
        button.canvas.button.label = text;
      }
      if (key === 'isCreator') {
        const { info, input } = map.get('name');
        info.dom.wrapper.style.display = value ? 'none' : '';
        input.dom.wrapper.style.display = value ? '' : 'none';
      }
    });
    this.draw();
  }
}

export default RealmUI;
