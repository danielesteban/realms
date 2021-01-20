const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const config = require('../config');

const html = fs.readFileSync(path.join(__dirname, 'screenshots.html'), 'utf-8');

class Screenshots {
  constructor() {
    this.queue = [];
    if (!config.test) {
      puppeteer
        .launch({
          args: ['--disable-web-security', '--no-sandbox'],
          ignoreHTTPSErrors: true,
          // headless: false,
        })
        .then((browser) => {
          this.browser = browser;
          this.processQueue();
        });
    }
  }

  capture(model) {
    const { browser } = this;
    return browser
      .newPage()
      .then((page) => (
        page
          // .on('console', (msg) => console.log('PAGE LOG:', msg.text()))
          .setViewport({ width: 512, height: 512 })
          .then(() => (
            page
              .setContent(
                html
                  .replace(/__CLIENT__/g, config.clientOrigin)
                  .replace(/__META__/, JSON.stringify({
                    width: model.width,
                    height: model.height,
                    depth: model.depth,
                    ambient: model.ambient.color,
                    background: model.background.color,
                    light1: model.light1.color,
                    light2: model.light2.color,
                    light3: model.light3.color,
                    light4: model.light4.color,
                  }))
                  .replace(/__VOXELS__/, JSON.stringify([...(new Uint8Array(model.voxels.buffer))]))
              )
          ))
          .then(() => (
            page
              .waitForFunction('window.__READY__', { timeout: 10000 })
          ))
          .then(() => (
            page
              .screenshot({ type: 'png' })
          ))
          .then((buffer) => {
            model.screenshot = buffer;
            return model
              .save();
          })
          .finally(() => (
            page
              .close()
          ))
      ));
  }

  processQueue() {
    const { queue } = this;
    const job = queue.shift();
    if (!job) return;
    this.isBusy = true;
    this.capture(job)
      .catch(() => {})
      .finally(() => setTimeout(() => {
        this.isBusy = false;
        this.processQueue();
      }, 1000));
  }

  update(model) {
    const { browser, isBusy, queue } = this;
    if (~queue.findIndex(({ _id: queued }) => (queued.equals(model._id)))) {
      return;
    }
    queue.push(model);
    if (browser && !isBusy) {
      this.processQueue();
    }
  }
}

module.exports = new Screenshots();
