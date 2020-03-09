const request = require('request-promise');

class SteamApiService {
	/**
	 * Constructor
	 */
	constructor() {
		this._baseUri = 'https://api.steampowered.com';
		this._steamKey = process.env.x_steam_key;
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
		return request({
			method: 'GET',
			uri: `${this._baseUri}/ISteamUser/ResolveVanityURL/v0001/?key=${this._steamKey}&vanityUrl=${encodeURIComponent(name)}`,
			json: true
		});
	}

	/**
	 * Get Steam user details for array of Steam user ID's
	 * @param {number[]} ids - Array of Steam user ID's
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
		return request({
			method: 'GET',
			uri: `${this._baseUri}/ISteamUser/GetPlayerSummaries/v0002/?key=${this._steamKey}&steamids=${ids.join(',')}`,
			json: true
		});
	}


	/**
	 * Get Steam games list for Steam user ID
	 * @param {number} id - Steam user ID
	 * @returns {Promise<{
	 *   response: {
	 *     games: {
	 *       appid: number,
	 *       name: string,
	 *       img_icon_url: string,
	 *       img_logo_url: string
	 *     }[]
	 *   }
	 * }>}
	 */
	getGamesByUserId(id) {
		return request({
			method: 'GET',
			uri: `${this._baseUri}/IPlayerService/GetOwnedGames/v0001/?key=${this._steamKey}&steamId=${id}&format=json&include_appinfo=1&include_played_free_games=1`,
			json: true
		});
	}
}

module.exports = SteamApiService;
