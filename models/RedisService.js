const redis = require('redis-promisify');

class RedisService {

	/**
	 * Constructor
	 */
	constructor() {
		this._keyBase = 'wswpos';
		this._keyId = 'id';
		this._keyGames = 'games';
		this._keyDetails = 'details';

		this._client = redis.createClient({
			host: process.env.x_redis_host,
			port: process.env.x_redis_port
		});
		this._expire = process.env.x_redis_expire ? parseInt(process.env.x_redis_expire) : 900;
	}

	/**
	 * Destructor
	 */
	destroy() {
		if (this._client) {
			this._client.quit();
		}
	}


	/***********
	 * SETTERS *
	 ***********/

	/**
	 * Set value in Redis
	 * @private
	 * @param key
	 * @param value
	 * @returns {Promise}
	 */
	set(key, value) {
		return this._client.setAsync(`${this._keyBase}.${key}`, value, 'EX', this._expire);
	}

	/**
	 * Set Steam user ID for Steam vanity name
	 * @param {string} name - Steam vanity name
	 * @param {number} id - Steam user ID
	 * @return {Promise}
	 */
	setUserIdForName(name, id) {
		return this.set(`${this._keyId}.${name}`, id);
	}

	/**
	 * Set Steam user details for Steam user ID
	 * @param {number} id - Steam user ID
	 * @param {UserDetails} userDetails - Steam user details
	 * @return {Promise}
	 */
	setUserDetailsForUserId(id, userDetails) {
		return this.set(`${this._keyDetails}.${id}`, JSON.stringify(userDetails));
	}

	/**
	 * Set Steam games list for Steam user ID
	 * @param {number} id - Steam user ID
	 * @param {Game[]} gamesList - Steam games list
	 * @return {Promise}
	 */
	setGamesForUserId(id, gamesList) {
		return this.set(`${this._keyGames}.${id}`, JSON.stringify(gamesList));
	}


	/***********
	 * GETTERS *
	 ***********/

	/**
	 * Get value from Redis
	 * @private
	 * @param {string} key
	 * @returns {Promise<any|null>}
	 */
	get(key) {
		return this._client.getAsync(`${this._keyBase}.${key}`);
	}

	/**
	 * Get Steam user ID by Steam vanity name
	 * @param {string} name - Steam vanity name
	 * @return {Promise<number|null>}
	 */
	getUserIdByName(name) {
		return this.get(`${this._keyId}.${name}`);
	}

	/**
	 * Get Steam user details by Steam user ID
	 * @param {number} id - Steam user ID
	 * @return {Promise<UserDetails|null>}
	 */
	getUserDetailsByUserId(id) {
		return this.get(`${this._keyDetails}.${id}`);
	}

	/**
	 * Get Steam games list by Steam user ID
	 * @param {number} id - Steam user ID
	 * @return {Promise<Game[]|null>}
	 */
	getGamesByUserId(id) {
		return this.get(`${this._keyGames}.${id}`);
	}

}

module.exports = RedisService;
