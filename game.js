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
var timer = -1; // *100 мс
// var lives = 3;
// var livesText;
var immunity = 0;
const velocity = 120; // базова 
var velocityMultiplier = 1;
var xTravelled = 0;
var stopGame = false;

var startAuto = 6000; // x, після якого почнеться автоматична генерація
var worldWidth = 15000; // всього ширина

const YLines = [250, 400, 550, 700, 850]; // можливі значення y для платформ
const platformProbability = 0.1;
const breadYOffset = -20;
const tractorYOffset = -24;
const breadProbability = 0.02;
const tractorProbability = 0.01;

function preload() {
    this.load.image('sky', "assets/sky.png");
    this.load.image('tile', "assets/tile.png");
    this.load.image('bread', "assets/bread.png");
    this.load.image('hero', "assets/grandpa.png");
    this.load.image('enemy', "assets/enemy.png");
    this.load.image('tractor', "assets/tractor.png");
    this.load.image('flag', "assets/flag.png");
}

function create() {
    // додає небо, починаючи з точки (0, 0)
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(worldWidth, 1080); // setDisplaySize розтягує

    // для камери
    // this.add.tileSprite(0, 0, worldWidth, 1080, "sky").setDisplaySize(1920, 1080).setOrigin(0, 0);

    platforms = this.physics.add.group();

    createGround(0, 1034, 75, new Array(4, 5, 6, 10, 11, 12, 25, 26, 27, 28, 29, 36, 37, 38, 39, 40, 41, 42, 43, 44)); // земля
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
    createGround(97, 350, 5, new Array());
    createGround(108, 900, 15, new Array());


    // гравець
    // створює гравця на старті або на чекпойнті залежно від збереженого результату
    checkpoint = fetchRecords()[1] != 99999;
    player = checkpoint ? this.physics.add.sprite(5750, 800, 'hero') : this.physics.add.sprite(175, 700, 'hero');
    // налаштування гравця
    player.setScale(3);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);
    // гравітація для гравця
    player.body.setGravityY(350);

    // реєструє стрілки вліво, вправо, вгору, вниз
    cursors = this.input.keyboard.createCursorKeys();

    // хліб
    bread = this.physics.add.group();
    createBread(480, 720);
    createBread(1150, 620);
    createBread(1400, 500);
    createLotOfBread(3000, 950, 50, 0, 12);
    createLotOfBread(5000, 200, 20, 50, 12);

    // scoreText = this.add.text(16, 16, 'Очок: 0', { fontSize: '32px', fill: '#000' }); // додати текст до текстової змінної очків, задати його локацію
    updateScore();
    // livesText = this.add.text(250, 16, 'Життів: 3', { fontSize: '32px', fill: '#000' });

    // колайдер для хліба
    this.physics.add.overlap(player, bread, collectBread, null, this);

    // вороги
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
        child.setScale(3); // збільшити у 3 рази
    });

    this.physics.add.collider(player, enemies, hitEnemy, null, this);

    // зменшувати імунітет
    const immunityFunction = setInterval(function() {
        if (immunity == 0) {return;}
        immunity--;
    }, 10);

    // трактори
    tractors = this.physics.add.group();
    this.physics.add.collider(player, tractors, collectTractor, null, this);
    createTractor(750, 600);
    createTractor(1770, 790);
    createTractor(2900, 950);

    // додати флаг
    flag = this.physics.add.sprite(5500, 560, 'flag').setOrigin(0, 0).setScale(1, 10); // розтягнути вертикально у 10 разів
    // якщо чекпойнт, то флаг неактивний
    if (!checkpoint) {
        this.physics.add.overlap(player, flag, hitFlag, null, this);
    }

    // таймер
    const timerFunction = setInterval(function() {
        timer++;
        updateTime();
    }, 95); // повторювати кожні 95 мс (-5 мс для владнання похибки)

    // створити землю після x = 6000 автоматично
    createGroundAuto();
    // випадково створити платформи
    createPlatformsAuto();
    createBreadAuto();
    createTractorsAuto();

    // налаштування камери
    this.cameras.main.setBounds(0, 0, worldWidth, window.innerHeight);
    this.physics.world.setBounds(0, 0, worldWidth, window.innerHeight);
    // слідкування камери за гравцем
    this.cameras.main.startFollow(player);

    player.body.setGravityY(350);
}

// start - стартова позиція по x * 48
// count - кількість платформ
// holes - масив значень x*48, де треба дірки
function createGround(start, y, count, holes) {
    for (let i = start; i < start + count; i++) {
        if (holes === null || !holes.includes(i)) { // якщо не задана діра
            platforms.create(i * 48, y, 'tile').setImmovable(true);
        }
    }
    /* вимкнути гравітацію (уже в createPlatformsAuto)
    platforms.children.iterate(function (child) {
        child.setImmovable(true);
        child.body.setAllowGravity(false);
    }); */
}

function createGroundAuto() {
    // починаючи з x = 6000, створювати землю автоматично
    for (var x = startAuto; x < worldWidth;  x += 48) {
        platforms.create(x, 1000, 'tile').setOrigin(0, 0).refreshBody();
    }
}

function createPlatformsAuto() {
    YLines.forEach(y => { // для кожного можливого значення Y платформи
        for (var x = startAuto; x < worldWidth; x += 48) {
            if (Math.random() < platformProbability) { // згенерувати число від 0 до 1, якщо воно менше ймовірності, створити платформу
                let length = 1 + getRandomInt(3) + getRandomInt(8); // випадково обрати довжину платформи
                for (var a = 0; a < length; a++) {
                    platforms.create(x, y, 'tile').setOrigin(0, 0).refreshBody(); // створити платформу
                    x += 48;
                }
                x += 115; // зробити відступ (буде ще +48)
            }
        }
    });
    platforms.children.iterate(function (child) {
        child.setImmovable(true);
        child.body.setAllowGravity(false);
    });
}
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function createBreadAuto() {
    YLines.forEach(y => {
        for (var x = startAuto; x < worldWidth; x += 50) { // значення не кратні 48 обрані для нелінійності
            if (Math.random() < breadProbability) {
                createBread(x, y + breadYOffset);
            }
        }
    });
}

function createTractorsAuto() {
    YLines.forEach(y => {
        for (var x = startAuto; x < worldWidth; x += 50) {
            if (Math.random() < tractorProbability) {
                createTractor(x, y + tractorYOffset);
            }
        }
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
function hitFlag(player, flag) {
    gameOver(true);
}

function createEnemy(x, y) {
    enemies.create(x, y, 'enemy');
}

function createTractor(x, y) {
    tractors.create(x, y, 'tractor').setScale(2);
}

function collectBread(player, bread) {
    bread.destroy(); // видалити хліб з гри
    score += 1;
    updateScore();
}

function collectTractor(player, tractor) {
    tractor.destroy();
    velocityMultiplier = 1.75; // збільшити швидкість у 1.75 разів
    player.setTint(0xffcc00); // поставити гравця зеленим
    immunity = 600; // додати імунітет на 6 секунд
    score += 2;
    updateScore();
    const tractorFunction = setInterval(function () { // скинути швидкість і колір через 6 секунд
        velocityMultiplier = 1;
        player.setTint(0xffffff);
    }, 6000);
}

function hitEnemy(player, enemy) {
    // якщо зверху, вбити ворога
    if (player.y < enemy.y - 80) {
        enemy.destroy();
        score += 2;
        updateScore();
        player.setVelocityY(-100);
    }
    else {
        // якщо імунітет, не зважати
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
        gameOver(false);
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
    /*
    if (player.x > 600) { // скроллінг
        scroll(2 + (player.x - 600) / 150.0 ); // адаптивний скроллінг у залежності від x
    }
    */
    if (player.y > 1000) { // герой впав
        gameOver(false);
    }
}

/*
function scroll(x) {
    player.x -= x;
    flag.x -= x;
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
*/

function updateScore() {
    // scoreText.setText('Очок: ' + score);
    document.getElementById("score").innerText = "Score: " + score;
}

function updateTime() {
    document.getElementById("timer").innerText = "Timer: " + formatTimerText(timer);
}
function formatTimerText(time)
{
    // розраховує мілісекунди * 100 (децисекунди), секунди й хвилини
    let ms = time % 10; // *100 мс
    let s = Math.floor((time / 10) % 60);
    let min = Math.floor(time / 600);
    // якщо кількість секунд і хвилин одноцифрова, додати на початку 0
    let sText = s < 10 ? "0" + s : "" + s;
    let mText = min < 10 ? "0" + min : "" + min;
    // відформатовує текст і повертає
    return mText + ":" + sText + "." + ms;
}

function fetchRecords() {
    let cookies = document.cookie;
    if (cookies == "") {return new Array(0, 99999);} // якщо не збережено, далі не йти
    const data = cookies.split("=")[1].split(" "); // поділити по коміркам по черзі
    // data[0] - high score, data[1] - time
    return data;
}

function gameOver(win) {
    // this.physics.pause();
    if (stopGame) {return;}
    stopGame = true;
    if (win) {
        const data = fetchRecords();
        let highScore = data[0] // якщо результати ще не збережені, буде 0
        let lowestTime = data[1] ?? 99999; // якщо результати ще не збережені, буде 99999 (велике значення, яке має бути побито при першій перемозі)
        let record1 = (score > highScore ? "минулий рекорд: " : "рекорд: ") + highScore;
        let record2 = (timer < lowestTime ? "минулий рекорд: " : "рекорд: ") + formatTimerText(lowestTime);
        if (lowestTime == 99999) record2 = "минулий рекорд не збережено";

        /*
        приклад повідомлення:
        Ви виграли!
        Набрано очок: 45 (минулий рекорд: 43).
        Витрачено часу: 00:55.6 (рекорд: 00:49.4).
        */
        alert("Ви досягли чекпойнту!\nНабрано очок: " + score + " (" + record1 + ").\nВитрачено часу: " + formatTimerText(timer) + " (" + record2 + ").");

        // якщо хоча б один із рекордів побито, зберегти cookie
        if (score > highScore || timer < lowestTime) {
            // якщо кількість очків більша, зберегти її, 
            saveResultAsCookie(score > highScore ? score : highScore, timer < lowestTime ? timer : lowestTime);
        }

        // перемістити гравця до фактичної локації чекпойнту
        player.x = 5750;
        player.y = 800;
        stopGame = false;
    }
    else {
        alert("Гру завершено. Набрано очок: " + score + ".");
        location.reload();
    }
}

function saveResultAsCookie(score, time) {
    // задати вміст cookie
    str = score +  " " + time; // сам контент cookie
    // зберегти cookie
    document.cookie = "data=" + str + "; expires=Thu, 12 Feb 2026 12:00:00 UTC";
}