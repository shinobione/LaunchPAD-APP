(() => {
  const SELECTOR = '#lyrics-track-select';
  const VIEW_SELECTOR = '#view-lyrics';
  let installed = false;

  function enhanceLyricsTrackSelect() {
    const select = document.querySelector(SELECTOR);
    const view = document.querySelector(VIEW_SELECTOR);
    if (!(select instanceof HTMLSelectElement) || !view) return false;
    if (select.dataset.lp97Enhanced === 'true') return true;

    select.dataset.lp97Enhanced = 'true';
    select.classList.add('lp97-native-track-select');

    const picker = document.createElement('div');
    picker.className = 'lp97-lyrics-picker';
    picker.dataset.lp97LyricsPicker = 'true';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'lp97-lyrics-picker-button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const list = document.createElement('div');
    list.className = 'lp97-lyrics-picker-list';
    list.role = 'listbox';
    list.hidden = true;

    picker.append(trigger, list);
    select.insertAdjacentElement('afterend', picker);

    const close = ({ focusTrigger = false } = {}) => {
      picker.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      list.hidden = true;
      if (focusTrigger) trigger.focus({ preventScroll: true });
    };

    const syncMode = () => {
      const studioMode = view.classList.contains('lyrics-studio-mode');
      picker.hidden = studioMode;
      if (studioMode) {
        select.removeAttribute('aria-hidden');
        select.tabIndex = 0;
        close();
      } else {
        select.setAttribute('aria-hidden', 'true');
        select.tabIndex = -1;
      }
    };

    const syncSelection = () => {
      const selected = select.selectedOptions[0] || select.options[0];
      trigger.textContent = selected?.textContent?.trim() || 'Choose a track';
      [...list.querySelectorAll('.lp97-lyrics-option')].forEach(optionButton => {
        optionButton.setAttribute('aria-selected', String(optionButton.dataset.value === select.value));
      });
    };

    const revealSelectedOption = () => {
      const selectedButton = list.querySelector('.lp97-lyrics-option[aria-selected="true"]');
      if (!(selectedButton instanceof HTMLElement)) return;
      const target = selectedButton.offsetTop - Math.max(0, (list.clientHeight - selectedButton.offsetHeight) / 2);
      list.scrollTop = Math.max(0, target);
    };

    const rebuild = () => {
      const fragment = document.createDocumentFragment();
      [...select.options].forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lp97-lyrics-option';
        button.role = 'option';
        button.dataset.value = option.value;
        button.textContent = option.textContent;
        button.disabled = option.disabled;
        button.setAttribute('aria-selected', String(option.selected));
        button.addEventListener('click', () => {
          if (select.value !== option.value) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          syncSelection();
          close({ focusTrigger: true });
        });
        fragment.appendChild(button);
      });
      list.replaceChildren(fragment);
      syncSelection();
    };

    const open = () => {
      if (picker.hidden) return;
      rebuild();
      picker.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      list.hidden = false;
      requestAnimationFrame(revealSelectedOption);
    };

    trigger.addEventListener('click', () => {
      if (list.hidden) open();
      else close();
    });

    trigger.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      if (list.hidden) open();
      requestAnimationFrame(() => {
        const options = [...list.querySelectorAll('.lp97-lyrics-option:not(:disabled)')];
        const selectedIndex = Math.max(0, options.findIndex(button => button.getAttribute('aria-selected') === 'true'));
        const offset = event.key === 'ArrowUp' ? -1 : 1;
        const nextIndex = Math.min(options.length - 1, Math.max(0, selectedIndex + offset));
        options[nextIndex]?.focus({ preventScroll: true });
      });
    });

    list.addEventListener('keydown', event => {
      const option = event.target.closest('.lp97-lyrics-option');
      if (!option) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close({ focusTrigger: true });
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const options = [...list.querySelectorAll('.lp97-lyrics-option:not(:disabled)')];
      const currentIndex = options.indexOf(option);
      const offset = event.key === 'ArrowUp' ? -1 : 1;
      const nextIndex = Math.min(options.length - 1, Math.max(0, currentIndex + offset));
      options[nextIndex]?.focus({ preventScroll: true });
    });

    document.addEventListener('click', event => {
      if (!picker.contains(event.target)) close();
    });

    window.addEventListener('shinobi:route-change', () => {
      close();
      requestAnimationFrame(() => {
        syncMode();
        syncSelection();
      });
    });

    select.addEventListener('change', syncSelection);

    new MutationObserver(() => {
      rebuild();
    }).observe(select, { childList: true, subtree: true });

    new MutationObserver(syncMode).observe(view, { attributes: true, attributeFilter: ['class'] });

    rebuild();
    syncMode();
    installed = true;
    return true;
  }

  function boot() {
    if (enhanceLyricsTrackSelect()) return;
    const observer = new MutationObserver(() => {
      if (!enhanceLyricsTrackSelect()) return;
      observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.addEventListener('pageshow', () => {
    if (!installed) boot();
  });
})();
