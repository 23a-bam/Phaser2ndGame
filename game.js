var config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    // для this.physics
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
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


function preload() {
    this.load.image('sky', "assets/sky.png");
    this.load.image('tile', "assets/tile.png");
    this.load.image('bread', "assets/bread.png");
    this.load.image('hero', "assets/grandpa.png");
    this.load.image('enemy', "assets/enemy.png");
    this.load.image('tractor', "assets/tractor.png");
}

function create() {
    
}

function update() {

}