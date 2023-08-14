
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

const socket = io();

let username;
let room;
let host;

initName();

function initName() {
    const play_button = document.getElementById('play-button');
    play_button.addEventListener('click', initHome);
}

function initHome() {
    username = document.getElementById('name-input').value;
    removeNameScreen();
    createHomeScreen();
}

function removeNameScreen() {
    document.querySelector('.play-button-container').remove();
}

function createHomeScreen() {
    // get header
    const header = document.getElementById('header');

    // create join room button and input
    const join_room_contianer = newElem('div', 'join-room-container');

    const join_room_button = newElem('button', null, 'join-room-button');
    join_room_button.textContent = 'Join Room';
    const join_room_input = newElem('input', null, 'join-room-input');
    join_room_input.type = 'tel';
    join_room_input.name = 'join-room-input';
    join_room_input.placeholder = 'Room Code';

    addChild(join_room_contianer, join_room_button);
    addChild(join_room_contianer, join_room_input);

    // add join room button and input to screen
    addChild(header, join_room_contianer);

    join_room_button.addEventListener('click', () => joinRoom(join_room_input.value));

    // create create room button
    const create_room_contianer = newElem('div', 'create-room-container');

    const create_room_button = newElem('button', null, 'create-room-button');
    create_room_button.textContent = 'Create Room';

    addChild(create_room_contianer, create_room_button);

    // add create room button to screen
    addChild(header, create_room_contianer);

    create_room_button.addEventListener('click', createRoom);
}

function createRoom() {
    socket.emit('create-room', username);
}

function joinRoom(room_id) {
    socket.emit('join-room', username, room_id);
}

socket.on('joined-room', (room_id_value, host_value) => {
    room_id = room_id_value;
    host = host_value;
    initRoom();
})

function initRoom() {
    removeHomeScreen();
    createRoomScreen();
}

function removeHomeScreen() {
    document.querySelector('.join-room-container').remove();
    document.querySelector('.create-room-container').remove();
}

function createRoomScreen() {
    // get header
    const header = document.getElementById('header');

    // create room code heading
    const room_code_container = newElem('div', 'room-code-container');

    const room_code_header = newElem('h2');
    room_code_header.textContent = room_id;

    addChild(room_code_container, room_code_header);

    // add room code heading to screen
    addChild(header, room_code_container)

    // create joined players list
    const joined_players_container = newElem('div', 'joined-players-container');

    const joined_players_list = newElem('ul', null, 'joined-players-list');
    const caption = newElem('caption');
    caption.textContent = 'Joined players:';

    addChild(joined_players_list, caption);
    addChild(joined_players_container, joined_players_list);

    // add joined players list to screen
    addChild(header, joined_players_container);

    if (!host) return;

    // create play button if user is host
    const play_button_contianer = newElem('div', 'play-button-container');
    
    const play_button = newElem('button', null, 'play-button');
    play_button.textContent = 'Play!';
    play_button.disabled = true;

    addChild(play_button_contianer, play_button);

    // add play button to screen
    addChild(header, play_button_contianer);

    // add click functionality to play button
    play_button.addEventListener('click', () => socket.emit('new-game', room_id));
}

socket.on('update-players', players => {
    const joined_players_list = document.getElementById('joined-players-list');
    
    document.querySelectorAll('.room-player').forEach(li => li.remove());
    
    Object.entries(players).forEach(([player_id, player_name]) => {
        const li = newElem('li', 'room-player');
        li.textContent = player_name;
        li.id = player_id;
        addChild(joined_players_list, li);
    });

    if (!host) return;

    if (players.length >= 4) {
        const play_button = document.getElementById('play-button');
        play_button.disabled = false;
    }
});

socket.on('player-left', user_id => {
    const joined_players_list = document.getElementById('joined-players-list');
    if (joined_players_list == null) return;

    document.querySelectorAll('.room-player').forEach(li => {
        if (li.textContent == user_id) {
            li.remove();
        }
    });
});

socket.on('new-game', initGame);

function initGame() {
    removeRoomScreen();
    createGameScreen();
    createCards();
}

function removeRoomScreen() {
    document.querySelector('.joined-players-container').remove();
    if (!host) return;
    document.querySelector('.play-button-container').remove();
}

function createGameScreen() {
    // get header
    const header = document.getElementById('header');

    // create flip button
    const flip_button_container = newElem('div', 'flip-button-container');

    const flip_button = newElem('button', null, 'flip-button');
    flip_button.textContent = 'Flip';

    addChild(flip_button_container, flip_button);

    // add flip button to screen
    addChild(header, flip_button_container);

    // add functionality to flip button
    flip_button.addEventListener("click", () => socket.emit('new-round', room_id));

    // create card container
    const arr = ['a', 'b', 'c', 'd', 'e'];

    const card_container = newElem('div', 'card-container');
    for (var r = 1; r <= 5; r++) {
        for (var i = 0; i < 5; i++) {
            let card_pos = newElem('div', 'card-pos-' + arr[i] + r);
            addChild(card_container, card_pos);
        }
    }

    // add card container to screen
    const main = document.getElementById('main');

    addChild(main, card_container);
}

function createCards() {
    for (let i = 0; i < 25; i++) {
        createCard(defaultCardType)
    }
}

function createCard() {

    // create divs for a new card
    const card_element = newElem('div', 'card');
    const card_inner = newElem('div', 'card-inner');
    const card_front = newElem('div', 'card-front');
    const card_back = newElem('div', 'card-back');

    // create front image
    const card_img = newElem('img', 'card-img');
    addChild(card_front, card_img);

    //create front text
    const card_text = newElem('p', 'card-text');
    addChild(card_front, card_text);

    // create empty back image
    const card_back_img = newElem('img', 'card-img');
    addChild(card_back, card_back_img);

    //create front text
    const card_back_text = newElem('p', 'card-text');
    addChild(card_back, card_back_text);

    // add the front and back elements to the inner element
    addChild(card_inner, card_front);
    addChild(card_inner, card_back);

    // add the inner element to the card element
    addChild(card_element, card_inner);

    // add the card to the screen
    gridCard(card_element);
}

socket.on('new-round', cards => newRound(cards));

function newRound(cards) {
    editCards(cards);
    flipCards();
    setTimeout(() => unflipCards(cards), 800);
}

function editCards(cards) {
    const card_elements = document.querySelectorAll('.card');

    card_elements.forEach( (card_element, i) => {
        let card_back = getCardBack(card_element);
        addBackID(card_back, cards[i].id);
        addBackImage(card_back);
        addBackText(card_back, cards[i].text);
    });
}

function getCardBack(card_element) {
    const card_inner = card_element.firstChild;
    return card_inner.children[1 - card_inner.classList.contains('flipped')]
}

function addBackID(card_back, id) {
    addId(card_back, id);
}

function addBackImage(card_back) {
    const card_img = card_back.firstChild;
    addPath(card_img, cardTypes[card_back.id].imagePath);
}

function addBackText(card_back, text) {
    const card_text = card_back.lastChild;
    card_text.textContent = text;
    if (card_back.id == 5) {
        addClass(card_text, 'assassin');
        return;
    }
    removeClass(card_text, 'assassin');
}

function flipCards() {
    document.querySelectorAll('.card').forEach(card => addClass(card.firstChild, 'flipped'));
}

function unflipCards(cards) {
    editCards(cards);
    document.querySelectorAll('.card').forEach(card => removeClass(card.firstChild, 'flipped'));
}

function newElem(element_type, className = null, id = null) {
    return addId(addClass(document.createElement(element_type), className), id);
}

function addClass(element, className) {
    if (className != null) element.classList.add(className);
    return element;
}

function removeClass(element, className) {
    element.classList.remove(className);
    return element;
}

function addId(element, id) {
    if (id != null) element.id = id;
    return element;
}

function addPath(element, path) {
    element.src = path;
    return element;
}

function addChild(element, child) {
    element.appendChild(child);
    return element;
}

function gridCard(card) {
    const card_pos_class = getFreePos();
    const card_pos = document.querySelector('.' + card_pos_class);

    addChild(card_pos, card);
}

function getFreePos() {
    const containers = [...document.querySelector('.card-container').children];
    const openContainers = [];
    containers.forEach(container => {
        if (!container.children.length) {
            openContainers.push(container)
        }
    });
    return openContainers[0].className;
}