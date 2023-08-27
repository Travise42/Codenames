
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

const RED = 1;
const GREEN = 2;
const BLUE = 3;
const INNOCENT = 4;
const ASSASSIN = 5;

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
        code: <room-code>,
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
        first: <team-going-first>
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
        room: <room-code>,
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
io.on('connection', (socket) => {

    // Menu
    socket.on('create-room', (nickname) => createRoom(socket, nickname));
    socket.on('join-room', (room, nickname) => joinRoom(socket, room, nickname, false));
    socket.on('join-team', (team) => joinTeam(socket, team));
    socket.on('new-game', () => newGame(socket));
    
    // ingame
    socket.on('new-round', () => newRound(socket));
    socket.on('guess-card', (pos) => guessCard(socket, pos));
    socket.on('give-clue', (clue, amount, sender) => giveClue(socket, clue, amount, sender));

    // leaving game
    socket.on('disconnect', () => handleDisconnection(socket));
});

// ----------------------------------------------------------------------------------------------------
// Handle Disconnection

//? from a client
function handleDisconnection(socket) {
    // Get room code of disconnect player
    if (players[socket.id] == null) return;
    const roomCode = getRoomCode(socket);
    if (roomCode == null) return;

    // Delete any players with the id of the disconnect player
    delete getIdsOfPlayersIn(roomCode)[socket.id];

    // Notify all members that someone left
    if (getIdsOfPlayersIn(roomCode).length) {
        io.to(roomCode).emit('update-players', getNamesOfPlayersIn(roomCode, RED), getNamesOfPlayersIn(roomCode, BLUE));
        return;
    }

    // Delete empty rooms
    delete getRoom(roomCode);
}

// ----------------------------------------------------------------------------------------------------
// Handle Creating & Joining Rooms

// Add player to cached players
function cachePlayer(socket, roomCode, nickname) {
    /*
    <player-id>: {
        id: <player-id>,
        room: <room-code>,
        name: <player-name>
    }
    */
    players[socket.id] = {
        id: socket.id,
        room: roomCode,
        name: nickname
    };
}

function newRoom(roomCode) {
    rooms[roomCode] = {code: roomCode, players: [], cards: {}, first: randInt(2)};

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

    COLUMNS.forEach(column => {
        for (let row = 1; row <= 5; row++) {
            let pos = column + row;
            rooms[roomCode].cards[pos] = {
                pos: pos,
                id: 4,
                text: '',
                covered: false
            }
        }
    });

    return roomCode;
}

//TODO - OPTIMIZE
//? from a client
function createRoom(socket, nickname) {
    do { var roomCode = randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString() + randIntBetween(0, 10).toString();
    } while (getRoomCodes().includes(roomCode));
    
    joinRoom(socket, newRoom(roomCode), nickname, true);
}

//TODO - OPTIMIZE
//? from a client
function joinRoom(socket, roomCode, nickname, isHost = false) {
    if (rooms[roomCode] == null) return;
    if (!isHost && Array.from(io.sockets.adapter.rooms.get(roomCode)).length >= 4) return;

    // Add player to room
    socket.join(roomCode);
    cachePlayer(socket, roomCode, nickname);

    // Announce to new player that they have joined
    socket.emit('joined-room', roomCode, isHost);
    socket.emit('update-players', getNamesOfPlayersIn(roomCode, RED), getNamesOfPlayersIn(roomCode, BLUE));
}

//TODO - OPTIMIZE
//? from a client
function joinTeam(socket, team) {
    const roomCode = getRoomCode(socket);

    // Set player team
    getPlayer(socket).team = team;

    // Remove player from the team they left
    const i = getRoom(roomCode).players.indexOf(socket.id);
    if (i != -1) {
        getRoom(roomCode).players.splice(i, 1);
    }

    // Add player to room
    if (getPlayer(socket).team == RED) getRoom(roomCode).players.unshift(getPlayer(socket).id);
    else getRoom(roomCode).players.push(getPlayer(socket).id);

    // Tell players about the new player that joined
    io.to(roomCode).emit('update-players', getNamesOfPlayersIn(roomCode, RED), getNamesOfPlayersIn(roomCode, BLUE));
}

// ----------------------------------------------------------------------------------------------------
// Start a New Game

//TODO - OPTIMIZE
//? from a client
function newGame(socket) {
    const roomCode = getRoomCode(socket);
    io.to(roomCode).emit('new-game', getNamesOfPlayersIn(roomCode));
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
function newRound(socket) {
    const roomCode = getRoomCode(socket);
    // Change which team goes first
    getRoom(roomCode).first = (getRoom(roomCode).first == RED) ? BLUE : RED;

    // Change who is code master
    const players = getRoom(roomCode).players;
    var temp = [players[1], players[0], players[3], players[2]];
    players[0] = temp[0]; players[1] = temp[1]; players[2] = temp[2]; players[3] = temp[3];
    
    // Create layout ids
    const cardIds = setCards( setCards( setCards( setCards(
        Array(25).fill(DEFAULT), 
        8, RED ),
        8, BLUE ),
        1, getRoom(roomCode).first ),
        1, ASSASSIN );

    // Create layout texts
    const card_texts = randFrom(words, 25);

    // Combine ids and texts
    const cards = getRoom(roomCode).cards;
    Object.keys(cards).forEach((pos, i) => {
        cards[pos] = {
            pos: pos,
            id: cardIds[i],
            text: card_texts[i],
            covered: false
        }
    });
    
    // Broadcast new layout
    getIdsOfPlayersIn(roomCode).forEach(playerId => {
        const alteredCards = Object.values(cards).map(card => ({...card}));
        const codeMaster = (players[RED_CODEMASTER] == playerId || players[BLUE_CODEMASTER] == playerId);
        if (!codeMaster) alteredCards.forEach(card => card.id = 4);
        io.to(playerId).emit('new-round', alteredCards, codeMaster);
    });
}

// ----------------------------------------------------------------------------------------------------
// Handle Guessing Cards

//TODO - OPTIMIZE
//? from a client
function guessCard(socket, pos) {
    // Get room code
    const roomCode = getRoomCode(socket);

    // Get guessed card
    const card = getRoom(roomCode).cards[pos];
    if (card == null || card.covered) return;

    // Cover guessed card
    card.covered = true;
    io.to(roomCode).emit('cover-card', pos, card.id);
}

// ----------------------------------------------------------------------------------------------------
// Handle Giving Clues

//TODO - OPTIMIZE
//? from a client
function giveClue(socket, clue, amount, sender) {
    // Get room code
    const roomCode = getRoomCode(socket);

    /* //TODO deal with hackers using this code
    if (!clue_element.value) return;

    const card_poses = Array.from(document.querySelector('.card-container').children);
    const duplicates = [];
    card_poses.forEach((card_pos) => {
        const card = card_pos.firstChild;
        const inner = card.firstChild;
        if (inner.lastChild.className == 'card-cover') return;
        removeClass(card_pos, 'invalid');
        if (clue_element.value.toLowerCase() == inner.firstChild.lastChild.textContent.toLowerCase()) duplicates.push(card_pos);
    });
    if (duplicates.length) {
        duplicates.forEach((card_pos) => {
            addClass(card_pos, 'invalid');
        });
        return;
    }
    */

    io.to(roomCode).emit('recive-clue', clue.toUpperCase(), amount, sender);
}

// ----------------------------------------------------------------------------------------------------
// 
// ----------------------------------------------------------------------------------------------------
// 
// ----------------------------------------------------------------------------------------------------
// 
// ----------------------------------------------------------------------------------------------------
// Room Functions

function getPlayer(socket) {
    const player = players[socket.id]
    if (player != null) return player;

    console.log(`ERROR || Player not found:\nPlayer id of ${socket.id} does not exist`);
    return {id: socket.id, room: null, name: '<<<ERROR>>>'};
}

function getRoomCode(socket) {
    const player = players[socket.id]
    if (player != null) return player.room;

    console.log(`ERROR || Player not found:\nPlayer id of ${socket.id} does not exist`);
    return null;
}

//TODO - OPTIMIZE
function getRoom(roomCode) {
    const room = rooms[roomCode];
    if (room != null) return room;

    console.log(`ERROR || Room not found:\nRoom code of ${roomCode} does not exist`);
    return {code: roomCode, players: [], cards: {}, first: 0};
}

function getIdsOfPlayersIn(roomCode) {
    return getRoom(roomCode).players;
}

function getNamesOfPlayersIn(roomCode, team = null) {
    if (team == null) {
        return getIdsOfPlayersIn(roomCode).map(playerId => players[playerId].name);
    }

    return getIdsOfPlayersIn(roomCode).filter(playerId => players[playerId].team == team ).map(playerId => players[playerId].name);
}

function getRoomCodes() {
    return Object.keys(rooms);
}

// ----------------------------------------------------------------------------------------------------


