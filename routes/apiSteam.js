const SteamService = require('../models/SteamService');
const express = require('express');
const router = express.Router();

// Steam data barely changes within a session; the Vercel CDN keeps each response for this long
const CACHE_SECONDS = 900;

/**
 * Send a successful response that the CDN may cache
 * Errors are sent without it, so a failed Steam call is retried on the next request
 * @param {Object} res
 * @param {*} result
 */
function sendCacheable(res, result) {
	res.set('Cache-Control', `public, s-maxage=${CACHE_SECONDS}`);
	res.json(result);
}


router.get('/details/:names', (req, res, next) => {
	const names = req.params.names;

	new SteamService().getUsersDetailsByNames(names.split(','))
		.then(result => sendCacheable(res, result))
		.catch(reason => res.status(500).json(reason));
});


router.get('/games/:id', (req, res, next) => {
	const id = req.params.id;

	new SteamService().getGamesByUserId(id)
		.then(result => sendCacheable(res, result))
		.catch(reason => res.status(500).json(reason));
});


router.get('/friends/:id', (req, res, next) => {
	const id = req.params.id;

	if (!/^\d{17}$/.test(id)) {
		return res.status(400).json({ status: 400, error: 'Invalid Steam user ID' });
	}

	new SteamService().getFriendsByUserId(id)
		.then(result => sendCacheable(res, result))
		.catch(reason => res.status(reason.status || 500).json(reason));
});


module.exports = router;
