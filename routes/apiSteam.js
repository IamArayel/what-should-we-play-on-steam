const SteamService = require('../models/SteamService');
const express = require('express');
const router = express.Router();


router.get('/details/:names', (req, res, next) => {
	const names = req.params.names;

	const steamService = new SteamService();

	steamService.getUsersDetailsByNames(names.split(','))
		.then(result => res.json(result))
		.catch(reason => res.status(500).json(reason))
		.finally(() => steamService.destroy());
});


router.get('/games/:id', (req, res, next) => {
	const id = req.params.id;

	const steamService = new SteamService();

	steamService.getGamesByUserId(id)
		.then(result => res.json(result))
		.catch(reason => res.status(500).json(reason))
		.finally(() => steamService.destroy());
});


module.exports = router;
