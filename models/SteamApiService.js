const q = require('q');
const request = require('request-promise');
const RedisService = require('./RedisService');

class SteamApiService {

	constructor() {
		this._redis = new RedisService();
		this._baseUri = 'https://api.steampowered.com';
		this._steamKey = process.env.x_steam_key;
	}

	/**
	 * Get user ID for name.
	 * @param name
	 * @returns {Promise<number>}
	 */
	getIdForName(name) {
		const defer = q.defer();
		let isResolved = false;

		this._redis.get(`id.${name}`)
			.then(result => {
				if (result) {
					defer.resolve(result);
					return isResolved = true;
				}

				return request({
					method: 'GET',
					uri: `${this._baseUri}/ISteamUser/ResolveVanityURL/v0001/?key=${this._steamKey}&vanityUrl=${encodeURIComponent(name)}`,
					json: true
				})
			})
			.then(result => {
				if (isResolved) {
					return;
				}

				let id;
				if (result && result.response && result.response.steamid > 0) {
					id = result.response.steamid;
				} else {
					try {
						parseInt(name);
						id = name;
					} catch {
						id = NaN;
					}

					if (id < 1 || isNaN(id)) {
						return defer.reject({ status: 404, error: 'Name not found' })
					}
				}

				defer.resolve(id);

				return this._redis.set(`id.${name}`, id);
			})
			.catch(reason => defer.reject(reason));

		return defer.promise;
	}

	/**
	 * Get user details for array of names.
	 * @param names
	 * @returns {Promise<any>}
	 */
	getUsersDetails(names) {
		const defer = q.defer();

		let ids = [];
		let nameIds = {};
		let userResult = {};
		let isResolved = false;

		const idsPromises = names.map(
			name =>
				this.getIdForName(name)
					.then(
						result => {
							nameIds[result] = name;
							ids.push(result);
						})
					.catch(reason =>
						userResult[name] = {
							error: reason
						}
					)
		);

		q.all(idsPromises)
			.then(() => {
				const redisPromises = ids.map(
					id =>
						this._redis.get(`details.${id}`)
							.then(
								result => {
									if (result) {
										userResult[nameIds[id]] = JSON.parse(result);
										const index = ids.indexOf(id);
										ids.splice(index, 1);
									}
								}
							)
				);

				return q.all(redisPromises)
					.then(() => {
						if (!Array.isArray(ids) || ids.length < 1) {
							defer.resolve(userResult);
							return isResolved = true;
						}

						return request({
							method: 'GET',
							uri: `${this._baseUri}/ISteamUser/GetPlayerSummaries/v0002/?key=${this._steamKey}&steamids=${ids.join(',')}`,
							json: true
						})
					});
			})
			.then(result => {
				if (isResolved) {
					return;
				}

				if (!result || !result.response || !Array.isArray(result.response.players)) {
					defer.reject({ error: 'No players', status: 500 })
				}

				result.response.players.forEach(player => {
					const name = nameIds[player.steamid];

					userResult[name] = {
						id: player.steamid,
						url: player.profileurl,
						icon: player.avatarfull,
						name: player.personaname,
						state: player.personastate
					};

					this._redis.set(`details.${player.steamid}`, JSON.stringify(userResult[name]));
				});

				defer.resolve(userResult);
			});

		return defer.promise;
	}


	/**
	 * Get games list for user ID.
	 * @param id
	 * @returns {Promise<any>}
	 */
	getGames(id) {
		const defer = q.defer();
		let isResolved = false;

		this._redis.get(`games.${id}`)
			.then(result => {
				if (result) {
					defer.resolve(JSON.parse(result));
					return isResolved = true;
				}

				return request({
					method: 'GET',
					uri: `${this._baseUri}/IPlayerService/GetOwnedGames/v0001/?key=${this._steamKey}&steamId=${id}&format=json&include_appinfo=1&include_played_free_games=1`,
					json: true
				})
			})
			.then(result => {
				if (isResolved) {
					return;
				}

				if (!result || !result.response || !Array.isArray(result.response.games)) {
					defer.reject({ error: 'No games', status: 500 })
				}

				const userGames = result.response.games.map(
					game =>
						({
							id: game.appid,
							name: game.name,
							iconUri: game.img_icon_url,
							logoUri: game.img_logo_url
						})
				);

				defer.resolve(userGames);
				return this._redis.set(`games.${name}`, JSON.stringify(userGames));
			})
			.catch(reason => defer.reject(reason));

		return defer.promise;
	}


	/**
	 * Destructor
	 */
	destroy() {
		this._redis.destroy();
	}
}

module
	.exports = SteamApiService;
