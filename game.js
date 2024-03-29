var config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    // для this.physics
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
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
var lives = 2;
var livesText;
var immunity = 0; // *10 мс
const velocity = 120; // базова горизонтальна швидкість
var velocityMultiplier = 1;
// var xTravelled = 0;
var stopGame = false; // для того, щоб функція GameOver не викликалася двічі

var startAuto = 250; // x, після якого почнеться автоматична генерація
var worldWidth = config.width * 5; // ширина в екранах

var tractorBonus = 0; // строк дії трактора (*10 мс)

const YLines = [250, 400, 550, 700, 850, 1000]; // можливі значення y для платформ та об'єктів
const breadYOffset = -20;
const tractorYOffset = -24;
const enemyYOffset = -50;
const heartYOffset = -24;

// імовірності для різних об'єктів
const platformProbability = 0.1;
const breadProbability = 0.02;
const tractorProbability = 0.005;
const enemyProbability = 0.02;
const heartProbability = 0.007;
const decor = ['bush', 'tree', 'mushroom']; // можливі декорації

function preload() {
    // завантажити асети в гру
    this.load.image('sky', "assets/sky.png");
    this.load.image('tile', "assets/tile.png");
    this.load.image('bread', "assets/bread.png");
    this.load.image('hero', "assets/grandpa.png");
    this.load.image('enemy', "assets/enemy.png");
    this.load.image('tractor', "assets/tractor.png");
    this.load.image('heart', "assets/heart.png");
    this.load.image('flag', "assets/flag.png");
    this.load.image('bush', "assets/bush.png");
    this.load.image('tree', "assets/tree.png");
    this.load.image('mushroom', "assets/mushroom.png");
}

function create() {
    // додає небо, починаючи з точки (0, 0)
    this.add.image(0, 0, 'sky')
        .setOrigin(0, 0)
        .setDisplaySize(worldWidth, 1080)
        .setDepth(0); // setDisplaySize розтягує

    // для камери
    // this.add.tileSprite(0, 0, worldWidth, 1080, "sky").setDisplaySize(1920, 1080).setOrigin(0, 0);

    platforms = this.physics.add.group();
    createGround(1, 800, 5, new Array()); // початкова платформа

    // гравець
    // створює гравця на старті або на чекпойнті залежно від збереженого результату
    // checkpoint = fetchRecords()[1] != 99999;
    player = this.physics.add.sprite(100, 700, 'hero');
    // налаштування гравця
    player.setScale(3);
    player.setDepth(5);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);
    // гравітація для гравця
    player.body.setGravityY(350);

    // реєструє стрілки вліво, вправо, вгору, вниз
    cursors = this.input.keyboard.createCursorKeys();

    // scoreText = this.add.text(16, 16, 'Очок: 0', { fontSize: '32px', fill: '#000' }); // додати текст до текстової змінної очків, задати його локацію
    updateScore();
    // livesText = this.add.text(250, 16, 'Життів: 2', { fontSize: '32px', fill: '#000' });
    updateLives();

    // хліб
    bread = this.physics.add.group();
    // колайдер для хліба
    this.physics.add.overlap(player, bread, collectBread, null, this);

    // вороги
    enemies = this.physics.add.group();
    this.physics.add.collider(enemies, platforms);
    this.physics.add.collider(player, enemies, hitEnemy, null, this); // зіткнення ворога з платформами

    // трактори
    tractors = this.physics.add.group();
    this.physics.add.collider(player, tractors, collectTractor, null, this);

    // об'єкт життя
    hearts = this.physics.add.group();
    this.physics.add.overlap(player, hearts, collectHeart, null, this);

    // зменшувати імунітет
    const immunityAndTractorFunction = setInterval(function () {
        if (immunity <= 0 && tractorBonus <= 0) { return; }
        immunity--;
        tractorBonus--;
    }, 10);

    // додати флаг
    flag = this.physics.add.sprite(9500, 1000, 'flag')
        .setOrigin(0, 1);
    this.physics.add.overlap(player, flag, hitFlag, null, this);

    // таймер
    const timerFunction = setInterval(function () {
        timer++;
        updateTime();
    }, 95); // повторювати кожні 95 мс (-5 мс для владнання похибки)

    // створити землю після x = 6000 автоматично
    createGroundAuto();
    createPlatformsAuto();
    // випадково створити ігрові об'єкти
    createElementAuto(enemyProbability, enemyYOffset, createEnemy);
    createElementAuto(breadProbability, breadYOffset, createBread);
    createElementAuto(tractorProbability, tractorYOffset, createTractor);
    createElementAuto(heartProbability, heartYOffset, createHeart)

    // налаштування ворогів
    enemies.children.iterate(function (child) {
        child.body.setGravityY(350); // додати гравітацію для ворогів
        child.setScale(3); // збільшити у 3 рази
    });

    // налаштування камери
    this.cameras.main.setBounds(0, 0, worldWidth, window.innerHeight);
    this.physics.world.setBounds(0, 0, worldWidth, window.innerHeight);
    // слідкування камери за гравцем
    this.cameras.main.startFollow(player);

    // декорації
    decorations = this.physics.add.group();
    createDecorations();
}

// start - стартова позиція по x * 48
// count - кількість платформ
// holes - масив значень x*48, де треба "дірки"
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

/*
function createOldObjects() {
    // НЕ ВИКОРИСТОВУЄТЬСЯ
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

    createTractor(750, 600);
    createTractor(1770, 790);
    createTractor(2900, 950);

    createEnemy(275, 800);
    createEnemy(1100, 550);
    createEnemy(1500, 900);
    createEnemy(2300, 900);
    createEnemy(2400, 900);
    createEnemy(2500, 900);
    createEnemy(2600, 900);
    createEnemy(2700, 900);

    createBread(480, 720);
    createBread(1150, 620);
    createBread(1400, 500);
    createLotOfBread(3000, 950, 50, 0, 12);
    createLotOfBread(5000, 200, 20, 50, 12);
}
*/

function createGroundAuto() {
    // пстворювати землю автоматично
    for (var x = startAuto; x < worldWidth; x += 48) {
        platforms.create(x, 1000, 'tile').setOrigin(0, 0).refreshBody();
    }
}

function createPlatformsAuto() {
    YLines.forEach(y => { // для кожного можливого значення Y платформи
        if (y == 1000) {return;} // не створювати на y=1000, бо там вже є земля
        for (var x = startAuto; x < worldWidth; x += 48) {
            if (Math.random() < platformProbability) { // згенерувати число від 0 до 1, якщо воно менше ймовірності, створити платформу
                let length = 1 + getRandomInt(3) + getRandomInt(8); // випадково обрати довжину платформи
                for (var a = 0; a < length; a++) { // стільки разів створити платформу
                    platforms.create(x, y, 'tile')
                        .setOrigin(0, 0)
                        .refreshBody();
                    x += 48;
                }
                x += 115; // зробити відступ (буде ще +48)
            }
        }
    });
    // налаштувати всі платформи
    platforms.children.iterate(function (child) {
        child.setImmovable(true);
        child.body.setAllowGravity(false);
    });
}
function getRandomInt(max) {
    return Phaser.Math.Between(0, max);
}

function createElementAuto(probability, offset, creator) { // автоматично створювати деякий елемент
    YLines.forEach(y => {
        for (var x = startAuto; x < worldWidth; x += 54) { // значення не кратні 48 обрані для нелінійності
            if (Math.random() < probability) {
                creator(x, y + offset, Phaser.Math.Between(1, 10));
            }
        }
    });
}

function createDecorations() {
    for (var x = startAuto; x < worldWidth; x += 400) { // кожні 400 пікселів по x
        xRandom = Phaser.Math.Between(0, 300); // зміщення по x
        scale = Phaser.Math.Between(0.6, 1.1); // випадковий розмір
        index = getRandomInt(decor.length); // обрати випадковий елемент з декорацій
        if (index == decor.length) {continue;} // або нічого не обирати
        type = decor[index]
        decorations.create(x + xRandom, 1000, type) // створити відповідну декорацію
            .setOrigin(0, 1)
            .setScale(scale)
            .setDepth(Phaser.Math.Between(1, 10));
    }
}

function hitFlag(player, flag) {
    gameOver(true); // закінчити гру з позначкою "виграв"
}

function createBread(x, y, depth) {
    bread.create(x, y, 'bread').setDepth(depth);
}
/*
function createLotOfBread(x, y, stepX, stepY, count) {
    let a = x;
    let b = y;
    for (let i = 0; i < count; i++) {
        createBread(a, b);
        a += stepX;
        b += stepY;
    }
}
*/
function createEnemy(x, y, depth) {
    enemies.create(x, y, 'enemy').setDepth(depth);
}

function createTractor(x, y, depth) {
    tractors.create(x, y, 'tractor').setScale(2).setDepth(depth);
}

function createHeart(x, y, depth) {
    hearts.create(x, y - getRandomInt(25), 'heart').setDepth(depth);
}

function collectHeart(player, heart) {
    heart.destroy();
    lives++;
    score += 3;
    updateLives();
    updateScore();
}

function collectBread(player, bread) {
    bread.destroy(); // видалити хліб з гри
    score += 1;
    updateScore();
}

function collectTractor(player, tractor) {
    tractor.destroy();
    if (immunity > 0) {immunity += 200;} // додати 2 секунди імунітету, якщо він вже є
    else {immunity = 400;} // додати імунітет на 4 секунди
    if (tractorBonus > 0) {tractorBonus += 200;} // аналогічно з бонусом трактора, що відповідає за швидкість і колір гравця
    else {tractorBonus = 400;}
    score += 2;
    updateScore();
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
        lives--;
        updateLives();
        enemy.disableBody(true, true);
        // livesText.setText('Життів: ' + lives);
        if (lives == 0) {
            gameOver(false);
        }
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

    if (cursors.up.isDown && player.body.touching.down) {
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
    // бонус трактора
    if (tractorBonus > 0) {
        velocityMultiplier = 1.75; // збільшити швидкість у 1.75 разів
        player.setTint(0xffcc00); // поставити гравця зеленим
    }
    else {
        velocityMultiplier = 1;
        player.setTint(0xffffff);
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
    document.getElementById("score").innerText = "Очок: " + score; // відобразити кількість очок
}
function updateLives() {
    document.getElementById("lives").innerText = "Життів: " + lives;
}
function updateTime() {
    document.getElementById("timer").innerText = "Час: " + formatTimerText(timer); // відобразити час
}
function formatTimerText(time) {
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
    if (cookies == "") { return new Array(0, 99999); } // якщо не збережено, далі не йти
    const data = cookies.split("=")[1].split(" "); // поділити по коміркам по черзі
    // data[0] - high score, data[1] - time
    return data;
}

function gameOver(win) {
    // this.physics.pause();
    if (stopGame) { return; }
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
        Витрачено часу: 01:55.6 (рекорд: 01:49.4).
        */
        alert("Ви виграли!\nНабрано очок: " + score + " (" + record1 + ").\nВитрачено часу: " + formatTimerText(timer) + " (" + record2 + ").");

        // якщо хоча б один із рекордів побито, зберегти cookie
        if (score > highScore || timer < lowestTime) {
            // якщо кількість очків більша, зберегти її, 
            saveResultAsCookie(score > highScore ? score : highScore, timer < lowestTime ? timer : lowestTime);
        }

        location.reload();
    }
    else {
        alert("Гру завершено. Набрано очок: " + score + ".");
        location.reload();
    }
}

function saveResultAsCookie(score, time) {
    // задати вміст cookie
    str = score + " " + time; // сам контент cookie
    // зберегти cookie
    document.cookie = "data=" + str + "; expires=Thu, 12 Feb 2026 12:00:00 UTC";
}