class PixelGameEntity {
	key = null;
	x = null;
	y = null;
	color = null;
	restricted = false;
	restrictedArea = {
		start: { x: 0, y: 0},
		end: { x: 8, y: 8 }
	}
	attributes = []
	allowMoveListener = () => true;
	collid = false
	aiMove = () => {}
	image = null;

 	constructor(key, x = 0, y = 0, color = '#000000', collid = false) {
		if(key)
			this.key = key;
		else
			this.key = 'entity' + Date.now();

		this.x = x;
		this.y = y;
		this.color = color;
		this.collid = collid
	}

	onAllowMoveListener(callback) {
		this.allowMoveListener = callback
	}

	onAiMove(callback) {
		this.aiMove = callback
	}

	isColliding(collider) {
		if(!collider) return false;
		return collider.x == this.x && collider.y == this.y
	}

	setRestriction(restricted, area) {
		if(area && area.start && area.start.x) this.restrictedArea.start.x = area.start.x;
		if(area && area.start && area.start.y) this.restrictedArea.start.y = area.start.y;
		if(area && area.end && area.end.x) this.restrictedArea.end.x = area.end.x;
		if(area && area.end && area.end.y) this.restrictedArea.end.y = area.end.y;
		this.restricted = restricted;
	}

	move(direction) {
		let x = this.x;
		let y = this.y;

		if(direction == 'right' && this.x < this.restrictedArea.end.x - 1)
			x++;
		if(direction == 'left' && this.x > this.restrictedArea.start.x)
			x--;
		if(direction == 'down' && this.y < this.restrictedArea.end.y - 1)
			y++;
		if(direction == 'up' && this.y > this.restrictedArea.start.y)
			y--;

		if(!this.allowMoveListener({ newPosition: { x, y }, direction }))
			return;

		this.x = x;
		this.y = y;

	}

	setAttribute(name, value) {
		const attribute = this.attributes.find(a => a.name == name)
		if(attribute) attribute.value = value;
		else this.attributes.push({ name, value })
	}

	getAttribute(name) {
		return this.attributes.find(a => a.name == name)
	}

	setImage(key) {
		this.image = key;
	}

}

class PixelGameEngine {
	canvas = null;
	ctx = null;
	initialized = false;
	size = {
		width: 1024,
		height: 768
	}
	map = {
		bgColor: '#ffffff',
		width: 32,
		height: 24,
		tileWidth: 32,
		tileHeight: 32
	}
	refreshRate = 100;
	refreshTimeout = 0;
	tiles = [];
	paused = false;
	entities = [];
	images = [];

	/*
	Listeners:
		init,
		create-tile (tile),
		draw-start,
		draw-end,
		update-start,
		update-end,
		set-tile (tile),
		key-up (key, event)
		key-down (key, event)
		key-press (key, event)
		pause (isPause)
		new-entity (entity)
		remove-entity (entity)
		collision (entityA, entityB)
		loaded-image (image)
	*/
	listeners = [] 

	constructor(canvas, size, options) {
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d");

		if(size && size.width) this.size.width = size.width;
		if(size && size.height) this.size.height = size.height;
		
		if(options && options.map && options.map.tileWidth) this.map.tileWidth = options.map.tileWidth
		if(options && options.map && options.map.tileHeight) this.map.tileHeight = options.map.tileHeight
		if(options && options.map && options.map.bgColor) this.map.bgColor = options.map.bgColor

		if(options && options.refreshRate) this.refreshRate = options.refreshRate

		this.init()
	}

	init() {
		this.canvas.width = this.size.width;
		this.canvas.height = this.size.height;

		this.map.width = this.size.width / this.map.tileWidth;
		this.map.height = this.size.height / this.map.tileHeight;
		
		window.addEventListener('keydown', event => this.keyPress('down', event))
		window.addEventListener('keyup', event => this.keyPress('up', event))
		window.addEventListener('keypress', event => this.keyPress('press', event))

		setTimeout(() => {
			this.createMap()
			this.listen('init')
			this.initialized = true;
			this.update();
		}, this.refreshRate)
	}

	keyPress(name, event) {
		if(!this.initialized) return;

		const key = {
			name: event.key,
			shift: event.shiftKey,
			ctrl: event.ctrlKey
		}
		if(name == 'down') this.listen('key-down', [key, event])
		else if(name == 'up') this.listen('key-up', [key, event])
		else if(name == 'press') this.listen('key-press', [key, event])
	}

	changeRefreshRate(refreshRate) {
		this.refreshRate = refreshRate

		if(!this.initialized) return;

		clearInterval(this.refreshTimeout)
		this.refreshTimeout = setTimeout(() => this.update(), this.refreshTimeout)
	}

	checkInitialized() {
		if(!this.initialized) throw new Error('Game not initialized');
		return true;
	}

	listen(name, args = []) {
		this.listeners.forEach(listener => 
			listener.name == name ? listener.callback(...args) : null
		)
	}

	on(name, callback) {
		this.listeners.push({
			name,
			callback
		})
	}

	createMap() {
		for(let x = 0; x < this.map.width; x++) {
			for(let y = 0; y < this.map.height; y++) {
				const tile = { x, y, color: '#FFFFFF', data: {} }
				this.listen('create-tile', [ tile ])
				this.tiles.push(tile);
			}
		}
	}

	drawTile(tile) {
		this.ctx.fillStyle = tile.color;
		this.ctx.fillRect(
			tile.x * this.map.tileWidth,
			tile.y * this.map.tileHeight,
			this.map.tileWidth,
			this.map.tileHeight
		)
	}

	drawEntity(entity) {
		if(entity.image) {
			const image = this.getImage(entity.image);
			this.ctx.drawImage(
				image.image,
				entity.x * this.map.tileWidth,
				entity.y * this.map.tileHeight,
				this.map.tileWidth,
				this.map.tileHeight
			)
		}
		else {
			this.ctx.fillStyle = entity.color;
			this.ctx.fillRect(
				entity.x * this.map.tileWidth,
				entity.y * this.map.tileHeight,
				this.map.tileWidth,
				this.map.tileHeight
			)
		}
	}

	clean() {
		this.ctx.fillStyle = this.map.bgColor
		this.ctx.fillRect(
			0, 0,
			this.size.width,
			this.size.height
		)
	}

	draw() {
		this.checkInitialized();
		
		this.clean();
		this.listen('draw-start')
		this.tiles.forEach(tile => {
			this.drawTile(tile)
		})
		this.entities.forEach(entity => {
			this.drawEntity(entity)
		})
		this.listen('draw-end')
	}

	update() {
		this.checkInitialized();

		if(this.paused) return;
		
		this.listen('update-start')
		this.draw()
		this.entities.forEach(e => {
			const move = e.aiMove();
			if(move)
				e.move(move)
		})
		this.listen('update-end')

		this.changeRefreshRate(this.refreshRate)
	}

	setTile(position, data = {}) {
		const tile = this.tiles.find(t => t.x == position.x && t.y == position.y)
		if(!tile) return false;

		if(data.color) tile.color = data.color;
		if(data.data) tile.data = data.data

		this.listen('set-tile', [tile])

		return true;
	}

	setPause(pause) {
		this.paused = pause
		this.listen('pause', [this.paused])
	}

	isPaused() {
		return this.paused
	}

	createEntity(key, x, y, color, colliding = false) {
		const entity = new PixelGameEntity(key, x, y, color, colliding);
		entity.setRestriction(true, { start: { x: 0, y: 0 }, end: { x: this.map.width, y: this.map.height} })
		
		if(colliding)
			entity.onAllowMoveListener(move => {
				const entities = this.entities.filter(e => e.collid)
				const collider = entities.find(e => e.isColliding(move.newPosition) )
				
				if(collider) 
					this.listen('collision', [entity, collider])

				return !collider;
			})

		this.listen('new-entity', [entity])
		this.entities.push(entity)
		return entity
	}

	getEntity(key) {
		return this.entities.find(e => e.key == key);
	}

	removeEntity(key) {
		const entityIndex = this.entities.findIndex(e => e.key == key);

		this.listen('remove-entity', [this.entities[entityIndex]])

		if(entityIndex >= 0) {
			this.entities = [...this.entities.splice(entityIndex, 1)]
			return true;
		}

		return false;
	}

	loadImage(key, src, size) {
		const defaultSize = { width: this.map.tileWidth, height: this.map.tileHeight }

		const element = document.createElement('img');
		element.src = src;
		element.alt = key;
		element.width = size && size.width ? size.width : defaultSize.width;
		element.height = size && size.height ? size.height : defaultSize.height;

		const image = {
			key,
			image: element
		}

		this.images.push(image)

		this.listen('loaded-image', [image])
		return image
	}

	loadImages(images) {
		const loaded = []
		images.forEach(image => {
			loaded.push(
				this.loadImage(image.key, image.src, image.size ? image.size : null )
			)
		})
		return loaded;
	}

	getImage(key) {
		return this.images.find(i => i.key == key)
	}
}