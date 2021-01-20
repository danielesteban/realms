class Visualizer {
  constructor() {
    const renderer = document.createElement('canvas');
    renderer.style.marginBottom = '1.25rem';
    renderer.width = 200;
    renderer.height = 50;
    this.bar = {
      y: renderer.height / Visualizer.steps,
    };
    this.bar.h = this.bar.y * 0.8;
    this.bar.oy = (this.bar.y - this.bar.h) * 0.5;
    this.context = renderer.getContext('2d');
    this.gradients = {
      on: this.context.createLinearGradient(0, 0, 0, renderer.height),
      off: this.context.createLinearGradient(0, 0, 0, renderer.height),
    };
    this.gradients.on.addColorStop(0, 'rgba(51, 153, 51, 1)');
    this.gradients.on.addColorStop(1, 'rgba(51, 153, 51, 0)');
    this.gradients.off.addColorStop(0, 'rgba(0, 0, 0, 0.125)');
    this.gradients.off.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    this.renderer = renderer;
  }

  update(bins) {
    const { bar, context: ctx, gradients, renderer } = this;
    const { on, off } = gradients;
    const { width, height } = renderer;
    const { steps } = Visualizer;
    bar.x = width / bins.length;
    bar.w = bar.x * 0.9;
    bar.ox = (bar.x - bar.w) * 0.5;
    ctx.clearRect(0, 0, width, height);
    bins.forEach((value, i) => {
      const step = Math.round(steps * value);
      for (let j = 0; j < steps; j += 1) {
        ctx.fillStyle = j < step ? on : off;
        ctx.fillRect(
          bar.x * i + bar.ox,
          height - (bar.y * (j + 1) + bar.oy),
          bar.w,
          bar.h
        );
      }
    });
  }
}

Visualizer.steps = 16;

export default Visualizer;
