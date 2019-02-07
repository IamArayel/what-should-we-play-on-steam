const express = require('express');
const router = express.Router();

router.get('/', global.redisMiddleware.route(), (req, res, next) => {
	res.render('index');
});

module.exports = router;
