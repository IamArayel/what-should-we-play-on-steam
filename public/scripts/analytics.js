/**
 * Vercel Web Analytics
 * Initializes analytics tracking using the inject() method
 */
// Use a script tag with type="module" to load the analytics library
(function() {
	// Create and inject the analytics module
	const script = document.createElement('script');
	script.type = 'module';
	script.textContent = `
		import { inject } from '/dist/vercel-analytics/index.mjs';
		inject();
	`;
	document.head.appendChild(script);
})();
