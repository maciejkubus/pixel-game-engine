let game = null;

const main = () => {
	const canvas = document.getElementById('game')
	game = new PixelGameEngine(canvas, null)

	game.on('create-tile', tile => {
		tile.color = '#00dddd'
	})
	
	game.on('init', () => {
		console.log(game.tiles)
	})

	const player = game.createEntity('player', 0, 0, '#ff0000', true)
	const e1 = game.createEntity('e1', 2, 5, '#00ff00', true)
	const e2 = game.createEntity('e2', 3, 1, '#00ff00', true)
	const e3 = game.createEntity('e1', 4, 7, '#00ff00')

	game.on('key-down', (key) => {
		if(key.name == 'd') player.move('right')
		if(key.name == 'a') player.move('left')
		if(key.name == 'w') player.move('up')
		if(key.name == 's') player.move('down')
	})

	game.on('collision', (a, b) => {
		console.log(a, b)
	})

}

main()