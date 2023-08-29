
// ----------------------------------------------------------------------------------------------------
// Initiate Client

const client = io();

/*
NameScreen ->   HomeScreen ->   LobbyScreen ->  GameScreen ->   EndScreen
Name inp.       Join but.       Join red but.   Flip but.       New Game but.
Start but.      Create but.     Join blue but.  Main div.       Main div.
                                Play but.
*/

// ----------------------------------------------------------------------------------------------------
// Define Constants

////const GREEN = 2;
const RED = 1;
const BLUE = 2;
const INNOCENT = 3;
const ASSASSIN = 4;

const DEFAULT = INNOCENT;

////2: {id: GREEN, string: 'green', card_path: 'img/cards/green.png', cover_paths: ['img/covers/green1.png', 'img/covers/green2.png']},
const CARDIDS = {
	1: {id: RED, string: 'red', card_path: 'img/cards/red.png', cover_paths: ['img/covers/red1.png', 'img/covers/red2.png']},
	2: {id: BLUE, string: 'blue', card_path: 'img/cards/blue.png', cover_paths: ['img/covers/blue1.png', 'img/covers/blue2.png']},
	3: {id: INNOCENT, string: 'innocent', card_path: 'img/cards/innocent.png', cover_paths: ['img/covers/innocent1.png', 'img/covers/innocent2.png']},
	4: {id: ASSASSIN, string: 'assassin', card_path: 'img/cards/assassin.png', cover_paths: ['img/covers/assassin.png']},
};

const TOP_LEFT = 0;
const BOTTOM_LEFT = 1;
const TOP_RIGHT = 2;
const BOTTOM_RIGHT = 3;

const RED_SPYMASTER = 0;
const RED_OPPERATIVE = 1;
const BLUE_SPYMASTER = 2;
const BLUE_OPPERATIVE = 3;

const COLUMNS = ['a', 'b', 'c', 'd', 'e'];

// ----------------------------------------------------------------------------------------------------
// Create Player Data

const user = {
    name: undefined,
    roomCode: undefined,
    isHost: undefined,
    team: undefined,
    isSpymaster: undefined,
    role: undefined,
    guesses: undefined
};

let players = [];

let turn;
let scores = {
    1: 0,
    2: 0
}

// ----------------------------------------------------------------------------------------------------
// Start Program

init();
function init() {
    createNameScreen();
}

// ----------------------------------------------------------------------------------------------------
// Handle Server

client.on('joined-room', joinRoom);
client.on('update-players', updateLobbyScreen);
client.on('new-game', initGame);
client.on('new-round', newRound);
client.on('made-guess', madeGuess)
client.on('cover-card', coverCard);
client.on('recive-clue', reciveClue);
client.on('next-turn', nextTurn);

// ----------------------------------------------------------------------------------------------------
// Name Screen

function createNameScreen() {
    /*
    <div class="start-button-container">
        <input type="text" id="name-input" placeholder="nickname">
        <button id="start-button">Play</button>
    </div>
    */

    // get main container
    const main_container = document.querySelector('main');
   
    // create start button container
    const name_container = newElem('div', 'name-container');

    // create name input
    const name_input_element = newElem('input', null, 'name-input');
    name_input_element.type = "text";
    name_input_element.placeholder = "nickname";

    addChild(name_container, name_input_element);

    // create start button
    const name_button_element = newElem('button', null, 'name-button');
    name_button_element.textContent = 'Play';
    name_button_element.addEventListener('click', () => submitName(name_input_element.value));

    addChild(name_container, name_button_element);
    
    // add name container to main container
    addChild(main_container, name_container);
}

function removeNameScreen() {
    document.querySelector('.name-container').remove();
}

//? from name-button
//? transition | Name Screen => Home Screen
function submitName(inputedName) {
    // Dont allow empty names
    if (!inputedName) return;

    // Set nickname to inputed value
    user.name = inputedName;

    // Create home screen
    removeNameScreen();
    createHomeScreen();
}

// ----------------------------------------------------------------------------------------------------
// Home Screen

function createHomeScreen() {
    // Get main container
    const main_container = document.querySelector('main');

    // Create join room container
    const join_room_contianer = newElem('div', 'join-room-container');

    // Create join room input (room id input)
    const join_room_input = newElem('input', null, 'join-room-input');
    join_room_input.type = 'tel';
    join_room_input.placeholder = 'Room Code';

    addChild(join_room_contianer, join_room_input);

    // Create join room button
    const join_room_button = newElem('button', null, 'join-room-button');
    join_room_button.textContent = 'Join Room';
    join_room_button.addEventListener('click', () => client.emit('join-room', join_room_input.value, user.name));

    addChild(join_room_contianer, join_room_button);

    // Add join room container to main container
    addChild(main_container, join_room_contianer);

    // create create room button
    const create_room_contianer = newElem('div', 'create-room-container');

    const create_room_button = newElem('button', null, 'create-room-button');
    create_room_button.textContent = 'Create Room';
    create_room_button.addEventListener('click', () => client.emit('create-room', user.name));

    addChild(create_room_contianer, create_room_button);

    // add create room button to screen
    addChild(main_container, create_room_contianer);
}

function removeHomeScreen() {
    document.querySelector('.join-room-container').remove();
    document.querySelector('.create-room-container').remove();
}

// ----------------------------------------------------------------------------------------------------
// Lobby Screen

//? from server
//? transition | Home Screen => Lobby Screen
function joinRoom(roomId, isHost) {
    // Set room id and host value
    user.roomCode = roomId;
    user.isHost = isHost;

    // Create Looby screen
    removeHomeScreen();
    createLobbyScreen();
}

//? from red-players-button
function joinTeam(team) {
    user.team = team;
    client.emit('join-team', user.team);
}

function createLobbyScreen() {

    // Get header container
    const header_container = document.querySelector('.header');

    // Get main container
    const main_container = document.querySelector('.main');


    // Create room code container
    const room_code_container = newElem('div', 'room-code-container');

    // Create room code header
    const room_code_header = newElem('h2');
    room_code_header.textContent = user.roomCode;

    addChild(room_code_container, room_code_header);

    // Add room code container to heading container
    addChild(header_container, room_code_container)


    // Create red players container
    const red_players_container = newElem('div', 'red-players-container');

    // Create red players heading
    const red_players_heading = newElem('h3', null, 'red-players-heading');
    red_players_heading.textContent = 'Red Team';

    addChild(red_players_container, red_players_heading);

    // Create red players list
    const red_players_list = newElem('ul', null, 'red-players-list');

    addChild(red_players_container, red_players_list);

    // Create red players join button
    const red_players_button = newElem('button', null, 'red-players-button');
    red_players_button.textContent = 'Join';
    red_players_button.addEventListener('click', () => joinTeam(RED));

    addChild(red_players_container, red_players_button);

    // Add red players container to main container
    addChild(main_container, red_players_container);


    // Create blue players container
    const blue_players_container = newElem('div', 'blue-players-container');

    // Create blue players heading
    const blue_players_heading = newElem('h3', null, 'blue-players-heading');
    blue_players_heading.textContent = 'Blue Team';

    addChild(blue_players_container, blue_players_heading);

    // Create blue players list
    const blue_players_list = newElem('ul', null, 'blue-players-list');

    addChild(blue_players_container, blue_players_list);

    // Create blue players button
    const blue_players_button = newElem('button', null, 'blue-players-button');
    blue_players_button.textContent = 'Join';
    blue_players_button.addEventListener('click', () => joinTeam(BLUE));

    addChild(blue_players_container, blue_players_button);

    // Add blue players list to screen
    addChild(main_container, blue_players_container);


    // Stop if user is not host
    if (!user.isHost) return;

    // create play button if user is host
    const play_button_contianer = newElem('div', 'play-button-container');
    
    const play_button = newElem('button', null, 'play-button');
    play_button.textContent = 'Play';
    play_button.disabled = true;

    addChild(play_button_contianer, play_button);

    // add play button to screen
    addChild(main_container, play_button_contianer);

    // add click functionality to play button
    play_button.addEventListener('click', () => client.emit('new-game'));
}

function removeLobbyScreen() {
    document.querySelector('.red-players-container').remove();
    document.querySelector('.blue-players-container').remove();

    if (!user.isHost) return;

    document.querySelector('.play-button-container').remove();
}

//? from server
function updateLobbyScreen(redTeam, blueTeam) {

    // Get main container
    const main_container = document.querySelector('.main');
    if (main_container.classList.contains("playing-board")) return;
    
    const join_red_button = document.getElementById('red-players-button');
    const join_blue_button = document.getElementById('blue-players-button');

    const red_players_list = document.getElementById('red-players-list');
    const blue_players_list = document.getElementById('blue-players-list');
    
    join_red_button.disabled = (user.team == RED);
    join_blue_button.disabled = (user.team == BLUE);
    
    document.querySelectorAll('.room-player').forEach(li => li.remove());

    redTeam.forEach(playerName => {
        const list_element = newElem('li', 'room-player');
        list_element.textContent = playerName;

        addChild(red_players_list, list_element);
    });

    blueTeam.forEach(playerName => {
        const list_element = newElem('li', 'room-player');
        list_element.textContent = playerName;

        addChild(blue_players_list, list_element);
    });

    if (!user.isHost) return;

    if (red_players_list.children.length >= 2 && blue_players_list.children.length >= 2) {
        const play_button = document.getElementById('play-button');
        play_button.disabled = false;
    }
}

// ----------------------------------------------------------------------------------------------------
// Empty Game Screen

//? from server
//? transition | Lobby Screen => Game Screen
function initGame(playerNames, isSpymaster) {
    removeLobbyScreen();
    setSpymaster(isSpymaster);
    definePlayerRoles(playerNames)
    createGameScreen();
    createCards();
}

function createGameScreen() {
    // Get main container
    const main_container = document.querySelector('.main');

    // Create playing board
    addClass(main_container, 'playing-board');


    // Create flip button container
    const flip_button_container = newElem('div', 'flip-button-container');

    // Create flip button
    const flip_button = newElem('button', null, 'flip-button');
    flip_button.textContent = 'Flip';
    flip_button.addEventListener("click", () => client.emit('new-round', user.roomCode));

    addChild(flip_button_container, flip_button);

    // Add flip button container to main container
    addChild(main_container, flip_button_container);


    // Create card container
    const card_container = newElem('div', 'card-container');

    // Fill card container
    COLUMNS.forEach(c => {
        for (var r = 1; r <= 5; r++) {
            // Create card pos
            const card_pos = newElem('div', `card-pos-${c}${r}`, `${c}${r}`);
            card_pos.addEventListener('click', () => {
                if (!card_pos.firstChild.classList.contains('clickable')) return;
                guessCard(card_pos.id)
            });

            addChild(card_container, card_pos);
        }
    });

    // Add card container to main container
    addChild(main_container, card_container);

    // Create topleft nametag container
    const topleft_nametag_container = newElem('div', 'topleft-nametag-container');
    addClass(topleft_nametag_container, 'red');

    // Create topleft nametag label
    const topleft_nametag_label = newElem('h3', 'topleft-nametag-label');
    topleft_nametag_label.textContent = players[TOP_LEFT].toUpperCase();
    if (user.role == RED_SPYMASTER) topleft_nametag_label.textContent += ' (YOU)';

    addChild(topleft_nametag_container, topleft_nametag_label);

    // Add topleft nametag container to main container
    addChild(main_container, topleft_nametag_container);


    // Create bottomleft nametag container
    const bottomleft_nametag_container = newElem('div', 'bottomleft-nametag-container');
    addClass(bottomleft_nametag_container, 'red');

    // Create bottomleft nametag label
    const bottomleft_nametag_label = newElem('h3', 'bottomleft-nametag-label');
    bottomleft_nametag_label.textContent = players[BOTTOM_LEFT].toUpperCase();
    if (user.role == RED_OPPERATIVE) bottomleft_nametag_label.textContent += ' (YOU)';

    addChild(bottomleft_nametag_container, bottomleft_nametag_label);

    // Add bottomleft nametag container to main container
    addChild(main_container, bottomleft_nametag_container);


    // Create topright nametag container
    const topright_nametag_container = newElem('div', 'topright-nametag-container');
    addClass(topright_nametag_container, 'blue');
    
    // Create topright nametag label
    const topright_nametag_label = newElem('h3', 'topright-nametag-label');
    topright_nametag_label.textContent = players[TOP_RIGHT].toUpperCase();
    if (user.role == BLUE_SPYMASTER) topright_nametag_label.textContent += ' (YOU)';

    addChild(topright_nametag_container, topright_nametag_label);

    // Add topright nametag container to main container
    addChild(main_container, topright_nametag_container);


    // Create bottomright nametag container
    const bottomright_nametag_container = newElem('div', 'bottomright-nametag-container');
    addClass(bottomright_nametag_container, 'blue');
    
    // Create bottomright nametag label
    const bottomright_nametag_label = newElem('h3', 'bottomright-nametag-label');
    bottomright_nametag_label.textContent = players[BOTTOM_RIGHT].toUpperCase();
    if (user.role == BLUE_OPPERATIVE) bottomright_nametag_label.textContent += ' (YOU)';

    addChild(bottomright_nametag_container, bottomright_nametag_label);

    // Add bottomright nametag container to main container
    addChild(main_container, bottomright_nametag_container);


    // Add turn indicator container
    const turn_indicator_container = newElem('div', 'turn-indicator-container');

    // Add turn indicator
    const turn_indicator = newElem('h3', 'turn-indicator');

    addChild(turn_indicator_container, turn_indicator);

    // Add turn indicator container to main container
    addChild(main_container, turn_indicator_container);


    // Create red score container
    const red_score_container = newElem('div', 'red-score-container');

    // Create red score image
    const red_score_image = newElem('img', 'red-score-image');
    addPath(red_score_image, CARDIDS[RED].cover_paths[0]);

    addChild(red_score_container, red_score_image);

    // Create red score heading
    const red_score_heading = newElem('h3', 'red-score-heading');

    addChild(red_score_container, red_score_heading);

    // Add red score container to main container
    addChild(main_container, red_score_container);


    // Create blue score container
    const blue_score_container = newElem('div', 'blue-score-container');

    // Create blue score image
    const blue_score_image = newElem('img', 'blue-score-image');
    addPath(blue_score_image, CARDIDS[BLUE].cover_paths[0]);

    addChild(blue_score_container, blue_score_image);

    // Create blue score heading
    const blue_score_heading = newElem('h3', 'blue-score-heading');

    addChild(blue_score_container, blue_score_heading);

    // Add blue score container to main container
    addChild(main_container, blue_score_container);


    // Create game log container
    const game_log_container = newElem('div', 'game-log-container');

    // Create game log heading
    const game_log_heading = newElem('h3', 'game-log-heading');
    game_log_heading.textContent = 'Game log'

    addChild(game_log_container, game_log_heading);

    // Create game log list
    const game_log_list = newElem('ul', 'game-log', 'game-log');

    addChild(game_log_container, game_log_list);

    // Add game log container to main container
    addChild(main_container, game_log_container);
}

function definePlayerRoles(playerNames) {
    //const i = playerNames.indexOf(user.name);

    // const shiftBy = x => (i + 4 + ((i % 2) ? -x : x)) % 4;
    
    // players[TOP_LEFT] = playerNames[shiftBy(3)];
    // players[BOTTOM_LEFT] = playerNames[shiftBy(2)];
    // players[TOP_RIGHT] = playerNames[shiftBy(1)];
    // players[BOTTOM_RIGHT] = playerNames[i];

    players = playerNames;
}

function createCards() {
    for (let i = 0; i < 25; i++) {
        createCard();
    }
}

function createCard() {
    /*
    <div class="card">
        <div class="card-inner">
            <div class="card-front" id="_">
                <img class="card-img" src="img/cards/__________.png">
                <p class="card-text _________">_____</p>
            </div>
            <div class="card-back" id="_">
                <img class="card-img" src="img/cards/__________.png">
                <p class="card-text _________">_____</p>
            </div>
        </div>
    </div>
    */

    // Create containers for a new card
    const card_element = newElem('div', 'card');
    const card_inner = newElem('div', 'card-inner');
    const card_front = newElem('div', 'card-front');
    const card_back = newElem('div', 'card-back');

    // Create front image
    const card_front_img = newElem('img', 'card-img');
    addChild(card_front, card_front_img);

    // Create front text
    const card_front_text = newElem('p', 'card-text');
    addChild(card_front, card_front_text);

    // Create empty back image
    const card_back_img = newElem('img', 'card-img');
    addChild(card_back, card_back_img);

    // Create front text
    const card_back_text = newElem('p', 'card-text');
    addChild(card_back, card_back_text);

    // Add the front and back elements to the inner element
    addChild(card_inner, card_front);
    addChild(card_inner, card_back);

    // Add the inner element to the card element
    addChild(card_element, card_inner);

    // Add the card to the screen
    gridCard(card_element);
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

//? from server
//? event | Empty Game Screen => Active Game Screen
function newRound(cards, isSpymaster, turn, newScores) {
    setSpymaster(isSpymaster);
    clearLog();
    clearCovers();
    editCards(cards);
    flipCards();
    nextTurn(turn, undefined);
    updateScoring(newScores);
    setTimeout(() => unflipCards(cards), 800);
}

// ----------------------------------------------------------------------------------------------------
// Active Game Screen

function addClueInput() {
    // get main container
    const main_container = document.querySelector('.main');

    // create give clue container
    const give_clue_container = newElem('div', 'give-clue-container');
    const clue_input = newElem('input', 'clue-input', 'clue-input');
    clue_input.type = 'text';
    clue_input.placeholder = 'Enter your clue here';

    addChild(give_clue_container, clue_input);

    // Create clue amount input
    const clue_amount_input = newElem('input', 'clue-amount-input', 'clue-amount-input');
    clue_amount_input.type = 'number';
    clue_amount_input.value = 1;
    clue_amount_input.min = 0;
    clue_amount_input.max = 9;

    addChild(give_clue_container, clue_amount_input);

    // Create give clue button
    const give_clue_button = newElem('button', 'give-clue-button', 'give-clue-button');
    give_clue_button.textContent = 'Give Clue';

    addChild(give_clue_container, give_clue_button);

    // add 'give clue' button and input fields to screen
    addChild(main_container, give_clue_container);

    give_clue_button.addEventListener('click', giveClue);
}

function removeClueInput() {
    const give_clue_container = document.querySelector('.give-clue-container');
    if (give_clue_container == null) return;
    give_clue_container.remove();
}

function editCards(cards) {
    cards.forEach( card => {
        const card_element = document.querySelector(`.card-pos-${card.pos}`).firstChild;

        let card_back = getCardBack(card_element);
        addBackID(card_back, card.id);
        addBackImage(card_back);
        addBackText(card_back, card.text);
    });
}

function flipCards() {
    document.querySelectorAll('.card').forEach(card => addClass(card.firstChild, 'flipped'));
}

function unflipCards(cards) {
    editCards(cards);
    document.querySelectorAll('.card').forEach(card => removeClass(card.firstChild, 'flipped'));
}

//? from card-pos-<pos>
function guessCard(pos) {
    client.emit('guess-card', pos);
}

//? from server
function coverCard(pos, id) {
    const card_pos = document.getElementById(pos);
    const card = card_pos.firstChild;
    const inner = card.firstChild;
    
    // create card cover
    const card_cover = newElem('div', 'card-cover');
    addClass(card_cover, 'new');
    const card_cover_img = newElem('img', 'card-img');
    addPath(card_cover_img, CARDIDS[id].cover_paths[parseInt(pos.charAt(1)) % CARDIDS[id].cover_paths.length]);
    addChild(card_cover, card_cover_img);

    // Add card cover to screen
    addChild(inner, card_cover);

    setTimeout(() => removeClass(card_cover, 'new'), 10);
}

function clearCovers() {
    const covers = document.querySelectorAll('.card-cover');

    covers.forEach((cover) => {
        cover.remove();
    });
}

function updateScoring(newScores) {
    scores = newScores;

    const red_score_heading = document.querySelector('.red-score-heading');
    red_score_heading.textContent = scores[RED];

    const blue_score_heading = document.querySelector('.blue-score-heading');
    blue_score_heading.textContent = scores[BLUE];

    //TODO HANDLE WINNING
}

//? from give-clue-button
function giveClue() {
    const clue_element = document.getElementById('clue-input');
    const amount_element = document.getElementById('clue-amount-input');

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

    client.emit('give-clue', clue_element.value, amount_element.value);
    clue_element.value = '';
}

//? from server
function madeGuess(newScores, guessesLeft = user.guesses) {
    updateScoring(newScores);

    // Get turn indicator
    const turn_indicator = document.querySelector('.turn-indicator');

    turn_indicator.textContent = 'Your Turn... ' + (user.guesses - guessesLeft) + '/' + user.guesses;

    if (user.guesses != guessesLeft && guessesLeft > 0) {
        createPassButton();
    } else {
        removePassButton();
    }
}

function createPassButton() {
    // Get main container
    const main_container = document.querySelector('.main');

    // Create pass button container
    const pass_button_container = newElem('div', 'pass-button-container');

    // Create pass button
    const pass_button = newElem('button', null, 'pass-button');
    pass_button.textContent = 'PASS';
    pass_button.addEventListener('click', passGuess);

    addChild(pass_button_container, pass_button);
    
    // Add pass button container to main container
    addChild(main_container, pass_button_container);
}

function removePassButton() {
    // Get pass button container
    const pass_button_container = document.querySelector('.pass-button-container');
    if (pass_button_container != null) pass_button_container.remove();
}

function passGuess() {
    client.emit('pass-guess');
}

//? from server
function reciveClue(clue, amount, nickname, team) {
    // Get game log
    const game_log = document.getElementById('game-log');

    // Create new list element
    const log_message = newElem('li', 'log-message');
    addClass(log_message, CARDIDS[team].string);
    log_message.textContent = `${nickname}: '${clue}' for ${amount}`;
    addChild(game_log, log_message);

    game_log.scrollTop = game_log.scrollHeight;
}

function clearLog() {
    // Get game log
    const game_log = document.getElementById('game-log');
    while (game_log.children.length) game_log.removeChild(game_log.firstChild);
}

//? from server
function nextTurn(newTurn, amount=0) {
    turn = newTurn;
    if (turn == user.role) user.guesses = amount;
    if (turn == user.role) addPlayingElements();
    else removePlayingElements();
    editTurnIndicator();
    removePassButton();
}

function addPlayingElements() {
    removePlayingElements();

    if (!user.isSpymaster) document.querySelectorAll('.card').forEach((card_element) => addClass(card_element, 'clickable'));
    else addClueInput();
}

function removePlayingElements() {
    document.querySelectorAll('.card').forEach((card_element) => {
        removeClass(card_element, 'clickable')
    });
    removeClueInput();
}

function editTurnIndicator() {
    // Edit turn-indicator to tell the player whos turn it is
    const [team, isSpymaster] = getRoleAttributes(turn);

    const turn_indicator = document.querySelector('.turn-indicator');

    if (user.team == team) {
        if (user.isSpymaster == isSpymaster) {
            if (!user.isSpymaster) {
                // Your turn (opperative)
                turn_indicator.textContent = 'Your Turn... 0/' + user.guesses;
                return;
            }
            // Your turn (spymaster)
            turn_indicator.textContent = 'Your Turn...';
            return;
        }
        if (!user.isSpymaster) {
            // Your teamate's turn (spymaster)
            turn_indicator.textContent = 'Your Teamate is Thinking...';
            return;
        }
        // Your teamate's turn (opperative)
        turn_indicator.textContent = 'Your Teamate is Guessing...';
        return;
    }

    if (isSpymaster) {
        // The opponent spymaster's turn
        turn_indicator.textContent = 'The Opponent Spymaster is Thinking...';
        return;
    }

    // The opponent opperative's turn
    turn_indicator.textContent = 'The Opponent Opperative is Guessing...';
}

// ----------------------------------------------------------------------------------------------------
// Player Functions

function setSpymaster(value) {
    user.isSpymaster = value;
    updateRole();
}

function updateRole() {
    user.role = (user.team == RED ? 0 : 2) + !user.isSpymaster;
}

function getRoleAttributes(role) {
    const team = Math.floor(role/2) ? BLUE : RED;
    const isSpymaster = !(role % 2);
    return [team, isSpymaster];
}

// ----------------------------------------------------------------------------------------------------
// Editting Card Functions

function getCardBack(card_element) {
    const card_inner = card_element.firstChild;
    return card_inner.children[1 - card_inner.classList.contains('flipped')]
}

function addBackID(card_back, id) {
    addId(card_back, id);
}

function addBackImage(card_back) {
    const card_img = card_back.firstChild;
    addPath(card_img, CARDIDS[card_back.id].card_path);
}

function addBackText(card_back, text) {
    const card_text = card_back.lastChild;
    card_text.textContent = text;
    if (card_back.id == ASSASSIN) {
        addClass(card_text, 'assassin');
        return;
    }
    removeClass(card_text, 'assassin');
}

// ----------------------------------------------------------------------------------------------------
// HTML Functions

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

// ----------------------------------------------------------------------------------------------------



