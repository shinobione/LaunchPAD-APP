import('./app-main.js').catch(error => {
  console.error('Impossible de lancer SHINOBIWAN App', error);
  const main = document.querySelector('.main-content');
  if (main) main.insertAdjacentHTML('afterbegin', '<p style="padding:20px;color:#ff9cae">Une erreur empêche le chargement de l’application. Recharge la page.</p>');
});
