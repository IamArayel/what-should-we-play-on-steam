/*global Vue, axios, Q */
/**
 * @copyright Kiririn.io
 * @since 2019
 * @author Tim van Leuverden <TvanLeuverden@Gmail.com>
 */

const GROUPS_STORAGE_KEY = 'wswpos.groups';

function isValidGroup(group) {
	return group !== null
		&& typeof group === 'object'
		&& typeof group.name === 'string'
		&& Array.isArray(group.members)
		&& group.members.every(member => typeof member === 'string');
}

/**
 * Read saved groups from localStorage
 * Throws when storage is unavailable or holds invalid data
 * @returns {{name: string, members: string[]}[]}
 */
function readGroups() {
	const raw = window.localStorage.getItem(GROUPS_STORAGE_KEY);
	if (raw === null) {
		return [];
	}

	const groups = JSON.parse(raw);
	if (!Array.isArray(groups) || !groups.every(isValidGroup)) {
		throw new Error('Saved groups have an invalid format');
	}
	return groups;
}

/**
 * Write groups to localStorage
 * Throws when storage is unavailable or full
 * @param {{name: string, members: string[]}[]} groups
 */
function writeGroups(groups) {
	window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

new Vue({
	el: '#index',
	data: {
		loading: false,
		users: [''],
		details: {},
		games: {},
		selectedGame: null,
		gameList: null,
		matchingGames: 0,
		groups: [],
		groupName: '',
		groupError: null
	},
	computed: {
		canSaveGroup: function () {
			return this.groupName !== '' && this.users.some(user => user !== '');
		}
	},
	created: function () {
		try {
			this.groups = readGroups();
		} catch (error) {
			// Corrupted data is kept until the next save, so nothing is lost without the user acting
			console.error(error);
			this.groupError = 'Saved groups could not be read. Saving a group will replace them.';
		}
	},
	methods: {
		addUserIfNeeded: function () {
			if (this.users.length < 1 || this.users[this.users.length - 1] !== '') {
				this.users.push('');
			}
		},
		removeFromUsers: function (index) {
			this.users.splice(index, 1);
			this.resetGameSelection();
			this.addUserIfNeeded();
		},
		resetGameSelection: function () {
			this.gameList = null;
			this.selectedGame = null;
			this.matchingGames = 0;
		},
		storeGroups: function (groups) {
			try {
				writeGroups(groups);
			} catch (error) {
				console.error(error);
				this.groupError = 'Groups could not be saved: browser storage is unavailable or full.';
				return;
			}
			this.groups = groups;
			this.groupError = null;
		},
		saveGroup: function () {
			if (!this.canSaveGroup) {
				return;
			}

			const group = {
				name: this.groupName,
				members: this.users.filter(user => user !== '')
			};
			const groups = this.groups
				.filter(savedGroup => savedGroup.name !== group.name)
				.concat(group)
				.sort((a, b) => a.name.localeCompare(b.name));

			this.storeGroups(groups);
		},
		loadGroup: function (name) {
			const group = this.groups.find(savedGroup => savedGroup.name === name);
			if (!group || this.loading) {
				return;
			}

			this.users = group.members.slice();
			this.groupName = group.name;
			this.resetGameSelection();
			this.addUserIfNeeded();
			this.getDetails();
		},
		deleteGroup: function (name) {
			this.storeGroups(this.groups.filter(savedGroup => savedGroup.name !== name));
		},
		getErrorMessage: function (errorObj) {
			return errorObj.status + ' - ' + errorObj.error;
		},
		getLogoUri: function (gameObj) {
			return `https://cdn.akamai.steamstatic.com/steam/apps/${gameObj.id}/header.jpg`;
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

			this.resetGameSelection();

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
