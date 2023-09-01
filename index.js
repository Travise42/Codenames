// ----------------------------------------------------------------------------------------------------
// Import Functions

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

http.listen(port, () => console.log(`Socket.IO server running at http://localhost:${port}/`));

// ----------------------------------------------------------------------------------------------------
// Define Constants

////const GREEN = 2;
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
        status: <current-screen>
    }
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

//TODO - OPTIMIZE
io.on("connection", (client) => {
    // Home screen
    client.on("create-room", (...args) => createRoom(client, ...args));
    client.on("join-room", (roomCode, nickname, isHost = false) => joinRoom(client, roomCode, nickname));
    client.on("join-team", (...args) => joinTeam(client, ...args));
    client.on("leave-team", () => leaveTeam(client));
    client.on("new-game", () => newGame(client));

    // game screen
    client.on("pass-guess", () => passGuess(client));
    client.on("guess-card", (...args) => guessCard(client, ...args));
    client.on("give-clue", (...args) => giveClue(client, ...args));

    // game over screen
    client.on("change-teams", () => changeTeams(client));
    client.on("next-game", () => nextGame(client));
    client.on("leave-game", () => leaveGame(client));

    // leaving game
    client.on("disconnect", () => leaveGame(client));
});

// ----------------------------------------------------------------------------------------------------
// Handle Creating & Joining Rooms

// Add player to cached players
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

function uncachePlayer(client) {
    delete players[client.id];
}

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

//TODO - OPTIMIZE
//? from a client
function createRoom(client, nickname) {
    do {
        var roomCode =
            randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString();
    } while (getRoomCodes().includes(roomCode));

    joinRoom(client, newRoom(roomCode), nickname, true);
}

//TODO - OPTIMIZE
//? from a client
function joinRoom(client, roomCode, nickname, isHost = false) {
    if (rooms[roomCode] == null) return;
    if (!isHost && Array.from(io.sockets.adapter.rooms.get(roomCode)).length >= 4) return;

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
    io.to(roomCode).emit("player-left", player.team, player.role, room.status, room.host);

    // Remove player from room
    room.players[player.team][player.role] = null;
    client.leave(roomCode);

    // If no one is left in the room...
    if (redMembers[0] == null && redMembers[1] == null && blueMembers[0] == null && blueMembers[1] == null) {
        delete room;
        return;
    }

    // Tell players this player left the room
    Array.from(io.sockets.adapter.rooms.get(roomCode)).forEach((playerId) => {
        io.to(playerId).emit(
            "update-players",
            getPlayerNames(roomCode, RED),
            getPlayerNames(roomCode, BLUE),
            room.status,
            players[playerId] == null ? null : players[playerId].role
        );
    });
}

//TODO - OPTIMIZE
//? from a client
function joinTeam(client, team) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    const player = getPlayer(client);

    if (player.team == team || !getPlayerNames(roomCode, team).includes(null)) return;

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
            Object.values(room.cards),
            player.role,
            [SPYMASTER, OPPERATIVE],
            room.turn,
            room.scores
        );
    }

    // Tell players about the new player that joined
    Array.from(io.sockets.adapter.rooms.get(roomCode)).forEach((playerId) => {
        io.to(playerId).emit(
            "update-players",
            getPlayerNames(roomCode, RED),
            getPlayerNames(roomCode, BLUE),
            room.status,
            players[playerId] == null ? null : players[playerId].role
        );
    });
}

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

function getEmptySpaceOnTeam(roomCode, playerTeam) {
    const room = getRoom(roomCode);
    if (room.players[playerTeam][0] == null) return 0;
    if (room.players[playerTeam][1] == null) return 1;
    return null;
}

// ----------------------------------------------------------------------------------------------------
// Start a New Game

//TODO - OPTIMIZE
//? from a client
function newGame(client) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Must have 4 players
    if (getPlayerNames(roomCode, RED).includes(null) || getPlayerNames(roomCode, BLUE).includes(null)) return;

    // Only allow host to start the game
    if (room.host != client.id) return;

    Object.values(room.players).forEach((teamMembers) => {
        teamMembers.forEach((playerId, role) => {
            io.to(playerId).emit("new-game", getPlayerNames(roomCode, RED), getPlayerNames(roomCode, BLUE), role);
        });
    });

    room.status = "game";
    newRound(client);
}

// ----------------------------------------------------------------------------------------------------
// Start a New Round

//TODO - OPTIMIZE
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
function rotateRoles() {
    [SPYMASTER, OPPERATIVE] = [OPPERATIVE, SPYMASTER];
}

//TODO - OPTIMIZE
//? from a client
function newRound(client) {
    rotateRoles();

    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

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
    const card_texts = randFrom(words, 25);

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

//? from a client
function guessCard(client, pos) {
    // Get room code
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    const player = getPlayer(client);

    // Handle cheaters
    // Make sure it is the player's turn
    if (!isActive(client)) return;

    // Get guessed card
    const card = room.cards[pos];
    if (card == null || card.covered) return;

    // Cover guessed card
    card.covered = true;
    // If card is RED or BLUE, then decrease score of the card's team
    if (room.scores[card.id] != null) room.scores[card.id] -= 1;
    // Decrease player's guesses left
    room.guessesLeft -= 1;
    // Tell members to cover the chosen card
    io.to(roomCode).emit("cover-card", pos, card.id, room.scores);
    // Tell player that they made a valid guess
    client.emit("made-guess", room.guessesLeft);

    // Handle game over
    handleGameOver(client, card);

    // Right guess: Go again
    const guessIsCorrect = player.team == card.id;
    const playerHasBonusGuess = room.guessesLeft == 0 && 0 < room.missedCards[player.team];
    const playerHasAnotherGuess = 0 < room.guessesLeft;

    if (guessIsCorrect && playerHasBonusGuess) room.missedCards[player.team] -= 1;
    if (guessIsCorrect && (playerHasAnotherGuess || playerHasBonusGuess)) return;

    // Wrong guess: Next turn
    room.guessesLeft += 1;
    handleNewMissedCards(client);
    nextTurn(client);
}

function passGuess(client) {
    // Handle cheaters
    // Make sure it is the player's turn
    if (!isActive(client)) return;

    handleNewMissedCards(client);
    nextTurn(client);
}

function handleNewMissedCards(client) {
    const room = getRoom(getRoomCode(client));
    if (room == null) return;

    if (0 < room.guessesLeft) room.missedCards[getPlayer(client).team] += room.guessesLeft;
}

function handleGameOver(client, card) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    if (room == null) return;

    const teamHasNoCardsLeft = room.scores[card.id] <= 0;

    if (teamHasNoCardsLeft) {
        // Tell all members that all agents are found
        io.to(roomCode).emit("game-over", card.id, "Found All Agents");
        room.status = "game-over";

        return;
    }

    if (card.id == ASSASSIN) {
        // Tell all members that the assassin was chosen
        io.to(roomCode).emit("game-over", getPlayer(client).team != RED ? RED : BLUE, "Found The Assassin");
        room.status = "game-over";
    }
}

// ----------------------------------------------------------------------------------------------------
// Handle Giving Clues

//? from a client
function giveClue(client, clue, amount) {
    // Get room code
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    if (room == null) return;

    // Handle cheaters
    // Make sure it is the player's turn
    if (!isActive(client)) return;
    // Make sure the clue has content
    if (!clue) return;

    // Reset opperative's guesses left
    room.guessesLeft = amount;
    // Tell everyone about the new clue
    io.to(roomCode).emit("recive-clue", clue.toUpperCase(), amount, getPlayer(client).name, getPlayer(client).team);

    // Next Turn
    nextTurn(client, amount);
}

// ----------------------------------------------------------------------------------------------------
// Handle Turns

function nextTurn(client, amount = 0) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    if (room == null) return;

    if (room.turn.role == SPYMASTER) {
        room.turn.role = OPPERATIVE;
    } else {
        room.turn.team = room.turn.team != RED ? RED : BLUE;
        room.turn.role = SPYMASTER;
    }

    io.to(roomCode).emit("next-turn", room.turn, amount);
}

// ----------------------------------------------------------------------------------------------------
// Game Over Screen

function changeTeams(client) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    if (room == null) return;

    room.status = "lobby";
    Array.from(io.sockets.adapter.rooms.get(roomCode)).forEach((playerId) => {
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

function nextGame(client) {
    newRound(client);
    const room = getRoom(getRoomCode(client));
    if (room == null) return;

    room.status = "game";
}

function leaveGame(client) {
    leaveRoom(client);
    uncachePlayer(client);
}

// ----------------------------------------------------------------------------------------------------
//
// ----------------------------------------------------------------------------------------------------
// Room Functions

function getPlayer(client) {
    const player = players[client.id];
    if (player != null) return player;

    // Player is not cached
    console.log(`ERROR || Player not found:\nPlayer id of ${client.id} does not exist`);
    return null;
}

function getRoomCode(client) {
    const player = getPlayer(client);
    return player.roomCode;
}

//TODO - OPTIMIZE
function getRoom(roomCode) {
    const room = rooms[roomCode];
    if (room != null) return room;

    // Room code does not exist
    console.log(`ERROR || Room not found:\nRoom code of ${roomCode} does not exist`);
    return null;
}

function getPlayerNames(roomCode, team) {
    const room = getRoom(roomCode);
    if (room == null) return null;

    return room.players[team].map(getPlayerName);
}

function getPlayerName(playerId) {
    return playerId == null ? null : players[playerId].name;
}

function getPlayerIds(roomCode) {
    const room = getRoom(roomCode);
    if (room == null) return;

    const playerIds = [];

    Object.values(room.players).forEach((teamMembers) => {
        //TODO - TRY WITHOUT PARAMETERS
        teamMembers.forEach((playerId) => playerIds.push(playerId));
    });

    return playerIds;
}

function getJoinedPlayerIds(roomCode) {
    const room = getRoom(roomCode);
    if (room == null) return null;

    const playerIds = [];

    Object.values(room.players).forEach((teamMembers) => {
        teamMembers.forEach((playerId) => {
            if (playerId == null) return;
            playerIds.push(playerId);
        });
    });

    return playerIds;
}

function getRoomCodes() {
    return Object.keys(rooms);
}

// Check if it is the player's turn
function isActive(client) {
    return client.id == getActivePlayerId(getRoomCode(client));
}

function getActivePlayerId(roomCode) {
    const room = getRoom(roomCode);
    if (room == null) return;

    return room.players[room.turn.team][room.turn.role];
}

// ----------------------------------------------------------------------------------------------------
