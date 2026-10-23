/**
 * @copyright Kiririn.io
 * @since 2019
 * @author Tim van Leuverden <TvanLeuverden@Gmail.com>
 */
const path = require('path');
const logger = require('morgan');
const express = require('express');
const bodyParser = require('body-parser');
const vercelConfig = require('./vercel.json');


/// Express
const app = express();
const PROD = process.env.NODE_ENV === 'production';


/// Security headers
// vercel.json holds them for production, local runs read the same ones so both stay in sync
const securityHeaders = vercelConfig.headers[0].headers;
app.use((req, res, next) => {
	securityHeaders.forEach(header => res.setHeader(header.key, header.value));
	next();
});


/// Middleware
app.use(logger(PROD ? 'tiny' : 'dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Built by scripts/build.js; on Vercel the CDN serves public/ before requests reach this app
app.use(express.static(path.join(__dirname, 'public')));


/// Routes
app.use('/api/steam', require('./routes/apiSteam'));


/// 404 handler
app.use((req, res) => {
	res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});


/// Error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(err.status || 500).json({ status: err.status || 500, error: 'Unexpected error' });
});


module.exports = app;
