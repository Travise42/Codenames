
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

const words = require('./words.json');

// {<room-id>: {id: <number>, data: {round: <number>}, cards: [{id: <number>, text: <string>, covered: <boolean>}, ...]}, ...}
const rooms = {};

let round = 0;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.on('create-room', (username) => createRoom(socket, username));
    socket.on('join-room', (username, room_id) => joinRoom(socket, username, room_id));
    socket.on('new-game', (room_id) => newGame(room_id));
    socket.on('new-round', (room_id) => newRound(room_id));

    socket.on('disconnect', () => {
        Object.keys(rooms).forEach(room_id => {
            delete rooms[room_id].players[socket.id]
            io.to(room_id).emit('update-players', rooms[room_id].players);
        });
    })
});

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

function createRoom(socket, username) {
    do { var room_id = rand(100, 999);
    } while (Object.keys(rooms).includes(room_id.toString()));
    
    rooms[room_id] = {id: room_id, players: {}, data: {round: 0}, cards: []};
    rooms[room_id].players[socket.id] = username;

    console.log(room_id);
    socket.join(room_id.toString())
    socket.emit('joined-room', room_id, true);
    io.to(room_id.toString()).emit('update-players', rooms[room_id].players);
}

function joinRoom(socket, username, room_id) {
    if (rooms[room_id] == null) return;
    const players = rooms[room_id].players;
    if (players.length >= 4) return;

    // announce to new player that they have joined
    socket.emit('joined-room', room_id, false);
    players[socket.id] = username;
    socket.join(room_id.toString())

    // tell players about the new player that joined
    io.to(room_id.toString()).emit('update-players', players);
}

function newGame(room_id) {
    io.to(room_id.toString()).emit('new-game')
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
    rooms[room_id].cards = cards;
    
    // broadcast new layout
    io.emit('new-round', rooms[room_id].cards);
}

http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});
