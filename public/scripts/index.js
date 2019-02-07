/*global Vue, axios, Q */
/**
 * @copyright Kiririn.io
 * @since 2019
 * @author Tim van Leuverden <TvanLeuverden@Gmail.com>
 */

new Vue({
	el: '#index',
	data: {
		loading: false,
		users: [''],
		details: {},
		games: {},
		selectedGame: null,
		gameList: null,
		matchingGames: 0
	},
	methods: {
		addUserIfNeeded: function () {
			if (this.users.length < 1 || this.users[this.users.length - 1] !== '') {
				this.users.push('');
			}
		},
		removeFromUsers: function (index) {
			this.users.splice(index, 1);
			this.addUserIfNeeded();
		},
		getErrorMessage: function (errorObj) {
			return errorObj.status + ' - ' + errorObj.error;
		},
		getLogoUri: function (gameObj) {
			return `//media.steampowered.com/steamcommunity/public/images/apps/${gameObj.id}/${gameObj.logoUri}.jpg`;
		},
		getDetails: function () {
			if (this.loading) {
				return;
			}
			this.loading = true;

			const usersUri = this.users
				.filter(user => user && user !== '' && !this.details[user])
				.map(user => encodeURIComponent(user))
				.join(',');

			if (usersUri.length < 1) {
				return this.loading = false;
			}

			axios.get(`/api/steam/details/${usersUri}`)
				.then(result => {
					if (result.data) {
						const promises = this.users
							.map(
								user => {
									if (result.data[user] && !this.details[user]) {
										this.details[user] = result.data[user];
										return this.getGames(user);
									}
								}
							)
							.filter(promise => promise);

						return Q.all(promises);
					}
				})
				.then(this.makeGameList)
				.catch(console.log)
				.finally(() => this.loading = false);
		},
		getGames: function (name) {
			const userDetails = this.details[name];
			if (!userDetails || !userDetails.id) {
				return;
			}

			return axios.get(`/api/steam/games/${userDetails.id}`)
				.then(result => {
					if (result.data) {
						this.games[name] = result.data;
						this.gameList = null;
					}
				})
				.catch(console.log);
		},
		whatShouldWePlay: function () {
			if (!Array.isArray(this.gameList) || this.gameList.length < 1) {
				console.log('shuffle!');
				this.makeGameList();
			}

			if (!Array.isArray(this.gameList) || this.gameList.length < 1) {
				return;
			}

			const selectedIndex = this.getRandomInt(this.gameList.length);
			this.selectedGame = this.gameList.splice(selectedIndex, 1)[0];
		},
		makeGameList: function() {
			const users = this.users
				.filter(user => user && user !== '' && this.games[user]);

			if (users.length < 1) {
				return;
			}

			let gameList = this.games[users[0]];

			users.slice(1)
				.forEach(
					user =>
						gameList = gameList.filter(
							gameListGame =>
								this.games[user].some(
									userGame =>
										userGame.id === gameListGame.id
								)
						)
				);

			this.matchingGames = gameList.length;
			this.gameList = gameList;
		},
		getRandomInt: function (max) {
			max = Math.floor(max);
			return Math.floor(Math.random() * max);
		}
	}
});
