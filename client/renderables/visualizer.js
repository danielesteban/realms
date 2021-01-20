class Visualizer {
  constructor() {
    const renderer = document.createElement('canvas');
    renderer.style.marginBottom = '1.25rem';
    renderer.width = 200;
    renderer.height = 50;
    this.context = renderer.getContext('2d');
    const bar = this.context.createLinearGradient(0, 0, 0, renderer.height);
    bar.addColorStop(0, 'rgba(51, 153, 51, 1)');
    bar.addColorStop(1, 'rgba(51, 153, 51, 0)');
    this.context.fillStyle = bar;
    this.renderer = renderer;
  }

  update(bins) {
    const { context: ctx, renderer } = this;
    const { width, height } = renderer;
    const bar = width / bins.length;
    ctx.clearRect(0, 0, width, height);
    bins.forEach((value, i) => {
      const h = height * value;
      ctx.fillRect(bar * i, height - h, bar, h);
    });
  }
}

export default Visualizer;
