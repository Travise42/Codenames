// ----------------------------------------------------------------------------------------------------
// Initiate Client

const client = io();

/*
NameScreen ->   HomeScreen ->   LobbyScreen ->  GameScreen ->   EndScreen
Name inp.       Join but.       Join red but.   Main div.       New Game/Change Team/Home but.
Start but.      Create but.     Join blue but.                  Main div.
                                Play but.
*/

// ----------------------------------------------------------------------------------------------------
// Define Constants

const RED = 1;
const BLUE = 2;
const INNOCENT = 3;
const ASSASSIN = 4;

const DEFAULT = INNOCENT;

const CARDIDS = {
    1: {
        id: RED,
        string: "red",
        card_path: "img/cards/red.png",
        cover_paths: ["img/covers/red1.png", "img/covers/red2.png"],
    },
    2: {
        id: BLUE,
        string: "blue",
        card_path: "img/cards/blue.png",
        cover_paths: ["img/covers/blue1.png", "img/covers/blue2.png"],
    },
    3: {
        id: INNOCENT,
        string: "innocent",
        card_path: "img/cards/innocent.png",
        cover_paths: ["img/covers/innocent1.png", "img/covers/innocent2.png"],
    },
    4: {
        id: ASSASSIN,
        string: "assassin",
        card_path: "img/cards/assassin.png",
        cover_paths: ["img/covers/assassin.png"],
    },
};

const TOP_LEFT = 0;
const BOTTOM_LEFT = 1;
const TOP_RIGHT = 2;
const BOTTOM_RIGHT = 3;

const LEFT = 1;
const RIGHT = 2;
const TOP = 0;
const BOTTOM = 1;

let OPPERATIVE = 0;
let SPYMASTER = 1;

const COLUMNS = ["a", "b", "c", "d", "e"];

// ----------------------------------------------------------------------------------------------------
// Create Player Data

const user = {
    name: undefined,
    roomCode: undefined,
    isHost: undefined,
    team: undefined,
    role: undefined,
    guesses: undefined,
};

let players = [];

let turn;
let scores = {
    1: 0,
    2: 0,
};

// ----------------------------------------------------------------------------------------------------
// Start Program

init();
function init() {
    createNameScreen();
}

// ----------------------------------------------------------------------------------------------------
// Handle Server

client.on("joined-room", joinRoom);
client.on("left-team", leaveTeam);
client.on("update-players", updatePlayers);
client.on("new-game", startGame);
client.on("new-round", newRound);
client.on("player-left", playerLeft);
client.on("made-guess", madeGuess);
client.on("cover-card", coverCard);
client.on("recive-clue", reciveClue);
client.on("next-turn", nextTurn);
client.on("game-over", gameOver);

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
    const main_container = document.querySelector("main");

    // create start button container
    const name_container = newElem("div", "name-container");

    // create name input
    const name_input_element = newElem("input", null, "name-input");
    name_input_element.type = "text";
    name_input_element.placeholder = "nickname";

    addChild(name_container, name_input_element);

    // create start button
    const name_button_element = newElem("button", null, "name-button");
    name_button_element.textContent = "Play";
    name_button_element.addEventListener("click", () => submitName(name_input_element.value.toUpperCase()));

    addChild(name_container, name_button_element);

    // add name container to main container
    addChild(main_container, name_container);
}

function removeNameScreen() {
    document.querySelector(".name-container").remove();
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
    const main_container = document.querySelector("main");

    // Create join room container
    const join_room_contianer = newElem("div", "join-room-container");

    // Create join room input (room id input)
    const join_room_input = newElem("input", null, "join-room-input");
    join_room_input.type = "tel";
    join_room_input.placeholder = "Room Code";

    addChild(join_room_contianer, join_room_input);

    // Create join room button
    const join_room_button = newElem("button", null, "join-room-button");
    join_room_button.textContent = "Join Room";
    join_room_button.addEventListener("click", () => client.emit("join-room", join_room_input.value, user.name, false));

    addChild(join_room_contianer, join_room_button);

    // Add join room container to main container
    addChild(main_container, join_room_contianer);

    // create create room button
    const create_room_contianer = newElem("div", "create-room-container");

    const create_room_button = newElem("button", null, "create-room-button");
    create_room_button.textContent = "Create Room";
    create_room_button.addEventListener("click", () => client.emit("create-room", user.name));

    addChild(create_room_contianer, create_room_button);

    // add create room button to screen
    addChild(main_container, create_room_contianer);
}

function removeHomeScreen() {
    const join_room_container = document.querySelector(".join-room-container");
    const create_room_container = document.querySelector(".create-room-container");

    if (join_room_container != null) join_room_container.remove();
    if (create_room_container != null) create_room_container.remove();
}

// ----------------------------------------------------------------------------------------------------
// Lobby Screen

//? from server
//? transition | Home Screen => Lobby Screen
function joinRoom(roomCode, isHost = null) {
    // Set room id and host value
    user.roomCode = roomCode;
    console.log(isHost);
    if (isHost != null) user.isHost = isHost;

    // Remove potential end screen
    removeGameOverScreen();
    removeGameScreen();

    // Create Lobby screen
    removeHomeScreen();
    createLobbyScreen();
}

//? from red-players-button
function joinTeam(team) {
    user.team = team;
    client.emit("join-team", user.team);
}

function createLobbyScreen() {
    /*
    <header class="header">
        <div class="header-title-container">
            <h1>Code Names</h1>
        </div>
        <div class="room-code-container">
            <h2>ROOMCODE</h2>
        </div>
    </header>
    <main class="main">
        <div class="red-players-container">
            <h3 id="red-players-heading">Red Team</h3>

            <ul id="red-players-list">
                <li class="room-player">PLAYER1</li>
                <li class="room-player">PLAYER2</li>
            </ul>

            <button id="red-players-button" disabled=true>Join</button>
        </div>

        <div class="blue-players-container">
            <h3 id="blue-players-heading">Blue Team</h3>

            <ul id="blue-players-list">
                <li class="room-player">PLAYER3</li>
                <li class="room-player">PLAYER4</li>
            </ul>

            <button id="blue-players-button">Join</button>
        </div>

        <div class="back-button-container">
            <button id="home-button">Home</button>
        </div>

        <div class="lobby-buttons-container">
            <button id="leave-button">Leave</button> 
            <br>
            <button id="play-button">Play</button>
        </div>
    </main>
    */

    // Get header container
    const header_container = document.querySelector(".header");
    // Get main container
    const main_container = document.querySelector(".main");

    // If room code hasn't been created already....
    if (document.querySelector(".room-code-container") == null) {
        // Create room code container
        const room_code_container = newElem("div", "room-code-container");

        // Create room code header
        const room_code_header = newElem("h2");
        room_code_header.textContent = user.roomCode;

        addChild(room_code_container, room_code_header);

        // Add room code container to heading container
        addChild(header_container, room_code_container);
    }

    // Create red players container
    const red_players_container = newElem("div", "red-players-container");

    // Create red players heading
    const red_players_heading = newElem("h3", null, "red-players-heading");
    red_players_heading.textContent = "Red Team";

    addChild(red_players_container, red_players_heading);

    // Create red players list
    const red_players_list = newElem("ul", null, "red-players-list");

    addChild(red_players_container, red_players_list);

    // Create red players join button
    const red_players_button = newElem("button", null, "red-players-button");
    red_players_button.textContent = "Join";
    red_players_button.addEventListener("click", () => joinTeam(RED));

    addChild(red_players_container, red_players_button);

    // Add red players container to main container
    addChild(main_container, red_players_container);

    // Create blue players container
    const blue_players_container = newElem("div", "blue-players-container");

    // Create blue players heading
    const blue_players_heading = newElem("h3", null, "blue-players-heading");
    blue_players_heading.textContent = "Blue Team";

    addChild(blue_players_container, blue_players_heading);

    // Create blue players list
    const blue_players_list = newElem("ul", null, "blue-players-list");

    addChild(blue_players_container, blue_players_list);

    // Create blue players button
    const blue_players_button = newElem("button", null, "blue-players-button");
    blue_players_button.textContent = "Join";
    blue_players_button.addEventListener("click", () => joinTeam(BLUE));

    addChild(blue_players_container, blue_players_button);

    // Add blue players list to screen
    addChild(main_container, blue_players_container);

    // Create home button container
    const back_button_container = newElem("div", "back-button-container");

    // Crate home button
    const home_button = newElem("button", null, "home-button");
    home_button.textContent = "Home";
    home_button.addEventListener("click", () => {
        client.emit("leave-game");
        removeGameOverScreen();
        removeGameScreen();
        removeLobbyScreen();
        createHomeScreen();

        user.team = null;
        user.roomCode = null;
        user.role = null;
        user.guesses = null;
        user.isHost = null;
    });

    addChild(back_button_container, home_button);

    // Add home button to main container
    addChild(main_container, back_button_container);

    // Create lobby buttons container
    const lobby_buttons_container = newElem("div", "lobby-buttons-container");

    // Create leave room button
    const leave_button = newElem("button", null, "leave-button");
    leave_button.textContent = "Leave";
    leave_button.disabled = true;
    leave_button.addEventListener("click", () => client.emit("leave-team"));

    addChild(lobby_buttons_container, leave_button);
    addChild(lobby_buttons_container, newElem("br"));

    // Add lobby buttons to screen
    addChild(main_container, lobby_buttons_container);

    // Stop if user is not host
    if (!user.isHost) return;

    // Create play button if user is host
    const play_button = newElem("button", null, "play-button");
    play_button.textContent = "Play";
    play_button.disabled = true;
    play_button.addEventListener("click", () => client.emit("new-game"));

    addChild(lobby_buttons_container, play_button);
}

function removeLobbyScreen() {
    const home_button_container = document.querySelector(".back-button-container").remove();
    const lobby_buttons_container = document.querySelector(".lobby-buttons-container").remove();

    if (home_button_container != null) home_button_container.remove();
    if (lobby_buttons_container != null) lobby_buttons_container.remove();

    const red_players_container = document.querySelector(".red-players-container");
    const blue_players_container = document.querySelector(".blue-players-container");

    if (red_players_container == null) return;
    if (blue_players_container == null) return;

    red_players_container.remove();
    blue_players_container.remove();
}

function playerLeft(newHost) {
    if (client.id == newHost) {
        user.isHost = true;
        console.log("im host");
    }
}

function leaveTeam() {
    user.team = null;
    user.role = null;

    // Get leave button
    const leave_button = document.getElementById("leave-button");

    if (leave_button == null) return;

    leave_button.disabled = false;
}

function toggleLeaveButton(value = true) {
    // Get leave button
    const leave_button = document.getElementById("leave-button");

    if (leave_button == null) return;

    leave_button.disabled = value;
}

//? from server
function updatePlayers(redTeam, blueTeam, roomStatus, playerRole = null) {
    // Get main container
    const main_container = document.querySelector(".main");
    if (main_container.classList.contains("playing-board")) {
        // Get game over new game button
        const game_over_new_game_button = document.getElementById("game-over-new-game-button");

        if (roomStatus == "game") {
            const nametags = {
                1: [
                    document.querySelector(".topleft-nametag-label"),
                    document.querySelector(".bottomleft-nametag-label"),
                ],
                2: [
                    document.querySelector(".topright-nametag-label"),
                    document.querySelector(".bottomright-nametag-label"),
                ],
            };

            caseNull = (label) => (label == null ? "--DISCONNECTED--" : label);

            nametags[LEFT][TOP].textContent = caseNull(redTeam[TOP]);
            nametags[LEFT][BOTTOM].textContent = caseNull(redTeam[BOTTOM]);

            nametags[RIGHT][TOP].textContent = caseNull(blueTeam[TOP]);
            nametags[RIGHT][BOTTOM].textContent = caseNull(blueTeam[BOTTOM]);

            nametags[user.team][user.role].textContent += " (YOU)";
        }

        if (game_over_new_game_button == null) return;
        if (redTeam.length == 2 && blueTeam.length == 2) return;

        game_over_new_game_button.disabled = true;
        return;
    }

    const join_red_button = document.getElementById("red-players-button");
    const join_blue_button = document.getElementById("blue-players-button");

    const red_players_list = document.getElementById("red-players-list");
    const blue_players_list = document.getElementById("blue-players-list");

    join_red_button.disabled = user.team == RED || !redTeam.includes(null);
    join_blue_button.disabled = user.team == BLUE || !blueTeam.includes(null);

    document.querySelectorAll(".room-player").forEach((li) => li.remove());

    redTeam.forEach((playerName, role) => {
        const list_element = newElem("li", "room-player");
        list_element.textContent = playerName;
        if (user.team == RED && playerRole == role) {
            addClass(list_element, "you");
        }

        addChild(red_players_list, list_element);
    });

    blueTeam.forEach((playerName, role) => {
        const list_element = newElem("li", "room-player");
        list_element.textContent = playerName;
        if (user.team == BLUE && playerRole == role) {
            addClass(list_element, "you");
        }

        addChild(blue_players_list, list_element);
    });

    if (!redTeam.includes(null) && !blueTeam.includes(null)) {
        toggleLeaveButton(false);
    } else {
        toggleLeaveButton(true);
    }

    if (!user.isHost) return;

    let play_button = document.getElementById("play-button");

    if (play_button == null) {
        play_button = newElem("button", null, "play-button");
        play_button.textContent = "Play";
        play_button.disabled = true;
        play_button.addEventListener("click", () => client.emit("new-game"));

        const lobby_buttons_container = document.querySelector(".lobby-buttons-container");
        addChild(lobby_buttons_container, play_button);
    }

    if (!redTeam.includes(null) && !blueTeam.includes(null)) {
        play_button.disabled = false;
    }
}

// ----------------------------------------------------------------------------------------------------
// Empty Game Screen

//? from server
//? transition | Lobby Screen => Game Screen
function startGame(redMembers, blueMembers, role) {
    removeLobbyScreen();
    setRole(role);
    definePlayerRoles(redMembers, blueMembers);
    createGameScreen();
    createCards();
}

function createGameScreen() {
    // Get main container
    const main_container = document.querySelector(".main");

    // Create playing board
    addClass(main_container, "playing-board");

    // Create card container
    const card_container = newElem("div", "card-container");

    // Fill card container
    COLUMNS.forEach((column) => {
        for (var row = 1; row <= 5; row++) {
            // Create card pos
            const card_pos = newElem("div", `card-pos-${column}${row}`, `${column}${row}`);
            card_pos.addEventListener("click", () => {
                if (!card_pos.firstChild.classList.contains("clickable")) return;
                guessCard(card_pos.id);
            });

            addChild(card_container, card_pos);
        }
    });

    // Add card container to main container
    addChild(main_container, card_container);

    // Create topleft nametag container
    const topleft_nametag_container = newElem("div", "topleft-nametag-container");
    addClass(topleft_nametag_container, "red");

    // Create topleft nametag label
    const topleft_nametag_label = newElem("h3", "topleft-nametag-label");
    topleft_nametag_label.textContent = players[LEFT][TOP].toUpperCase();
    if (user.team == RED && user.role == OPPERATIVE) topleft_nametag_label.textContent += " (YOU)";

    addChild(topleft_nametag_container, topleft_nametag_label);

    // Add topleft nametag container to main container
    addChild(main_container, topleft_nametag_container);

    // Create bottomleft nametag container
    const bottomleft_nametag_container = newElem("div", "bottomleft-nametag-container");
    addClass(bottomleft_nametag_container, "red");

    // Create bottomleft nametag label
    const bottomleft_nametag_label = newElem("h3", "bottomleft-nametag-label");
    bottomleft_nametag_label.textContent = players[LEFT][BOTTOM].toUpperCase();
    if (user.team == RED && user.role == SPYMASTER) bottomleft_nametag_label.textContent += " (YOU)";

    addChild(bottomleft_nametag_container, bottomleft_nametag_label);

    // Add bottomleft nametag container to main container
    addChild(main_container, bottomleft_nametag_container);

    // Create topright nametag container
    const topright_nametag_container = newElem("div", "topright-nametag-container");
    addClass(topright_nametag_container, "blue");

    // Create topright nametag label
    const topright_nametag_label = newElem("h3", "topright-nametag-label");
    topright_nametag_label.textContent = players[RIGHT][TOP].toUpperCase();
    if (user.team == BLUE && user.role == OPPERATIVE) topright_nametag_label.textContent += " (YOU)";

    addChild(topright_nametag_container, topright_nametag_label);

    // Add topright nametag container to main container
    addChild(main_container, topright_nametag_container);

    // Create bottomright nametag container
    const bottomright_nametag_container = newElem("div", "bottomright-nametag-container");
    addClass(bottomright_nametag_container, "blue");

    // Create bottomright nametag label
    const bottomright_nametag_label = newElem("h3", "bottomright-nametag-label");
    bottomright_nametag_label.textContent = players[RIGHT][BOTTOM].toUpperCase();
    if (user.team == BLUE && user.role == SPYMASTER) bottomright_nametag_label.textContent += " (YOU)";

    addChild(bottomright_nametag_container, bottomright_nametag_label);

    // Add bottomright nametag container to main container
    addChild(main_container, bottomright_nametag_container);

    // Add turn indicator container
    const turn_indicator_container = newElem("div", "turn-indicator-container");

    // Add turn indicator
    const turn_indicator = newElem("h3", "turn-indicator");

    addChild(turn_indicator_container, turn_indicator);

    // Add turn indicator container to main container
    addChild(main_container, turn_indicator_container);

    // Create red score container
    const red_score_container = newElem("div", "red-score-container");
    red_score_container.addEventListener("click", () => {
        if (red_score_container.classList.contains("hidden")) {
            removeClass(red_score_container, "hidden");
        } else {
            addClass(red_score_container, "hidden");
        }
    });

    // Create red score image
    const red_score_image = newElem("img", "red-score-image");
    addPath(red_score_image, CARDIDS[RED].cover_paths[0]);

    addChild(red_score_container, red_score_image);

    // Create red score heading
    const red_score_heading = newElem("h3", "red-score-heading");

    addChild(red_score_container, red_score_heading);

    // Add red score container to main container
    addChild(main_container, red_score_container);

    // Create blue score container
    const blue_score_container = newElem("div", "blue-score-container");
    blue_score_container.addEventListener("click", () => {
        if (blue_score_container.classList.contains("hidden")) {
            removeClass(blue_score_container, "hidden");
        } else {
            addClass(blue_score_container, "hidden");
        }
    });

    // Create blue score image
    const blue_score_image = newElem("img", "blue-score-image");
    addPath(blue_score_image, CARDIDS[BLUE].cover_paths[0]);

    addChild(blue_score_container, blue_score_image);

    // Create blue score heading
    const blue_score_heading = newElem("h3", "blue-score-heading");

    addChild(blue_score_container, blue_score_heading);

    // Add blue score container to main container
    addChild(main_container, blue_score_container);

    // Create game log container
    const game_log_container = newElem("div", "game-log-container");
    addClass(game_log_container, "hidden");

    // Create game log heading
    const game_log_heading = newElem("h3", "game-log-heading");
    game_log_heading.textContent = "Game log...";
    game_log_heading.addEventListener("click", () => {
        if (game_log_container.classList.contains("hidden")) {
            removeClass(game_log_container, "hidden");
            game_log_heading.textContent = "Game log";
        } else {
            addClass(game_log_container, "hidden");
            game_log_heading.textContent = "Game log...";
        }
    });

    addChild(game_log_container, game_log_heading);

    // Create game log list
    const game_log_list = newElem("ul", "game-log", "game-log");

    addChild(game_log_container, game_log_list);

    // Add game log container to main container
    addChild(main_container, game_log_container);
}

function removeGameScreen() {
    // Get main container
    const main_container = document.querySelector(".main");

    // Tell CSS game is over
    removeClass(main_container, "playing-board");

    // Get all elements in main container
    const game_elements = Array.from(main_container.children);

    // Remove all elements in main container
    game_elements.forEach((game_element) => {
        game_element.remove();
    });
}

function definePlayerRoles(redMembers, blueMembers) {
    players[RED] = redMembers;
    players[BLUE] = blueMembers;
}

function createCards() {
    COLUMNS.forEach((column) => {
        for (var row = 1; row <= 5; row++) {
            createCard(`${column}${row}`);
        }
    });
}

function createCard(pos) {
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
    const card_element = newElem("div", "card");
    const card_inner = newElem("div", "card-inner");
    const card_front = newElem("div", "card-front");
    const card_back = newElem("div", "card-back");

    // Create front image
    const card_front_img = newElem("img", "card-img");
    addChild(card_front, card_front_img);

    // Create front text
    const card_front_text = newElem("p", "card-text");
    addChild(card_front, card_front_text);

    // Create empty back image
    const card_back_img = newElem("img", "card-img");
    addChild(card_back, card_back_img);

    // Create front text
    const card_back_text = newElem("p", "card-text");
    addChild(card_back, card_back_text);

    // Add the front and back elements to the inner element
    addChild(card_inner, card_front);
    addChild(card_inner, card_back);

    // Add the inner element to the card element
    addChild(card_element, card_inner);

    // Add the card to the screen
    gridCard(card_element, pos);
}

function gridCard(card, pos) {
    const card_pos_class = `card-pos-${pos}`;
    const card_pos = document.querySelector("." + card_pos_class);

    addChild(card_pos, card);
}

//? from server
//? event | Empty Game Screen => Active Game Screen
function newRound(cards, role, roles, turn, newScores) {
    removeGameOverScreen();
    setRole(role, roles);
    clearLog();
    clearCovers();
    editCards(cards);
    flipCards();
    nextTurn(turn, undefined);
    updateScore(newScores);
    setTimeout(() => unflipCards(cards), 800);
}

// ----------------------------------------------------------------------------------------------------
// Active Game Screen

function createClueInput() {
    // get main container
    const main_container = document.querySelector(".main");

    // create give clue container
    const give_clue_container = newElem("div", "give-clue-container");
    const clue_input = newElem("input", "clue-input", "clue-input");
    clue_input.type = "text";
    clue_input.placeholder = "Enter your clue here";

    addChild(give_clue_container, clue_input);

    // Create clue amount input
    const clue_amount_input = newElem("input", "clue-amount-input", "clue-amount-input");
    clue_amount_input.type = "number";
    clue_amount_input.value = 1;
    clue_amount_input.min = 0;
    clue_amount_input.max = 9;

    addChild(give_clue_container, clue_amount_input);

    // Create give clue button
    const give_clue_button = newElem("button", "give-clue-button", "give-clue-button");
    give_clue_button.textContent = "Give Clue";

    addChild(give_clue_container, give_clue_button);

    // add 'give clue' button and input fields to screen
    addChild(main_container, give_clue_container);

    give_clue_button.addEventListener("click", giveClue);
}

function removeClueInput() {
    const give_clue_container = document.querySelector(".give-clue-container");
    if (give_clue_container == null) return;
    give_clue_container.remove();
}

function editCards(cards) {
    cards.forEach((card) => {
        const card_element = document.querySelector(`.card-pos-${card.pos}`).firstChild;

        const card_back = getCardBack(card_element);
        addBackID(card_back, card.id);
        addBackImage(card_back);
        addBackText(card_back, card.text);
    });
}

function flipCards() {
    document.querySelectorAll(".card").forEach((card) => addClass(card.firstChild, "flipped"));
}

function unflipCards(cards) {
    editCards(cards);
    document.querySelectorAll(".card").forEach((card) => removeClass(card.firstChild, "flipped"));
}

//? from card-pos-<pos>
function guessCard(pos) {
    client.emit("guess-card", pos);
}

//? from server
function coverCard(cardPos, cardId, newScores) {
    updateScore(newScores);

    const card_pos_element = document.getElementById(cardPos);
    const card_element = card_pos_element.firstChild;
    const inner_element = card_element.firstChild;

    // create card cover
    const card_cover_element = newElem("div", "card-cover");
    addClass(card_cover_element, "new");
    const card_cover_img = newElem("img", "card-img");
    addPath(
        card_cover_img,
        CARDIDS[cardId].cover_paths[parseInt(cardPos.charAt(1)) % CARDIDS[cardId].cover_paths.length]
    );
    addChild(card_cover_element, card_cover_img);

    // Add card cover to screen
    addChild(inner_element, card_cover_element);

    addClass(card_element, "covered");

    setTimeout(() => removeClass(card_cover_element, "new"), 10);
}

function clearCovers() {
    const cards = document.querySelectorAll(".covered");
    cards.forEach((card) => {
        removeClass(card, "covered");
    });

    const covers = document.querySelectorAll(".card-cover");
    covers.forEach((cover) => {
        cover.remove();
    });
}

function updateScore(newScores) {
    scores = newScores;

    const red_score_heading = document.querySelector(".red-score-heading");
    red_score_heading.textContent = scores[RED];

    const blue_score_heading = document.querySelector(".blue-score-heading");
    blue_score_heading.textContent = scores[BLUE];
}

//? from give-clue-button
function giveClue() {
    const clue_element = document.getElementById("clue-input");
    const amount_element = document.getElementById("clue-amount-input");

    if (!clue_element.value) return;

    // Check if clue is already a word on the board
    const card_poses = Array.from(document.querySelector(".card-container").children);
    const duplicates = [];
    card_poses.forEach((card_pos) => {
        const card = card_pos.firstChild;
        const inner = card.firstChild;
        if (inner.lastChild.className == "card-cover") return;
        removeClass(card_pos, "invalid");
        if (clue_element.value.toLowerCase() == inner.firstChild.lastChild.textContent.toLowerCase())
            duplicates.push(card_pos);
    });
    if (duplicates.length) {
        duplicates.forEach((card_pos) => {
            addClass(card_pos, "invalid");
        });
        return;
    }

    client.emit("give-clue", clue_element.value, amount_element.value);
    clue_element.value = "";
}

//? from server
function madeGuess(guessesLeft = user.guesses) {
    // Update turn indicator
    const turnIndicator = document.querySelector(".turn-indicator");

    if (turnIndicator != null) {
        turnIndicator.textContent = `Your Turn... ${user.guesses - guessesLeft}/${user.guesses}`;
    }

    // Check if pass button shoud
    if (guessesLeft <= 0) return;

    removePassButton();
    createPassButton();
}

function createPassButton() {
    // Get main container
    const main_container = document.querySelector(".main");

    // Create pass button container
    const pass_button_container = newElem("div", "pass-button-container");

    // Create pass button
    const pass_button = newElem("button", null, "pass-button");
    pass_button.textContent = "PASS";
    pass_button.addEventListener("click", passGuess);

    addChild(pass_button_container, pass_button);

    // Add pass button container to main container
    addChild(main_container, pass_button_container);
}

function removePassButton() {
    // Get pass button container
    const pass_button_container = document.querySelector(".pass-button-container");
    if (pass_button_container != null) pass_button_container.remove();
}

function passGuess() {
    client.emit("pass-guess");
}

//? from server
function reciveClue(clue, amount, senderName, senderTeam) {
    // Get game log
    const game_log = document.getElementById("game-log");

    // Create new list element
    const log_message = newElem("li", "log-message");
    addClass(log_message, CARDIDS[senderTeam].string);
    log_message.textContent = `${senderName}: '${clue}' for ${amount}`;
    addChild(game_log, log_message);

    game_log.scrollTop = game_log.scrollHeight;
}

function clearLog() {
    // Get game log
    const game_log = document.getElementById("game-log");
    while (game_log.children.length) game_log.removeChild(game_log.firstChild);
}

//? from server
function nextTurn(newTurn, amount = 0) {
    turn = newTurn;

    const isPlayersTurn = turn.team == user.team && turn.role == user.role;

    if (isPlayersTurn) {
        user.guesses = amount;
        createPlayingElements();
    } else {
        removePlayingElements();
    }

    editTurnIndicator();
}

function createPlayingElements() {
    removePlayingElements();

    if (user.role == SPYMASTER) createClueInput();
    else document.querySelectorAll(".card").forEach((card_element) => addClass(card_element, "clickable"));
}

function removePlayingElements() {
    document.querySelectorAll(".card").forEach((card_element) => removeClass(card_element, "clickable"));
    removeClueInput();
    removePassButton();
}

function editTurnIndicator() {
    const turn_indicator = document.querySelector(".turn-indicator");

    updateHighlightedNametags();

    // Player's team's turn
    if (user.team == turn.team) {
        // Player's turn
        if (user.role == turn.role) {
            // Player is spymaster
            if (turn.role == SPYMASTER) {
                turn_indicator.textContent = "Your Turn...";
            }

            // Player is opperative
            else if (turn.role == OPPERATIVE) {
                turn_indicator.textContent = `Your Turn... 0/${user.guesses}`;
            }
        }

        // Player's teamate's turn
        else if (user.role != turn.role) {
            // Player's teamate is spymaster
            if (turn.role == SPYMASTER) {
                turn_indicator.textContent = "Your Teamate is Thinking...";
            }

            // Player's teamate's is opperative
            else if (turn.role == OPPERATIVE) {
                turn_indicator.textContent = "Your Teamate is Guessing...";
            }
        }
    }

    // Player's opponents's turn
    else if (user.team != turn.team) {
        // The opponent is opperative
        if (turn.role == SPYMASTER) {
            turn_indicator.textContent = "The Opponent Opperative is Guessing...";
        }

        // The opponent is spymaster
        else if (turn.role == OPPERATIVE) {
            turn_indicator.textContent = "The Opponent Spymaster is Thinking...";
        }
    }
}

function updateHighlightedNametags() {
    const nametags = {
        1: [
            document.querySelector(".topleft-nametag-container"),
            document.querySelector(".bottomleft-nametag-container"),
        ],
        2: [
            document.querySelector(".topright-nametag-container"),
            document.querySelector(".bottomright-nametag-container"),
        ],
    };

    // Remove highlight from everyone
    removeClass(nametags[RED][OPPERATIVE], "active");
    removeClass(nametags[RED][SPYMASTER], "active");
    removeClass(nametags[BLUE][OPPERATIVE], "active");
    removeClass(nametags[BLUE][SPYMASTER], "active");

    // Add highlight to the active player
    addClass(nametags[turn.team][turn.role], "active");
}

// ----------------------------------------------------------------------------------------------------
// Player Functions

function setRole(playerRole, roles = null) {
    user.role = playerRole;
    updateRoles(roles);
}

function updateRoles(roles) {
    if (roles == null) return;
    [SPYMASTER, OPPERATIVE] = roles;
}

// ----------------------------------------------------------------------------------------------------
// Editting Card Functions

function getCardBack(card_element) {
    const card_inner = card_element.firstChild;
    return card_inner.children[1 - card_inner.classList.contains("flipped")];
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
        addClass(card_text, "assassin");
        return;
    }
    removeClass(card_text, "assassin");
}

// ----------------------------------------------------------------------------------------------------
// Game Over Screen

function gameOver(winningTeam, causeMessage) {
    createGameOverScreen(winningTeam, causeMessage);
}

function createGameOverScreen(winningTeam, causeMessage) {
    // Get main container
    const main_container = document.querySelector(".main");

    // Create game over container
    const game_over_container = newElem("div", "game-over-container");

    // Create game over heading
    const game_over_heading = newElem("h3", "game-over-heading");
    game_over_heading.textContent = `${CARDIDS[winningTeam].string.toUpperCase()} WINS!`;

    addChild(game_over_container, game_over_heading);

    // Create game over summary
    const game_over_summary = newElem("p", "game-over-summary");
    game_over_summary.textContent = causeMessage;

    addChild(game_over_container, game_over_summary);

    // Create game over new game container
    const game_over_new_game_container = newElem("div", "game-over-new-game-container");

    // Create game over new game button
    const game_over_new_game_button = newElem("button", null, "game-over-new-game-button");
    game_over_new_game_button.textContent = "New Game";
    game_over_new_game_button.addEventListener("click", () => {
        client.emit("next-game");
    });

    addChild(game_over_new_game_container, game_over_new_game_button);
    addChild(game_over_container, game_over_new_game_container);

    // Create game over new game container
    const game_over_change_teams_container = newElem("div", "game-over-change-teams-container");

    // Create game over home button
    const game_over_change_teams_button = newElem("button", null, "game-over-change-teams-button");
    game_over_change_teams_button.textContent = "Change Teams";
    game_over_change_teams_button.addEventListener("click", () => {
        client.emit("change-teams");
    });

    addChild(game_over_change_teams_container, game_over_change_teams_button);
    addChild(game_over_container, game_over_change_teams_container);

    // Create game over new game container
    const game_over_home_container = newElem("div", "game-over-home-container");

    // Create game over home button
    const game_over_home_button = newElem("button", null, "game-over-home-button");
    game_over_home_button.textContent = "Home";
    game_over_home_button.addEventListener("click", () => {
        client.emit("leave-game");
        removeGameOverScreen();
        removeGameScreen();
        removeLobbyScreen();
        createHomeScreen();

        user.team = null;
        user.roomCode = null;
        user.role = null;
        user.guesses = null;
        user.isHost = null;
    });

    addChild(game_over_home_container, game_over_home_button);
    addChild(game_over_container, game_over_home_container);

    // Add game over container to main container
    addChild(main_container, game_over_container);
}

function removeGameOverScreen() {
    // Get game over container
    const game_over_container = document.querySelector(".game-over-container");

    if (game_over_container != null) game_over_container.remove();
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
