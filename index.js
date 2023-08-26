
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

// ----------------------------------------------------------------------------------------------------
// Import Data

//? get words from json file
const words = require('./words.json').map(a => a.toUpperCase());

// ----------------------------------------------------------------------------------------------------
// Caches for Rooms & Players

//TODO - COMMENT THIS
const rooms = {};
const players = {};

// ----------------------------------------------------------------------------------------------------
// Handle Sockets

//TODO - OPTIMIZE
io.on('connection', (socket) => {
    // Menu
    socket.on('create-room', (username) => createRoom(socket, username));
    socket.on('join-room', (room_id) => joinRoom(socket, room_id));
    socket.on('join-team', (username, team, room_id) => joinTeam(socket, username, team, room_id));
    socket.on('new-game', (room_id) => newGame(room_id));
    
    // ingame
    socket.on('new-round', (room_id) => newRound(room_id));
    socket.on('guess-card', (pos, room_id) => guessCard(socket, pos, room_id));
    socket.on('give-clue', (clue, amount, sender, room_id) => giveClue(socket, clue, amount, sender, room_id));

    // leaving game
    socket.on('disconnect', () => handleDisconnection(socket));
});

// ----------------------------------------------------------------------------------------------------
// Handle Disconnection

//? from a client
function handleDisconnection(socket) {
    getRoomIds().forEach(room_id => {
        // Delete any players with the id of the disconnect player
        delete getPlayers(room_id)[socket.id];

        // Notify all members that someone's left
        if (Object.keys(getPlayers(room_id)).length) {
            io.to(room_id).emit('update-players', getPlayers(room_id));
            return;
        }

        // Delete empty rooms
        delete getRoom(room_id);
    });
}

// ----------------------------------------------------------------------------------------------------
// Handle Creating & Joining Rooms

//TODO - OPTIMIZE
function newRoom(id) {
    rooms[id] = {id: id, players: {}, data: {first: randInt(2)}, cards: []};
    return id;
}

//TODO - OPTIMIZE
//? from a client
function createRoom(socket) {
    do { var roomId = randIntBetween(100, 999);
    } while (getRoomIds().includes(roomId.toString()));
    
    joinRoom(socket, newRoom(roomId), true);
}

//TODO - OPTIMIZE
//? from a client
function joinRoom(socket, room_id, host = false) {
    if (rooms[room_id] == null) return;
    if (!host && Array.from(io.sockets.adapter.rooms.get(room_id.toString())).length >= 4) return;

    // add player to room
    socket.join(room_id.toString());

    // announce to new player that they have joined
    socket.emit('joined-room', room_id, host);
    socket.emit('update-players', getPlayers(room_id));
}

//TODO - OPTIMIZE
//? from a client
function joinTeam(socket, username, team, room_id) {
    const roomPlayers = getPlayers(room_id);

    // Add player to room
    roomPlayers[socket.id] = {name: username, team: team};

    // Tell players about the new player that joined
    io.to(room_id.toString()).emit('update-players', roomPlayers);
}

// ----------------------------------------------------------------------------------------------------
// Start a New Game

//TODO - OPTIMIZE
//? from a client
function newGame(room_id) {
    io.to(room_id.toString()).emit('new-game', getPlayers(room_id));
}

// ----------------------------------------------------------------------------------------------------
// Start a New Round

//TODO - OPTIMIZE
function setIds(arr, num, id) {
    i = 0;
    while (i < num) {
        let elem = randInt(25);

        if (arr[elem] != DEFAULT) continue;

        arr[elem] = id;
        i++;
    }
    return arr;
}

//TODO - OPTIMIZE
//? from a client
function newRound(room_id) {
    // Change which team goes first
    getRoom(room_id).data.first = (getRoom(room_id).data.first == RED) ? BLUE : RED;

    // Create layout ids
    let card_ids = setIds( setIds( setIds( setIds(
        Array(25).fill(DEFAULT), 
        8, RED ),
        8, BLUE ),
        1, getRoom(room_id).data.first ),
        1, ASSASSIN );

    // Create layout texts
    let card_texts = randFrom(words, 25);

    // Combine ids and texts
    cards = [];
    for (let i = 0; i < 25; i++) {
        cards.push({
            id: card_ids[i],
            text: card_texts[i],
            covered: false
        });
    }

    // Add cards to room
    getRoom(room_id).cards = cards;
    
    // Broadcast new layout
    io.to(room_id.toString()).emit('new-round', getRoom(room_id).cards, getPlayers(room_id));
}

// ----------------------------------------------------------------------------------------------------
// Handle Guessing Cards

//TODO - OPTIMIZE
//? from a client
function guessCard(socket, pos, room_id) {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const card_index = arr.indexOf(pos.charAt(0)) + (parseInt(pos.charAt(1)) - 1) * 5;
    const card = getRoom(room_id).cards[card_index]
    if (card == null || card.covered) return;
    card.covered = true;
    //socket.emit('end-of-turn');
    io.to(room_id.toString()).emit('cover-card', pos, card.id);
}

// ----------------------------------------------------------------------------------------------------
// Handle Giving Clues

//TODO - OPTIMIZE
//? from a client
function giveClue(socket, clue, amount, sender, room_id) {
    io.to(room_id.toString()).emit('recive-clue', clue.toUpperCase(), amount, sender);
}

// ----------------------------------------------------------------------------------------------------
// 
// ----------------------------------------------------------------------------------------------------
// 
// ----------------------------------------------------------------------------------------------------
// 
// ----------------------------------------------------------------------------------------------------
// Room Functions

//TODO - OPTIMIZE
function getRoom(id) {
    const room = rooms[id];

    if (room == null) {
        console.log(`ERROR || Room not found:\nRoom id of ${id} does not exist`);
        return {id: id, players: {}, data: {round: 0}, cards: []};
    }
    return room;
}

function getPlayers(id) {
    return getRoom(id).players;
}

function getRoomIds() {
    return Object.keys(rooms);
}

// ----------------------------------------------------------------------------------------------------


