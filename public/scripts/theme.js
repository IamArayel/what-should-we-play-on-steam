/**
 * Loaded synchronously in <head> so the theme is set before first paint
 * Not part of the Vue app: the header (and its toggle) is shared with the error page
 */
(function () {
	const THEME_STORAGE_KEY = 'wswpos.theme';
	const root = document.documentElement;

	let theme = null;
	try {
		theme = window.localStorage.getItem(THEME_STORAGE_KEY);
	} catch (error) {
		// Storage unavailable: falling back to the system preference is the intended behaviour
		console.error(error);
	}
	if (theme !== 'light' && theme !== 'dark') {
		theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	}
	root.dataset.theme = theme;

	document.addEventListener('click', event => {
		const button = event.target.closest('[data-set-theme]');
		if (!button) {
			return;
		}

		root.dataset.theme = button.dataset.setTheme;
		try {
			window.localStorage.setItem(THEME_STORAGE_KEY, button.dataset.setTheme);
		} catch (error) {
			// The theme still applies for this page, it just won't be remembered
			console.error(error);
		}
	});
})();
