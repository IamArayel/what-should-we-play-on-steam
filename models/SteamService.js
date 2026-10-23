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
		this._api = new SteamApiService();
	}

	/**
	 * Get Steam user ID by Steam vanity name
	 * A name that is not a vanity name is taken as a Steam user ID
	 * @param {string} name - Steam vanity name
	 * @returns {Promise<number|string>}
	 */
	getUserIdByName(name) {
		return this._api.getUserIdForName(name)
			.then(result => {
				if (result && result.response && result.response.steamid > 0) {
					return result.response.steamid;
				}

				if (isNaN(name) || name < 1) {
					throw { status: 404, error: 'Name not found' };
				}
				return name;
			});
	}

	/**
	 * Get Steam user details by array of Steam vanity names
	 * @param {string[]} names - Steam vanity names
	 * @returns {Promise<Object.<string, UserDetails>>}
	 */
	getUsersDetailsByNames(names) {
		const ids = [];
		const nameIds = {};
		const userResult = {};

		const idsPromises = names.map(
			name =>
				this.getUserIdByName(name)
					.then(id => {
						nameIds[id] = name;
						ids.push(id);
					})
					.catch(reason =>
						userResult[name] = {
							error: reason
						}
					)
		);

		return Promise.all(idsPromises)
			.then(() => ids.length < 1 ? null : this._api.getUsersDetailsByUserIds(ids))
			.then(result => {
				if (ids.length < 1) {
					return userResult;
				}

				if (!result || !result.response || !Array.isArray(result.response.players)) {
					throw { error: 'No players', status: 500 };
				}

				result.response.players.forEach(player => {
					userResult[nameIds[player.steamid]] = toUserDetails(player);
				});

				return userResult;
			});
	}


	/**
	 * Get Steam games list for Steam user ID
	 * @param {number} id - Steam user ID
	 * @returns {Promise<Game[]>}
	 */
	getGamesByUserId(id) {
		return this._api.getGamesByUserId(id)
			.then(result => {
				if (!result || !result.response || !Array.isArray(result.response.games)) {
					throw { error: 'No games', status: 500 };
				}

				return result.response.games.map(game => ({
					id: game.appid,
					name: game.name
				}));
			});
	}

	/**
	 * Get Steam friends details for Steam user ID
	 * @param {string} id - Steam user ID
	 * @returns {Promise<UserDetails[]>}
	 */
	getFriendsByUserId(id) {
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

				return Promise.all(chunks.map(chunk => this._api.getUsersDetailsByUserIds(chunk)));
			})
			.then(results => {
				const friends = [];
				results.forEach(summary => {
					if (summary && summary.response && Array.isArray(summary.response.players)) {
						summary.response.players.forEach(player => friends.push(toUserDetails(player)));
					}
				});

				return friends;
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
