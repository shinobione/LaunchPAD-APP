import('./app-main.js').catch(error => {
  console.error('Unable to start the SHINOBIWAN App', error);
  const main = document.querySelector('.main-content');
  if (main) main.insertAdjacentHTML('afterbegin', '<p style="padding:20px;color:#ff9cae">An error is preventing the application from loading. Please refresh the page.</p>');
});
