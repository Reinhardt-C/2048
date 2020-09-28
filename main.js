let board, json;

function init() {
	document.getElementById("game").innerHTML = "";
	fetch("config.json")
		.then(r => r.json())
		.then(j => {
			let url = document.URL.split("?");
			if (url.length > 1) {
				json = JSON.parse(atob(decodeURIComponent(url[1])));
				for (let i in j) {
					if (json[i] == undefined) json[i] = j[i];
					if (j[i] instanceof Object && !(j[i] instanceof Array))
						for (let k in j[i]) if (json[i][k] == undefined) json[i][k] = j[i][k];
				}
			} else json = j;

			json.mergeFunc = new Function("return " + json.mergeFunc)();
			json.colorFunc = new Function("return " + json.colorFunc)();
			json.textFunc = new Function("return " + json.textFunc)();
			json.opFunc = new Function("return " + json.opFunc)();

			document.body.style.backgroundColor = json.bgColor;

			const g = document.getElementById("game");
			g.style.width = json.dimensions.x * (json.dimensions.cellX + json.dimensions.cellMarginX);
			g.style.height = json.dimensions.y * (json.dimensions.cellY + json.dimensions.cellMarginY);
			g.style.backgroundPosition = `-${json.dimensions.cellMarginX}px -${json.dimensions.cellMarginY}px`;
			g.style.backgroundSize = `${json.dimensions.cellX + json.dimensions.cellMarginX}px ${
				json.dimensions.cellY + json.dimensions.cellMarginY
			}px`;
			g.style.backgroundImage = `linear-gradient(to right, ${json.gridColor} ${json.dimensions.cellMarginX}px, 
										transparent ${json.dimensions.cellMarginX}px),
									   linear-gradient(to bottom, ${json.gridColor} ${json.dimensions.cellMarginY}px,
										transparent ${json.dimensions.cellMarginY}px)`;
			g.style.borderTop = `solid ${json.gridColor} ${json.dimensions.cellMarginY}px`;
			g.style.borderLeft = `solid ${json.gridColor} ${json.dimensions.cellMarginX}px`;

			board = new Board(json.dimensions.x, json.dimensions.y);

			board.randomNew();
			board.randomNew();

			let delay = 0;
			setInterval(() => {
				if (delay > 0) delay--;
			}, 50);
			document.onkeydown = e => {
				if (delay !== 0) return;
				switch (e.keyCode) {
					case 37:
						board.move(0);
						break;
					case 40:
						board.move(1);
						break;
					case 39:
						board.move(2);
						break;
					case 38:
						board.move(3);
						break;
				}
				delay = 2;
			};
		});
}

class Cell {
	constructor(x, y, value) {
		this.x = x;
		this.y = y;
		this.value = value;
		this.toRemove = false;
		this.justMerged = false;

		this.createElement();
	}

	get dispValue() {
		return json.names[this.value.toString()] || this.value;
	}

	orderValue(d) {
		if (!d) return this.y * board.x + this.x;
		return this.x * board.y + this.y;
	}

	createElement() {
		let div = document.createElement("div");
		this.div = div;
		div.style.left = this.x * (json.dimensions.cellX + json.dimensions.cellMarginX);
		div.style.top = this.y * (json.dimensions.cellY + json.dimensions.cellMarginY);
		div.style.width = json.dimensions.cellX + "px";
		div.style.height = json.dimensions.cellY + "px";
		let len = this.dispValue
			.toString()
			.split("<br>")
			.map(e => e.replace(/<[\/\w]*>/g, "").replace(/&\w*;/g, "$").length)
			.reduce((a, b) => Math.max(a, b));
		div.style.fontSize =
			((Math.min(json.dimensions.cellX, json.dimensions.cellY) / 100) * 60) / Math.pow(len, 0.6) +
			"px";
		div.style.backgroundColor = "#" + hex(json.colorFunc(this.value));
		div.style.color = "#" + hex(json.textFunc(this.value));
		div.className = "cell";
		div.innerHTML = `<p>${this.dispValue}</p>`;
		document.getElementById("game").appendChild(div);
	}

	update() {
		this.div.style.left = this.x * (json.dimensions.cellX + json.dimensions.cellMarginX);
		this.div.style.top = this.y * (json.dimensions.cellY + json.dimensions.cellMarginY);
		let len = this.dispValue
			.toString()
			.split("<br>")
			.map(e => e.replace(/<[\/\w]*>/g, "").replace(/&\w*;/g, "$").length)
			.reduce((a, b) => Math.max(a, b));
		this.div.style.fontSize =
			((Math.min(json.dimensions.cellX, json.dimensions.cellY) / 100) * 60) / Math.pow(len, 0.6) +
			"px";
		this.div.innerHTML = `<p>${this.dispValue}</p>`;
		this.div.style.backgroundColor = "#" + hex(json.colorFunc(this.value));
		this.div.style.color = "#" + hex(json.textFunc(this.value));
	}

	removeElement() {
		setTimeout(() => {
			try {
				document.getElementById("game").removeChild(this.div);
				board.remove(this.x, this.y);
			} catch {}
		}, 80);
	}
}

class Board {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.cells = [];
	}

	get complete() {
		if (this.cells.length == 0) return false;
		for (let i of this.cells) {
			if (
				i.x !== 0 &&
				(!this.find(i.x - 1, i.y) || json.mergeFunc(this.find(i.x - 1, i.y).value, i.value))
			)
				return false;
			if (
				i.x !== this.x - 1 &&
				(!this.find(i.x + 1, i.y) || json.mergeFunc(this.find(i.x + 1, i.y).value, i.value))
			)
				return false;
			if (
				i.y !== 0 &&
				(!this.find(i.x, i.y - 1) || json.mergeFunc(this.find(i.x, i.y - 1).value, i.value))
			)
				return false;
			if (
				i.y !== this.y - 1 &&
				(!this.find(i.x, i.y + 1) || json.mergeFunc(this.find(i.x, i.y + 1).value, i.value))
			)
				return false;
		}
		return true;
	}

	get emptyCell() {
		if (this.complete) return;

		let x = Math.floor(Math.random() * this.x);
		let y = Math.floor(Math.random() * this.y);
		if (!this.find(x, y)) return [x, y];
		return this.emptyCell;
	}

	find(x, y) {
		let t = this.cells.filter(e => e.x == x && e.y == y);
		if (t.length == 0) return false;
		return t[0];
	}

	remove(x, y) {
		let t = this.cells.filter(e => !(e.x == x && e.y == y && e.toRemove));
		this.cells = t;
	}

	randomNew() {
		let value = chooseWeighted(json.startWeights).value;
		let coords = this.emptyCell;
		this.cells.push(new Cell(coords[0], coords[1], value));
	}

	move(direction = 0) {
		if (this.complete) return;
		this.cells.sort(
			(a, b) =>
				(Math.floor(direction / 2) * 2 - 1) *
				((direction % 2) * 2 - 1) *
				(a.orderValue(Math.floor(direction / 2)) - b.orderValue(Math.floor(direction / 2)))
		);
		this.cells.forEach(e => (e.justMerged = false));
		let change = false;
		if (direction == 0) {
			for (let j = 0; j < this.cells.length; j++) {
				let i = this.cells[j];
				let x = i.x,
					y = i.y;
				if (x == 0) continue;
				let t = this.find(x - 1, y);
				if (t) {
					if (t.justMerged || !json.mergeFunc(i.value, t.value)) continue;
					t.value = json.opFunc(i.value, t.value);
					t.update();
					t.justMerged = true;
					i.removeElement();
					i.toRemove = true;
					i.div.zIndex = "-1000";
				}
				i.x--;
				i.update();
				if (!i.toRemove) j--;
				change = true;
			}
		}
		if (direction == 2) {
			for (let j = 0; j < this.cells.length; j++) {
				let i = this.cells[j];
				let x = i.x,
					y = i.y;
				if (x == this.x - 1) continue;
				let t = this.find(x + 1, y);
				if (t) {
					if (t.justMerged || !json.mergeFunc(i.value, t.value)) continue;
					t.value = json.opFunc(i.value, t.value);
					t.update();
					t.justMerged = true;
					i.removeElement();
					i.toRemove = true;
					i.div.zIndex = "-1000";
				}
				i.x++;
				i.update();
				if (!i.toRemove) j--;
				change = true;
			}
		}
		if (direction == 1) {
			for (let j = 0; j < this.cells.length; j++) {
				let i = this.cells[j];
				let x = i.x,
					y = i.y;
				if (y == this.y - 1) continue;
				let t = this.find(x, y + 1);
				if (t) {
					if (t.justMerged || !json.mergeFunc(i.value, t.value)) continue;
					t.value = json.opFunc(i.value, t.value);
					t.update();
					t.justMerged = true;
					i.removeElement();
					i.toRemove = true;
					i.div.zIndex = "-1000";
				}
				i.y++;
				i.update();
				if (!i.toRemove) j--;
				change = true;
			}
		}
		if (direction == 3) {
			for (let j = 0; j < this.cells.length; j++) {
				let i = this.cells[j];
				let x = i.x,
					y = i.y;
				if (y == 0) continue;
				let t = this.find(x, y - 1);
				if (t) {
					if (t.justMerged || !json.mergeFunc(i.value, t.value)) continue;
					t.value = json.opFunc(i.value, t.value);
					t.update();
					t.justMerged = true;
					i.removeElement();
					i.toRemove = true;
					i.div.zIndex = "-1000";
				}
				i.y--;
				i.update();
				if (!i.toRemove) j--;
				change = true;
			}
		}
		if (change) this.randomNew();

		if (this.complete) this.end();
	}

	end() {}
}

function chooseWeighted(items) {
	let chances = items.map(e => e.weight);
	var sum = chances.reduce((acc, el) => acc + el, 0);
	var acc = 0;
	chances = chances.map(el => (acc = el + acc));
	var rand = Math.random() * sum;
	return items[chances.filter(el => el <= rand).length] || items[0];
}

function hex(n) {
	n = Math.floor(n) % (0xffffff + 1);
	return "0".repeat(6 - n.toString(16).replace("-", "").length) + n.toString(16);
}
