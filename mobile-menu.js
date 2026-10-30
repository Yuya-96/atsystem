export function setupMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // 二重生成を防止
  if (document.querySelector('.menu-toggle')) return;

  sidebar.id = 'app-sidebar';

  // 三本線ボタン
  const toggle = document.createElement('button');
  toggle.className = 'menu-toggle';
  toggle.type = 'button';
  toggle.textContent = '☰';
  toggle.setAttribute('aria-label', 'メニューを開く');
  toggle.setAttribute('aria-controls', 'app-sidebar');
  toggle.setAttribute('aria-expanded', 'false');

  // 閉じるボタン
  const close = document.createElement('button');
  close.className = 'sidebar-close';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'メニューを閉じる');

  // 背景
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';

  document.body.append(toggle, overlay);
  sidebar.appendChild(close);

  function setOpen(open) {
    sidebar.classList.toggle('open', open);
    overlay.classList.toggle('open', open);

    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute(
      'aria-label',
      open ? 'メニューを閉じる' : 'メニューを開く'
    );

    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', () => {
    setOpen(!sidebar.classList.contains('open'));
  });

  close.addEventListener('click', () => setOpen(false));
  overlay.addEventListener('click', () => setOpen(false));

  sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) setOpen(false);
  });
}