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

const SUGGESTION_DELAY_MS = 300;
const MAX_SUGGESTIONS = 8;
const MIN_SUGGESTION_QUERY_LENGTH = 2;
let suggestionTimer = null;

/**
 * Rank the friends of the entered players whose name contains the query
 * Friends shared by more entered players come first
 * @param {Object[][]} friendLists - One friends list per entered player
 * @param {string[]} excludedIds - Steam user IDs already entered
 * @param {string} query
 * @returns {Object[]}
 */
function rankFriendSuggestions(friendLists, excludedIds, query) {
	const needle = query.toLowerCase();
	const matches = {};

	friendLists.forEach(friends => friends.forEach(friend => {
		if (excludedIds.indexOf(friend.id) !== -1 || !friend.name || friend.name.toLowerCase().indexOf(needle) === -1) {
			return;
		}
		if (!matches[friend.id]) {
			matches[friend.id] = { friend: friend, mutualCount: 0 };
		}
		matches[friend.id].mutualCount++;
	}));

	return Object.keys(matches)
		.map(id => matches[id])
		.sort((a, b) => b.mutualCount - a.mutualCount || a.friend.name.localeCompare(b.friend.name))
		.slice(0, MAX_SUGGESTIONS)
		.map(match => match.friend);
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
		groupError: null,
		friends: {},
		unavailableFriendLists: [],
		suggestionIndex: null,
		suggestions: [],
		highlightedSuggestion: -1
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
			this.closeSuggestions();
			this.users.splice(index, 1);
			this.resetGameSelection();
			this.addUserIfNeeded();
		},
		// Methods rather than computed: details gets keys added without Vue reactivity
		getEnteredIds: function () {
			return this.users
				.filter(user => this.details[user] && this.details[user].id)
				.map(user => this.details[user].id);
		},
		getUnavailableFriendsMessage: function () {
			const names = this.users
				.filter(user => this.details[user] && this.unavailableFriendLists.indexOf(this.details[user].id) !== -1)
				.map(user => this.details[user].name);

			return names.length > 0
				? `Friends lists of ${names.join(', ')} are private or unavailable: their friends won't be suggested.`
				: null;
		},
		loadFriends: function (id) {
			if (this.friends[id] || this.unavailableFriendLists.indexOf(id) !== -1) {
				return;
			}

			axios.get(`/api/steam/friends/${id}`)
				.then(result => {
					this.friends = Object.assign({}, this.friends, { [id]: result.data });
				})
				.catch(error => {
					if (!error.response || error.response.status !== 403) {
						console.error(error);
					}
					this.unavailableFriendLists.push(id);
				});
		},
		onUserInput: function (index) {
			this.addUserIfNeeded();
			this.closeSuggestions();

			const query = this.users[index];
			if (query.length < MIN_SUGGESTION_QUERY_LENGTH) {
				return;
			}

			suggestionTimer = setTimeout(() => {
				const enteredIds = this.getEnteredIds();
				const friendLists = enteredIds
					.map(id => this.friends[id])
					.filter(friends => friends);

				this.suggestionIndex = index;
				this.suggestions = rankFriendSuggestions(friendLists, enteredIds, query);
			}, SUGGESTION_DELAY_MS);
		},
		onUserKeydown: function (event, index) {
			const count = this.suggestions.length;
			if (this.suggestionIndex !== index || count < 1) {
				return;
			}

			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault();
					this.highlightedSuggestion = (this.highlightedSuggestion + 1) % count;
					break;
				case 'ArrowUp':
					event.preventDefault();
					this.highlightedSuggestion = this.highlightedSuggestion <= 0 ? count - 1 : this.highlightedSuggestion - 1;
					break;
				case 'Enter':
					if (this.highlightedSuggestion >= 0) {
						event.preventDefault();
						this.selectSuggestion(index, this.suggestions[this.highlightedSuggestion]);
					}
					break;
				case 'Escape':
					this.closeSuggestions();
					break;
			}
		},
		onUserBlur: function () {
			this.closeSuggestions();
			this.getDetails();
		},
		selectSuggestion: function (index, friend) {
			this.closeSuggestions();
			this.users.splice(index, 1, friend.id);
			this.addUserIfNeeded();
			this.getDetails();
		},
		closeSuggestions: function () {
			clearTimeout(suggestionTimer);
			this.suggestionIndex = null;
			this.suggestions = [];
			this.highlightedSuggestion = -1;
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
										if (result.data[user].id) {
											this.loadFriends(result.data[user].id);
										}
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
