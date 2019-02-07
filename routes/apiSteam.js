const q = require('q');
const SteamApiService = require('../models/SteamApiService');
const express = require('express');
const router = express.Router();


router.get('/details/:names', (req, res, next) => {
	const names = req.params.names;

	const steamApi = new SteamApiService();

	steamApi.getUsersDetails(names.split(','))
		.then(result => res.json(result))
		.catch(reason => res.status(500).json(reason))
		.finally(() => steamApi.destroy());
});


router.get('/games/:id', (req, res, next) => {
	const id = req.params.id;

	const steamApi = new SteamApiService();

	steamApi.getGames(id)
		.then(result => res.json(result))
		.catch(reason => res.status(500).json(reason))
		.finally(() => steamApi.destroy());
});


module.exports = router;
