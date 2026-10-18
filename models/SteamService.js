const q = require('q');
const RedisService = require('./RedisService');
const SteamApiService = require('./SteamApiService');

// GetPlayerSummaries accepts at most 100 Steam user IDs per call
const MAX_IDS_PER_SUMMARY_CALL = 100;

/**
 * @param {Object} player - Player from GetPlayerSummaries
 * @returns {UserDetails}
 */
function toUserDetails(player) {
	return {
		id: player.steamid,
		url: player.profileurl,
		icon: player.avatarfull,
		name: player.personaname,
		state: player.personastate
	};
}

class SteamService {
	/**
	 * Constructor
	 */
	constructor() {
		this._redis = new RedisService();
		this._api = new SteamApiService();
	}

	/**
	 * Destructor
	 * Call manually, as NodeJS doesn't support destructors
	 */
	destroy() {
		this._redis.destroy();
	}

	/**
	 * Get Steam user ID by Steam vanity name
	 * @param {string} name - Steam vanity name
	 * @returns {Promise<number>}
	 */
	getUserIdByName(name) {
		const defer = q.defer();
		let isResolved = false;

		this._redis.getUserIdByName(name)
			.then(result => {
				if (result) {
					defer.resolve(result);
					return isResolved = true;
				}

				return this._api.getUserIdForName(name);
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

				return this._redis.setUserIdForName(name, id);
			})
			.catch(reason => defer.reject(reason));

		return defer.promise;
	}

	/**
	 * Get Steam user details by array of Steam vanity names
	 * @param {string[]} names - Steam vanity names
	 * @returns {Promise<Object.<string, UserDetails>>}
	 */
	getUsersDetailsByNames(names) {
		const defer = q.defer();

		let ids = [];
		let nameIds = {};
		let userResult = {};
		let isResolved = false;

		const idsPromises = names.map(
			name =>
				this.getUserIdByName(name)
					.then(result => {
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
						this._redis.getUserDetailsByUserId(id)
							.then(result => {
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

						return this._api.getUsersDetailsByUserIds(ids);
					});
			})
			.then(result => {
				if (isResolved) {
					return;
				}

				if (!result || !result.response || !Array.isArray(result.response.players)) {
					return defer.reject({ error: 'No players', status: 500 });
				}

				result.response.players.forEach(player => {
					const name = nameIds[player.steamid];

					userResult[name] = toUserDetails(player);

					return this._redis.setUserDetailsForUserId(player.steamid, userResult[name]);
				});

				defer.resolve(userResult);
			})
			.catch(reason => defer.reject(reason));

		return defer.promise;
	}


	/**
	 * Get Steam games list for Steam user ID
	 * @param {number} id - Steam user ID
	 * @returns {Promise<Game[]>}
	 */
	getGamesByUserId(id) {
		const defer = q.defer();
		let isResolved = false;

		this._redis.getGamesByUserId(id)
			.then(result => {
				if (result) {
					defer.resolve(JSON.parse(result));
					return isResolved = true;
				}

				return this._api.getGamesByUserId(id);
			})
			.then(result => {
				if (isResolved) {
					return;
				}

				if (!result || !result.response || !Array.isArray(result.response.games)) {
					return defer.reject({ error: 'No games', status: 500 });
				}

				const userGames = result.response.games.map(game => ({
					id: game.appid,
					name: game.name
				}));

				defer.resolve(userGames);

				return this._redis.setGamesForUserId(id, userGames);
			})
			.catch(reason => defer.reject(reason));

		return defer.promise;
	}

	/**
	 * Get Steam friends details for Steam user ID
	 * @param {string} id - Steam user ID
	 * @returns {Promise<UserDetails[]>}
	 */
	getFriendsByUserId(id) {
		return this._redis.getFriendsByUserId(id)
			.then(cached => {
				if (cached) {
					return JSON.parse(cached);
				}

				return this._api.getFriendsByUserId(id)
					.catch(reason => {
						throw reason.status === 401 ? { status: 403, error: 'Friends list is private' } : reason;
					})
					.then(result => {
						const friendIds = result && result.friendslist && Array.isArray(result.friendslist.friends)
							? result.friendslist.friends.map(friend => friend.steamid)
							: [];

						const chunks = [];
						for (let i = 0; i < friendIds.length; i += MAX_IDS_PER_SUMMARY_CALL) {
							chunks.push(friendIds.slice(i, i + MAX_IDS_PER_SUMMARY_CALL));
						}

						return q.all(chunks.map(chunk => this._api.getUsersDetailsByUserIds(chunk)));
					})
					.then(results => {
						const friends = [];
						results.forEach(summary => {
							if (summary && summary.response && Array.isArray(summary.response.players)) {
								summary.response.players.forEach(player => friends.push(toUserDetails(player)));
							}
						});

						return this._redis.setFriendsForUserId(id, friends)
							.then(() => friends);
					});
			});
	}
}

module.exports = SteamService;

/**
 * @typedef UserDetails
 * @property {number} id
 * @property {string} url
 * @property {string} icon
 * @property {string} name
 * @property {string} state
 */

/**
 * @typedef Game
 * @property {number} id
 * @property {string} name
 */
