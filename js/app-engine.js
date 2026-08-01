const logoLock = document.createElement('link');
logoLock.rel = 'stylesheet';
logoLock.href = 'css/logo-lock.css';
document.head.appendChild(logoLock);

Promise.all([
  import('./app-main.js'),
  import('./audio-focus.js')
])
  .then(([, audioFocus]) => {
    audioFocus.initAudioFocus({ audio: document.querySelector('#audio') });
  })
  .catch(error => {
    console.error('Unable to start the SHINOBIWAN App', error);
    const main = document.querySelector('.main-content');
    if (main) main.insertAdjacentHTML('afterbegin', '<p style="padding:20px;color:#ff9cae">An error is preventing the application from loading. Please refresh the page.</p>');
  });
