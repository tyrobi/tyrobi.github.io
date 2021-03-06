const LEVELS = [
    [
        [1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1]
    ],
    [
        [1, 1, 2, 2, 1, 1],
        [0, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 0, 0],
    ],
    [
        [1, 2, 1, 2, 1, 2, 1],
        [2, 1, 2, 1, 2, 1, 2],
    ],
    [
        [1, 2, 3, 3, 2, 1],
        [1, 2, 2, 2, 2, 1],
    ],
    [
        [3, 3, 3, 3, 3],
        [1, 2, 2, 2, 1],
        [1, 1, 1, 1, 1]
    ],
]

function getEnemyCount(index)
{
    index -= 1;
    if (index >= 0 && index < LEVELS.length)
        return LEVELS[index].length * LEVELS[index][0].length;
    return -1;
}

class Level
{
    constructor(sketch, config)
    {
        this.currentLevel = 0;
        this.sketch = sketch;
        this.config = config;
        this.shouldRenderEnemies = true;

        this.enemies = [];
        this.explosions = [];
        this.blasts = [];
        this.speed = config.DEFAULT_ENEMY_SPEED;
        this.vertSpeed = config.DEFAULT_ENEMY_DROP_SPEED;
        this.deltaX = this.speed;
        this.travellingRight = true;
        this.deltaY = 0;

        this.xLim = 100 - (1600 / config.DEFAULT_DIM.x);
        this.edgeHit = false;
        this.dropTime = 0;
        this.updateSpeed = false;
        this.fireChance = 0.0017;
        this.initialized = false;
        this.levelTitleTimer = 3000;

    }

    initEnemies()
    {
        let {sketch, config, currentLevel} = this;
        if (!this.shouldRenderEnemies)
            return;
        this.enemies = [];
        if (this.currentLevel >= LEVELS.length)
        {

            this.shouldRenderEnemies = false;
        }
        if (currentLevel < LEVELS.length)
            for (let y = 0; y < LEVELS[currentLevel].length; y++) {
                for (let x = 0; x < LEVELS[currentLevel][y].length; x++) {
                    if (LEVELS[currentLevel][y][x] > 0)
                        this.enemies.push(
                            new Enemy(sketch, config,
                                x * 7, y * 8, LEVELS[currentLevel][y][x] - 1));
            }
        }
        this.currentLevel ++;
        this.travellingRight = true;
        this.deltaY = 0;
        this.edgeHit = false;
        this.lastFrameEdgeHit = false;
        this.dropTime = 0;
        this.fireChance = 0.0017;
        this.updateSpeed = false;
        this.speed = config.DEFAULT_ENEMY_SPEED;
        this.deltaX = this.speed;
        this.updateDifficulty();
        this.levelTitleTimer = 3000;
        this.hasLost = false;
        this.loseDelayCounter = 2000;
        this.replayDelayCounter = 1000;
    }

    updateDifficulty()
    {
        let enemiesDefeated = getEnemyCount(this.currentLevel) - this.enemies.length;
        this.speed += enemiesDefeated * 0.01;
        this.fireChance += enemiesDefeated * 50;
        if (this.fireChance >= 1700)
            this.fireChance = 1700;
        this.updateSpeed = false;
    }

    initialize()
    {
        this.messages = {
            win   : this.config.loadText("You Win!"),
            lose  : this.config.loadText("Game Over"),
            replay: this.config.loadText("Press 'F5' to play again!")
        };
        this.levelMessages = [
            this.config.loadText("Level 1"),
            this.config.loadText("Level 2"),
            this.config.loadText("Level 3"),
            this.config.loadText("Level 4"),
            this.config.loadText("Level 5"),
            this.config.loadText("Level 6"),
            this.config.loadText("Level 7"),
            this.config.loadText("Level 8"),
        ]
        this.initialized = true;
    }

    detectCollisions(projectiles, ship)
    {
        let projectileW, projectileH;
        let enemyW, enemyH;
        let blastW, blastH;
        if (projectiles.length > 0)
        {
            projectileW = projectiles[0].getWidth();
            projectileH = projectiles[0].getHeight();
        }
        if (this.enemies.length > 0)
        {
            enemyW = this.enemies[0].getWidth();
            enemyH = this.enemies[0].getHeight();
        }
        if (this.blasts.length > 0)
        {
            blastW = this.blasts[0].getWidth();
            blastH = this.blasts[0].getHeight();
        }
        this.hasLost = ship.lives <= 0;
        if (this.hasLost && this.vertSpeed > 0)
            this.vertSpeed *= -3;
        if (this.levelTitleTimer <= 0)
        {
            for (let p = 0; p < projectiles.length; p++)
            {
                for (let e = 0; e < this.enemies.length; e++)
                {
                    let projectile = projectiles[p];
                    let enemy = this.enemies[e];
                    if (projectile.getY() <= enemy.getY() + enemyH &&
                        projectile.getY() + projectileH >= enemy.getY())
                    {
                        if (projectile.getX() < enemy.getX() + enemyW &&
                            projectile.getX() + projectileW > enemy.getX())
                        {
                            enemy.hit = true;
                            projectile.impacted = true;
                            this.updateSpeed = true;
                            this.explosions.push(new Explosion(this.sketch, this.config, enemy.x, enemy.y));
                            this.config.explosion.play();
                        }
                    }
                }
            }
        }
        for (var i = 0; i < this.blasts.length; i++) {
            let blast = this.blasts[i];
            if (blast.getY() <= ship.getY() + (ship.getHeight() / 2) &&
                    blast.getY() + blastH >= ship.getY())
                {
                if (blast.getX() < ship.getX() + ship.getWidth() &&
                        blast.getX() + blastW > ship.getX())
                    {
                        ship.hit = true;
                        blast.impacted = true;
                        this.explosions.push(new Explosion(this.sketch, this.config, ship.x, ship.y - 4));
                    }
                }
        }
    }

    updateEnemies(update)
    {
        let {sketch, config, explosions, blasts, enemies} = this;
        let edgeDetected = false;
        if (this.updateSpeed)
            this.updateDifficulty();
        for (var i = enemies.length - 1; i >= 0; i--) {
            if (enemies[i].hit)
            {
                enemies.splice(i, 1);
                continue;
            }
            if (enemies[i].firingTime < this.fireChance)
            {
                enemies[i].resetFiringTimer();
                blasts.push(
                    new EnergyBlast(sketch, config, enemies[i].x, enemies[i].y, 0.7, enemies[i].variant));
            }
            if (this.edgeHit) continue;
            if (this.enemies[i].x < 0 || this.enemies[i].x > this.xLim)
               edgeDetected = true;
        }
        if (this.lastFrameEdgeHit)
            this.lastFrameEdgeHit = edgeDetected;
        else if (edgeDetected)
        {
            this.edgeHit = true;
            this.dropTime = 1000;
            this.deltaY = this.vertSpeed;
            this.deltaX = 0;
        }
        if (this.edgeHit)
        {
            if (this.dropTime > 0)
                this.dropTime = this.dropTime - update;
            else
            {
                this.edgeHit = false;
                this.dropTime = 0;
                this.deltaY = 0;
                this.travellingRight = !this.travellingRight;
                this.deltaX = (this.travellingRight)? this.speed: -this.speed;
                this.lastFrameEdgeHit = true;
            }
        }
        for (var i = 0; i < enemies.length; i++) {
            enemies[i].move(this.deltaX, this.deltaY);
            enemies[i].draw(update);
        }

    }

    draw(update)
    {
        let {sketch, config, explosions, blasts, enemies, messages} = this;
        if (this.hasLost)
        {
            this.shouldRenderEnemies = enemies.length == 0 ||
                enemies[enemies.length - 1].y > -10;
            if (this.loseDelayCounter <= 0)
            {
                config.drawText(this.messages.lose, 50, 50, 1, false);
                if (this.replayDelayCounter <= 0)
                    config.drawText(this.messages.replay, 52, 60, 0.4, false);
                else
                    this.replayDelayCounter -= update;
            }
            else
                this.loseDelayCounter -= update;
        }
        if (enemies.length == 0 || enemies[0].y > 100)
            this.initEnemies();
        if (this.levelTitleTimer > 0)
        {
            if (this.currentLevel <= LEVELS.length)
            {

                this.levelTitleTimer -= update;
                this.config.drawText(this.levelMessages[this.currentLevel - 1], 50, 50, 1, false);
            }
            else
            {
                this.shouldRenderEnemies = false;
                this.config.drawText(this.messages.win, 50, 50, 1, false);
                if (this.replayDelayCounter <= 0)
                    config.drawText(this.messages.replay, 52, 60, 0.4, false);
                else
                    this.replayDelayCounter -= update;
            }
        }
        else if (this.shouldRenderEnemies) this.updateEnemies(update);

        for (let i = explosions.length -1; i >= 0; i--)
        {
            if (explosions[i].done)
            {
                explosions.splice(i, 1);
                continue;
            } else
                explosions[i].draw();
        }
        for (let i = blasts.length -1; i >= 0; i--)
        {
            if (blasts[i].y > 100 || blasts[i].impacted)
            {
                blasts.splice(i, 1);
                continue;
            } else
                blasts[i].draw(update);
        }
    }
}