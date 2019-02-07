const redis = require('redis-promisify');

class RedisService {

	constructor() {
		this._keyBase = 'wswpos';
		this._client = redis.createClient({
			host: process.env.x_redis_host,
			port: process.env.x_redis_port
		});
		this._expire = process.env.x_redis_expire;
	}

	/**
	 *
	 * @param key
	 * @param value
	 * @returns {Promise<any>}
	 */
	set(key, value) {
		return this._client.setAsync(`${this._keyBase}.${key}`, value, 'EX', this._expire);
	}

	/**
	 *
	 * @param key
	 * @returns {Promise<any>}
	 */
	get(key) {
		return this._client.getAsync(`${this._keyBase}.${key}`);
	}

	/**
	 * Destructor
	 */
	destroy() {
		this._client.quit();
	}

}

module.exports = RedisService;
