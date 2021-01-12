class Welcome {
  static showDialog() {
    if (Welcome.hasShowed) {
      return;
    }
    // This is maybe nuts.. but I'm feeling nostalgic this days.
    const dialog = document.createElement('div');
    dialog.className = 'dialog wide open';
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    const close = document.createElement('div');
    close.className = 'close';
    close.innerText = '×';
    wrapper.appendChild(close);

    const closeDialog = () => document.body.removeChild(dialog);
    close.addEventListener('click', closeDialog);

    const letter = document.createElement('div');
    [
      'Welcome, my dudes!',
      'This is an alpha test for a second iteration of realmsvr. Which was an old webvr project of mine that prolly some of you remember from the supermedium era and the OG vive.',
      'It\'s a voxel editor with a recursive twist. It lets your create infinite voxel dioramas with your buddies for desktop and VR.',
      'Every realm is public but only it\'s creator can edit it. You can also create copies of them that you can modify and there\'s even anonymous realms that everybody can edit for those of you hesitant of creating an account.',
      'It\'s also multiplayer. If the owner is online you can ask him for permission to edit just by clicking on the voxels. Or you can just make your own copy anytime as well.',
      'During this alpha I\'m mainly focusing on getting a great desktop experience and the editor so... The VR support is just for PC-VR and it doesn\'t have the editing tools yet. I plan to optimize it for devices like the Oculus Quest and implementing the VR UI during the next updates, though.',
      'You can drop me a <a style="color:inherit" href="https://twitter.com/DaniGatunes" rel="noopener noreferrer" target="_blank">tweet</a> if you have any suggestions or if you find any bugs.',
      'If you like this and/or think is somehow important that I keep developing it, please consider becoming a sponsor by clicking on the ribbon at the top right corner.',
      'Much love,<br />Dani.',
    ].forEach((text) => {
      const p = document.createElement('p');
      p.innerHTML = text;
      letter.appendChild(p);
    });
    wrapper.appendChild(letter);

    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'submit';
    const button = document.createElement('button');
    button.className = 'primary';
    button.innerText = 'Let\'s Go!';
    button.addEventListener('click', closeDialog);
    buttonWrapper.appendChild(button);
    wrapper.appendChild(buttonWrapper);

    dialog.appendChild(wrapper);
    document.body.appendChild(dialog);
    Welcome.hasShowed = true;
  }
}

export default Welcome;
