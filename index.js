
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5500;
app.use(express.static('public'));
app.use('/img', express.static('img'));

const RED = 1;
const GREEN = 2;
const BLUE = 3;
const INNOCENT = 4;
const ASSASSIN = 5;

const cardTypes = {
    1: {id: RED, imagePath: "img/cards/red.png"},
    2: {id: GREEN, imagePath: "img/cards/green.png"},
    3: {id: BLUE, imagePath: "img/cards/blue.png"},
    4: {id: INNOCENT, imagePath: "img/cards/innocent.png"},
    5: {id: ASSASSIN, imagePath: "img/cards/assassin.png"}
}

const defaultCardType = cardTypes[INNOCENT];

const words = require('./words.json').map(a => a.toUpperCase());

const rooms = {};

let round = 0;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(`${__dirname}/index.html`);
});

io.on('connection', (socket) => {
    // Socket Listeners
    socket.on('create-room', (username) => createRoom(socket, username));
    socket.on('join-room', (room_id) => joinRoom(socket, room_id));
    socket.on('join-team', (username, team, room_id) => joinTeam(socket, username, team, room_id));
    socket.on('new-game', (room_id) => newGame(room_id));
    socket.on('new-round', (room_id) => newRound(room_id));
    
    // ingame
    socket.on('guess-card', (pos, room_id) => guessCard(socket, pos, room_id));
    socket.on('give-clue', (clue, amount, sender, room_id) => giveClue(socket, clue, amount, sender, room_id));

    // leaving game
    socket.on('disconnect', () => handleDisconnection(socket));
});

function handleDisconnection(socket) {
    getRoomIds().forEach(room_id => {
        delete getPlayers(room_id)[socket.id];
        if (Object.keys(getPlayers(room_id)).length) {
            io.to(room_id).emit('update-players', getPlayers(room_id));
        } else {
            delete getRoom(room_id);
        }
    });
}

function setIds(arr, num, id) {
    i = 0;
    while (i < num) {
        let elem = rand(0, 25);

        if (arr[elem] != defaultCardType.id) continue;

        arr[elem] = id;
        i++;
    }
    return arr;
}

function randFrom(arr, count) {
    let rand_arr = [];
    i = 0;
    while (i < count) {
        rand_elem = arr[Math.floor(Math.random() * arr.length)];
        if (rand_arr.includes(rand_elem)) continue;
        rand_arr.push(rand_elem);
        i++;
    }
    return rand_arr;
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function createRoom(socket) {
    do { var room_id = rand(100, 999);
    } while (getRoomIds().includes(room_id.toString()));
    
    joinRoom(socket, newRoom(room_id), true);
}

function joinRoom(socket, room_id, host = false) {
    if (rooms[room_id] == null) return;
    if (!host && Array.from(io.sockets.adapter.rooms.get(room_id.toString())).length >= 4) return;

    // add player to room
    socket.join(room_id.toString());

    // announce to new player that they have joined
    socket.emit('joined-room', room_id, host);
    socket.emit('update-players', getPlayers(room_id));
}

function joinTeam(socket, username, team, room_id) {

    const players = getPlayers(room_id);

    // add player to room
    players[socket.id] = {name: username, team: team};

    // tell players about the new player that joined
    io.to(room_id.toString()).emit('update-players', players);
}

function newGame(room_id) {
    io.to(room_id.toString()).emit('new-game', getPlayers(room_id));
}

function newRound(room_id) {
    // create layout ids
    let card_ids = setIds( setIds( setIds( setIds(
        Array(25).fill(defaultCardType.id), 
        8, RED ),
        8, BLUE ),
        1, round%2 == 0 ? RED : BLUE ),
        1, ASSASSIN );

    // create layout texts
    let card_texts = randFrom(words, 25);

    // combine ids and texts
    cards = [];
    for (let i = 0; i < 25; i++) {
        cards.push({
            id: card_ids[i],
            text: card_texts[i],
            covered: false
        });
    }

    // increment round
    round++;

    // add cards to room
    getRoom(room_id).cards = cards;
    
    // broadcast new layout
    io.to(room_id.toString()).emit('new-round', getRoom(room_id).cards, getPlayers(room_id), round);
}

function guessCard(socket, pos, room_id) {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const card_index = arr.indexOf(pos.charAt(0)) + (parseInt(pos.charAt(1)) - 1) * 5;
    const card = getRoom(room_id).cards[card_index]
    if (card == null || card.covered) return;
    card.covered = true;
    //socket.emit('end-of-turn');
    io.to(room_id.toString()).emit('cover-card', pos, card.id);
}

function giveClue(socket, clue, amount, sender, room_id) {
    io.to(room_id.toString()).emit('recive-clue', clue.toUpperCase(), amount, sender);
}

function newRoom(id) {
    rooms[id] = {id: id, players: {}, data: {round: 0}, cards: []};
    return id;
}

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

http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});
