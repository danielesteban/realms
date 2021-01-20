import {
  Color,
} from '../core/three.js';
import ColorPicker from './colorpicker.js';
import UI from './ui.js';

// WELCOME TO THE JUNGLE
// We got fun and games
// We got everything you want, honey, we know the names

// If you read pass this point you will prolly loose your sanity.
// Consider yourself notified.

// This is a bit of an experimental idea I'm still fleshing out.
// The main requirement in my mind at the time was to have a single UI update function
// and events for both the desktop and the VR UI. So far it's proven to work fine even though
// it's getting a bit crazy to mantain. This will prolly be rewritten into a more structured
// thingy once I'm confident that I have a good idea of what the UI needs really are.

class RealmUI extends UI {
  constructor() {
    super({});

    this.auxColor = new Color();

    const dom = document.createElement('div');
    dom.className = 'ui';
    document.body.appendChild(dom);
    this.dom = dom;

    this.map = new Map();
    this.requests = [];
    this.tabs = new Map();
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
    this.tabs.set('request', {
      buttons: [
        {
          x: 48,
          y: 138,
          width: 64,
          height: 44,
          label: 'Nope',
        },
        {
          x: 144,
          y: 138,
          width: 64,
          height: 44,
          label: 'Yep',
        },
      ],
      labels: [
        {
          x: 128,
          y: 96,
        },
      ],
    });
    this.tabs.set('select', {
      setup({ options, selected, onSelect }) {
        this.buttons = options.map(({ label, value }, i) => ({
          x: 16 + 76 * (i % 3),
          y: 90 + 32 * Math.floor(i / 3),
          label,
          width: 72,
          height: 26,
          isActive: value === selected,
          onPointer: () => onSelect(value),
        }));
      },
    });

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
          line: lineHeight * (tabId === 'meta' ? 1.5 : 1.8),
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
          button.x = button.x || left;
          button.y = tab.line;
          button.width = button.width || 224;
          button.height = lineHeight;
          tab.buttons.push(button);
          if (!button.sameLine) {
            tab.line += lineHeight * (button.lineHeight || 1);
          }
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
          if (options) {
            i.min = options.min;
            i.max = options.max;
            i.step = options.step;
          }
          i.value = value;
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

    const light = (tab, id, label, band, color) => {
      const w = document.createElement('div');
      w.style.marginBottom = '0.25rem';
      const l = document.createElement('div');
      l.appendChild(document.createTextNode(label));
      w.appendChild(l);
      const g = document.createElement('div');
      g.style.display = 'flex';
      const b = document.createElement('select');
      b.style.width = '55%';
      const options = [];
      ['Fixed', 'Band 1', 'Band 2', 'Band 3', 'Band 4', 'Band 5', 'Band 6', 'Band 7', 'Band 8'].forEach((v, i) => {
        const o = document.createElement('option');
        o.value = `${i}`;
        o.appendChild(document.createTextNode(v));
        b.appendChild(o);
        options.push({ label: v, value: `${i}` });
      });
      b.value = `${band}`;
      g.appendChild(b);
      const c = document.createElement('input');
      c.type = 'color';
      c.value = `#${this.auxColor.setHex(color).getHexString()}`;
      g.appendChild(c);
      w.appendChild(g);
      const dom = {
        wrapper: w,
        label: l,
        band: b,
        color: c,
      };
      const graphic = ({ ctx }) => {
        const { x, y, height } = canvas.buttons.color;
        ctx.fillStyle = c.value;
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.rect(x, y + 1, height - 2, height - 2);
        ctx.fill();
        ctx.stroke();
      };
      graphic.order = 'post';
      const canvas = {
        buttons: {
          band: {
            label: band === 0 ? 'F' : `B${band}`,
            lineHeight: 1.2,
            width: 34,
            sameLine: true,
            onPointer: () => {
              this.setTab('select', {
                options,
                selected: b.value,
                onSelect: (value) => {
                  b.value = value;
                  onUpdate('input')();
                  onUpdate('change')();
                  this.setTab(tab);
                },
              });
            },
          },
          color: {
            label,
            textAlign: 'left',
            textOffsetX: 30,
            lineHeight: 1.2,
            x: 50,
            width: 190,
            onPointer: () => {
              this.setTab('colorpicker', { tab, id, value: c.value });
            },
          },
        },
        color: graphic,
      };
      const onUpdate = (type) => () => {
        const band = parseInt(b.value, 10);
        canvas.buttons.band.label = band === 0 ? 'F' : `B${band}`;
        this.draw();
        this.dispatchEvent({
          type,
          id,
          value: {
            band,
            color: this.auxColor.set(c.value).getHex(),
          },
        });
      };
      ['input', 'change'].forEach((type) => {
        b.addEventListener(type, onUpdate(type), false);
        c.addEventListener(type, onUpdate(type), false);
      });
      add(
        tab, id, { light: { dom, canvas } },
        !canvas ? { dom: w } : {
          dom: w,
          buttons: [canvas.buttons.band, canvas.buttons.color],
          graphics: [canvas.color],
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
    input('brush', 'brushSize', 'SIZE', 'range', 1, { min: 1, max: 4, step: 1, noCanvas: true });
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

    light('lighting', 'light1', 'LIGHT CHANNEL 1', 0, 0);
    light('lighting', 'light2', 'LIGHT CHANNEL 2', 0, 0);
    light('lighting', 'light3', 'LIGHT CHANNEL 3', 0, 0);
    light('lighting', 'light4', 'LIGHT CHANNEL 4', 0, 0);
    light('lighting', 'background', 'BACKGROUND', 0, 0);
    light('lighting', 'ambient', 'AMBIENT LIGHT', 0, 0);

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
    const { tabs, tabButtons } = this;
    const tab = tabs.get(tabId);
    if (this.tab && this.tab.dispose) {
      this.tab.dispose();
    }
    this.tab = tab;
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
      const isActive = button.tab === tabId;
      button.background = isActive ? '#222' : undefined;
      button.border = isActive ? 'rgba(0,0,0,0)' : undefined;
    });
    this.buttons = [
      ...tabButtons,
      ...(buttons || []),
    ];
    this.graphics = graphics || [];
    this.labels = labels || [];
    this.sliders = sliders || [];
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
    const { requests, tabs } = this;
    const request = document.createElement('div');
    request.className = 'request';
    const question = document.createElement('div');
    question.className = 'question';
    question.innerText = `${name} wants to edit`;
    request.appendChild(question);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const dismiss = document.createElement('button');
    dismiss.innerText = 'Nope';
    dismiss.addEventListener('click', () => this.setTab('meta'));
    actions.appendChild(dismiss);
    const onClick = () => {
      onAllow();
      this.setTab('meta');
    };
    const allow = document.createElement('button');
    allow.innerText = 'Yep';
    allow.addEventListener('click', onClick);
    actions.appendChild(allow);
    request.appendChild(actions);
    document.body.appendChild(request);

    const tab = tabs.get('request');
    tab.dispose = () => {
      document.body.removeChild(request);
      requests.shift();
      if (requests.length) {
        this.renderRequest(requests[0]);
      }
    };
    {
      const { buttons: [nope, yep], labels: [question] } = tab;
      question.text = `${name} wants to edit`;
      nope.onPointer = () => this.setTab('meta');
      yep.onPointer = onClick;
    }
    this.setTab('request');
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
        const { info, input, light } = map.get(key);
        if (info) {
          info.dom.value.innerText = value;
          info.canvas.value.text = value;
        }
        if (light || input) {
          if (light) {
            light.dom.band.value = `${value.band}`;
            light.dom.color.value = `#${auxColor.setHex(value.color).getHexString()}`;
            light.canvas.buttons.band.label = value.band === 0 ? 'F' : `B${value.band}`;
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
          }
          this.dispatchEvent({
            type: 'input',
            id: key,
            value,
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
