/**
 * Build the static site into public/
 * On Vercel the CDN serves public/ before any request reaches Express, so the pages, styles
 * and client libraries are generated here instead of on each request
 */
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const sass = require('sass');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const STYLES = ['main', 'index'];

// Published path under public/dist -> source under node_modules
const VENDORS = {
	'vue/vue.min.js': 'vue/dist/vue.min.js',
	'q/q.js': 'q/q.js',
	'axios/axios.min.js': 'axios/dist/axios.min.js',
	'fontawesome/css': '@fortawesome/fontawesome-free/css',
	'fontawesome/webfonts': '@fortawesome/fontawesome-free/webfonts'
};

// Published page -> view and the locals it expects
const PAGES = {
	'index.html': { view: 'index', locals: {} },
	'404.html': { view: 'error', locals: { error: { status: 404 }, message: 'Not Found' } }
};

function buildStyles() {
	STYLES.forEach(name => {
		const result = sass.compile(path.join(PUBLIC, 'styles', `${name}.scss`), {
			loadPaths: [ROOT],
			style: 'compressed',
			// index.scss still uses @import; it keeps working until Dart Sass 3
			silenceDeprecations: ['import']
		});
		fs.writeFileSync(path.join(PUBLIC, 'styles', `${name}.css`), result.css);
	});
}

function copyVendors() {
	Object.keys(VENDORS).forEach(target => {
		fs.cpSync(path.join(ROOT, 'node_modules', VENDORS[target]), path.join(PUBLIC, 'dist', target), { recursive: true });
	});
}

function renderPages() {
	Object.keys(PAGES).forEach(target => {
		const filename = path.join(ROOT, 'views', `${PAGES[target].view}.ejs`);
		const html = ejs.render(fs.readFileSync(filename, 'utf8'), PAGES[target].locals, { filename });
		fs.writeFileSync(path.join(PUBLIC, target), html);
	});
}

buildStyles();
copyVendors();
renderPages();
console.log('Built public/');
