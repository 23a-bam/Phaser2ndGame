var config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    // для this.physics
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0},
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
// var lives = 3;
// var livesText;
var immunity = 0;
const velocity = 120;
var velocityMultiplier = 1;
var xTravelled = 0;
var stopGame = false;

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

    createGround(0, 1034, 75, new Array(4, 5, 6, 10, 11, 12, 25, 26, 27, 28, 29, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45));
    createGround(4, 920, 3, new Array());
    createGround(9, 800, 3, new Array());
    createGround(14, 665, 11, new Array(17, 18, 19, 20, 21));
    createGround(27, 900, 1, new Array());
    createGround(34, 850, 5, new Array(33));
    // elevator start
    createGround(77, 950, 4, new Array());
    createGround(82, 800, 4, new Array());
    createGround(87, 650, 4, new Array());
    createGround(92, 500, 5, new Array(93));
    createGround(97, 350, 4, new Array());
    createGround(108, 1000, 10, new Array());

    player = this.physics.add.sprite(50, 700, 'hero');
    player.setScale(3);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);
    // гравітація для гравця
    player.body.setGravityY(350);

    // реєструє стрілки вліво, вправо, вгору, вниз
    cursors = this.input.keyboard.createCursorKeys();

    bread = this.physics.add.group();
    createBread(480, 720);
    createBread(1150, 620);
    createBread(1400, 500);
    createLotOfBread(3000, 950, 50, 0, 11);
    createLotOfBread(5000, 200, 20, 50, 15);

    // scoreText = this.add.text(16, 16, 'Очок: 0', { fontSize: '32px', fill: '#000' }); // додати текст до текстової змінної очків, задати його локацію
    updateScore();
    // livesText = this.add.text(250, 16, 'Життів: 3', { fontSize: '32px', fill: '#000' });

    this.physics.add.collider(player, bread, collectBread, null, this);

    enemies = this.physics.add.group();
    this.physics.add.collider(enemies, platforms);
    createEnemy(275, 800);
    createEnemy(1100, 550);
    createEnemy(1500, 900);
    createEnemy(2300, 900);
    createEnemy(2400, 900);
    createEnemy(2500, 900);
    createEnemy(2600, 900);
    createEnemy(2700, 900);

    enemies.children.iterate(function (child) {
        child.body.setGravityY(350); // додати гравітацію для ворогів
        child.setScale(3);
    });

    this.physics.add.collider(player, enemies, hitEnemy, null, this);

    const immunityFunction = setInterval(function() {
        if (immunity == 0) {return;}
        immunity--;
    }, 10);

    tractors = this.physics.add.group();
    this.physics.add.collider(player, tractors, collectTractor, null, this);
    createTractor(750, 600);
    createTractor(1770, 790);
    createTractor(2900, 950);
}

function createGround(start, y, count, holes) {
    for (let i = start; i < start + count; i++) {
        if (holes === null || !holes.includes(i)) { // якщо не задана діра
            platforms.create(i * 48, y, 'tile').setImmovable(true);
        }
    }
    platforms.children.iterate(function (child) {
        child.setImmovable(true);
        child.body.setAllowGravity(false);
    });
}

function createBread(x, y) {
    bread.create(x, y, 'bread');
}
function createLotOfBread(x, y, stepX, stepY, count) {
    let a = x;
    let b = y;
    for (let i = 0; i < count; i++) {
        createBread(a, b);
        a += stepX;
        b += stepY;
    }
}

function createEnemy(x, y) {
    enemies.create(x, y, 'enemy');
}

function createTractor(x, y) {
    tractors.create(x, y, 'tractor').setScale(2);
}

function collectBread(player, bread) {
    bread.disableBody(true, true);
    score += 1;
    updateScore();
}

function collectTractor(player, tractor) {
    tractor.disableBody(true, true);
    velocityMultiplier = 1.75;
    player.setTint(0xffcc00);
    immunity = 600;
    score += 2;
    updateScore();
    const tractorFunction = setInterval(function () { // скинути швидкість через 6 секунд
        velocityMultiplier = 1;
        player.setTint(0xffffff);
    }, 6000);
}

function hitEnemy(player, enemy) {
    // якщо зверху, вбити ворога
    if (player.y < enemy.y - 80) {
        enemy.disableBody(true, true);
        score += 2;
        updateScore();
        player.setVelocityY(-100);
    }
    else {
        if (immunity > 0) {
            return;
        }
        if (player.x < enemy.x + 50) { // з лівої сторони
            player.x -= enemy.x - player.x + 5;
            player.setVelocityX(-120);
        }
        else { // з правої сторони
            player.x += player.x - enemy.x + 5;
            player.setVelocityX(120);
        }
        // lives--;
        // enemy.disableBody(true, true);
        // livesText.setText('Життів: ' + lives);
        // if (lives == 0) {
        gameOver();
        // }
        // immunity = 40; // *10 мс
    }
}

function update() {
    if (cursors.left.isDown) // якщо натиснута стрілка вліво
    {
        player.setVelocityX(-velocity * velocityMultiplier); // йти вліво
        player.flipX = true; // повернути вліво
    }
    else if (cursors.right.isDown) // якщо натиснута стрілка вправо
    {
        player.setVelocityX(velocity * velocityMultiplier); // йти вправо
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
    if (player.x > 600) {
        scroll(2);
    }
    if (player.y > 1000) {
        gameOver();
    }
    if (xTravelled > 5000) {
        gameOver();
    }
}

function scroll(x) {
    player.x -= x;
    platforms.children.iterate(function (child) {
        child.x -= x;
    });
    bread.children.iterate(function (child) {
        child.x -= x;
    });
    enemies.children.iterate(function (child) {
        child.x -= x;
    });
    tractors.children.iterate(function (child) {
        child.x -= x;
    });
    xTravelled += x;
}

function gameOver() {
    // this.physics.pause();
    if (stopGame) {return;}
    stopGame = true;
    alert("Гру завершено. Набрано очок: " + score + ".");
    location.reload();
}

function updateScore() {
    // scoreText.setText('Очок: ' + score);
    document.getElementById("score").innerText = "Score: " + score;
}