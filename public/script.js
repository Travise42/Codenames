
const RED = 1;
const GREEN = 2;
const BLUE = 3;
const INNOCENT = 4;
const ASSASSIN = 5;

const cardTypes = {
    1: {id: RED, imagePath: "img/cards/red.png", agentPaths: ["img/agents/red1.png", "img/agents/red2.png"]},
    2: {id: GREEN, imagePath: "img/cards/green.png", agentPaths: ["img/agents/green1.png", "img/agents/green2.png"]},
    3: {id: BLUE, imagePath: "img/cards/blue.png", agentPaths: ["img/agents/blue1.png", "img/agents/blue2.png"]},
    4: {id: INNOCENT, imagePath: "img/cards/innocent.png", agentPaths: ["img/agents/innocent1.png", "img/agents/innocent2.png"]},
    5: {id: ASSASSIN, imagePath: "img/cards/assassin.png", agentPaths: ["img/agents/assassin.png"]}
}

const defaultCardType = cardTypes[INNOCENT];

const socket = io();

let username;
let room_id;
let host;
let team;
let codeMaster;

const users = {
    topleft: {id: undefined, name: undefined},
    topright: {id: undefined, name: undefined},
    bottomleft: {id: undefined, name: undefined},
    bottomright: {id: undefined, name: undefined}
};

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

    const join_room_input = newElem('input', null, 'join-room-input');
    join_room_input.type = 'tel';
    join_room_input.name = 'join-room-input';
    join_room_input.placeholder = 'Room Code';
    addChild(join_room_contianer, join_room_input);
    const join_room_button = newElem('button', null, 'join-room-button');
    join_room_button.textContent = 'Join Room';
    addChild(join_room_contianer, join_room_button);

    // add join room button and input to screen
    addChild(header, join_room_contianer);

    join_room_button.addEventListener('click', () => socket.emit('join-room', join_room_input.value));

    // create create room button
    const create_room_contianer = newElem('div', 'create-room-container');

    const create_room_button = newElem('button', null, 'create-room-button');
    create_room_button.textContent = 'Create Room';

    addChild(create_room_contianer, create_room_button);

    // add create room button to screen
    addChild(header, create_room_contianer);

    create_room_button.addEventListener('click', () => socket.emit('create-room'));
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

    // create red players list
    const red_players_container = newElem('div', 'red-players-container');

    const red_players_caption = newElem('caption', null, 'caption');
    red_players_caption.textContent = 'Red Team';
    addChild(red_players_container, red_players_caption);
    const red_players_list = newElem('ul', null, 'red-players-list');
    addChild(red_players_container, red_players_list);

    // create red players join button
    const red_players_join_button = newElem('button', null, 'join-red-button');
    red_players_join_button.textContent = 'Join';
    addChild(red_players_container, red_players_join_button);
    
    // add red players list to screen
    addChild(header, red_players_container);

    red_players_join_button.addEventListener('click', () => joinTeam('red'));
    
    // create blue players list
    const blue_players_container = newElem('div', 'blue-players-container');

    const blue_players_caption = newElem('caption', null, 'caption');
    blue_players_caption.textContent = 'Blue Team';
    addChild(blue_players_container, blue_players_caption);
    const blue_players_list = newElem('ul', null, 'blue-players-list');
    addChild(blue_players_container, blue_players_list);

    // create blue players join button
    const blue_players_join_button = newElem('button', null, 'join-blue-button');
    blue_players_join_button.textContent = 'Join';
    addChild(blue_players_container, blue_players_join_button);

    // add blue players list to screen
    addChild(header, blue_players_container);

    blue_players_join_button.addEventListener('click', () => joinTeam('blue'));

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

function joinTeam(team_value) {
    team = team_value;
    socket.emit('join-team', username, team, room_id);
}

socket.on('update-players', players => {
    const join_blue_button = document.getElementById('join-blue-button');
    const join_red_button = document.getElementById('join-red-button');

    const red_players_list = document.getElementById('red-players-list');
    const blue_players_list = document.getElementById('blue-players-list');

    join_red_button.disabled = (team == 'red');
    join_blue_button.disabled = (team == 'blue');
    
    document.querySelectorAll('.room-player').forEach(li => li.remove());
    
    Object.entries(players).forEach(([player_id, player_data]) => {
        const li = newElem('li', 'room-player');
        li.textContent = player_data.name;

        const id_meta = newElem('meta');
        id_meta.name = "id";
        id_meta.content = player_id;
        
        //const team_meta = newElem('meta');
        //team_meta.name = "team";
        //team_meta.content = player_data.team;

        addChild(li, id_meta);
        //addChild(li, team_meta);

        if (player_data.team == 'red') {
            addChild(red_players_list, li);
        } else if (player_data.team == 'blue') {
            addChild(blue_players_list, li);
        }
    });

    if (!host) return;

    if (red_players_list.children.length >= 2 && blue_players_list.children.length >= 2) {
        const play_button = document.getElementById('play-button');
        play_button.disabled = false;
    }
});

socket.on('new-game', (players) => initGame(players));

function initGame(players) {
    removeRoomScreen();
    definePlayerRolls(players)
    createGameScreen();
    createCards();
}

function removeRoomScreen() {
    document.querySelector('.red-players-container').remove();
    document.querySelector('.blue-players-container').remove();
    if (!host) return;
    document.querySelector('.play-button-container').remove();
}

function definePlayerRolls(players) {
    // get you and your teamate
    const teamates = Object.entries(players).filter(([player_id, player_data]) => player_data.team == team).sort(([a_id, a_data], [b_id, b_data]) => a_id - b_id);

    // get your oppenents
    const opponents = Object.entries(players).filter(([player_id, player_data]) => player_data.team != team).sort(([a_id, a_data], [b_id, b_data]) => a_id - b_id);

    // place you in the bottom right
    users.bottomright = {id: socket.id, name: username, team: team};

    const top = +(teamates[0][0] == users.bottomright.id);
    const bottom = 1-top;
    users.topright = {id: teamates[top][0], name: teamates[top][1].name, team: teamates[top][1].team};
    users.topleft = {id: opponents[top][0], name: opponents[top][1].name, team: opponents[top][1].team};
    users.bottomleft = {id: opponents[bottom][0], name: opponents[bottom][1].name, team: opponents[bottom][1].team};
}

function createGameScreen() {
    // get main section
    const main = document.getElementById('main');
    main.className = 'playing-board';

    // create flip button
    const flip_button_container = newElem('div', 'flip-button-container');

    const flip_button = newElem('button', 'flip-button');
    flip_button.textContent = 'Flip';

    addChild(flip_button_container, flip_button);

    // add flip button to screen
    addChild(main, flip_button_container);

    // add functionality to flip button
    flip_button.addEventListener("click", () => socket.emit('new-round', room_id));

    // create card container
    const arr = ['a', 'b', 'c', 'd', 'e'];

    const card_container = newElem('div', 'card-container');
    for (var r = 1; r <= 5; r++) {
        for (var i = 0; i < 5; i++) {
            let card_pos = newElem('div', 'card-pos-' + arr[i] + r, arr[i] + r);
            card_pos.addEventListener('click', () => guessCard(card_pos.id));
            addChild(card_container, card_pos);
        }
    }

    // add card container to screen
    addChild(main, card_container);

    // make 4 name paragraphs
    const topleft_container = newElem('div', 'topleft-user-container');
    addClass(topleft_container, users.topleft.team);
    const topleft_label = newElem('h3', 'topleft-user-label');
    topleft_label.textContent = users.topleft.name;

    addChild(topleft_container, topleft_label);

    const bottomleft_container = newElem('div', 'bottomleft-user-container');
    addClass(bottomleft_container, users.bottomleft.team);
    const bottomleft_label = newElem('h3', 'bottomleft-user-label');
    bottomleft_label.textContent = users.bottomleft.name;

    addChild(bottomleft_container, bottomleft_label);

    const topright_container = newElem('div', 'topright-user-container');
    addClass(topright_container, users.topright.team);
    const topright_label = newElem('h3', 'topright-user-label');
    topright_label.textContent = users.topright.name;

    addChild(topright_container, topright_label);

    const bottomright_container = newElem('div', 'bottomright-user-container');
    addClass(bottomright_container, users.bottomright.team);
    const bottomright_label = newElem('h3', 'bottomright-user-label');
    bottomright_label.textContent = users.bottomright.name + ' (You)';

    addChild(bottomright_container, bottomright_label);

    // add names to screen
    addChild(main, topleft_container);
    addChild(main, bottomleft_container);
    addChild(main, topright_container);
    addChild(main, bottomright_container);

    // create game log
    const game_log_container = newElem('div', 'game-log-container');
    const game_log_caption = newElem('h3', 'game-log-caption');
    game_log_caption.textContent = 'Game log'
    addChild(game_log_container, game_log_caption);
    const game_log_list = newElem('ul', 'game-log', 'game-log');
    addChild(game_log_container, game_log_list);

    // add game log to screen
    addChild(main, game_log_container);
}

function createCards() {
    for (let i = 0; i < 25; i++) {
        createCard();
    }
}

socket.on('cover-card', (pos, id) => {
    const card_pos = document.getElementById(pos);
    const card = card_pos.firstChild;
    const inner = card.firstChild;
    
    // create card cover
    const card_cover = newElem('div', 'card-cover');
    addClass(card_cover, 'new');
    const card_cover_img = newElem('img', 'card-img');
    addPath(card_cover_img, cardTypes[id].agentPaths[parseInt(pos.charAt(1)) % cardTypes[id].agentPaths.length]);
    addChild(card_cover, card_cover_img);

    // Add card cover to screen
    addChild(inner, card_cover);

    setTimeout(() => removeClass(card_cover, 'new'), 10);
});

function createCard() {
    // create divs for a new card
    const card_element = newElem('div', 'card');
    const card_inner = newElem('div', 'card-inner');
    const card_front = newElem('div', 'card-front');
    const card_back = newElem('div', 'card-back');

    // create front image
    const card_front_img = newElem('img', 'card-img');
    addChild(card_front, card_front_img);

    //create front text
    const card_front_text = newElem('p', 'card-text');
    addChild(card_front, card_front_text);

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

socket.on('new-round', (cards, players, round) => {
    let team_members = Object.entries({...players}).filter(([key, value]) => value.team == team).sort((a, b) => a[0] - b[0]);
    codeMaster = team_members[round%2][0] == socket.id;
    newRound(cards);
});

function newRound(cards) {
    removeClueInput();
    addClueinput();
    clearAgents();
    editCards(cards);
    flipCards();
    setTimeout(() => unflipCards(cards), 800);
}

function removeClueInput() {
    const give_clue_container = document.querySelector('.give-clue-container');
    if (give_clue_container == null) return;
    give_clue_container.remove();
}

function addClueinput() {
    if (!codeMaster) return;

    // get main section
    const main = document.getElementById('main');

    // create 'give clue' button and input fields
    const give_clue_container = newElem('div', 'give-clue-container');
    const clue_input = newElem('input', 'clue-input', 'clue-input');
    clue_input.type = 'text';
    clue_input.placeholder = 'Enter your clue here';
    addChild(give_clue_container, clue_input);
    const clue_amount_input = newElem('input', 'clue-amount-input', 'clue-amount-input');
    clue_amount_input.type = 'number';
    clue_amount_input.value = 1;
    clue_amount_input.min = 0;
    clue_amount_input.max = 9;
    addChild(give_clue_container, clue_amount_input);
    const give_clue_button = newElem('button', 'give-clue-button', 'give-clue-button');
    give_clue_button.textContent = 'Give Clue';
    addChild(give_clue_container, give_clue_button);

    // add 'give clue' button and input fields to screen
    addChild(main, give_clue_container);

    give_clue_button.addEventListener('click', giveClue);
}

function clearAgents() {
    const agents = document.querySelectorAll('.card-cover');

    agents.forEach((agent) => {
        agent.remove();
    });
}

function editCards(cards) {
    const card_elements = document.querySelectorAll('.card');

    card_elements.forEach( (card_element, i) => {
        let card_back = getCardBack(card_element);
        addBackID(card_back, codeMaster ? cards[i].id : defaultCardType.id);
        addBackImage(card_back);
        addBackText(card_back, cards[i].text);
    });
}

function guessCard(pos) {
    socket.emit('guess-card', pos, room_id);
}

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

    socket.emit('give-clue', clue_element.value, amount_element.value, {name: username, team: team}, room_id);
    clue_element.value = '';
}

socket.on('recive-clue', (clue, amount, sender) => {
    // get game log
    const game_log = document.getElementById('game-log');

    // create new list element
    const log_message = newElem('li', 'log-message');
    addClass(log_message, sender.team);
    log_message.textContent = `${sender.name}: '${clue}' for ${amount}`;
    addChild(game_log, log_message);

    game_log.scrollTop = game_log.scrollHeight
});

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