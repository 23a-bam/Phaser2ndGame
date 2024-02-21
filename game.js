var config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    // для this.physics
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var score = 0; // кількість очків
var scoreText; // текстова змінна для очків

function preload() {
    this.load.image('sky', "assets/sky.png");
    this.load.image('tile', "assets/tile.png");
    this.load.image('bread', "assets/bread.png");
    this.load.image('hero', "assets/grandpa.png");
    this.load.image('enemy', "assets/enemy.png");
    this.load.image('tractor', "assets/tractor.png");
}

function create() {
    // додає небо, починаючи з точки (0, 0)
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(1920, 1080); // setDisplaySize розтягує

    platforms = this.physics.add.group();

    createGround(0, 1034, 50, 1, new Array(4, 5, 6, 10, 11, 12));
    createGround(4, 920, 3, 1, new Array());
    createGround(9, 800, 3, 1, new Array());

    player = this.physics.add.sprite(50, 700, 'hero');
    player.setScale(3);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);

    // реєструє стрілки вліво, вправо, вгору, вниз
    cursors = this.input.keyboard.createCursorKeys();

}

function createGround(start, y, count, scale, holes) {
    for (let i = start; i < start + count; i++) {
        if (holes === null || !holes.includes(i)) { // якщо не задана діра
            platforms.create(i * 48 * scale, y, 'tile').setScale(scale).setImmovable(true);
        }
    }
    platforms.children.iterate(function (child) {
        child.setImmovable(true);
        child.body.setAllowGravity(false);
    });
}

function update() {
    if (cursors.left.isDown) // якщо натиснута стрілка вліво
    {
        player.setVelocityX(-160); // йти вліво
        player.flipX = true; // повернути вліво
    }
    else if (cursors.right.isDown) // якщо натиснута стрілка вправо
    {
        player.setVelocityX(160); // йти вправо
        player.flipX = false; // повернути вправо
    }
    else // якщо не натиснута стрілка вліво чи вправо
    {
        player.setVelocityX(0); // зупинитись
        // player.flipX = false;
    }

    if (cursors.up.isDown && player.body.touching.down)
    {
        // стрибнути, якщо натиснута стрілка вгору і гравець торкається землі
        player.setVelocityY(-340);
    }
    if (player.x > 400) {
        scroll();
    }
}

function scroll() {
    player.x -= 3;
    platforms.children.iterate(function (child) {
        child.x -= 3;
    });
}