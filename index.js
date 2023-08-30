
// ----------------------------------------------------------------------------------------------------
// Import Functions

const {randIntBetween, randInt, randFrom} = require('./func.js');

// ----------------------------------------------------------------------------------------------------
// Initiate Server

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5500;
app.use(express.static('public'));
app.use('/img', express.static('img'));

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
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

const RED_CODEMASTER = 0;
const RED_OPPERATIVE = 1;
const BLUE_CODEMASTER = 2;
const BLUE_OPPERATIVE = 3;

const COLUMNS = ['a', 'b', 'c', 'd', 'e'];

// ----------------------------------------------------------------------------------------------------
// Import Data

//? get words from json file
const words = require('./words.json').map(a => a.toUpperCase());

// ----------------------------------------------------------------------------------------------------
// Caches for Rooms & Players

/*
rooms: {
    <room-code>: {
        roomCode: <room-code>,
        players: [
            <red-codemaster-id>,
            <red-opperative-id>,
            <blue-codemaster-id>,
            <blue-opperative-id>
        ],
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
        turn: <turn-id>,
        first: <team-going-first>,
        scores: {
            1: <red-score>,
            2: <blue-score>
        },
        guessesLeft: <#-of-guesses-left>,
        missed: {
            1: <#-of-cards-red-missed>,
            2: <#-of-cards-blue-missed>
        }
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
        name: <player-name>
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
io.on('connection', client => {

    // Home screen
    client.on('create-room', (...args) => createRoom(client, ...args));
    client.on('join-room', (...args) => joinRoom(client, ...args));
    client.on('join-team', (...args) => joinTeam(client, ...args));
    client.on('new-game', () => newGame(client));
    
    // game screen
    client.on('pass-guess', () => passGuess(client));
    client.on('guess-card', (...args) => guessCard(client, ...args));
    client.on('give-clue', (...args) => giveClue(client, ...args));

    // game over screen
    client.on('ping-change-teams', () => pingChangeTeams(client));
    client.on('change-teams', () => changeTeams(client));
    client.on('next-game', () => nextGame(client));
    client.on('leave-game', () => leaveGame(client));

    // leaving game
    client.on('disconnect', () => leaveGame(client));
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
        name: nickname
    };
}

function uncachePlayer(client) {
    delete players[client.id];
}

function newRoom(roomCode) {
    
    rooms[roomCode] = {
        roomCode: roomCode,
        players: [],
        host: null,
        cards: {},
        first: randInt(2),
        scores: {},
        guessesLeft: 0,
        missed: {1: 0, 2: 0}
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
    COLUMNS.forEach(column => {
        for (let row = 1; row <= 5; row++) {
            let pos = column + row;
            room.cards[pos] = {
                pos: pos,
                id: INNOCENT,
                text: '',
                covered: false
            }
        }
    });

    return roomCode;
}

//TODO - OPTIMIZE
//? from a client
function createRoom(client, nickname) {
    do { var roomCode = randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString();
    } while (getRoomCodes().includes(roomCode));
    
    joinRoom(client, newRoom(roomCode), nickname, true);
}

//TODO - OPTIMIZE
//? from a client
function joinRoom(client, roomCode, nickname, isHost = false) {
    if (rooms[roomCode] == null) return;
    if (!isHost && Array.from(io.sockets.adapter.rooms.get(roomCode)).length >= 4) return;

    // Add player to room
    client.join(roomCode);
    cachePlayer(client, roomCode, nickname);
    if (isHost) getRoom(roomCode).host = client.id;

    // Announce to new player that they have joined
    client.emit('joined-room', roomCode, isHost);
    client.emit('update-players', getNamesOfPlayersIn(roomCode, RED), getNamesOfPlayersIn(roomCode, BLUE));
}

//? uncachePlayer must NOT be called before leaveRoom
function leaveRoom(client) {
    if (players[client.id] == null) return;

    const roomCode = players[client.id].roomCode;

    // Dont need to announce leaving a room if player isn't in a room
    if (roomCode == null) return;

    const room = rooms[roomCode];
    const playerIds = room.players;

    client.leave(roomCode);
    rooms[roomCode].players.splice(rooms[roomCode].players.indexOf(client.id), 1);

    // If anyone is left in the room...
    if (playerIds.length) {
        // Tell players this player left the room
        io.to(roomCode).emit('update-players', getNamesOfPlayersIn(roomCode, RED), getNamesOfPlayersIn(roomCode, BLUE));
        return;
    }

    delete room;
}

//TODO - OPTIMIZE
//? from a client
function joinTeam(client, team) {
    const roomCode = getRoomCode(client);
    const roomPlayers = getRoom(roomCode).players;

    // Set player team
    getPlayer(client).team = team;

    // Remove player from the team they left
    const i = roomPlayers.indexOf(client.id);
    if (i != -1) {
        roomPlayers.splice(i, 1);
    }

    // Add player to room
    if (team == RED) roomPlayers.unshift(client.id);
    else roomPlayers.push(client.id);

    // Tell players about the new player that joined
    io.to(roomCode).emit('update-players', getNamesOfPlayersIn(roomCode, RED), getNamesOfPlayersIn(roomCode, BLUE));
}

// ----------------------------------------------------------------------------------------------------
// Start a New Game

//TODO - OPTIMIZE
//? from a client
function newGame(client) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Must have 4 players
    if (getNamesOfPlayersIn(roomCode, RED).length != 2 || getNamesOfPlayersIn(roomCode, BLUE).length != 2) return;

    // Only allow host to start the game
    if (room.host != client.id) return;

    room.players.forEach((playerId, i) => {
        io.to(playerId).emit('new-game', getNamesOfPlayersIn(roomCode), (RED_CODEMASTER == i || BLUE_CODEMASTER == i));
    });

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

//TODO - OPTIMIZE
//? from a client
function newRound(client) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Change which team goes first
    room.first = (room.first != RED) ? RED : BLUE;

    room.turn = (room.first == RED) ? RED_CODEMASTER : BLUE_CODEMASTER;

    // Change who is code master
    //? [0, 1, 2, 3] => [1, 0, 3, 2]
    room.players = room.players.splice(0, 2).reverse().concat(room.players.splice(0, 2).reverse());
    
    // Create layout ids
    const cardIds = setCards( setCards( setCards( setCards(
        Array(25).fill(DEFAULT), 
        8, RED ),
        8, BLUE ),
        1, room.first ),
        1, ASSASSIN );

    // Create layout texts
    const card_texts = randFrom(words, 25);

    // Combine ids and texts
    const cards = room.cards;
    Object.keys(cards).forEach((pos, i) => {
        cards[pos] = {
            pos: pos,
            id: cardIds[i],
            text: card_texts[i],
            covered: false
        };
    });

    // Create new scores
    room.scores = {1: 8, 2: 8};
    room.scores[room.first] += 1;
    
    // Broadcast new layout
    room.players.forEach(playerId => {
        const alteredCards = Object.values(cards).map(card => ({...card}));
        const spymaster = (room.players[RED_CODEMASTER] == playerId || room.players[BLUE_CODEMASTER] == playerId);
        if (!spymaster) alteredCards.forEach(card => card.id = INNOCENT);
        const turn = room.turn;
        const scores = room.scores;
        const first = room.first;
        io.to(playerId).emit('new-round', alteredCards, spymaster, turn, scores, first);
    });
}

// ----------------------------------------------------------------------------------------------------
// Handle Guessing Cards

//? from a client
function guessCard(client, pos) {
    // Get room code
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Handle cheaters
    if (client.id != getActivePlayerId(roomCode)) return;

    // Get guessed card
    const card = room.cards[pos];
    if (card == null || card.covered) return;

    // Cover guessed card
    card.covered = true;
    if (room.scores[card.id] != null) room.scores[card.id] -= 1;
    room.guessesLeft -= 1;
    io.to(roomCode).emit('cover-card', pos, card.id);
    client.emit('made-guess', room.scores, room.guessesLeft);

    // Handle game over
    handleGameOver(client, card);

    // Right guess: Go again
    const isCorrect = getPlayer(client).team == card.id;
    const hasBonusGuess = room.guessesLeft == 0 && room.missed[getPlayer(client).team];
    if (isCorrect && hasBonusGuess) room.missed[getPlayer(client).team] -= 1;

    if (isCorrect && (room.guessesLeft > 0 || hasBonusGuess)) return;

    // Wrong guess: Next turn
    handleMissingCards(client);
    nextTurn(client);
}

function passGuess(client) {
    const roomCode = getRoomCode(client);

    // Handle cheaters
    if (client.id != getActivePlayerId(roomCode)) return;

    handleMissingCards(client);
    nextTurn(client);
}

function handleMissingCards(client) {
    const room = getRoom(getRoomCode(client));

    if (room.guessesLeft > 0) room.missed[getPlayer(client).team] += room.guessesLeft;
}

function handleGameOver(client, card) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    if (room.scores[card.id] <= 0) {
        io.to(roomCode).emit('game-over', card.id, 'Found All Agents')
        return;
    }

    if (card.id == ASSASSIN) {
        io.to(roomCode).emit('game-over', getPlayer(client).team != RED ? RED : BLUE, 'Found The Assassin')
        return;
    }
}

// ----------------------------------------------------------------------------------------------------
// Handle Giving Clues

//? from a client
function giveClue(client, clue, amount) {
    // Get room code
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);

    // Handle cheaters
    if (client.id != getActivePlayerId(roomCode)) return;
    if (!clue) return;

    room.guessesLeft = amount;
    io.to(roomCode).emit('recive-clue', clue.toUpperCase(), amount, getPlayer(client).name, getPlayer(client).team);

    // Next Turn
    nextTurn(client, amount);
}

// ----------------------------------------------------------------------------------------------------
// Handle Turns

function nextTurn(client, amount=0) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    
    room.turn = (room.turn + 1) % 4;

    io.to(roomCode).emit('next-turn', room.turn, amount);
}

// ----------------------------------------------------------------------------------------------------
// Game Over Screen

function changeTeams(client) {
    const roomCode = getRoomCode(client);
    const room = getRoom(roomCode);
    const playerIds = room.players;
    
    playerIds.forEach(playerId => {
        io.to(playerId).emit('joined-room', roomCode);
        io.to(playerId).emit('update-players', getNamesOfPlayersIn(roomCode, RED), getNamesOfPlayersIn(roomCode, BLUE));
    });
}

function nextGame(client) {
    newRound(client);
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

    console.log(`ERROR || Player not found:\nPlayer id of ${client.id} does not exist`);
    return {id: client.id, room: null, name: '<<<ERROR>>>'};
}

function getRoomCode(client) {
    const player = getPlayer(client);
    if (player != null) return player.roomCode;

    console.log(`ERROR || Player not found:\nPlayer id of ${client.id} does not exist`);
    return null;
}

//TODO - OPTIMIZE
function getRoom(roomCode) {
    const room = rooms[roomCode];
    if (room != null) return room;

    console.log(`ERROR || Room not found:\nRoom code of ${roomCode} does not exist`);
    return {code: roomCode, players: [], cards: {}, first: 0, scores: {}, guessesLeft: 0, missed: {1: 0, 2: 0}};
}

function getNamesOfPlayersIn(roomCode, team = null) {
    if (team == null) {
        return getRoom(roomCode).players.map(playerId => players[playerId].name);
    }

    return getRoom(roomCode).players.filter(playerId => players[playerId].team == team).map(playerId => players[playerId].name);
}

function getRoomCodes() {
    return Object.keys(rooms);
}

function getActivePlayerId(roomCode) {
    const room = getRoom(roomCode);

    return room.players[room.turn];
}

// ----------------------------------------------------------------------------------------------------


