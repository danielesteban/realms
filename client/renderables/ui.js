import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
  Vector3,
} from '../core/three.js';

// A general purpose UI class

class UI extends Mesh {
  static setupGeometry() {
    UI.geometry = new PlaneBufferGeometry(1, 1);
    UI.geometry.deleteAttribute('normal');
  }

  constructor({
    width = 0.4,
    height = 0.4,
    buttons = [],
    graphics = [],
    labels = [],
    sliders = [],
    styles = {},
    textureWidth = 256,
    textureHeight = 256,
  }) {
    if (!UI.geometry) {
      UI.setupGeometry();
    }
    styles = {
      background: '#222',
      color: '#fff',
      font: '700 18px monospace',
      textAlign: 'center',
      textBaseline: 'middle',
      ...styles,
      button: {
        background: '#333',
        border: '#000',
        color: '#fff',
        ...(styles.button || {}),
        active: {
          background: '#393',
          border: '#000',
          color: '#fff',
          ...(styles.button && styles.button.active ? styles.button.active : {}),
        },
        disabled: {
          background: '#222',
          border: '#000',
          color: '#777',
          ...(styles.button && styles.button.disabled ? styles.button.disabled : {}),
        },
      },
      slider: {
        background: '#333',
        border: '#000',
        color: '#393',
        ...(styles.slider || {}),
        disabled: {
          background: '#222',
          border: '#000',
          color: '#777',
          ...(styles.slider && styles.slider.disabled ? styles.slider.disabled : {}),
        },
      },
    };
    const renderer = document.createElement('canvas');
    renderer.width = textureWidth;
    renderer.height = textureHeight;
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    super(
      UI.geometry,
      new MeshBasicMaterial({
        map: texture,
      })
    );
    this.scale.set(width, height, 1);
    this.buttons = buttons;
    this.context = renderer.getContext('2d');
    this.graphics = graphics;
    this.labels = labels;
    this.pointer = new Vector3();
    this.renderer = renderer;
    this.sliders = sliders;
    this.styles = styles;
    this.texture = texture;
    this.draw();
  }

  dispose() {
    const { material, texture } = this;
    material.dispose();
    texture.dispose();
  }

  draw() {
    const {
      buttons,
      context: ctx,
      graphics,
      labels,
      renderer,
      sliders,
      styles,
      texture,
    } = this;
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = styles.background;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    graphics.filter(({ order }) => (!order || order === 'pre')).forEach((draw) => {
      ctx.save();
      draw({ ctx, styles });
      ctx.restore();
    });
    buttons.forEach(({
      label,
      x,
      y,
      width,
      height,
      background,
      border,
      color,
      font,
      textAlign,
      textBaseline,
      textOffsetX,
      textOffsetY,
      isActive,
      isDisabled,
      isVisible,
    }) => {
      if (isVisible === false) {
        return;
      }
      let { button } = styles;
      if (isActive) {
        button = styles.button.active;
      } else if (isDisabled) {
        button = styles.button.disabled;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.fillStyle = background || button.background;
      ctx.strokeStyle = border || button.border;
      ctx.fill();
      ctx.stroke();
      if (label) {
        ctx.fillStyle = color || button.color;
        ctx.font = font || button.font || styles.font;
        ctx.textAlign = textAlign || button.textAlign || styles.textAlign;
        ctx.textBaseline = textBaseline || button.textBaseline || styles.textBaseline;
        ctx.fillText(
          label,
          textOffsetX !== undefined ? textOffsetX : (width * 0.5),
          textOffsetY !== undefined ? textOffsetY : (height * 0.5 + 1)
        );
      }
      ctx.restore();
    });
    labels.forEach(({
      x,
      y,
      color,
      font,
      text,
      textAlign,
      textBaseline,
      isVisible,
    }) => {
      if (isVisible === false || !text) {
        return;
      }
      ctx.save();
      ctx.fillStyle = color || styles.color;
      ctx.font = font || styles.font;
      ctx.textAlign = textAlign || styles.textAlign;
      ctx.textBaseline = textBaseline || styles.textBaseline;
      ctx.fillText(text, x, y);
      ctx.restore();
    });
    sliders.forEach(({
      x,
      y,
      width,
      height,
      background,
      border,
      color,
      value,
      isDisabled,
      isVisible,
    }) => {
      if (isVisible === false) {
        return;
      }
      const slider = isDisabled ? styles.slider.disabled : styles.slider;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 4, width, height - 8);
      ctx.fillStyle = background || slider.background;
      ctx.strokeStyle = border || slider.border;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color || slider.color;
      const thumb = height * 0.5;
      const thumbX = Math.min(Math.max(width * value, thumb * 0.5), width - thumb * 0.5);
      ctx.fillRect(0, 5, thumbX, height - 10);
      ctx.beginPath();
      ctx.arc(
        thumbX,
        height * 0.5,
        thumb,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    graphics.filter(({ order }) => (order === 'post')).forEach((draw) => {
      ctx.save();
      draw({ ctx, styles });
      ctx.restore();
    });
    texture.needsUpdate = true;
  }

  onPointer(point) {
    const {
      buttons,
      pointer,
      renderer,
      sliders,
    } = this;
    this.worldToLocal(pointer.copy(point));
    pointer.set(
      (pointer.x + 0.5) * renderer.width,
      (1 - (pointer.y + 0.5)) * renderer.height,
      0
    );
    for (let i = buttons.length - 1; i >= 0; i -= 1) {
      const {
        isDisabled,
        x,
        y,
        width,
        height,
        onPointer,
      } = buttons[i];
      if (
        !isDisabled
        && onPointer
        && pointer.x >= x
        && pointer.x <= x + width
        && pointer.y >= y
        && pointer.y <= y + height
      ) {
        onPointer();
        break;
      }
    }
    for (let i = sliders.length - 1; i >= 0; i -= 1) {
      const {
        isDisabled,
        x,
        y,
        width,
        height,
        onChange,
        onInput,
      } = sliders[i];
      if (
        !isDisabled
        && (onChange || onInput)
        && pointer.x >= x
        && pointer.x <= x + width
        && pointer.y >= y
        && pointer.y <= y + height
      ) {
        const value = (pointer.x - x) / width;
        sliders[i].value = value;
        if (onChange) onChange(value);
        if (onInput) onInput(value);
        break;
      }
    }
  }
}

export default UI;
