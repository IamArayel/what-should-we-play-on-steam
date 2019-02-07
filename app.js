/**
 * @copyright Kiririn.io
 * @since 2019
 * @author Tim van Leuverden <TvanLeuverden@Gmail.com>
 */
const path = require('path');
const redis = require('redis');
const logger = require('morgan');
const express = require('express');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const sassMiddleware = require('node-sass-middleware');
const redisMiddleware = require('express-redis-cache');
const babelMiddleware = require('express-babel').default;


/// Express
const app = express();


/// Redis cache
global.redisMiddleware = redisMiddleware({
	prefix: 'wswpos.express',
	host: process.env.x_redis_host,
	port: process.env.x_redis_port,
	expire: process.env.x_redis_expire || 900
});


/// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


/// Middleware
app.use(favicon(path.join(__dirname, 'public', 'images', 'logo.png')));
app.use(logger(global.PROD ? 'tiny' : 'dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(sassMiddleware({
	src: path.join(__dirname, 'public'),
	dest: path.join(__dirname, 'public'),
	indentedSyntax: false,
	outputStyle: 'compressed',
	sourceMap: false
}));
app.use('/scripts', babelMiddleware(path.join(__dirname, 'public', 'scripts'), {
	compact: true,
	minified: true,
	presets: ['env'], // 'minify' is broken
	plugins: ['transform-strict-mode']
}));
app.use(express.static(path.join(__dirname, 'public')));


// Dependencies
addStaticDep('q', path.join('q'));
addStaticDep('vue', path.join('vue', 'dist'));
addStaticDep('axios', path.join('axios', 'dist'));
addStaticDep('open-sans', path.join('open-sans-fonts', 'open-sans'));
addStaticDep('fontawesome', path.join('@fortawesome', 'fontawesome-free'));

function addStaticDep(depName, depPath = depName) {
	app.use('/dist/' + depName, express.static(path.join(__dirname, 'node_modules', depPath)));
}


/// Robots
app.get('/robots.txt', global.redisMiddleware.route(), (req, res) => {
	res.type('text/plain');
	res.send(
		'User-agent: *\n' +
		'Allow: /'
	);
});


/// Routes
app.use('/', require('./routes/index'));
app.use('/api/steam', require('./routes/apiSteam'));


/// 404 handler
app.use((req, res, next) => {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});


/// Error handler
app.use((err, req, res, next) => {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = global.PROD ? {} : err;

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});


module.exports = app;
