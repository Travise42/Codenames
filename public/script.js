
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

const cardContainer = document.querySelector(".card-container");
const flip_button = document.getElementById('flip-button');

init();

function init() {
    newGame();
    flip_button.addEventListener("click", newRound);
}

function newGame() {
    createCards();
}

function createCards() {
    for (let i = 0; i < 25; i++) {
        createCard(defaultCardType)
    }
}

function newRound() {
    socket.emit('create-new-round');
}

socket.on('new-round', cards => {
    editCards(cards);
    flipCards();
    setTimeout(() => unflipCards(cards), 1000);
})

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

function newElem(element_type, className = '', id = '') {
    return addId(addClass(document.createElement(element_type), className), id);
}

function addClass(element, className) {
    element.classList.add(className);
    return element;
}

function removeClass(element, className) {
    element.classList.remove(className);
    return element;
}

function addId(element, id) {
    if (id) element.id = id;
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