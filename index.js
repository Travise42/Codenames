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

let round = 0;
let flip_delay = false;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.on('create-new-round', () => {
        if (flip_delay) return;
        flip_delay = true;

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
                text: card_texts[i]
            });
        }

        // increment round
        round++;
        
        // broadcast new layout
        io.emit('new-round', cards);
        setTimeout(() => flip_delay = false, 800);
    });
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

http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});