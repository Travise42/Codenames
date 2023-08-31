function randIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randInt(max) {
    return Math.floor(Math.random() * max);
}

function randFrom(arr, count) {
    const usedIndexes = [];
    i = 0;
    while (i < count) {
        const randIndex = randInt(arr.length);
        if (usedIndexes.includes(randIndex)) continue;
        usedIndexes.push(randIndex);
        i++;
    }
    return usedIndexes.map((i) => arr[i]);
}

module.exports = { randIntBetween, randInt, randFrom };
