import { useEffect } from 'react';

/**
 * Dev-only runtime AAA checker.
 *
 * After paint, sweeps the DOM for common white-glove violations:
 *  - buttons with no hover/focus styling
 *  - forms with no loading/pending affordance
 *  - empty lists with no empty-state sibling
 *
 * Logs to the console and pins a small badge in the corner. Renders
 * nothing in production.
 */
export function PropagationChecker() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const run = () => {
      const violations: string[] = [];

      document.querySelectorAll('button').forEach((btn) => {
        const cls = btn.className || '';
        const hasInteractive = /hover:|focus:|active:|group-hover:|data-\[state/.test(cls);
        const label = btn.textContent?.trim() || btn.getAttribute('aria-label') || '';
        if (label && !hasInteractive) {
          violations.push(`Button missing hover/focus state: "${label.slice(0, 40)}"`);
        }
      });

      document.querySelectorAll('form').forEach((form) => {
        const html = form.innerHTML;
        const hasLoading = /disabled|aria-busy|isLoading|pending|loading/i.test(html);
        if (!hasLoading) {
          violations.push(`Form missing loading state: #${form.id || '(unnamed)'}`);
        }
      });

      document.querySelectorAll<HTMLElement>('[role="list"], [data-list]').forEach((list) => {
        if (list.children.length === 0) {
          const next = list.nextElementSibling;
          const hasEmpty = next && /empty|placeholder/i.test(next.className || '');
          if (!hasEmpty) violations.push('Empty list with no empty-state sibling');
        }
      });

      const existing = document.getElementById('aaa-propagation-badge');
      if (existing) existing.remove();

      if (violations.length === 0) return;

      // eslint-disable-next-line no-console
      console.groupCollapsed(`%c⚠ AAA propagation: ${violations.length} issue(s)`, 'color:#f87171;font-weight:600');
      violations.forEach((v) => console.warn(v));
      console.groupEnd();

      const badge = document.createElement('div');
      badge.id = 'aaa-propagation-badge';
      badge.textContent = `⚠ ${violations.length} AAA`;
      badge.title = 'Open console for details';
      badge.style.cssText =
        'position:fixed;bottom:8px;right:8px;background:#7f1d1d;color:#fff;padding:3px 8px;border-radius:6px;font:11px/1.2 ui-sans-serif,system-ui;z-index:99999;opacity:.85;pointer-events:none';
      document.body.appendChild(badge);
    };

    const id = window.setTimeout(run, 1500);
    const obs = new MutationObserver(() => {
      window.clearTimeout((obs as any)._t);
      (obs as any)._t = window.setTimeout(run, 1500);
    });
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(id);
      obs.disconnect();
      document.getElementById('aaa-propagation-badge')?.remove();
    };
  }, []);

  return null;
}
