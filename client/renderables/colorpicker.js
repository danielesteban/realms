import {
  Color,
} from '../core/three.js';

class ColorPicker {
  constructor(ui) {
    const y = 32;
    const { width } = ui.renderer;
    const height = ui.renderer.height - y;
    this.color = new Color(Math.random() * 0xFFFFFF);
    this.area = {
      color: this.color.clone(),
      x: width * 0.05,
      y: y + height * 0.05,
      width: width * 0.75,
      height: height * 0.9,
    };
    this.strip = {
      x: width * 0.85,
      y: y + height * 0.05,
      width: width * 0.1,
      height: height * 0.9,
    };
    this.buttons = [
      {
        x: 0,
        y,
        width,
        height,
        isVisible: false,
        onPointer: () => {
          const { context: ctx, pointer } = ui;
          for (let i = 0; i < 2; i += 1) {
            const {
              x,
              y,
              width,
              height,
            } = i === 0 ? this.area : this.strip;
            if (
              pointer.x >= x
              && pointer.x <= x + width
              && pointer.y >= y
              && pointer.y <= y + height
            ) {
              const imageData = ctx.getImageData(pointer.x, pointer.y, 1, 1).data;
              this.color.setRGB(
                imageData[0] / 0xFF,
                imageData[1] / 0xFF,
                imageData[2] / 0xFF
              );
              if (i === 0) {
                const { tab, id } = this.value;
                const { input: { dom: { input } } } = ui.map.get(this.value.id);
                input.value = `#${this.color.getHexString()}`;
                ['input', 'change'].forEach((event) => (
                  ui.dispatchEvent({ type: event, id, value: this.color.getHex() })
                ));
                ui.setTab(tab);
              } else {
                this.area.color.copy(this.color);
                ui.draw();
              }
              break;
            }
          }
        },
      },
    ];
    this.graphics = [
      ({ ctx }) => {
        const {
          x,
          y,
          color,
          width,
          height,
        } = this.area;
        ctx.translate(x, y);
        ctx.fillStyle = `#${color.getHexString()}`;
        ctx.fillRect(0, 0, width, height);

        const grdWhite = ctx.createLinearGradient(0, 0, width, 0);
        grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
        grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grdWhite;
        ctx.fillRect(0, 0, width, height);

        const grdBlack = ctx.createLinearGradient(0, 0, 0, height);
        grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
        grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = grdBlack;
        ctx.fillRect(0, 0, width, height);
      },
      ({ ctx }) => {
        const {
          x,
          y,
          width,
          height,
        } = this.strip;
        ctx.translate(x, y);
        const grd = ctx.createLinearGradient(0, 0, 0, height);
        [
          '255,0,0',
          '255,0,255',
          '0,0,255',
          '0,255,255',
          '0,255,0',
          '255,255,0',
          '255,0,0',
        ].forEach((color, i) => {
          grd.addColorStop(Math.min(0.17 * i, 1), `rgb(${color})`);
        });
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
      },
    ];
    this.ui = ui;
  }

  setup({ tab, id, value }) {
    const { area, color } = this;
    color.set(value);
    area.color.copy(color);
    this.value = { id, tab };
  }
}

export default ColorPicker;
