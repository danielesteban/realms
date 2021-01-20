class Sharing {
  static setupDialog() {
    // This is maybe nuts.. but I'm feeling nostalgic this days.
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    const close = document.createElement('div');
    close.className = 'close';
    close.innerText = '×';
    close.addEventListener('click', Sharing.closeDialog);
    wrapper.appendChild(close);

    dialog.buttons = {};
    const buttons = document.createElement('div');
    buttons.className = 'sharing';
    const openInPopup = (button) => (e) => {
      e.preventDefault();
      window.open(button.href, '', 'width=640,height=720');
      Sharing.closeDialog();
    };
    Sharing.buttons.forEach(({ id, icon }) => {
      const button = document.createElement('a');
      button.rel = 'noopener noreferrer';
      button.target = '_blank';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', 28);
      svg.setAttribute('height', 32);
      svg.setAttribute('viewBox', '0 0 448 512');
      svg.setAttribute('fill', '#fff');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', icon);
      svg.appendChild(path);
      button.appendChild(svg);
      button.appendChild(document.createTextNode(`Share on ${id}`));
      button.addEventListener('click', openInPopup(button), false);
      buttons.appendChild(button);
      dialog.buttons[id] = button;
    });
    wrapper.appendChild(buttons);

    dialog.appendChild(wrapper);
    document.body.appendChild(dialog);
    Sharing.dialog = dialog;
  }

  static closeDialog() {
    const { dialog } = Sharing;
    if (!dialog) {
      return;
    }
    dialog.classList.remove('open');
  }

  static showDialog(link) {
    if (!Sharing.dialog) {
      Sharing.setupDialog();
    }
    const { dialog } = Sharing;
    dialog.classList.add('open');
    const encoded = encodeURIComponent(link);
    Sharing.buttons.forEach(({ id, url }) => {
      dialog.buttons[id].href = `${url}${encoded}`;
    });
  }
}

Sharing.buttons = [
  {
    id: 'twitter',
    url: 'https://twitter.com/intent/tweet?url=',
    icon: 'M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm-48.9 158.8c.2 2.8.2 5.7.2 8.5 0 86.7-66 186.6-186.6 186.6-37.2 0-71.7-10.8-100.7-29.4 5.3.6 10.4.8 15.8.8 30.7 0 58.9-10.4 81.4-28-28.8-.6-53-19.5-61.3-45.5 10.1 1.5 19.2 1.5 29.6-1.2-30-6.1-52.5-32.5-52.5-64.4v-.8c8.7 4.9 18.9 7.9 29.6 8.3a65.447 65.447 0 0 1-29.2-54.6c0-12.2 3.2-23.4 8.9-33.1 32.3 39.8 80.8 65.8 135.2 68.6-9.3-44.5 24-80.6 64-80.6 18.9 0 35.9 7.9 47.9 20.7 14.8-2.8 29-8.3 41.6-15.8-4.9 15.2-15.2 28-28.8 36.1 13.2-1.4 26-5.1 37.8-10.2-8.9 13.1-20.1 24.7-32.9 34z',
  },
  {
    id: 'facebook',
    url: 'https://facebook.com/sharer/sharer.php?u=',
    icon: 'M400 32H48A48 48 0 0 0 0 80v352a48 48 0 0 0 48 48h137.25V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.27c-30.81 0-40.42 19.12-40.42 38.73V256h68.78l-11 71.69h-57.78V480H400a48 48 0 0 0 48-48V80a48 48 0 0 0-48-48z',
  },
];

export default Sharing;
