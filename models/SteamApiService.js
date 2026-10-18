const request = require('request-promise');

class SteamApiService {
	/**
	 * Constructor
	 */
	constructor() {
		this._baseUri = 'https://api.steampowered.com';
		this._steamKey = process.env.STEAM_KEY;
	}

	/**
	 * Call the Steam API
	 * Errors are reduced to a status and a message: the raw error holds the request URI, API key included
	 * @private
	 * @param {string} uri
	 * @returns {Promise<Object>}
	 */
	get(uri) {
		return request({
			method: 'GET',
			uri: uri,
			json: true
		})
			.catch(error => {
				throw { status: error.statusCode || 500, error: 'Steam API request failed' };
			});
	}

	/**
	 * Get Steam user ID for Steam vanity name
	 * @param {string} name - Steam vanity name
	 * @returns {Promise<{
	 *   response: {
	 *     steamid: number
	 *   }
	 * }>}
	 */
	getUserIdForName(name) {
		return this.get(`${this._baseUri}/ISteamUser/ResolveVanityURL/v0001/?key=${this._steamKey}&vanityUrl=${encodeURIComponent(name)}`);
	}

	/**
	 * Get Steam user details for array of Steam user ID's
	 * @param {number[]} ids - Array of Steam user ID's, 100 at most
	 * @returns {Promise<{
	 *   response: {
	 *     players: {
	 *       steamid: number,
	 *       profileurl: string,
	 *       avatarfull: string,
	 *       personaname: string,
	 *       personastate: string
	 *     }[]
	 *   }
	 * }>}
	 */
	getUsersDetailsByUserIds(ids) {
		return this.get(`${this._baseUri}/ISteamUser/GetPlayerSummaries/v0002/?key=${this._steamKey}&steamids=${ids.join(',')}`);
	}


	/**
	 * Get Steam games list for Steam user ID
	 * @param {number} id - Steam user ID
	 * @returns {Promise<{
	 *   response: {
	 *     games: {
	 *       appid: number,
	 *       name: string
	 *     }[]
	 *   }
	 * }>}
	 */
	getGamesByUserId(id) {
		return this.get(`${this._baseUri}/IPlayerService/GetOwnedGames/v0001/?key=${this._steamKey}&steamId=${id}&format=json&include_appinfo=1&include_played_free_games=1`);
	}

	/**
	 * Get Steam friends list for Steam user ID
	 * Rejects with status 401 when the friends list is private
	 * @param {string} id - Steam user ID
	 * @returns {Promise<{
	 *   friendslist: {
	 *     friends: {
	 *       steamid: string
	 *     }[]
	 *   }
	 * }>}
	 */
	getFriendsByUserId(id) {
		return this.get(`${this._baseUri}/ISteamUser/GetFriendList/v0001/?key=${this._steamKey}&steamid=${encodeURIComponent(id)}&relationship=friend`);
	}
}

module.exports = SteamApiService;
