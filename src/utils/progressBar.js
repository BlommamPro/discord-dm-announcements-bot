function progressBar(percentage) {
    const blocks = Math.floor(percentage / 10);
    return '[' + '█'.repeat(blocks) + '-'.repeat(10 - blocks) + `] ${percentage}%`;
}

module.exports = { progressBar };