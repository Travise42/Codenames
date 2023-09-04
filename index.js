// ----------------------------------------------------------------------------------------------------
// Import Functions

const { Socket } = require("socket.io");
const { randIntBetween, randInt, randFrom } = require("./func.js");

// ----------------------------------------------------------------------------------------------------
// Initiate Server

const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 5500;
app.use(express.static("public"));
app.use("/img", express.static("img"));

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.sendFile(`${__dirname}/index.html`);
});

http.listen(port, () =>
    console.log(
        `Socket.IO server running at http://yardleys.internal.curtly.ca:${port}/\nFind it at http://www.volcise.com/`
    )
);

// ----------------------------------------------------------------------------------------------------
// Define Constants

const RED = 1;
const BLUE = 2;
const INNOCENT = 3;
const ASSASSIN = 4;

const DEFAULT = INNOCENT;

let OPPERATIVE = 0;
let SPYMASTER = 1;

const COLUMNS = ["a", "b", "c", "d", "e"];

// ----------------------------------------------------------------------------------------------------
// Import Data

//? get words from json file
const words = require("./words.json").map((a) => a.toUpperCase());

// ----------------------------------------------------------------------------------------------------
// Caches for Rooms & Players

/*
rooms: {
    <room-code>: {
        roomCode: <room-code>,
        players: {
            1: [
                <red-spymaster-id>,
                <red-opperative-id>
            ],
            2: [
                <blue-spymaster-id>,
                <blue-opperative-id>
            ],
        },
        cards: {
            'a1': {
                pos: 'a1',
                id: <card-id>,
                text: <card-text>,
                covered: <true/false>
            }
            .
            .
            .
        },
        turn: {
            team: <RED/BLUE>,
            role: <spymaster/opperative>,
        },
        startingTeam: <team-going-first>,
        scores: {
            1: <red-score>,
            2: <blue-score>
        },
        guessesLeft: <#-of-guesses-left>,
        missedCards: {
            1: <#-of-cards-red-missed>,
            2: <#-of-cards-blue-missed>
        },
        status: <current-screen>,
        logCache: [[<game-log-messages>, <sender-team>], ...]
    },
    .
    .
    .
}
*/
const rooms = {};

/*
players: {
    <player-id>: {
        id: <player-id>,
        roomCode: <room-code>,
        name: <player-name>,
        team: <player-team>,
        role: <spymaster/opperative>,
    }
    .
    .
    .
}
*/
const players = {};

// ----------------------------------------------------------------------------------------------------
// Handle Sockets

/**
 * 
 */
io.on("connection", (client) => {
    // Home screen
    client.on("create-room", (...args) => createRoom(client, ...args));
    client.on("join-room", (roomCode, nickname, isHost = false) => joinRoom(client, roomCode, nickname));
    client.on("join-team", (...args) => joinTeam(client, ...args));
    client.on("leave-team", () => leaveTeam(client));
    client.on("new-game", (...args) => newGame(client, ...args));

    // game screen
    client.on("pass-guess", () => passGuess(client));
    client.on("guess-card", (...args) => guessCard(client, ...args));
    client.on("give-clue", (...args) => giveClue(client, ...args));

    // game over screen
    client.on("change-teams", () => changeTeams(client));
    client.on("next-game", () => newRound(client));
    client.on("leave-game", () => leaveGame(client));

    // leaving game
    client.on("disconnect", () => leaveGame(client));
});

// ----------------------------------------------------------------------------------------------------
// Handle Creating & Joining Rooms

// Add player to cached players
/**
 * 
 * @param {Socket} client any connected socket
 * @param {*} roomCode 
 * @param {*} nickname 
 */
function cachePlayer(client, roomCode, nickname) {
    /*
    <player-id>: {
        id: <player-id>,
        roomCode: <room-code>,
        name: <player-name>
    }
    */
    players[client.id] = {
        id: client.id,
        roomCode: roomCode,
        name: nickname,
        role: null,
        team: null,
    };
}

/**
 * 
 * @param {Socket} client any connected socket
 */
function uncachePlayer(client) {
    delete players[client.id];
}

/**
 * 
 * @param {*} roomCode 
 * @returns 
 */
function newRoom(roomCode) {
    rooms[roomCode] = {
        roomCode: roomCode,
        players: {
            1: [null, null],
            2: [null, null],
        },
        host: null,
        cards: {},
        turn: {
            team: null,
            role: null,
        },
        startingTeam: randInt(2),
        scores: {},
        guessesLeft: 0,
        missedCards: { 1: 0, 2: 0 },
        status: "lobby",
        logCache: [],
        words: null,
        usingCustomWords: false,
    };

    /*
    cards: {
        a1: {
            pos: 'a1',
            id: <card-id>,
            text: <card-text>,
            covered: <true/false>
        }
        .
        .
        .
        e5: {
            pos: 'e5',
            id: <card-id>,
            text: <card-text>,
            covered: <true/false>
        }
    }
    */

    const room = getRoom(roomCode);
    COLUMNS.forEach((column) => {
        for (let row = 1; row <= 5; row++) {
            let pos = column + row;
            room.cards[pos] = {
                pos: pos,
                id: INNOCENT,
                text: "",
                covered: false,
            };
        }
    });

    return roomCode;
}

//? from a client
/**
 * 
 * @param {Socket} client any connected socket
 * @param {*} nickname 
 */
function createRoom(client, nickname) {
    do {
        var roomCode =
            randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString();
    } while (getRoomCodes().includes(roomCode));

    joinRoom(client, newRoom(roomCode), nickname, true);
}

//? from a client
/**
 * 
 * @param {Socket} client any connected socket
 * @param {*} roomCode 
 * @param {*} nickname 
 * @param {*} isHost 
 * @returns 
 */
function joinRoom(client, roomCode, nickname, isHost = false) {
    if (rooms[roomCode] == null) return;
    if (!isHost && getPlayerIds(roomCode).length >= 4) return;

    const room = getRoom(roomCode);

    // Add player to room
    client.join(roomCode);
    cachePlayer(client, roomCode, nickname);
    if (isHost) room.host = client.id;

    // Announce to new player that they have joined
    client.emit("joined-room", roomCode, isHost);
    // Tell members about the new player
    client.emit("update-players", getPlayerNames(roomCode, RED), getPlayerNames(roomCode, BLUE), room.status);
}

//? uncachePlayer must NOT be called before leaveRoom
/**
 * 
 * @param {Socket} client any connected socket
 * @returns 
 * @warning
 */
function leaveRoom(client) {
    if (players[client.id] == null) return;

    const roomCode = players[client.id].roomCode;

    // Dont need to announce leaving a room if player isn't in a room
    if (roomCode == null) return;

    const room = rooms[roomCode];

    const redMembers = room.players[RED];
    const blueMembers = room.players[BLUE];

    const player = getPlayer(client);

    // Create new host if old host left
    if (client.id == room.host) {
        room.host = getJoinedPlayerIds(roomCode).filter((playerId) => playerId != client.id)[0];
    }

    // Player hasn't been cached in the room yet, no removing needed
    if (player.team == null) return;

    // Tell members that player left
    io.to(roomCode).emit("player-left", room.host);

    // Remove player from room
    room.players[player.team][player.role] = null;
    client.leave(roomCode);

    // If no one is left in the room...
    if (redMembers[0] == null && redMembers[1] == null && blueMembers[0] == null && blueMembers[1] == null) {
        delete room;
        return;
    }

    // Tell players this player left the room
    getPlayerIds(roomCode).forEach((playerId) => {
        io.to(playerId).emit(
            "update-players",
            getPlayerNames(roomCode, RED),
            getPlayerNames(roomCode, BLUE),
            room.status,
            players[playerId] == null ? null : players[playerId].role
        );
    });
}

//? from a client
/**
 * 
 * @param {Socket} client any connected socket
 * @param {*} team 
 * @returns 
 */
function joinTeam(client, team) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    const player = getPlayer(client);

    if (player.team == team || !getPlayerNames(roomCode, team).some(name => name == null)) return;

    if (player.team != null && player.role != null) room.players[player.team][player.role] = null;

    // Set player team
    player.team = team;

    // Add player to room
    const openSpace = +getEmptySpaceOnTeam(roomCode, player.team);

    room.players[player.team][openSpace] = player.id;
    player.role = openSpace;

    if (room.status != "lobby") {
        client.emit("new-game", getPlayerNames(roomCode, RED), getPlayerNames(roomCode, BLUE), player.role);
        client.emit(
            "new-round",
            Object.values(room.cards).map(cardData => ({...cardData, id: cardData.covered ? cardData.id : INNOCENT})),
            player.role,
            [SPYMASTER, OPPERATIVE],
            room.turn,
            room.scores
        );
        client.emit("update-game-log", room.logCache)
        client.emit("update-guesses-left", room.guessesLeft);
    }

    // Tell players about the new player that joined
    getPlayerIds(roomCode).forEach((playerId) => {
        io.to(playerId).emit(
            "update-players",
            getPlayerNames(roomCode, RED),
            getPlayerNames(roomCode, BLUE),
            room.status,
            players[playerId] == null ? null : players[playerId].role
        );
    });
}

/**
 * 
 * @param {Socket} client any connected socket
 * @returns 
 */
function leaveTeam(client) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    const player = getPlayer(client);

    if (player.team == null) return;
    if (player.role == null) return;

    room.players[player.team][player.role] = null;

    player.team = null;
    player.role = null;

    client.emit("left-team");

    // Tell players about the player that left
    io.sockets.adapter.rooms.get(roomCode).forEach((playerId) => {
        io.to(playerId).emit(
            "update-players",
            getPlayerNames(roomCode, RED),
            getPlayerNames(roomCode, BLUE),
            room.status,
            players[playerId] == null ? null : players[playerId].role
        );
    });
}

/**
 * 
 * @param {*} roomCode 
 * @param {*} playerTeam 
 * @returns 
 */
function getEmptySpaceOnTeam(roomCode, playerTeam) {
    const room = getRoom(roomCode);
    if (room.players[playerTeam][0] == null) return 0;
    if (room.players[playerTeam][1] == null) return 1;
    return null;
}

// ----------------------------------------------------------------------------------------------------
// Start a New Game

//? from a client
/**
 * 
 * @param {Socket} client any connected socket
 * @returns 
 */
function newGame(client, usingCustomWords, customWords) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Must have 4 players
    if (getPlayerNames(roomCode, RED).some(name => name == null) || getPlayerNames(roomCode, BLUE).some(name => name == null)) return;

    // Only allow host to start the game
    if (room.host != client.id) return;

    room.words = null;
    room.usingCustomWords = false;
    if (usingCustomWords) {
        room.words = customWords?.split(",").map(x => x.trim());
        if (room.words.length >= 25) room.usingCustomWords = true;
        else room.words = null;
    }

    Object.values(room.players).forEach((teamMembers) => {
        teamMembers.forEach((playerId, role) => {
            io.to(playerId).emit("new-game", getPlayerNames(roomCode, RED), getPlayerNames(roomCode, BLUE), role);
        });
    });

    room.status = "game";
    newRound(client);
}

/**
 * 
 * @param {*} cards 
 * @param {*} amount 
 * @param {*} id 
 * @returns 
 */
function setCards(cards, amount, id) {
    i = 0;
    while (i < amount) {
        let cardIndex = randInt(25);

        if (cards[cardIndex] != DEFAULT) continue;

        cards[cardIndex] = id;
        i++;
    }
    return cards;
}

// Change who is code master
/**
 * 
 */
function rotateRoles() {
    [SPYMASTER, OPPERATIVE] = [OPPERATIVE, SPYMASTER];
}

//? from a client
/**
 * 
 * @param {Socket} client any connected socket
 */
function newRound(client) {
    rotateRoles();

    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Change the status of the room so players know what state the game is is
    room.status = "game";

    // Clear game log
    room.logCache = [];

    // Change which team goes first
    room.startingTeam = room.startingTeam != RED ? RED : BLUE;

    room.turn = {
        team: room.startingTeam,
        role: SPYMASTER,
    };

    // Create new scores
    room.scores = { 1: 8, 2: 8 };
    room.scores[room.startingTeam] += 1;

    // Create layout ids
    let cardIds = Array(25).fill(DEFAULT);

    // Add teams cards and assassin card
    cardIds = setCards(cardIds, room.scores[RED], RED);
    cardIds = setCards(cardIds, room.scores[BLUE], BLUE);
    cardIds = setCards(cardIds, 1, ASSASSIN);

    // Create layout texts
    const card_texts = randFrom(room.words ?? words, 25);

    // Combine ids and texts
    const cards = room.cards;
    Object.keys(cards).forEach((pos, i) => {
        cards[pos] = {
            pos: pos,
            id: cardIds[i],
            text: card_texts[i],
            covered: false,
        };
    });

    // Broadcast new layout
    Object.values(room.players).forEach((teamMembers) => {
        teamMembers.forEach((playerId, role) => {
            // Make a copy of 'cards'
            const alteredCards = Object.values(cards).map((card) => ({ ...card }));

            // Remove card identification if player isn't spymaster
            if (role == OPPERATIVE) alteredCards.forEach((card) => (card.id = INNOCENT));

            io.to(playerId).emit("new-round", alteredCards, role, [SPYMASTER, OPPERATIVE], room.turn, room.scores);
        });
    });
}

// ----------------------------------------------------------------------------------------------------
// Handle Guessing Cards

/**
 * A function that takes two arguements.
 * Checks the card the opperative guessed and covers it with the corresponding card.
 * 
 * ? Called upon by the client.
 * @param {Socket} client any connected socket
 * @param {*} pos 
 * @returns 
 */
function guessCard(client, pos) {
    // Get cached data
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    // If the room isn't cached...
    if (room == null) return;

    const player = getPlayer(client);

    // Get guessed card
    const card = room.cards[pos];
    // If the given card pos doesn't exist...
    if (card == null) return;

    // Make sure the player can't click already guessed cards
    if (card.covered) return;

    // Handle cheaters
    // Make sure it is the player's turn
    if (!isActive(client)) return;

    // Cover guessed card
    card.covered = true;

    // If card is RED or BLUE, then decrease score of the card's team
    if (room.scores[card.id] != null) room.scores[card.id] -= 1;

    // Decrease player's guesses left
    room.guessesLeft -= 1;

    const guessIsCorrect = player.team == card.id;

    const gameLogMessageData = [`${player.name} ${guessIsCorrect ? "correctly" : "incorrectly"} guessed '${card.text}'`, player.team];

    // Tell members to cover the chosen card
    io.to(roomCode).emit("cover-card", pos, card.id, room.scores, gameLogMessageData);
    // Tell the player that they made a valid guess
    client.emit("made-guess", room.guessesLeft);
    room.logCache.push(gameLogMessageData);

    // Check if the game should end
    handleGameOver(client, card);

    const usedBonusGuess = room.guessesLeft == 0 && 0 < room.missedCards[player.team];
    const playerHasAnotherGuess = 0 < room.guessesLeft;

    // Correct guess
    if (guessIsCorrect && usedBonusGuess) room.missedCards[player.team] -= 1;
    if (guessIsCorrect && playerHasAnotherGuess || usedBonusGuess) return;

    if (!guessIsCorrect) room.guessesLeft += 1;

    // Inncorrect guess: Next turn
    handleNewMissedCards(client);
    nextTurn(client);
}

/**
 * A function that takes one arguement.
 * Ends the player's turn early when they hit the "PASS" button.
 * 
 * ? Called upon by the client.
 * @param {Socket} client any connected socket
 * @returns 
 */
function passGuess(client) {
    const roomCode = getRoomCode(client);
    const player = getPlayer(client);
    const room = getRoom(roomCode)

    // Handle cheaters
    // Make sure it is the player's turn
    if (!isActive(client)) return;

    const gameLogMessageData = [`${player.name} passed`, player.team];
    room.logCache.push(gameLogMessageData);
    io.to(roomCode).emit("passed-gamelog", gameLogMessageData);

    handleNewMissedCards(client);
    nextTurn(client);

}

/**
 * A function that takes one arguement.
 * Handles any cards the player may have missed at the end of their turn.
 * 
 * If the player missed any cards, they can guess one extra card at the end of their turn granted they got nothing wrong.
 * @param {Socket} client any connected socket
 */
function handleNewMissedCards(client) {
    // Get cached data
    const room = getRoom(getRoomCode(client));

    // If the room is not cached...
    if (room == null) return;
    // If the amount of guesses left at the end of the palyer's turn is 0 or less...
    if (room.guessesLeft <= 0) return;
    
    const player = getPlayer(client);
    room.missedCards[player.team] += room.guessesLeft;
}

/**
 * A function that takes two arguements.
 * Checks the scores of both teams and initiates the end of the game with either team has 0 cards left or the assassin was found.
 * @param {Socket} client any connected socket
 * @param {object} card the card object containing the card data
 */
function handleGameOver(client, card) {
    // Get cached data
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // If the room is not cached...
    if (room == null) return;

    if (card.id == ASSASSIN) {
        // Tell all members that the assassin was chosen
        room.status = "game-over";
        io.to(roomCode).emit("game-over", getPlayer(client).team != RED ? RED : BLUE, "Found The Assassin");
        return;
    }

    const teamHasNoCardsLeft = room.scores[card.id] <= 0;

    if (teamHasNoCardsLeft) {
        // Tell all members that all agents are found
        room.status = "game-over";
        io.to(roomCode).emit("game-over", card.id, "Found All Agents");
    }
}

// ----------------------------------------------------------------------------------------------------
// Handle Giving Clues

/**
 * A function that takes three arguements.
 * Handles the values given by the spymaster by making sure the clue is valid and the amount is between 0 and 9.
 * 
 * ? Called upon by the client.
 * @param {Socket} client any connected socket
 * @param {String} clue the entered clue given by the spymaster
 * @param {Number} amount the entered amount value given by the spymaster
 */
function giveClue(client, clue, amount) {
    // Get cached data
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    const player = getPlayer(client);

    // Do nothing is the room doesn't exist
    if (room == null) return;

    // Handle cheaters
    // Make sure it is the player's turn
    if (!isActive(client)) return;
    // Make sure the clue has content
    if (!clue) return;
    // Make sure the amount is between 0 and 9
    if (amount < 0 || 9 < amount) return;

    // Reset opperative's guesses left
    room.guessesLeft = amount;

    // Tell everyone about the new clue
    const gameLogMessageData = [`${player.name} says '${clue.toUpperCase()}' for ${amount}`, player.team];

    io.to(roomCode).emit("recieve-clue", gameLogMessageData, [clue, amount, player.team, player.role]);
    room.logCache.push(gameLogMessageData);

    // Next Turn
    nextTurn(client, amount);
}

// ----------------------------------------------------------------------------------------------------
// Handle Turns

/**
 * A function that takes two arguements.
 * End the current player's turn and start the turn of the next player.
 * 
 * If the current player whose turn it is is the spymaster, the next player will be their teamate (an opperative),
 *  otherwise, the next team will go with their spymaster starting.
 * @param {Socket} client any connected socket
 * @param {Number} amount the amount of cards related to the spymaster's clue, and the amount of guesses the opperative has
 */
function nextTurn(client, amount = 0) {
    // Get cached data
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Do nothing if the room doesn't exist
    if (room == null) return;

    // Switch to next turn
    if (room.turn.role == SPYMASTER) {
        room.turn.role = OPPERATIVE;
    } else {
        room.turn.team = room.turn.team != RED ? RED : BLUE;
        room.turn.role = SPYMASTER;
    }

    // Tell players about the turn change
    io.to(roomCode).emit("next-turn", room.turn, amount);
}

// ----------------------------------------------------------------------------------------------------
// Game Over Screen

/**
 * A function that takes one arguement.
 * Bring the game back to the lobby where players can switch teams.
 * 
 * ? Called upon by the client.
 * @param {Socket} client any connected socket
 */
function changeTeams(client) {
    // Get cached data
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Do nothing if the room doesn't exist
    if (room == null) return;

    // Set the status of the room so that players know what state the game is in
    room.status = "lobby";

    // Tell all players connected to the room to change to the lobby screen
    getPlayerIds(roomCode).forEach((playerId) => {
        io.to(playerId).emit("joined-room", roomCode, room.host == playerId);
        io.to(playerId).emit(
            "update-players",
            getPlayerNames(roomCode, RED),
            getPlayerNames(roomCode, BLUE),
            room.status,
            players[playerId] == null ? null : players[playerId].role
        );
    });  
}

// ----------------------------------------------------------------------------------------------------
// Leaving the Game

/**
 * A function that takes one arguement.
 * Removes the player from cached player data and cached room data.
 * @param {Socket} client any connected socket
 */
function leaveGame(client) {
    leaveRoom(client);
    uncachePlayer(client);
}

// ----------------------------------------------------------------------------------------------------
// Room Functions //!DONE!//

/**
 * A function that takes one arguement.
 * Uses cached player data to retrieve a certain player's data
 * @param {Socket} client any connected socket
 * @returns {object | null} an object containing all stored player data
 */
function getPlayer(client) {
    // Get cached data
    return players[client.id] ?? console.log(`ERROR || Player not found:\nPlayer id of ${client.id} does not exist`);
}

/**
 * A function that takes one arguement.
 * Uses cached room data to retrieve a certain room's data.
 * @param {String} roomCode the 3-digit room code
 * @returns {object | null} an object containing all stored game data
 */
function getRoom(roomCode) {
    return rooms[roomCode] ?? console.log(`ERROR || Room not found:\nRoom code of ${roomCode} does not exist`);
}

/**
 * A function that takes one arguement.
 * Uses cached player data to retrieve the room a certain player is in.
 * @param {Socket} client any connected socket
 * @returns {String | null} the 3-digit room code
 */
function getRoomCode(client) {
    return getPlayer(client)?.roomCode;
}

/**
 * A function that takes two arguements.
 * Gets the room using roomCode and uses team to get the player IDs.
 * The IDs are mapped to get the player names.
 * @param {String} roomCode the 3-digit room code
 * @param {Number} team RED/BLUE
 * @returns {String[]} the names of all the players on a certain team
 */
function getPlayerNames(roomCode, team) {
    return getRoom(roomCode)?.players[team].map(getPlayerName);
}

/**
 * A function that takes one arguement.
 * Uses the cached player data to retrieve the player's name.
 * @param {String} playerID the player ID
 * @returns {String} the player's name if the player is cached, otherwise, returns null
 */
function getPlayerName(playerID) {
    return players[playerID]?.name;
}

/**
 * A function that takes one arguement.
 * Uses socket's adapter to retrieve the clients connected to a certain room.
 * @param {String} roomCode the 3-digit room code
 * @returns {String[]} the player IDs that have joined the room
 */
function getPlayerIds(roomCode) {
    // Use socket's adapter to get players currently connected
    const playerIds = io.sockets.adapter.rooms.get(roomCode);
    // Convert into an array for easier use
    return playerIds == null ? [] : Array.from(playerIds);
}

/**
 * A function that takes one arguement.
 * Uses the cached room data to retrieve the ID of all the players currently in a team.
 * @param {String} roomCode the 3-digit room code
 * @returns {String[]} the player IDs that have joined a team
 */
function getJoinedPlayerIds(roomCode) {
    // Get cached data
    const room = getRoom(roomCode);

    // If the room isn't cached...
    if (room == null) return null;

    // Room is defined
    // Get the red and blue player IDs and filter out the undefined values
    return [...room.players[RED], ...room.players[BLUE]].filter((playerId) => playerId != null);
}

/**
 * A function that takes no arguements.
 * Uses the set of cached room data to retrieve an array of every room code
 * @returns {String[]} the room code of every room
 */
function getRoomCodes() {
    // As rooms is an object with keys (room codes) leading to values (room data)
    // The keys can be used to get the room codes
    return Object.keys(rooms);
}

/**
 * A function that takes one arguement.
 * Uses cached room data to compare the client and the active player.
 * @param {Socket} client any connected socket
 * @returns {Boolean | null} true if it is the client's turn, otherwise, false
 */
function isActive(client) {
    // Get cached data
    const roomCode = getRoomCode(client);

    // Get the player ID of whom's turn it is
    const activePlayerID = getActivePlayerId(roomCode);

    return activePlayerID ?? client.id == activePlayerID;
}

/**
 * A function that takes one arguement.
 * Uses the cached room data to retrive the player ID of whom's turn it is.
 * @param {String} roomCode the 3-digit room code
 * @returns {String | null} the id of the player whose turn it is
 */
function getActivePlayerId(roomCode) {
    // Get cached data
    const room = getRoom(roomCode);

    return room?.players[room.turn.team][room.turn.role];
}

// ----------------------------------------------------------------------------------------------------
