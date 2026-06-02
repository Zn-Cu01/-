// 游戏常量
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PLAYER_SIZE = 40;
const DIAMOND_WIDTH = 20;
const DIAMOND_HEIGHT = 35;
const PLATFORM_HEIGHT = 20;
const INITIAL_SPEED = 0.12 * 0.7 * 0.7 * 4 * 0.25 * 2; // 减慢到原来的1/4后再乘2
const MAX_SPEED = 0.42 * 3 * 0.25 * 3; // 减慢到原来的1/4后再乘3，提升最高速度
const SPEED_INCREMENT = 0.0006 * 0.25 * 2.5; // 减慢到原来的1/4后再乘2.5，增加速度增量
const DIAMOND_VALUE = 10;
const OBSTACLE_SPACING = 250 * 1.3;
const DIAMOND_SPACING = 100;
const PLATFORM_SPACING = 220;
const OBSTACLE_PLATFORM_SPACING = 200 * 1.3;
const JUMP_POWER = 8 * 0.5; // 减慢跳跃力度到原来的1/2
const MAX_JUMP_POWER = 22 * 0.5; // 减慢最大跳跃力度到原来的1/2
// 平台长度阈值
const MIN_PLATFORM_WIDTH = 80;
const MAX_PLATFORM_WIDTH = 300;

// 音频元素
let audioElements = {};
let currentBgm = null;



// 游戏状态
let canvas, ctx;
// 存储随机场景顺序
let randomSceneOrder = [];
let player = {
    x: 100,
    y: GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dx: 0,
    dy: 0,
    speed: INITIAL_SPEED,
    jumping: false,
    sliding: false,
    jumpCount: 0,
    maxJumps: Infinity, // 无限次跳跃
    gravity: 0.18 * 4 * 0.25, // 减慢到原来的1/4
    velocityY: 0,
    animationFrame: 0,
    slideTimer: 0,
    jumpPower: 10 * 0.5 // 减慢跳跃力度到原来的1/2
};

let gameState = {
    running: false,
    gameOver: false,
    score: 0,
    distance: 0,
    diamondsCollected: 0,
    currentLevel: 0,
    currentScene: 0,
    elapsedTime: 0,
    platforms: [],
    diamonds: [],
    obstacles: [],
    particles: [],
    backgroundElements: []
};

let keys = {};
let keyPressed = {
    'ArrowUp': false
};

// 场景定义
const scenes = [
    { 
        name: 'grassland', 
        color: '#4CAF50', 
        platformColor: '#8BC34A',
        backgroundColor: '#81C784',
        backgroundElements: ['cloud', 'bird']
    },
    { 
        name: 'desert', 
        color: '#FFC107', 
        platformColor: '#FF9800',
        backgroundColor: '#FFD54F',
        backgroundElements: ['cactus']
    },
    { 
        name: 'castle', 
        color: '#9E9E9E', 
        platformColor: '#607D8B',
        backgroundColor: '#BDBDBD',
        backgroundElements: ['cloud', 'tower']
    },
    { 
        name: 'underwater', 
        color: '#2196F3', 
        platformColor: '#03A9F4',
        backgroundColor: '#4FC3F7',
        backgroundElements: ['bubble', 'fish', 'seaweed']
    }
];

// 关卡定义
const levels = [
    { platforms: 3, diamonds: 5 },
    { platforms: 4, diamonds: 7 },
    { platforms: 5, diamonds: 9 },
    { platforms: 6, diamonds: 11 }
];

// 初始化音频元素
function initAudio() {
    console.log('开始初始化音频元素...');
    
    audioElements = {
        grassland: document.getElementById('bgm-grassland'),
        desert: document.getElementById('bgm-desert'),
        castle: document.getElementById('bgm-castle'),
        underwater: document.getElementById('bgm-underwater')
    };
    
    // 检查音频元素是否存在
    Object.entries(audioElements).forEach(([key, audio]) => {
        if (audio) {
            console.log('音频元素找到:', key);
            console.log('音频src:', audio.querySelector('source').src);
            
            // 设置音量
            audio.volume = 0.7; // 调整音量到70%
            
            // 监听音频加载事件
            audio.addEventListener('canplaythrough', () => {
                console.log('音频加载完成:', key);
            });
            
            audio.addEventListener('error', (e) => {
                console.log('音频加载错误:', key, e);
            });
            
            // 尝试加载音频
            audio.load();
        } else {
            console.log('音频元素未找到:', key);
        }
    });
    
    console.log('音频初始化完成');
}

// 播放背景音乐
function playBgm(sceneName) {
    // 停止当前播放的音乐
    if (currentBgm) {
        currentBgm.pause();
        currentBgm.currentTime = 0;
    }
    
    // 播放新场景的音乐
    const newBgm = audioElements[sceneName];
    if (newBgm) {
        newBgm.currentTime = 0;
        newBgm.play().then(() => {
            console.log('场景音乐播放成功:', sceneName);
            currentBgm = newBgm;
        }).catch(error => {
            console.log('场景音乐播放失败:', error);
            // 尝试用户交互后再播放
            document.body.addEventListener('click', function playOnClick() {
                newBgm.play().then(() => {
                    console.log('场景音乐在用户交互后播放成功:', sceneName);
                    currentBgm = newBgm;
                }).catch(error => {
                    console.log('场景音乐播放仍然失败:', error);
                });
                document.body.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    }
}

// 暂停所有背景音乐
function pauseAllBgm() {
    Object.values(audioElements).forEach(audio => {
        if (audio) {
            audio.pause();
        }
    });
    currentBgm = null;
}

// 初始化游戏
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // 初始化音频
    initAudio();
    
    // 键盘事件监听
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        // 只有在按键第一次按下时设置keyPressed
        if (!keyPressed[e.key]) {
            keyPressed[e.key] = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        keyPressed[e.key] = false;
    });
    
    // 直接初始化游戏，使用Canvas绘制红宝石
    resetGame();
}

// 生成随机场景顺序
function generateRandomSceneOrder() {
    // 创建场景索引数组
    const sceneIndices = [0, 1, 2, 3];
    // 打乱数组顺序
    for (let i = sceneIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sceneIndices[i], sceneIndices[j]] = [sceneIndices[j], sceneIndices[i]];
    }
    return sceneIndices;
}

// 重置游戏
function resetGame() {
    player.x = 100;
    player.y = GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT;
    player.speed = INITIAL_SPEED;
    player.velocityY = 0;
    player.jumping = false;
    player.animationFrame = 0;
    
    // 生成新的随机场景顺序
    randomSceneOrder = generateRandomSceneOrder();
    
    gameState = {
        running: false,
        gameOver: false,
        gameComplete: false,
        score: 0,
        distance: 0,
        diamondsCollected: 0,
        currentLevel: 0,
        previousLevel: 0,
        currentScene: randomSceneOrder[0], // 初始场景使用随机顺序的第一个
        elapsedTime: 0,
        platforms: [],
        diamonds: [],
        obstacles: [],
        particles: [],
        backgroundElements: []
    };
    
    // 暂停所有背景音乐
    pauseAllBgm();
    
    generateLevel();
    generateBackgroundElements();
    updateUI();
    drawGame();
}

// 开始游戏
function gameStart() {
    if (!gameState.running && !gameState.gameOver) {
        gameState.running = true;
        
        // 播放当前场景的背景音乐
        const scene = scenes[gameState.currentScene % scenes.length];
        
        // 尝试播放音乐，处理浏览器自动播放限制
        const bgm = audioElements[scene.name];
        if (bgm) {
            bgm.currentTime = 0;
            bgm.play().then(() => {
                console.log('音乐播放成功:', scene.name);
                currentBgm = bgm;
            }).catch(error => {
                console.log('音乐播放失败:', error);
                // 尝试用户交互后再播放
                document.body.addEventListener('click', function playOnClick() {
                    bgm.play().then(() => {
                        console.log('音乐在用户交互后播放成功:', scene.name);
                        currentBgm = bgm;
                    }).catch(error => {
                        console.log('音乐播放仍然失败:', error);
                    });
                    document.body.removeEventListener('click', playOnClick);
                }, { once: true });
            });
        }
        
        gameLoop();
    }
}

// 暂停游戏
function pauseGame() {
    gameState.running = false;
    // 暂停所有背景音乐
    pauseAllBgm();
}

// 生成关卡
function generateLevel() {
    gameState.platforms = [];
    gameState.diamonds = [];
    gameState.obstacles = [];
    
    const level = levels[gameState.currentLevel % levels.length];
    const scene = scenes[gameState.currentScene % scenes.length];
    
    // 生成地面平台
    gameState.platforms.push({
        x: 0,
        y: GAME_HEIGHT - PLATFORM_HEIGHT,
        width: GAME_WIDTH,
        height: PLATFORM_HEIGHT,
        color: scene.platformColor
    });
    
    // 生成其他平台 - 确保垂直位置合理且无水平重叠
    for (let i = 0; i < level.platforms - 1; i++) {
        // 生成在阈值范围内的平台宽度（增加到原来的两倍）
        const platformWidth = (Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH) + MIN_PLATFORM_WIDTH) * 2;
        
        // 生成合理的位置，确保与其他平台无水平重叠
        let platformX, platformY;
        let validPosition = false;
        let maxAttempts = 100;
        let attempts = 0;
        
        while (!validPosition && attempts < maxAttempts) {
            attempts++;
            // 生成随机水平位置
            platformX = Math.random() * (GAME_WIDTH - platformWidth) + GAME_WIDTH;
            // 生成随机垂直位置
            platformY = Math.random() * (GAME_HEIGHT - 150) + 80;
            
            validPosition = true;
            
            // 检查与其他平台的水平重叠（垂直投影）
            for (let existingPlatform of gameState.platforms) {
                // 检查水平范围是否重叠
                if (!(platformX + platformWidth < existingPlatform.x || platformX > existingPlatform.x + existingPlatform.width)) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // 如果找不到合适的位置，使用默认位置
        if (!validPosition) {
            platformX = GAME_WIDTH + i * PLATFORM_SPACING;
            platformY = GAME_HEIGHT - PLATFORM_HEIGHT - 50;
            
            // 确保默认位置也不会重叠
            let overlapFound = true;
            let offset = 0;
            while (overlapFound && offset < 5) {
                overlapFound = false;
                const testX = platformX + offset * PLATFORM_SPACING;
                
                for (let existingPlatform of gameState.platforms) {
                    if (!(testX + platformWidth < existingPlatform.x || testX > existingPlatform.x + existingPlatform.width)) {
                        overlapFound = true;
                        offset++;
                        break;
                    }
                }
                
                if (!overlapFound) {
                    platformX = testX;
                }
            }
        }
        
        gameState.platforms.push({
            x: platformX,
            y: platformY,
            width: platformWidth,
            height: PLATFORM_HEIGHT,
            color: scene.platformColor
        });
    }
    
    // 生成钻石 - 基于平台垂直投影生成，确保分布合理
    for (let i = 0; i < gameState.platforms.length; i++) {
        const platform = gameState.platforms[i];
        // 计算平台的水平范围（垂直投影）
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        
        // 计算当前平台垂直投影上已有的钻石数量
        let existingDiamondCount = 0;
        for (let existingDiamond of gameState.diamonds) {
            if (existingDiamond.x >= platformLeft && existingDiamond.x <= platformRight) {
                existingDiamondCount++;
            }
        }
        
        // 每个平台的垂直投影上最多生成3个钻石，宁少勿多
        const maxDiamonds = 3;
        const remainingDiamonds = maxDiamonds - existingDiamondCount;
        
        if (remainingDiamonds > 0) {
            // 对于初始大平台（第一个平台），生成1-2颗钻石
            let diamondCount;
            if (i === 0) {
                // 初始平台：生成1-2颗钻石
                diamondCount = Math.floor(Math.random() * 2) + 1; // 1或2
            } else {
                // 根据平台长度调整钻石数量：短平台钻石少，长平台钻石多
                const platformLength = platform.width;
                let diamondProbability;
                
                // 根据平台长度设置钻石生成概率（减少一半）
                if (platformLength < 100) {
                    // 短平台：低概率生成钻石
                    diamondProbability = 0.1; // 10%概率生成钻石
                } else if (platformLength < 150) {
                    // 中等长度平台：中等概率生成钻石
                    diamondProbability = 0.2; // 20%概率生成钻石
                } else if (platformLength < 220) {
                    // 较长平台：较高概率生成钻石
                    diamondProbability = 0.35; // 35%概率生成钻石
                } else {
                    // 长平台：高概率生成钻石
                    diamondProbability = 0.45; // 45%概率生成钻石
                }
                
                // 生成钻石数量，考虑平台长度和剩余配额
                if (Math.random() > diamondProbability) {
                    diamondCount = 0;
                } else {
                    // 根据平台长度决定钻石数量（减少一半）
                    if (platformLength < 150) {
                        // 短平台和中等长度平台：最多1个钻石
                        diamondCount = Math.min(1, remainingDiamonds);
                    } else if (platformLength < 220) {
                        // 较长平台：最多1个钻石
                        diamondCount = Math.min(1, remainingDiamonds);
                    } else {
                        // 长平台：最多2个钻石
                        diamondCount = Math.min(Math.floor(Math.random() * 2) + 1, remainingDiamonds); // 1或2
                    }
                }
            }
            
            for (let j = 0; j < diamondCount; j++) {
                // 钻石生成在平台的垂直投影范围内
                const diamondX = platformLeft + Math.random() * (platform.width - DIAMOND_WIDTH);
                
                // 随机决定钻石位置：平台上方、空中或特殊位置
                const positionType = Math.random();
                let diamondY;
                
                if (positionType < 0.5) {
                    // 平台上方（距离平台有一定高度）
                    diamondY = platform.y - DIAMOND_HEIGHT - Math.random() * 80 - 20;
                } else if (positionType < 0.8) {
                    // 空中（更高的位置）
                    diamondY = Math.random() * (platform.y - DIAMOND_HEIGHT - 100);
                } else {
                    // 特殊位置（如栏杆洞口附近）
                    diamondY = platform.y - DIAMOND_HEIGHT - 50 - Math.random() * 40;
                }
                
                // 确保钻石不会低于平台
                diamondY = Math.max(0, diamondY);
                
                // 检查是否与其他钻石重合或过于密集
                let isOverlapping = false;
                for (let existingDiamond of gameState.diamonds) {
                    const distance = Math.sqrt(
                        Math.pow(diamondX - existingDiamond.x, 2) + 
                        Math.pow(diamondY - existingDiamond.y, 2)
                    );
                    if (distance < DIAMOND_WIDTH * 3) {
                        isOverlapping = true;
                        break;
                    }
                }
                
                if (!isOverlapping) {
                    gameState.diamonds.push({
                        x: diamondX,
                        y: diamondY,
                        width: DIAMOND_WIDTH,
                        height: DIAMOND_HEIGHT,
                        collected: false
                    });
                }
            }
        }
    }
    
    // 生成陷阱（障碍物）- 确保不在玩家初始位置附近且在平台上
    const obstacleCount = level.platforms + 1;
    for (let i = 0; i < obstacleCount; i++) {
        // 确保障碍物生成在平台上，且不在平台最左端，且远离玩家初始位置
        const randomPlatform = gameState.platforms[Math.floor(Math.random() * gameState.platforms.length)];
        
        // 确保障碍物生成在屏幕右侧足够远的位置，确保在屏幕外预先生成
        if (randomPlatform.x < GAME_WIDTH * 1.8) {
            continue; // 跳过屏幕左侧和屏幕边缘的平台，避免在玩家可见范围内生成障碍物
        }
        
        // 确保岩石和鸟居门出现概率各为50%
        const obstacleType = Math.random() < 0.5 ? 'rock' : 'fence';
        
        // 从平台的20%位置之后随机生成，避免在最左端
        const startX = randomPlatform.x + randomPlatform.width * 0.2;
        const endX = randomPlatform.x + randomPlatform.width - (obstacleType === 'fence' ? 80 : 30);
        const obstacleX = startX + Math.random() * (endX - startX);
        
        const obstacleY = obstacleType === 'fence' ? randomPlatform.y - 40 : randomPlatform.y - 30;
        const obstacleWidth = obstacleType === 'fence' ? 80 : 30;
        const obstacleHeight = obstacleType === 'fence' ? 40 : 30;
        
        // 检查新障碍物是否与现有障碍物重叠或距离太近
        let isOverlapping = false;
        const minDistance = OBSTACLE_SPACING * 0.5; // 障碍物之间的最小距离
        
        for (let existingObstacle of gameState.obstacles) {
            const distance = Math.sqrt(
                Math.pow(obstacleX - existingObstacle.x, 2) + 
                Math.pow(obstacleY - existingObstacle.y, 2)
            );
            
            // 检查是否距离太近
            if (distance < minDistance) {
                isOverlapping = true;
                break;
            }
        }
        
        // 只有当不重叠时才添加新障碍物
        if (!isOverlapping) {
            gameState.obstacles.push({
                x: obstacleX,
                y: obstacleY,
                width: obstacleWidth,
                height: obstacleHeight,
                type: obstacleType,
                active: true
            });
        
            // 为栏杆类型的障碍物在洞口内添加钻石
            if (obstacleType === 'fence') {
                // 计算平台的水平范围（垂直投影）
                const platformLeft = randomPlatform.x;
                const platformRight = randomPlatform.x + randomPlatform.width;
                
                // 计算当前平台垂直投影上已有的钻石数量
                let existingDiamondCount = 0;
                for (let existingDiamond of gameState.diamonds) {
                    if (existingDiamond.x >= platformLeft && existingDiamond.x <= platformRight) {
                        existingDiamondCount++;
                    }
                }
                
                // 检查是否还有剩余的钻石配额
                const maxDiamonds = 3;
                if (existingDiamondCount < maxDiamonds) {
                    // 有25%的概率在栏杆洞口内生成钻石（减少一半）
                    if (Math.random() > 0.75) {
                        // 栏杆洞口的中心位置
                        const holeCenterX = obstacleX + obstacleWidth / 2;
                        const holeY = obstacleY + obstacleHeight / 2;
                        
                        // 生成钻石在洞口内
                        const diamondX = holeCenterX - DIAMOND_WIDTH / 2;
                        const diamondY = holeY - DIAMOND_HEIGHT / 2;
                        
                        // 检查是否与其他钻石重合或过于密集
                        let isDiamondOverlapping = false;
                        for (let existingDiamond of gameState.diamonds) {
                            const distance = Math.sqrt(
                                Math.pow(diamondX - existingDiamond.x, 2) + 
                                Math.pow(diamondY - existingDiamond.y, 2)
                            );
                            if (distance < DIAMOND_WIDTH * 3) {
                                isDiamondOverlapping = true;
                                break;
                            }
                        }
                        
                        if (!isDiamondOverlapping) {
                            gameState.diamonds.push({
                                x: diamondX,
                                y: diamondY,
                                width: DIAMOND_WIDTH,
                                height: DIAMOND_HEIGHT,
                                collected: false
                            });
                        }
                    }
                }
            }
        }
    }
}

// 游戏主循环
function gameLoop() {
    if (!gameState.running) return;
    
    gameState.elapsedTime++;
    
    // 增加速度
    player.speed = Math.min(MAX_SPEED, INITIAL_SPEED + gameState.elapsedTime * SPEED_INCREMENT);
    
    // 更新玩家动画
    player.animationFrame++;
    
    // 帧开始前检查玩家状态 - 增强版
    if (isNaN(player.x) || isNaN(player.y) || !isFinite(player.x) || !isFinite(player.y) || player.x < -50 || player.y < -100 || player.x > GAME_WIDTH + 50) {
        // 重置玩家状态
        player.x = 100;
        player.y = GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT;
        player.velocityY = 0;
        player.jumpCount = 0;
        player.jumping = false;
        player.sliding = false;
    }
    
    updatePlayer();
    updateParticles();
    updateBackgroundElements();
    checkCollisions();
    updateGame();
    drawGame();
    
    requestAnimationFrame(gameLoop);
}

// 更新玩家
function updatePlayer() {
    // 确保玩家位置有效 - 增强版
    if (isNaN(player.x) || isNaN(player.y) || !isFinite(player.x) || !isFinite(player.y)) {
        player.x = 100;
        player.y = GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT;
        player.velocityY = 0;
        player.jumpCount = 0;
        player.jumping = false;
        player.sliding = false;
        return;
    }
    
    // 水平移动：默认向前移动
    let moveSpeed = player.speed;
    
    // 无限次跳跃机制 - 每次点击上键触发一次固定高度的跳跃
    if (keys['ArrowUp'] && !player.sliding) {
        // 触发跳跃
        player.jumping = true;
        player.velocityY = -player.jumpPower;
        
        // 同时按上和右时向右上跳跃
        if (keys['ArrowRight']) {
            moveSpeed += player.speed * 4 * 1.3 * 0.7 * 0.7 * 1.5; // 增加向右的速度
        }
        
        // 临时禁用上键，避免连续触发
        keys['ArrowUp'] = false;
    }
    
    // 下键控制：下滑避开障碍物
    if (keys['ArrowDown'] && !player.jumping && player.velocityY === 0) {
        player.sliding = true;
        player.slideTimer = 30; // 下滑持续时间
    }
    
    // 右键控制：加速，缩小到原来的7/10，再乘以0.7
    if (keys['ArrowRight']) {
        moveSpeed += player.speed * 4 * 1.3 * 0.7 * 0.7;
    }
    
    // 左键控制：无作用
    // 此处无需添加代码，因为游戏中没有处理左键的逻辑
    
    // 更新下滑状态
    if (player.sliding) {
        player.slideTimer--;
        if (player.slideTimer <= 0) {
            player.sliding = false;
        }
    }
    
    // 当玩家落到平台上时，重置跳跃状态
    if (player.y >= GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT && player.velocityY >= 0) {
        player.jumping = false;
        player.velocityY = 0;
    }
    
    // 天花板碰撞检测
    if (player.y <= 0) {
        player.y = 0;
        player.velocityY = 0;
    }
    
    // 应用重力
    player.velocityY += player.gravity;
    player.y += player.velocityY;
    
    // 水平移动
    player.x += moveSpeed;
    
    // 场景滚动：当玩家超过屏幕中心时，让场景向左移动
        if (player.x > GAME_WIDTH * 0.3) {
            const scrollSpeed = moveSpeed * 2 * 0.75; // 场景滚动速度增加为原来的1.5倍
            
            // 移动平台
            for (let platform of gameState.platforms) {
                platform.x -= scrollSpeed;
            }
            
            // 移动钻石
            for (let diamond of gameState.diamonds) {
                diamond.x -= scrollSpeed;
            }
            
            // 移动障碍物
            for (let obstacle of gameState.obstacles) {
                obstacle.x -= scrollSpeed;
            }
            
            // 保持玩家在屏幕中心附近
            player.x = GAME_WIDTH * 0.3;
        }
    
    // 确保玩家位置不会因为计算错误而异常 - 增强版
    player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x));
    // 移除y坐标限制，允许玩家掉出屏幕触发触底即死
    
    // 边界检查 - 增强版
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x > GAME_WIDTH - player.width) player.x = GAME_WIDTH - player.width;
    // 移除y坐标上限，允许玩家掉出屏幕
    
    // 检查平台碰撞 - 平台是固体的，角色从任何方向都无法穿过
    for (let platform of gameState.platforms) {
        if (checkCollision(player, platform)) {
            // 计算角色和平台的相对位置
            const playerCenter = player.y + player.height / 2;
            const platformCenter = platform.y + platform.height / 2;
            
            // 确定碰撞方向
            if (playerCenter < platformCenter) {
                // 角色在平台上方，从上方碰撞
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.jumping = false;
                player.jumpCount = 0; // 重置跳跃次数，允许再次进行多级跳跃
            } else {
                // 角色在平台下方，从下方碰撞
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
        }
    }
    
    // 统计距离
    gameState.distance += Math.abs(moveSpeed);
}

// 检查碰撞
function checkCollision(rect1, rect2) {
    // 下滑时可以穿过栅栏类型的障碍物
    if (player.sliding && rect2.type === 'fence') {
        return false;
    }
    
    // 精确碰撞检测 - 考虑下滑时的玩家高度
    const playerHeight = player.sliding ? player.height * 0.7 : player.height;
    const playerY = player.sliding ? player.y + player.height * 0.3 : player.y;
    
    return player.x < rect2.x + rect2.width &&
           player.x + player.width > rect2.x &&
           playerY < rect2.y + rect2.height &&
           playerY + playerHeight > rect2.y;
}

// 检查钻石收集
function checkCollisions() {
    // 确保玩家位置有效
    if (isNaN(player.x) || isNaN(player.y) || !isFinite(player.x) || !isFinite(player.y)) {
        // 重置玩家位置
        player.x = 100;
        player.y = GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT;
        player.velocityY = 0;
        player.jumpCount = 0;
        player.jumping = false;
        player.sliding = false;
        return;
    }
    
    for (let i = 0; i < gameState.diamonds.length; i++) {
        const diamond = gameState.diamonds[i];
        if (!diamond.collected && checkCollision(player, diamond)) {
            diamond.collected = true;
            gameState.diamondsCollected++;
            gameState.score += DIAMOND_VALUE;
            
            // 播放收集宝石音效
            playCollectSound();
            
            // 创建收集宝石的粒子效果
            createParticles(diamond.x + diamond.width/2, diamond.y + diamond.height/2, 8, '#FF5722');
        }
    }
    
    // 检查障碍物碰撞
    for (let i = 0; i < gameState.obstacles.length; i++) {
        const obstacle = gameState.obstacles[i];
        if (obstacle.active) {
            // 精确碰撞检测 - 使用人物实际视觉边界
            const playerCollisionBox = {
                x: player.x + player.width * 0.2, // 缩小碰撞盒，更接近视觉边界
                y: player.sliding ? player.y + player.height * 0.4 : player.y + player.height * 0.1,
                width: player.width * 0.6,
                height: player.sliding ? player.height * 0.6 : player.height * 0.9
            };
            
            const collision = playerCollisionBox.x < obstacle.x + obstacle.width &&
                              playerCollisionBox.x + playerCollisionBox.width > obstacle.x &&
                              playerCollisionBox.y < obstacle.y + obstacle.height &&
                              playerCollisionBox.y + playerCollisionBox.height > obstacle.y;
            
            // 下滑时可以穿过栅栏
            if (collision && !(player.sliding && obstacle.type === 'fence')) {
                // 播放碰撞音效
                playCollisionSound();
                
                // 创建碰撞的粒子效果
                createParticles(player.x + player.width/2, player.y + player.height/2, 12, '#FF0000');
                gameOver();
            }
        }
    }
    
    // 检查游戏结束条件（如果玩家掉出屏幕底部，触底即死）
    if (player.y > GAME_HEIGHT) {
        // 创建掉落的粒子效果
        createParticles(player.x + player.width/2, player.y + player.height/2, 12, '#FF0000');
        gameOver();
    }
    
    // 确保玩家位置不会超出合理范围（仅在未触底时执行）
    if (!gameState.gameOver && (player.x < -player.width * 2 || player.y < -player.height * 3 || player.x > GAME_WIDTH + player.width * 2)) {
        // 重置玩家位置
        player.x = 100;
        player.y = GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT;
        player.velocityY = 0;
        player.jumpCount = 0;
        player.jumping = false;
        player.sliding = false;
    }
    
    // 确保玩家位置总是有效的数值
    if (isNaN(player.x) || isNaN(player.y) || !isFinite(player.x) || !isFinite(player.y)) {
        // 重置玩家位置
        player.x = 100;
        player.y = GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT;
        player.velocityY = 0;
        player.jumpCount = 0;
        player.jumping = false;
        player.sliding = false;
    }
    
    // 当玩家移动时，生成新的场景元素
    if (gameState.running) {
        generateNewElements();
    }
}

// 更新游戏
function updateGame() {
    updateUI();
    checkSceneTransition();
    adjustDifficulty();
    
    // 检查游戏通关条件：难度等级达到大师（3级及以上）且得分超过400
    if (gameState.currentLevel >= 3 && gameState.score > 400) {
        gameComplete();
    }
}

// 游戏通关
function gameComplete() {
    gameState.running = false;
    gameState.gameOver = true;
    gameState.gameComplete = true;
    // 暂停所有背景音乐
    pauseAllBgm();
    // 生成游戏通关特效（礼花特效）
    createFireworksEffect();
    
    // 延迟后返回标题界面
    setTimeout(() => {
        // 调用返回标题界面的函数
        window.returnToTitle();
    }, 3000); // 3秒后返回标题界面，让玩家有时间看到通关特效
}

// 创建角色死亡特效
function createDeathEffect() {
    for (let i = 0; i < 100; i++) {
        gameState.particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            size: Math.random() * 8 + 4,
            speedX: (Math.random() - 0.5) * 12,
            speedY: (Math.random() - 0.5) * 12,
            color: '#FF0000',
            alpha: 1,
            life: 180
        });
    }
}

// 创建礼花特效
function createFireworksEffect() {
    for (let i = 0; i < 200; i++) {
        const angle = (i / 200) * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
        gameState.particles.push({
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            size: Math.random() * 6 + 3,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            alpha: 1,
            life: 240
        });
    }
}

// 检查场景切换
function checkSceneTransition() {
    // 场景切换逻辑已移至 adjustDifficulty 函数
    // 根据难度等级切换场景
}

// 调整游戏难度
function adjustDifficulty() {
    // 根据得分调整难度
    const difficultyLevel = Math.floor(gameState.score / 100);
    gameState.previousLevel = gameState.currentLevel;
    gameState.currentLevel = difficultyLevel;
    
    // 难度等级与场景对应关系
    // 简单 -> 草原 (0)
    // 中等 -> 沙漠 (1)
    // 困难 -> 城堡 (2)
    // 大师 -> 水下 (3)
    // 大师之后 -> 随机循环
    
    // 检查难度等级是否改变
    if (gameState.currentLevel !== gameState.previousLevel) {
        // 根据当前难度等级从随机场景顺序中选择场景
        // 对于前4个难度等级，使用随机顺序中的对应场景
        if (gameState.currentLevel < 4) {
            gameState.currentScene = randomSceneOrder[gameState.currentLevel];
        } else if (gameState.currentLevel === 4) {
            // 大师难度，使用随机顺序中的最后一个场景
            gameState.currentScene = randomSceneOrder[3];
        } else if (gameState.currentLevel > 4 && gameState.currentLevel % 2 === 0) {
            // 大师难度后，每2个等级随机切换场景
            gameState.currentScene = randomSceneOrder[Math.floor(Math.random() * 4)];
        }
        
        // 播放对应场景的背景音乐
        const scene = scenes[gameState.currentScene % scenes.length];
        playBgm(scene.name);
        
        // 根据难度等级调整速度
        if (gameState.currentLevel < 4) {
            // 每个难度等级增加速度
            const speedMultiplier = 1 + gameState.currentLevel * 0.5; // 每个难度等级增加50%速度，增大难度差异
            player.speed = Math.min(MAX_SPEED, INITIAL_SPEED * speedMultiplier);
            console.log('难度等级变化，新速度:', player.speed);
        } else {
            // 大师难度及以上，保持最大速度
            player.speed = MAX_SPEED;
            console.log('达到大师难度，保持最大速度:', player.speed);
        }
        
        generateBackgroundElements();
        // 创建场景切换粒子效果
        createSceneTransitionEffect();
    } else if (gameState.currentLevel < 4) {
        // 难度等级未改变，但未达到大师等级，继续增加速度
        player.speed = Math.min(MAX_SPEED, player.speed + SPEED_INCREMENT * 2); // 增加速度增量
    }
    
    // 随着难度增加，增加障碍物密度
    const obstacleDensity = Math.min(0.3, 0.1 + difficultyLevel * 0.02);
    // 这里可以根据难度调整其他游戏参数
}

// 创建场景切换效果
function createSceneTransitionEffect() {
    for (let i = 0; i < 50; i++) {
        gameState.particles.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: Math.random() * 6 + 3,
            speedX: (Math.random() - 0.5) * 8,
            speedY: (Math.random() - 0.5) * 8,
            color: '#FFD700',
            alpha: 1,
            life: 120
        });
    }
}

// 更新UI
function updateUI() {
    document.getElementById('score').textContent = `得分: ${gameState.score}`;
    document.getElementById('distance').textContent = `路程: ${Math.floor(gameState.distance)}`;
    document.getElementById('diamonds').textContent = `钻石: ${gameState.diamondsCollected}`;
    
    // 更新场景信息
    const scene = scenes[gameState.currentScene % scenes.length];
    const sceneNames = {
        'grassland': '草原',
        'desert': '沙漠',
        'castle': '城堡',
        'underwater': '水下'
    };
    document.getElementById('scene').textContent = `场景: ${sceneNames[scene.name] || scene.name}`;
    
    // 更新难度信息
    const difficultyLevel = Math.floor(gameState.score / 100);
    let difficultyName;
    if (difficultyLevel < 1) {
        difficultyName = '简单';
    } else if (difficultyLevel < 2) {
        difficultyName = '中等';
    } else if (difficultyLevel < 3) {
        difficultyName = '困难';
    } else {
        difficultyName = '大师';
    }
    document.getElementById('difficulty').textContent = `难度: ${difficultyName}`;
}

// 游戏结束
function gameOver() {
    gameState.running = false;
    gameState.gameOver = true;
    gameState.gameComplete = false;
    // 暂停所有背景音乐
    pauseAllBgm();
    // 生成游戏结束特效（角色死亡特效）
    createDeathEffect();
}

// 绘制游戏
function drawGame() {
    const scene = scenes[gameState.currentScene % scenes.length];
    
    // 清空画布 - 使用背景颜色
    ctx.fillStyle = scene.backgroundColor || scene.color;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 绘制背景元素
    drawBackgroundElements();
    
    // 绘制平台
    drawPlatforms();
    
    // 绘制钻石
    drawDiamonds();
    
    // 绘制障碍物
    drawObstacles();
    
    // 确保玩家总是被绘制
    drawPlayer();
    
    // 绘制粒子效果
    drawParticles();
    
    // 绘制游戏结束或游戏通关信息
    if (gameState.gameOver) {
        if (gameState.gameComplete) {
            // 游戏通关
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, GAME_HEIGHT / 2 - 40, GAME_WIDTH, 80);
            ctx.fillStyle = '#00FF00';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('游戏通关!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
        } else {
            // 游戏结束
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, GAME_HEIGHT / 2 - 40, GAME_WIDTH, 80);
            ctx.fillStyle = '#FF0000';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
        }
    }
    
    // 可选：绘制玩家位置信息（调试用）
    /*
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Player: x=${Math.round(player.x)}, y=${Math.round(player.y)}`, 10, 20);
    ctx.fillText(`Sliding: ${player.sliding}, Jumping: ${player.jumping}`, 10, 40);
    */
}

// 绘制平台
function drawPlatforms() {
    // 复用渐变对象
    const platformGradient = ctx.createLinearGradient(0, 0, 0, PLATFORM_HEIGHT);
    platformGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    platformGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    
    for (let platform of gameState.platforms) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // 添加平台细节
        ctx.fillStyle = platformGradient;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
}

// 绘制钻石
function drawDiamonds() {
    for (let diamond of gameState.diamonds) {
        if (!diamond.collected) {
            drawDiamond(diamond.x, diamond.y, diamond.width, diamond.height);
        }
    }
}

// 绘制障碍物
function drawObstacles() {
    const scene = scenes[gameState.currentScene % scenes.length];
    
    for (let obstacle of gameState.obstacles) {
        if (obstacle.active) {
            if (obstacle.type === 'fence') {
                // 绘制符合场景主题的栅栏
                drawToriiGate(obstacle.x, obstacle.y, obstacle.width, obstacle.height, scene);
            } else {
                // 根据场景绘制不同风格的岩石障碍物
                let rockColor, rockDetailColor;
                
                switch (scene.name) {
                    case 'grassland':
                        rockColor = '#8B4513';
                        rockDetailColor = '#654321';
                        break;
                    case 'desert':
                        rockColor = '#D7CCC8';
                        rockDetailColor = '#A1887F';
                        break;
                    case 'castle':
                        rockColor = '#9E9E9E';
                        rockDetailColor = '#616161';
                        break;
                    case 'underwater':
                        rockColor = '#4DB6AC';
                        rockDetailColor = '#26A69A';
                        break;
                    default:
                        rockColor = '#8B4513';
                        rockDetailColor = '#654321';
                }
                
                // 绘制岩石障碍物
                ctx.fillStyle = rockColor;
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // 绘制障碍物细节
                ctx.fillStyle = rockDetailColor;
                ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
                
                // 添加障碍物高光
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, 5);
            }
        }
    }
}

// 绘制下蹲障碍物（宽矮的栏杆）
function drawToriiGate(x, y, width, height, scene) {
    // 根据场景设置不同的栏杆材质
    let fenceColor, fenceDetailColor;
    
    switch (scene.name) {
        case 'grassland':
            fenceColor = '#8B4513';
            fenceDetailColor = '#654321';
            break;
        case 'desert':
            fenceColor = '#BF360C';
            fenceDetailColor = '#8D6E63';
            break;
        case 'castle':
            fenceColor = '#795548';
            fenceDetailColor = '#4E342E';
            break;
        case 'underwater':
            fenceColor = '#00796B';
            fenceDetailColor = '#004D40';
            break;
        default:
            fenceColor = '#8B4513';
            fenceDetailColor = '#654321';
    }
    
    // 绘制栏杆主体
    ctx.fillStyle = fenceColor;
    
    // 绘制左右柱子（更宽更矮）
    const pillarWidth = 20;
    const pillarHeight = height;
    ctx.fillRect(x, y, pillarWidth, pillarHeight);
    ctx.fillRect(x + width - pillarWidth, y, pillarWidth, pillarHeight);
    
    // 绘制顶部横杆（更宽）
    const barHeight = 15;
    ctx.fillRect(x, y, width, barHeight);
    
    // 下面没有横杆，中间是空的洞口
    // 这样就形成了一个宽矮的栏杆，角色可以蹲下穿过
    
    // 绘制障碍物细节（与其他障碍物一致）
    ctx.fillStyle = fenceDetailColor;
    ctx.fillRect(x + 2, y + 2, pillarWidth - 4, pillarHeight - 4);
    ctx.fillRect(x + width - pillarWidth + 2, y + 2, pillarWidth - 4, pillarHeight - 4);
    ctx.fillRect(x + 2, y + 2, width - 4, barHeight - 4);
    
    // 添加障碍物高光（与其他障碍物一致）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x + 2, y + 2, pillarWidth - 4, 3);
    ctx.fillRect(x + width - pillarWidth + 2, y + 2, pillarWidth - 4, 3);
    ctx.fillRect(x + 2, y + 2, width - 4, 3);
}

// 绘制玩家
function drawPlayer() {
    // 确保玩家位置有效 - 增强版
    if (isNaN(player.x) || isNaN(player.y) || !isFinite(player.x) || !isFinite(player.y)) {
        player.x = 100;
        player.y = GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT;
    }
    
    // 确保玩家在画布范围内 - 增强版
    player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x));
    player.y = Math.max(0, player.y);
    
    // 添加玩家动画效果
    const animationOffset = Math.sin(player.animationFrame * 0.1) * 2;
    const runningPhase = Math.sin(player.animationFrame * 0.2) * Math.PI;
    
    // 绘制玩家主体 - 人体形状
    const playerX = player.x;
    let playerY = player.y;
    let playerHeight = player.height;
    
    // 下滑时的状态
    if (player.sliding) {
        playerY += player.height * 0.3;
        playerHeight *= 0.7;
    }
    
    // 绘制头部 - 卡通圆脸
    ctx.fillStyle = '#FFCCB3';
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.5, playerY + playerHeight * 0.25, player.width * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // 添加头部轮廓
    ctx.strokeStyle = '#E57373';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.5, playerY + playerHeight * 0.25, player.width * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    
    // 绘制颈部
    ctx.fillStyle = '#FFCCB3';
    ctx.fillRect(playerX + player.width * 0.45, playerY + playerHeight * 0.45, player.width * 0.1, player.height * 0.1);
    // 颈部轮廓
    ctx.strokeStyle = '#E57373';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerX + player.width * 0.45, playerY + playerHeight * 0.45, player.width * 0.1, player.height * 0.1);
    
    // 绘制身体 - 红色上衣
    const bodyGradient = ctx.createLinearGradient(playerX, playerY, playerX, playerY + playerHeight);
    bodyGradient.addColorStop(0, '#FF5252');
    bodyGradient.addColorStop(1, '#C62828');
    
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(playerX + player.width * 0.35, playerY + playerHeight * 0.55, player.width * 0.3, player.height * 0.3);
    // 添加身体轮廓
    ctx.strokeStyle = '#B71C1C';
    ctx.lineWidth = 3;
    ctx.strokeRect(playerX + player.width * 0.35, playerY + playerHeight * 0.55, player.width * 0.3, player.height * 0.3);
    
    // 绘制手臂 - 跑步动画
    const armOffset = Math.sin(runningPhase) * 10;
    const armOffset2 = Math.sin(runningPhase + Math.PI) * 10;
    
    // 右臂
    ctx.fillStyle = '#FFCCB3';
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.65, playerY + playerHeight * 0.55 + armOffset, player.width * 0.12, player.height * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#E57373';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.65, playerY + playerHeight * 0.55 + armOffset, player.width * 0.12, player.height * 0.25);
    ctx.stroke();
    
    // 左臂
    ctx.fillStyle = '#FFCCB3';
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.23, playerY + playerHeight * 0.55 + armOffset2, player.width * 0.12, player.height * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#E57373';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.23, playerY + playerHeight * 0.55 + armOffset2, player.width * 0.12, player.height * 0.25);
    ctx.stroke();
    
    // 绘制腿部 - 跑步动画 - 蓝色裤子
    const legOffset = Math.sin(runningPhase) * 12;
    const legOffset2 = Math.sin(runningPhase + Math.PI) * 12;
    
    // 右腿
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.45, playerY + playerHeight * 0.8 + legOffset, player.width * 0.15, player.height * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#1565C0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.45, playerY + playerHeight * 0.8 + legOffset, player.width * 0.15, player.height * 0.25);
    ctx.stroke();
    
    // 左腿
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.35, playerY + playerHeight * 0.8 + legOffset2, player.width * 0.15, player.height * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#1565C0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(playerX + player.width * 0.35, playerY + playerHeight * 0.8 + legOffset2, player.width * 0.15, player.height * 0.25);
    ctx.stroke();
    
    // 绘制卡通风格的黑色头发 - 一簇一簇的波纹状
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    // 左侧第一簇头发
    ctx.moveTo(playerX + player.width * 0.1, playerY - playerHeight * 0.05);
    ctx.lineTo(playerX + player.width * 0.18, playerY - playerHeight * 0.15);
    ctx.lineTo(playerX + player.width * 0.25, playerY - playerHeight * 0.1);
    ctx.lineTo(playerX + player.width * 0.3, playerY - playerHeight * 0.2);
    // 中间第二簇头发
    ctx.lineTo(playerX + player.width * 0.4, playerY - playerHeight * 0.15);
    ctx.lineTo(playerX + player.width * 0.5, playerY - playerHeight * 0.25);
    ctx.lineTo(playerX + player.width * 0.6, playerY - playerHeight * 0.15);
    // 右侧第三簇头发
    ctx.lineTo(playerX + player.width * 0.7, playerY - playerHeight * 0.2);
    ctx.lineTo(playerX + player.width * 0.78, playerY - playerHeight * 0.1);
    ctx.lineTo(playerX + player.width * 0.85, playerY - playerHeight * 0.18);
    ctx.lineTo(playerX + player.width * 0.9, playerY - playerHeight * 0.1);
    // 头发底部
    ctx.lineTo(playerX + player.width * 0.85, playerY + playerHeight * 0.15);
    ctx.lineTo(playerX + player.width * 0.15, playerY + playerHeight * 0.15);
    ctx.closePath();
    ctx.fill();
    // 头发轮廓
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // 左侧第一簇头发
    ctx.moveTo(playerX + player.width * 0.1, playerY - playerHeight * 0.05);
    ctx.lineTo(playerX + player.width * 0.18, playerY - playerHeight * 0.15);
    ctx.lineTo(playerX + player.width * 0.25, playerY - playerHeight * 0.1);
    ctx.lineTo(playerX + player.width * 0.3, playerY - playerHeight * 0.2);
    // 中间第二簇头发
    ctx.lineTo(playerX + player.width * 0.4, playerY - playerHeight * 0.15);
    ctx.lineTo(playerX + player.width * 0.5, playerY - playerHeight * 0.25);
    ctx.lineTo(playerX + player.width * 0.6, playerY - playerHeight * 0.15);
    // 右侧第三簇头发
    ctx.lineTo(playerX + player.width * 0.7, playerY - playerHeight * 0.2);
    ctx.lineTo(playerX + player.width * 0.78, playerY - playerHeight * 0.1);
    ctx.lineTo(playerX + player.width * 0.85, playerY - playerHeight * 0.18);
    ctx.lineTo(playerX + player.width * 0.9, playerY - playerHeight * 0.1);
    // 头发底部
    ctx.lineTo(playerX + player.width * 0.85, playerY + playerHeight * 0.15);
    ctx.lineTo(playerX + player.width * 0.15, playerY + playerHeight * 0.15);
    ctx.closePath();
    ctx.stroke();
    
    // 绘制大大的眼睛
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.4, playerY + playerHeight * 0.22, 6, 0, Math.PI * 2);
    ctx.arc(playerX + player.width * 0.6, playerY + playerHeight * 0.22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.4, playerY + playerHeight * 0.22, 6, 0, Math.PI * 2);
    ctx.arc(playerX + player.width * 0.6, playerY + playerHeight * 0.22, 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // 绘制眼球
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.42, playerY + playerHeight * 0.22, 3, 0, Math.PI * 2);
    ctx.arc(playerX + player.width * 0.62, playerY + playerHeight * 0.22, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制高光
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.38, playerY + player.height * 0.2, 2, 0, Math.PI * 2);
    ctx.arc(playerX + player.width * 0.58, playerY + player.height * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制鼻子
    ctx.fillStyle = '#FFCCB3';
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.5, playerY + player.height * 0.28, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E57373';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.5, playerY + player.height * 0.28, 3, 0, Math.PI * 2);
    ctx.stroke();
    
    // 绘制嘴巴
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerX + player.width * 0.5, playerY + player.height * 0.35, 4, 0, Math.PI);
    ctx.stroke();
    
    // 绘制耳朵 - 更自然的形状，在头发之后绘制
    ctx.fillStyle = '#FFCCB3';
    // 左侧耳朵
    ctx.beginPath();
    ctx.moveTo(playerX + player.width * 0.15, playerY + player.height * 0.25);
    ctx.bezierCurveTo(
        playerX + player.width * 0.12, playerY + player.height * 0.22, 
        playerX + player.width * 0.12, playerY + player.height * 0.3, 
        playerX + player.width * 0.15, playerY + player.height * 0.28
    );
    ctx.bezierCurveTo(
        playerX + player.width * 0.16, playerY + player.height * 0.29, 
        playerX + player.width * 0.17, playerY + player.height * 0.26, 
        playerX + player.width * 0.15, playerY + player.height * 0.25
    );
    ctx.fill();
    // 右侧耳朵
    ctx.beginPath();
    ctx.moveTo(playerX + player.width * 0.85, playerY + player.height * 0.25);
    ctx.bezierCurveTo(
        playerX + player.width * 0.88, playerY + player.height * 0.22, 
        playerX + player.width * 0.88, playerY + player.height * 0.3, 
        playerX + player.width * 0.85, playerY + player.height * 0.28
    );
    ctx.bezierCurveTo(
        playerX + player.width * 0.84, playerY + player.height * 0.29, 
        playerX + player.width * 0.83, playerY + player.height * 0.26, 
        playerX + player.width * 0.85, playerY + player.height * 0.25
    );
    ctx.fill();
    // 耳朵轮廓
    ctx.strokeStyle = '#E57373';
    ctx.lineWidth = 2;
    // 左侧耳朵轮廓
    ctx.beginPath();
    ctx.moveTo(playerX + player.width * 0.15, playerY + player.height * 0.25);
    ctx.bezierCurveTo(
        playerX + player.width * 0.12, playerY + player.height * 0.22, 
        playerX + player.width * 0.12, playerY + player.height * 0.3, 
        playerX + player.width * 0.15, playerY + player.height * 0.28
    );
    ctx.bezierCurveTo(
        playerX + player.width * 0.16, playerY + player.height * 0.29, 
        playerX + player.width * 0.17, playerY + player.height * 0.26, 
        playerX + player.width * 0.15, playerY + player.height * 0.25
    );
    ctx.stroke();
    // 右侧耳朵轮廓
    ctx.beginPath();
    ctx.moveTo(playerX + player.width * 0.85, playerY + player.height * 0.25);
    ctx.bezierCurveTo(
        playerX + player.width * 0.88, playerY + player.height * 0.22, 
        playerX + player.width * 0.88, playerY + player.height * 0.3, 
        playerX + player.width * 0.85, playerY + player.height * 0.28
    );
    ctx.bezierCurveTo(
        playerX + player.width * 0.84, playerY + player.height * 0.29, 
        playerX + player.width * 0.83, playerY + player.height * 0.26, 
        playerX + player.width * 0.85, playerY + player.height * 0.25
    );
    ctx.stroke();
    
    // 可选：绘制碰撞边界（调试用）
    /*
    const playerCollisionBox = {
        x: player.x + player.width * 0.2,
        y: player.sliding ? player.y + player.height * 0.4 : player.y + player.height * 0.1,
        width: player.width * 0.6,
        height: player.sliding ? player.height * 0.6 : player.height * 0.9
    };
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(playerCollisionBox.x, playerCollisionBox.y, playerCollisionBox.width, playerCollisionBox.height);
    */
}

// 绘制精致立体红宝石
function drawDiamond(x, y, width, height) {
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    
    // 添加轻微旋转动画，增加动态感
    const time = Date.now() * 0.001;
    const rotation = Math.sin(time) * 5 * Math.PI / 180;
    ctx.rotate(rotation);
    
    // 绘制红宝石主体
    drawRubyMainShape(width, height);
    
    // 添加切割面细节
    drawRubyFacets(width, height);
    
    // 添加高级光影效果
    drawRubyLighting(width, height);
    
    // 添加宝石边缘和轮廓
    drawRubyOutline(width, height);
    
    ctx.restore();
}

// 绘制红宝石主体
function drawRubyMainShape(width, height) {
    // 创建高级红宝石渐变
    const gradient = ctx.createLinearGradient(0, -height/2, 0, height/2);
    gradient.addColorStop(0, '#FF8A80');
    gradient.addColorStop(0.2, '#FF5252');
    gradient.addColorStop(0.4, '#FF1744');
    gradient.addColorStop(0.5, '#D50000');
    gradient.addColorStop(0.6, '#C62828');
    gradient.addColorStop(0.8, '#B71C1C');
    gradient.addColorStop(1, '#880E4F');
    
    // 绘制瘦长六边形
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    const halfWidth = width / 2;
    const quarterHeight = height / 4;
    
    // 六边形顶点
    const points = [
        { x: 0, y: -height/2 },           // 顶部
        { x: halfWidth, y: -quarterHeight }, // 右上
        { x: halfWidth, y: quarterHeight },  // 右下
        { x: 0, y: height/2 },             // 底部
        { x: -halfWidth, y: quarterHeight }, // 左下
        { x: -halfWidth, y: -quarterHeight } // 左上
    ];
    
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    
    // 添加内部阴影效果
    const shadowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, width);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
}

// 绘制红宝石切割面
function drawRubyFacets(width, height) {
    // 绘制中心垂直切割面
    const centerFacetGradient = ctx.createLinearGradient(0, -height/2, 0, height/2);
    centerFacetGradient.addColorStop(0, 'rgba(255, 224, 225, 0.4)');
    centerFacetGradient.addColorStop(0.3, 'rgba(255, 182, 193, 0.3)');
    centerFacetGradient.addColorStop(0.5, 'rgba(255, 144, 144, 0.2)');
    centerFacetGradient.addColorStop(0.7, 'rgba(255, 105, 180, 0.25)');
    centerFacetGradient.addColorStop(1, 'rgba(255, 64, 129, 0.3)');
    
    ctx.fillStyle = centerFacetGradient;
    ctx.beginPath();
    ctx.moveTo(0, -height/2);
    ctx.lineTo(width*0.35, -height*0.35);
    ctx.lineTo(width*0.25, height*0.35);
    ctx.lineTo(0, height/2);
    ctx.lineTo(-width*0.25, height*0.35);
    ctx.lineTo(-width*0.35, -height*0.35);
    ctx.closePath();
    ctx.fill();
    
    // 绘制右侧切割面
    const rightFacetGradient = ctx.createLinearGradient(width*0.35, -height*0.35, width*0.25, height*0.35);
    rightFacetGradient.addColorStop(0, 'rgba(255, 182, 193, 0.3)');
    rightFacetGradient.addColorStop(1, 'rgba(255, 105, 180, 0.2)');
    
    ctx.fillStyle = rightFacetGradient;
    ctx.beginPath();
    ctx.moveTo(width*0.35, -height*0.35);
    ctx.lineTo(width*0.45, -height*0.2);
    ctx.lineTo(width*0.45, height*0.2);
    ctx.lineTo(width*0.25, height*0.35);
    ctx.closePath();
    ctx.fill();
    
    // 绘制左侧切割面
    const leftFacetGradient = ctx.createLinearGradient(-width*0.35, -height*0.35, -width*0.25, height*0.35);
    leftFacetGradient.addColorStop(0, 'rgba(255, 182, 193, 0.25)');
    leftFacetGradient.addColorStop(1, 'rgba(255, 105, 180, 0.15)');
    
    ctx.fillStyle = leftFacetGradient;
    ctx.beginPath();
    ctx.moveTo(-width*0.35, -height*0.35);
    ctx.lineTo(-width*0.45, -height*0.2);
    ctx.lineTo(-width*0.45, height*0.2);
    ctx.lineTo(-width*0.25, height*0.35);
    ctx.closePath();
    ctx.fill();
    
    // 绘制顶部切割面
    const topFacetGradient = ctx.createLinearGradient(0, -height/2, 0, -height*0.2);
    topFacetGradient.addColorStop(0, 'rgba(255, 240, 245, 0.4)');
    topFacetGradient.addColorStop(1, 'rgba(255, 224, 225, 0.2)');
    
    ctx.fillStyle = topFacetGradient;
    ctx.beginPath();
    ctx.moveTo(0, -height/2);
    ctx.lineTo(width*0.25, -height*0.45);
    ctx.lineTo(width*0.15, -height*0.25);
    ctx.lineTo(-width*0.15, -height*0.25);
    ctx.lineTo(-width*0.25, -height*0.45);
    ctx.closePath();
    ctx.fill();
    
    // 绘制底部切割面
    const bottomFacetGradient = ctx.createLinearGradient(0, height/2, 0, height*0.2);
    bottomFacetGradient.addColorStop(0, 'rgba(255, 193, 193, 0.25)');
    bottomFacetGradient.addColorStop(1, 'rgba(255, 160, 160, 0.15)');
    
    ctx.fillStyle = bottomFacetGradient;
    ctx.beginPath();
    ctx.moveTo(0, height/2);
    ctx.lineTo(width*0.25, height*0.4);
    ctx.lineTo(width*0.15, height*0.15);
    ctx.lineTo(-width*0.15, height*0.15);
    ctx.lineTo(-width*0.25, height*0.4);
    ctx.closePath();
    ctx.fill();
    
    // 绘制额外的小切割面
    const smallFacetGradient = ctx.createLinearGradient(0, 0, width*0.45, 0);
    smallFacetGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    smallFacetGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    
    ctx.fillStyle = smallFacetGradient;
    
    // 右侧小切割面
    ctx.beginPath();
    ctx.moveTo(width*0.15, -height*0.25);
    ctx.lineTo(width*0.3, -height*0.15);
    ctx.lineTo(width*0.3, height*0.15);
    ctx.lineTo(width*0.15, height*0.25);
    ctx.closePath();
    ctx.fill();
    
    // 左侧小切割面
    ctx.beginPath();
    ctx.moveTo(-width*0.15, -height*0.25);
    ctx.lineTo(-width*0.3, -height*0.15);
    ctx.lineTo(-width*0.3, height*0.15);
    ctx.lineTo(-width*0.15, height*0.25);
    ctx.closePath();
    ctx.fill();
}

// 绘制红宝石光影效果
function drawRubyLighting(width, height) {
    // 顶部主高光
    const topHighlightGradient = ctx.createRadialGradient(0, -height/2, 0, 0, -height/2, width*0.3);
    topHighlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    topHighlightGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    topHighlightGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
    topHighlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = topHighlightGradient;
    ctx.beginPath();
    ctx.moveTo(-width*0.15, -height/2);
    ctx.lineTo(width*0.15, -height/2);
    ctx.lineTo(width*0.2, -height*0.3);
    ctx.lineTo(-width*0.2, -height*0.3);
    ctx.closePath();
    ctx.fill();
    
    // 右侧高光
    const rightHighlightGradient = ctx.createRadialGradient(width*0.25, 0, 0, width*0.25, 0, width*0.3);
    rightHighlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    rightHighlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    rightHighlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    rightHighlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = rightHighlightGradient;
    ctx.beginPath();
    ctx.moveTo(width*0.2, -height*0.2);
    ctx.lineTo(width*0.35, -height*0.1);
    ctx.lineTo(width*0.35, height*0.1);
    ctx.lineTo(width*0.2, height*0.2);
    ctx.closePath();
    ctx.fill();
    
    // 左侧次要高光
    const leftHighlightGradient = ctx.createRadialGradient(-width*0.2, 0, 0, -width*0.2, 0, width*0.25);
    leftHighlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    leftHighlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    leftHighlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = leftHighlightGradient;
    ctx.beginPath();
    ctx.moveTo(-width*0.2, -height*0.2);
    ctx.lineTo(-width*0.3, -height*0.1);
    ctx.lineTo(-width*0.3, height*0.1);
    ctx.lineTo(-width*0.2, height*0.2);
    ctx.closePath();
    ctx.fill();
    
    // 底部反光
    const bottomReflectGradient = ctx.createRadialGradient(0, height/2, 0, 0, height/2, width*0.25);
    bottomReflectGradient.addColorStop(0, 'rgba(255, 224, 224, 0.5)');
    bottomReflectGradient.addColorStop(0.4, 'rgba(255, 200, 200, 0.3)');
    bottomReflectGradient.addColorStop(0.7, 'rgba(255, 160, 160, 0.2)');
    bottomReflectGradient.addColorStop(1, 'rgba(255, 128, 128, 0)');
    
    ctx.fillStyle = bottomReflectGradient;
    ctx.beginPath();
    ctx.moveTo(-width*0.15, height*0.3);
    ctx.lineTo(width*0.15, height*0.3);
    ctx.lineTo(width*0.1, height*0.45);
    ctx.lineTo(-width*0.1, height*0.45);
    ctx.closePath();
    ctx.fill();
    
    // 中心光泽
    const centerGlowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, width*0.2);
    centerGlowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    centerGlowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    centerGlowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = centerGlowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, width*0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制光泽线条
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -height/2);
    ctx.lineTo(0, height/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(width*0.35, -height*0.35);
    ctx.lineTo(width*0.25, height*0.35);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(-width*0.35, -height*0.35);
    ctx.lineTo(-width*0.25, height*0.35);
    ctx.stroke();
}

// 绘制红宝石轮廓
function drawRubyOutline(width, height) {
    // 绘制主轮廓
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const halfWidth = width / 2;
    const quarterHeight = height / 4;
    
    ctx.moveTo(0, -height/2);
    ctx.lineTo(halfWidth, -quarterHeight);
    ctx.lineTo(halfWidth, quarterHeight);
    ctx.lineTo(0, height/2);
    ctx.lineTo(-halfWidth, quarterHeight);
    ctx.lineTo(-halfWidth, -quarterHeight);
    ctx.closePath();
    ctx.stroke();
    
    // 绘制切割面边缘
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.8;
    
    // 中心切割面边缘
    ctx.beginPath();
    ctx.moveTo(0, -height/2);
    ctx.lineTo(width*0.35, -height*0.35);
    ctx.lineTo(width*0.25, height*0.35);
    ctx.lineTo(0, height/2);
    ctx.lineTo(-width*0.25, height*0.35);
    ctx.lineTo(-width*0.35, -height*0.35);
    ctx.closePath();
    ctx.stroke();
    
    // 右侧切割面边缘
    ctx.beginPath();
    ctx.moveTo(width*0.35, -height*0.35);
    ctx.lineTo(width*0.45, -height*0.2);
    ctx.lineTo(width*0.45, height*0.2);
    ctx.lineTo(width*0.25, height*0.35);
    ctx.closePath();
    ctx.stroke();
    
    // 左侧切割面边缘
    ctx.beginPath();
    ctx.moveTo(-width*0.35, -height*0.35);
    ctx.lineTo(-width*0.45, -height*0.2);
    ctx.lineTo(-width*0.45, height*0.2);
    ctx.lineTo(-width*0.25, height*0.35);
    ctx.closePath();
    ctx.stroke();
    
    // 添加宝石辉光效果
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, width*0.8);
    glowGradient.addColorStop(0, 'rgba(255, 82, 82, 0.3)');
    glowGradient.addColorStop(0.5, 'rgba(255, 82, 82, 0.1)');
    glowGradient.addColorStop(1, 'rgba(255, 82, 82, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, width*0.8, 0, Math.PI * 2);
    ctx.fill();
}

// 生成新的场景元素
function generateNewElements() {
    const scene = scenes[gameState.currentScene % scenes.length];
    
    // 移除屏幕左侧的元素
    gameState.platforms = gameState.platforms.filter(p => p.x + p.width > 0);
    gameState.diamonds = gameState.diamonds.filter(d => d.x + d.width > 0);
    gameState.obstacles = gameState.obstacles.filter(o => o.x + o.width > 0);
    
    // 生成新的平台（基于基础间距的倍数随机生成）
    if (Math.random() > 0.85) {
        const lastPlatform = gameState.platforms[gameState.platforms.length - 1];
        if (lastPlatform) {
            // 基于基础间距的倍数随机生成平台间距
            const spacingMultipliers = [1, 1.5, 2];
            const randomMultiplier = spacingMultipliers[Math.floor(Math.random() * spacingMultipliers.length)];
            const requiredSpacing = PLATFORM_SPACING * randomMultiplier;
            
            // 检查是否需要生成新平台（基于最后一个平台的位置）
            const newPlatformX = GAME_WIDTH;
            
            // 生成在阈值范围内的平台宽度（增加到原来的两倍）
            const platformWidth = (Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH) + MIN_PLATFORM_WIDTH) * 2;
            
            // 生成合理的位置，确保与其他平台无水平重叠且垂直间距足够
                let platformY;
                let validPosition = false;
                let maxAttempts = 100;
                let attempts = 0;
                
                while (!validPosition && attempts < maxAttempts) {
                    // 有20%的概率生成触碰到屏幕底部的平台
                    if (Math.random() < 0.2) {
                        platformY = GAME_HEIGHT - PLATFORM_HEIGHT; // 触碰到屏幕底部
                    } else {
                        platformY = Math.random() * (GAME_HEIGHT - 150) + 80;
                    }
                    validPosition = true;
                    attempts++;
                    
                    // 检查与其他平台的垂直间距和水平重叠
                    for (let existingPlatform of gameState.platforms) {
                        // 检查垂直间距
                        if (Math.abs(platformY - existingPlatform.y) < 80) {
                            validPosition = false;
                            break;
                        }
                        // 检查水平重叠（垂直投影）
                        if (!(newPlatformX + platformWidth < existingPlatform.x || newPlatformX > existingPlatform.x + existingPlatform.width)) {
                            validPosition = false;
                            break;
                        }
                    }
                }
            
            // 如果找到合适的位置，生成新平台
            if (validPosition) {
                gameState.platforms.push({
                    x: newPlatformX,
                    y: platformY,
                    width: platformWidth,
                    height: PLATFORM_HEIGHT,
                    color: scene.platformColor
                });
            }
        } else {
            // 第一个平台
            // 生成在阈值范围内的平台宽度
            const platformWidth = Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH) + MIN_PLATFORM_WIDTH;
            const platformY = GAME_HEIGHT - PLATFORM_HEIGHT;
            
            gameState.platforms.push({
                x: GAME_WIDTH,
                y: platformY,
                width: platformWidth,
                height: PLATFORM_HEIGHT,
                color: scene.platformColor
            });
        }
    }
    
    // 生成新的钻石（基于平台垂直投影生成，确保分布合理）
    // 找到屏幕右侧的平台
    const rightPlatforms = gameState.platforms.filter(p => p.x > GAME_WIDTH * 0.5);
    if (rightPlatforms.length > 0) {
        // 选择最远的平台
        const farthestPlatform = rightPlatforms.reduce((farthest, current) => 
            current.x > farthest.x ? current : farthest
        );
        
        // 计算平台的水平范围（垂直投影）
        const platformLeft = farthestPlatform.x;
        const platformRight = farthestPlatform.x + farthestPlatform.width;
        
        // 计算当前平台垂直投影上已有的钻石数量
        let existingDiamondCount = 0;
        for (let existingDiamond of gameState.diamonds) {
            if (existingDiamond.x >= platformLeft && existingDiamond.x <= platformRight) {
                existingDiamondCount++;
            }
        }
        
        // 每个平台的垂直投影上最多生成3个钻石，宁少勿多
        const maxDiamonds = 3;
        const remainingDiamonds = maxDiamonds - existingDiamondCount;
        
        if (remainingDiamonds > 0) {
            // 根据平台长度调整钻石数量：短平台钻石少，长平台钻石多
            const platformLength = farthestPlatform.width;
            let diamondProbability;
            
            // 根据平台长度设置钻石生成概率
            if (platformLength < 100) {
                // 短平台：低概率生成钻石
                diamondProbability = 0.2; // 20%概率生成钻石
            } else if (platformLength < 150) {
                // 中等长度平台：中等概率生成钻石
                diamondProbability = 0.4; // 40%概率生成钻石
            } else if (platformLength < 220) {
                // 较长平台：较高概率生成钻石
                diamondProbability = 0.7; // 70%概率生成钻石
            } else {
                // 长平台：高概率生成钻石
                diamondProbability = 0.9; // 90%概率生成钻石
            }
            
            // 检查是否需要在这个平台上生成钻石
            if (Math.random() > diamondProbability) {
                // 不生成钻石
            } else {
                // 根据平台长度决定钻石数量
                let diamondCount;
                if (platformLength < 100) {
                    // 短平台：最多1个钻石
                    diamondCount = Math.min(1, remainingDiamonds);
                } else if (platformLength < 150) {
                    // 中等长度平台：最多1个钻石
                    diamondCount = Math.min(1, remainingDiamonds);
                } else if (platformLength < 220) {
                    // 较长平台：最多2个钻石
                    diamondCount = Math.min(Math.floor(Math.random() * 2) + 1, remainingDiamonds); // 1或2
                } else {
                    // 长平台：最多3个钻石
                    diamondCount = Math.min(Math.floor(Math.random() * 3) + 1, remainingDiamonds); // 1-3
                }
                
                for (let i = 0; i < diamondCount; i++) {
                    // 钻石生成在平台的垂直投影范围内
                    const diamondX = platformLeft + Math.random() * (farthestPlatform.width - DIAMOND_WIDTH);
                    
                    // 随机决定钻石位置：平台上方、空中或特殊位置
                    const positionType = Math.random();
                    let diamondY;
                    
                    if (positionType < 0.5) {
                        // 平台上方（距离平台有一定高度）
                        diamondY = farthestPlatform.y - DIAMOND_HEIGHT - Math.random() * 70 - 20;
                    } else if (positionType < 0.8) {
                        // 空中（更高的位置）
                        diamondY = Math.random() * (farthestPlatform.y - DIAMOND_HEIGHT - 90);
                    } else {
                        // 特殊位置（如栏杆洞口附近）
                        diamondY = farthestPlatform.y - DIAMOND_HEIGHT - 40 - Math.random() * 30;
                    }
                    
                    // 确保钻石不会低于平台
                    diamondY = Math.max(0, diamondY);
                    
                    // 检查是否与其他钻石重合或过于密集
                    let isOverlapping = false;
                    for (let existingDiamond of gameState.diamonds) {
                        const distance = Math.sqrt(
                            Math.pow(diamondX - existingDiamond.x, 2) + 
                            Math.pow(diamondY - existingDiamond.y, 2)
                        );
                        if (distance < DIAMOND_WIDTH * 3) {
                            isOverlapping = true;
                            break;
                        }
                    }
                    
                    if (!isOverlapping) {
                        gameState.diamonds.push({
                            x: diamondX,
                            y: diamondY,
                            width: DIAMOND_WIDTH,
                            height: DIAMOND_HEIGHT,
                            collected: false
                        });
                    }
                }
            }
        }
    }
    
    // 生成新的障碍物（基于距离和固定概率生成，确保数量均匀）
    // 计算最后一个障碍物的位置
    let lastObstacleX = -Infinity;
    for (let obstacle of gameState.obstacles) {
        if (obstacle.x > lastObstacleX) {
            lastObstacleX = obstacle.x;
        }
    }
    
    // 基于基础间距的倍数随机生成障碍物间距
    const spacingMultipliers = [1, 1.5, 2];
    const randomMultiplier = spacingMultipliers[Math.floor(Math.random() * spacingMultipliers.length)];
    const requiredSpacing = OBSTACLE_SPACING * randomMultiplier;
    
    // 检查是否需要生成新障碍物
    const newObstacleX = GAME_WIDTH + 200; // 在屏幕外足够远的位置
    if (newObstacleX - lastObstacleX > requiredSpacing || lastObstacleX === -Infinity) {
        // 高概率生成障碍物，确保玩家能遇到足够的障碍物
        if (Math.random() > 0.1) { // 90%的概率生成障碍物
            // 选择所有平台，不限于屏幕外
            const availablePlatforms = gameState.platforms;
            if (availablePlatforms.length > 0) {
                // 选择屏幕右侧的平台，确保有足够的空间
                const rightPlatforms = availablePlatforms.filter(p => p.x + p.width > GAME_WIDTH);
                if (rightPlatforms.length > 0) {
                    // 随机选择一个平台
                    const targetPlatform = rightPlatforms[Math.floor(Math.random() * rightPlatforms.length)];
                    
                    // 确保岩石和鸟居门出现概率各为50%
                    const obstacleType = Math.random() < 0.5 ? 'rock' : 'fence';
                    
                    // 从平台的20%位置之后随机生成，避免在最左端
                    const startX = targetPlatform.x + targetPlatform.width * 0.2;
                    const endX = targetPlatform.x + targetPlatform.width - (obstacleType === 'fence' ? 80 : 30);
                    const obstacleX = startX + Math.random() * (endX - startX);
                    
                    const obstacleY = obstacleType === 'fence' ? targetPlatform.y - 40 : targetPlatform.y - 30;
                    const obstacleWidth = obstacleType === 'fence' ? 80 : 30;
                    const obstacleHeight = obstacleType === 'fence' ? 40 : 30;
                    
                    // 检查新障碍物是否与现有障碍物重叠或距离太近
                    let isOverlapping = false;
                    const minDistance = OBSTACLE_SPACING * 0.5; // 障碍物之间的最小距离
                    
                    for (let existingObstacle of gameState.obstacles) {
                        const distance = Math.sqrt(
                            Math.pow(obstacleX - existingObstacle.x, 2) + 
                            Math.pow(obstacleY - existingObstacle.y, 2)
                        );
                        
                        // 检查是否距离太近
                        if (distance < minDistance) {
                            isOverlapping = true;
                            break;
                        }
                    }
                    
                    // 只有当不重叠时才添加新障碍物
                    if (!isOverlapping) {
                        gameState.obstacles.push({
                            x: obstacleX,
                            y: obstacleY,
                            width: obstacleWidth,
                            height: obstacleHeight,
                            type: obstacleType,
                            active: true
                        });
                    
                        // 为栏杆类型的障碍物在洞口内添加钻石
                        if (obstacleType === 'fence') {
                            // 计算平台的水平范围（垂直投影）
                            const platformLeft = targetPlatform.x;
                            const platformRight = targetPlatform.x + targetPlatform.width;
                            
                            // 计算当前平台垂直投影上已有的钻石数量
                            let existingDiamondCount = 0;
                            for (let existingDiamond of gameState.diamonds) {
                                if (existingDiamond.x >= platformLeft && existingDiamond.x <= platformRight) {
                                    existingDiamondCount++;
                                }
                            }
                            
                            // 检查是否还有剩余的钻石配额
                            const maxDiamonds = 3;
                            if (existingDiamondCount < maxDiamonds) {
                                // 有50%的概率在栏杆洞口内生成钻石
                                if (Math.random() > 0.5) {
                                    // 栏杆洞口的中心位置
                                    const holeCenterX = obstacleX + obstacleWidth / 2;
                                    const holeY = obstacleY + obstacleHeight / 2;
                                    
                                    // 生成钻石在洞口内
                                    const diamondX = holeCenterX - DIAMOND_WIDTH / 2;
                                    const diamondY = holeY - DIAMOND_HEIGHT / 2;
                                    
                                    // 检查是否与其他钻石重合或过于密集
                                    let isDiamondOverlapping = false;
                                    for (let existingDiamond of gameState.diamonds) {
                                        const distance = Math.sqrt(
                                            Math.pow(diamondX - existingDiamond.x, 2) + 
                                            Math.pow(diamondY - existingDiamond.y, 2)
                                        );
                                        if (distance < DIAMOND_WIDTH * 3) {
                                            isDiamondOverlapping = true;
                                            break;
                                        }
                                    }
                                    
                                    if (!isDiamondOverlapping) {
                                        gameState.diamonds.push({
                                            x: diamondX,
                                            y: diamondY,
                                            width: DIAMOND_WIDTH,
                                            height: DIAMOND_HEIGHT,
                                            collected: false
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        // 第一个障碍物
        // 只选择完全在屏幕外的平台，确保障碍物在屏幕外预先生成
        const rightPlatforms = gameState.platforms.filter(p => p.x > GAME_WIDTH);
        if (rightPlatforms.length > 0) {
            // 选择最远的平台，确保障碍物在屏幕外足够远的位置
            const farthestPlatform = rightPlatforms.reduce((farthest, current) => 
                current.x > farthest.x ? current : farthest
            );
            
            // 确保岩石和鸟居门出现概率各为50%
                    const obstacleType = Math.random() < 0.5 ? 'rock' : 'fence';
                    
                    const startX = farthestPlatform.x + farthestPlatform.width * 0.2;
                    const endX = farthestPlatform.x + farthestPlatform.width - (obstacleType === 'fence' ? 80 : 30);
                    const obstacleX = startX + Math.random() * (endX - startX);
                    
                    const obstacleY = obstacleType === 'fence' ? farthestPlatform.y - 40 : farthestPlatform.y - 30;
                    const obstacleWidth = obstacleType === 'fence' ? 80 : 30;
                    const obstacleHeight = obstacleType === 'fence' ? 40 : 30;
                    
                    // 检查新障碍物是否与现有障碍物重叠或距离太近
                    let isOverlapping = false;
                    const minDistance = OBSTACLE_SPACING * 0.5; // 障碍物之间的最小距离
                    
                    for (let existingObstacle of gameState.obstacles) {
                        const distance = Math.sqrt(
                            Math.pow(obstacleX - existingObstacle.x, 2) + 
                            Math.pow(obstacleY - existingObstacle.y, 2)
                        );
                        
                        // 检查是否距离太近
                        if (distance < minDistance) {
                            isOverlapping = true;
                            break;
                        }
                    }
                    
                    // 只有当不重叠时才添加新障碍物
                    if (!isOverlapping) {
                        gameState.obstacles.push({
                            x: obstacleX,
                            y: obstacleY,
                            width: obstacleWidth,
                            height: obstacleHeight,
                            type: obstacleType,
                            active: true
                        });
                    
                        // 为栏杆类型的障碍物在洞口内添加钻石
                        if (obstacleType === 'fence') {
                            // 计算平台的水平范围（垂直投影）
                            const platformLeft = farthestPlatform.x;
                            const platformRight = farthestPlatform.x + farthestPlatform.width;
                            
                            // 计算当前平台垂直投影上已有的钻石数量
                            let existingDiamondCount = 0;
                            for (let existingDiamond of gameState.diamonds) {
                                if (existingDiamond.x >= platformLeft && existingDiamond.x <= platformRight) {
                                    existingDiamondCount++;
                                }
                            }
                            
                            // 检查是否还有剩余的钻石配额
                            const maxDiamonds = 3;
                            if (existingDiamondCount < maxDiamonds) {
                                // 有50%的概率在栏杆洞口内生成钻石
                                if (Math.random() > 0.5) {
                                    // 栏杆洞口的中心位置
                                    const holeCenterX = obstacleX + obstacleWidth / 2;
                                    const holeY = obstacleY + obstacleHeight / 2;
                                    
                                    // 生成钻石在洞口内
                                    const diamondX = holeCenterX - DIAMOND_WIDTH / 2;
                                    const diamondY = holeY - DIAMOND_HEIGHT / 2;
                                    
                                    // 检查是否与其他钻石重合或过于密集
                                    let isDiamondOverlapping = false;
                                    for (let existingDiamond of gameState.diamonds) {
                                        const distance = Math.sqrt(
                                            Math.pow(diamondX - existingDiamond.x, 2) + 
                                            Math.pow(diamondY - existingDiamond.y, 2)
                                        );
                                        if (distance < DIAMOND_WIDTH * 3) {
                                            isDiamondOverlapping = true;
                                            break;
                                        }
                                    }
                                    
                                    if (!isDiamondOverlapping) {
                                        gameState.diamonds.push({
                                            x: diamondX,
                                            y: diamondY,
                                            width: DIAMOND_WIDTH,
                                            height: DIAMOND_HEIGHT,
                                            collected: false
                                        });
                                    }
                                }
                            }
                        }
                    }
        }
    }
}

// 创建粒子效果
function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            size: Math.random() * 4 + 2,
            speedX: (Math.random() - 0.5) * 6,
            speedY: (Math.random() - 0.5) * 6,
            color: color,
            alpha: 1,
            life: 60
        });
    }
}

// 更新粒子效果
function updateParticles() {
    gameState.particles = gameState.particles.filter(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.speedY += 0.1;
        // 使用粒子的decaySpeed属性（如果存在）来控制透明度减少速度
        particle.alpha -= particle.decaySpeed || 0.02;
        particle.life--;
        return particle.life > 0 && particle.alpha > 0;
    });
}

// 绘制粒子效果
function drawParticles() {
    for (let particle of gameState.particles) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 生成背景元素
function generateBackgroundElements() {
    gameState.backgroundElements = [];
    const scene = scenes[gameState.currentScene % scenes.length];
    
    // 生成背景元素，确保分布合理
    for (let i = 0; i < 8; i++) {
        const elementType = scene.backgroundElements[Math.floor(Math.random() * scene.backgroundElements.length)];
                let newX = Math.random() * GAME_WIDTH * 2;
                // 为飞鸟设置更高的生成位置，在云层之中
                let newY;
                if (elementType === 'bird') {
                    newY = Math.random() * (GAME_HEIGHT * 0.3); // 飞鸟在屏幕上半部分飞翔
                } else {
                    newY = Math.random() * (GAME_HEIGHT - 100);
                }
                let newSize = Math.random() * 20 + 10;
        let isOverlapping = false;
        
        // 检查是否与现有元素重叠
        for (let existingElement of gameState.backgroundElements) {
            const distance = Math.sqrt(
                Math.pow(newX - existingElement.x, 2) + 
                Math.pow(newY - existingElement.y, 2)
            );
            if (distance < (newSize + existingElement.size) * 1.5) {
                isOverlapping = true;
                break;
            }
        }
        
        if (!isOverlapping) {
            gameState.backgroundElements.push({
                type: elementType,
                x: newX,
                y: newY,
                size: newSize,
                speed: Math.random() * 0.2 + 0.1,
                // 添加动画相关属性
                animationFrame: Math.random() * 100,
                baseX: newX,
                baseY: newY,
                // 对于云彩，添加固定的飘动方向
                cloudDirection: Math.random() > 0.5 ? 1 : -1,
                cloudFloatSpeed: Math.random() * 0.2 + 0.1,
                // 对于鱼，添加游动方向、速度和游动距离
                fishDirection: Math.random() > 0.5 ? 1 : -1,
                fishSpeed: Math.random() * 0.3 + 0.1,
                fishMoveDistance: 0,
                fishMaxDistance: Math.random() * 100 + 100, // 鱼在一个方向游动的最大距离
                // 对于飞鸟，添加飞翔方向和速度
                birdDirection: Math.random() > 0.5 ? 1 : -1,
                birdSpeed: Math.random() * 0.5 + 0.2,
                // 对于海草，添加摇摆偏移
                seaweedWaveOffset: Math.random() * Math.PI * 2
            });
        }
    }
}

// 更新背景元素
function updateBackgroundElements() {
    gameState.backgroundElements = gameState.backgroundElements.filter(element => {
        // 增加背景元素的移动速度，使其与场景滚动更匹配
                element.x -= element.speed * player.speed * 4;
        
        // 更新动画帧
        element.animationFrame += 0.1;
        
        // 根据元素类型添加不同的动画效果
        switch (element.type) {
            case 'cloud':
                // 云朵保持固定方向飘动
                element.x += element.cloudDirection * element.cloudFloatSpeed;
                // 当云朵移出屏幕时，从另一侧重新进入
                if (element.cloudDirection > 0 && element.x > GAME_WIDTH + element.size) {
                    element.x = -element.size;
                } else if (element.cloudDirection < 0 && element.x < -element.size) {
                    element.x = GAME_WIDTH + element.size;
                }
                break;
            case 'flower':
                // 花朵轻微摇摆
                element.y = element.baseY + Math.sin(element.animationFrame * 2) * 2;
                break;
            case 'cactus':
                // 仙人掌左右摇摆，不上下抖动
                element.x = element.baseX + Math.sin(element.animationFrame * 0.5) * 2;
                break;
            case 'rock':
                // 岩石轻微晃动
                element.y = element.baseY + Math.sin(element.animationFrame * 0.5) * 1;
                break;
            case 'tower':
                // 城堡保持静态
                // 不添加任何动画效果，保持固定位置
                break;
            case 'bubble':
                // 气泡上升效果
                element.y -= 0.2;
                element.x += Math.sin(element.animationFrame) * 0.5;
                break;
            case 'fish':
                // 鱼左右游动效果，不再上下飘动
                element.x += element.fishDirection * element.fishSpeed;
                element.fishMoveDistance += Math.abs(element.fishDirection * element.fishSpeed);
                
                // 当鱼游动一定距离后改变方向
                if (element.fishMoveDistance >= element.fishMaxDistance) {
                    element.fishDirection *= -1;
                    element.fishMoveDistance = 0;
                    element.fishMaxDistance = Math.random() * 100 + 100; // 重新设置游动距离
                }
                
                // 鱼游出屏幕时从另一侧重新进入
                if (element.fishDirection > 0 && element.x > GAME_WIDTH + element.size * 2) {
                    element.x = -element.size * 2;
                    element.fishMoveDistance = 0;
                } else if (element.fishDirection < 0 && element.x < -element.size * 2) {
                    element.x = GAME_WIDTH + element.size * 2;
                    element.fishMoveDistance = 0;
                }
                
                // 鱼吐泡泡效果（更小、更靠近鱼嘴）
                if (Math.random() > 0.97) {
                    // 根据鱼的游动方向确定泡泡位置
                    const bubbleX = element.fishDirection > 0 ? element.x + element.size * 0.65 : element.x - element.size * 0.65;
                    const bubbleY = element.y;
                    
                    gameState.particles.push({
                        x: bubbleX,
                        y: bubbleY,
                        size: Math.random() * 1.5 + 0.5, // 更小的泡泡
                        speedX: element.fishDirection * 0.2 + (Math.random() - 0.5) * 0.2,
                        speedY: -Math.random() * 0.3 - 0.1, // 更慢的上升速度
                        color: 'rgba(255, 255, 255, 0.8)',
                        alpha: 1,
                        life: 80, // 更长的生命周期
                        decaySpeed: 0.01 // 更慢的消失速度
                    });
                }
                break;
            case 'bird':
                // 飞鸟一直朝一个方向飞翔，鸟头朝向哪个方向就往哪个方向飞
                element.x += element.birdDirection * element.birdSpeed;
                
                // 飞鸟飞出屏幕时从另一侧重新进入
                if (element.birdDirection > 0 && element.x > GAME_WIDTH + element.size * 2) {
                    element.x = -element.size * 2;
                } else if (element.birdDirection < 0 && element.x < -element.size * 2) {
                    element.x = GAME_WIDTH + element.size * 2;
                }
                
                // 飞鸟轻微上下浮动
                element.y = element.baseY + Math.sin(element.animationFrame * 0.5) * 3;
                break;
            case 'seaweed':
                // 海草在水下摇摆舞动
                // 海草固定在屏幕底部
                element.y = GAME_HEIGHT - element.size * 0.2;
                // 海草向左向右弯曲摇摆
                element.x = element.baseX + Math.sin(element.animationFrame * 0.3 + element.seaweedWaveOffset) * 5;
                break;
        }
        
        return element.x > -element.size && element.y > -element.size && element.y < GAME_HEIGHT;
    });
    
    // 减少生成频率，避免元素堆积
    if (Math.random() > 0.98) {
        const scene = scenes[gameState.currentScene % scenes.length];
        const elementType = scene.backgroundElements[Math.floor(Math.random() * scene.backgroundElements.length)];
        
        // 确保新生成的元素不会与现有元素重叠
                let newX = GAME_WIDTH;
                // 为飞鸟设置更高的生成位置，在云层之中
                let newY;
                if (elementType === 'bird') {
                    newY = Math.random() * (GAME_HEIGHT * 0.3); // 飞鸟在屏幕上半部分飞翔
                } else {
                    newY = Math.random() * (GAME_HEIGHT - 100);
                }
                let newSize = Math.random() * 20 + 10;
        let isOverlapping = false;
        
        for (let existingElement of gameState.backgroundElements) {
            const distance = Math.sqrt(
                Math.pow(newX - existingElement.x, 2) + 
                Math.pow(newY - existingElement.y, 2)
            );
            if (distance < (newSize + existingElement.size) * 1.5) {
                isOverlapping = true;
                break;
            }
        }
        
        if (!isOverlapping) {
            gameState.backgroundElements.push({
                type: elementType,
                x: newX,
                y: newY,
                size: newSize,
                speed: Math.random() * 0.2 + 0.1,
                // 添加动画相关属性
                animationFrame: Math.random() * 100,
                baseX: newX,
                baseY: newY,
                // 对于云彩，添加固定的飘动方向
                cloudDirection: Math.random() > 0.5 ? 1 : -1,
                cloudFloatSpeed: Math.random() * 0.2 + 0.1,
                // 对于鱼，添加游动方向、速度和游动距离
                fishDirection: Math.random() > 0.5 ? 1 : -1,
                fishSpeed: Math.random() * 0.3 + 0.1,
                fishMoveDistance: 0,
                fishMaxDistance: Math.random() * 100 + 100, // 鱼在一个方向游动的最大距离
                // 对于飞鸟，添加飞翔方向和速度
                birdDirection: Math.random() > 0.5 ? 1 : -1,
                birdSpeed: Math.random() * 0.5 + 0.2,
                // 对于海草，添加摇摆偏移
                seaweedWaveOffset: Math.random() * Math.PI * 2
            });
        }
    }
}

// 绘制背景元素
function drawBackgroundElements() {
    for (let element of gameState.backgroundElements) {
        ctx.save();
        
        switch (element.type) {
            case 'cloud':
                // 云朵飘动效果，添加缓慢的透明度变化（有最低限制）
                const cloudAlpha = 0.5 + Math.sin(element.animationFrame * 0.1) * 0.3;
                ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`;
                ctx.beginPath();
                ctx.arc(element.x, element.y, element.size, 0, Math.PI * 2);
                ctx.arc(element.x + element.size, element.y, element.size * 0.8, 0, Math.PI * 2);
                ctx.arc(element.x + element.size * 0.5, element.y - element.size * 0.3, element.size * 0.9, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'flower':
                // 花朵轻微摇摆，添加颜色变化
                const flowerHue = 320 + Math.sin(element.animationFrame * 2) * 10;
                ctx.fillStyle = `hsl(${flowerHue}, 100%, 70%)`;
                ctx.beginPath();
                ctx.arc(element.x, element.y, element.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFEB3B';
                ctx.beginPath();
                ctx.arc(element.x, element.y, element.size * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'cactus':
                // 按照图片中的样子绘制仙人掌
                // 确保仙人掌在地上，最下面放到底端
                const cactusBaseY = GAME_HEIGHT;
                
                // 调整仙人掌的尺寸，体积缩小到原来的1/2
                const cactusHeight = element.size * 2.5 * 5 * 0.5;
                const cactusWidth = element.size * 0.8 * 5 * 2 * 0.5;
                
                // 绘制仙人掌主体（柱状）
                ctx.fillStyle = '#4CAF50';
                ctx.beginPath();
                ctx.moveTo(element.x - cactusWidth * 0.4, cactusBaseY);
                ctx.lineTo(element.x - cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.8);
                ctx.lineTo(element.x - cactusWidth * 0.1, cactusBaseY - cactusHeight);
                ctx.lineTo(element.x + cactusWidth * 0.1, cactusBaseY - cactusHeight);
                ctx.lineTo(element.x + cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.8);
                ctx.lineTo(element.x + cactusWidth * 0.4, cactusBaseY);
                ctx.closePath();
                ctx.fill();
                
                // 绘制左侧手臂
                ctx.beginPath();
                ctx.moveTo(element.x - cactusWidth * 0.35, cactusBaseY - cactusHeight * 0.6);
                ctx.lineTo(element.x - cactusWidth * 0.7, cactusBaseY - cactusHeight * 0.5);
                ctx.lineTo(element.x - cactusWidth * 0.65, cactusBaseY - cactusHeight * 0.3);
                ctx.lineTo(element.x - cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.4);
                ctx.closePath();
                ctx.fill();
                
                // 绘制右侧手臂
                ctx.beginPath();
                ctx.moveTo(element.x + cactusWidth * 0.35, cactusBaseY - cactusHeight * 0.7);
                ctx.lineTo(element.x + cactusWidth * 0.7, cactusBaseY - cactusHeight * 0.6);
                ctx.lineTo(element.x + cactusWidth * 0.65, cactusBaseY - cactusHeight * 0.4);
                ctx.lineTo(element.x + cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.5);
                ctx.closePath();
                ctx.fill();
                
                // 绘制黑色轮廓线
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                
                // 主体轮廓
                ctx.beginPath();
                ctx.moveTo(element.x - cactusWidth * 0.4, cactusBaseY);
                ctx.lineTo(element.x - cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.8);
                ctx.lineTo(element.x - cactusWidth * 0.1, cactusBaseY - cactusHeight);
                ctx.lineTo(element.x + cactusWidth * 0.1, cactusBaseY - cactusHeight);
                ctx.lineTo(element.x + cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.8);
                ctx.lineTo(element.x + cactusWidth * 0.4, cactusBaseY);
                ctx.closePath();
                ctx.stroke();
                
                // 左侧手臂轮廓
                ctx.beginPath();
                ctx.moveTo(element.x - cactusWidth * 0.35, cactusBaseY - cactusHeight * 0.6);
                ctx.lineTo(element.x - cactusWidth * 0.7, cactusBaseY - cactusHeight * 0.5);
                ctx.lineTo(element.x - cactusWidth * 0.65, cactusBaseY - cactusHeight * 0.3);
                ctx.lineTo(element.x - cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.4);
                ctx.closePath();
                ctx.stroke();
                
                // 右侧手臂轮廓
                ctx.beginPath();
                ctx.moveTo(element.x + cactusWidth * 0.35, cactusBaseY - cactusHeight * 0.7);
                ctx.lineTo(element.x + cactusWidth * 0.7, cactusBaseY - cactusHeight * 0.6);
                ctx.lineTo(element.x + cactusWidth * 0.65, cactusBaseY - cactusHeight * 0.4);
                ctx.lineTo(element.x + cactusWidth * 0.3, cactusBaseY - cactusHeight * 0.5);
                ctx.closePath();
                ctx.stroke();
                
                // 绘制绿色纵向纹理
                ctx.strokeStyle = '#388E3C';
                ctx.lineWidth = 1;
                
                // 主体纹理
                ctx.beginPath();
                ctx.moveTo(element.x - cactusWidth * 0.15, cactusBaseY);
                ctx.lineTo(element.x - cactusWidth * 0.1, cactusBaseY - cactusHeight);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(element.x + cactusWidth * 0.15, cactusBaseY);
                ctx.lineTo(element.x + cactusWidth * 0.1, cactusBaseY - cactusHeight);
                ctx.stroke();
                
                // 左侧手臂纹理
                ctx.beginPath();
                ctx.moveTo(element.x - cactusWidth * 0.5, cactusBaseY - cactusHeight * 0.6);
                ctx.lineTo(element.x - cactusWidth * 0.45, cactusBaseY - cactusHeight * 0.35);
                ctx.stroke();
                
                // 右侧手臂纹理
                ctx.beginPath();
                ctx.moveTo(element.x + cactusWidth * 0.5, cactusBaseY - cactusHeight * 0.7);
                ctx.lineTo(element.x + cactusWidth * 0.45, cactusBaseY - cactusHeight * 0.45);
                ctx.stroke();
                
                // 绘制白色的刺
                ctx.fillStyle = '#FFFFFF';
                
                // 主体上的刺
                const spikes = [
                    { x: element.x - cactusWidth * 0.3, y: cactusBaseY - cactusHeight * 0.2 },
                    { x: element.x - cactusWidth * 0.2, y: cactusBaseY - cactusHeight * 0.4 },
                    { x: element.x - cactusWidth * 0.1, y: cactusBaseY - cactusHeight * 0.6 },
                    { x: element.x, y: cactusBaseY - cactusHeight * 0.3 },
                    { x: element.x + cactusWidth * 0.1, y: cactusBaseY - cactusHeight * 0.5 },
                    { x: element.x + cactusWidth * 0.2, y: cactusBaseY - cactusHeight * 0.7 },
                    { x: element.x + cactusWidth * 0.3, y: cactusBaseY - cactusHeight * 0.3 },
                ];
                
                for (const spike of spikes) {
                    ctx.beginPath();
                    ctx.arc(spike.x, spike.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 左侧手臂上的刺
                const leftSpikes = [
                    { x: element.x - cactusWidth * 0.45, y: cactusBaseY - cactusHeight * 0.55 },
                    { x: element.x - cactusWidth * 0.6, y: cactusBaseY - cactusHeight * 0.45 },
                    { x: element.x - cactusWidth * 0.5, y: cactusBaseY - cactusHeight * 0.35 },
                ];
                
                for (const spike of leftSpikes) {
                    ctx.beginPath();
                    ctx.arc(spike.x, spike.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 右侧手臂上的刺
                const rightSpikes = [
                    { x: element.x + cactusWidth * 0.45, y: cactusBaseY - cactusHeight * 0.65 },
                    { x: element.x + cactusWidth * 0.6, y: cactusBaseY - cactusHeight * 0.55 },
                    { x: element.x + cactusWidth * 0.5, y: cactusBaseY - cactusHeight * 0.45 },
                ];
                
                for (const spike of rightSpikes) {
                    ctx.beginPath();
                    ctx.arc(spike.x, spike.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 绘制顶部的黄色花朵
                ctx.fillStyle = '#FFEB3B';
                
                // 花瓣
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 / 5) * i;
                    const petalX = element.x + Math.cos(angle) * cactusWidth * 0.2;
                    const petalY = cactusBaseY - cactusHeight + Math.sin(angle) * cactusWidth * 0.2;
                    ctx.beginPath();
                    ctx.arc(petalX, petalY, cactusWidth * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 花蕊
                ctx.fillStyle = '#FF9800';
                ctx.beginPath();
                ctx.arc(element.x, cactusBaseY - cactusHeight, cactusWidth * 0.05, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制花朵的黑色轮廓
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                
                // 花瓣轮廓
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 / 5) * i;
                    const petalX = element.x + Math.cos(angle) * cactusWidth * 0.2;
                    const petalY = cactusBaseY - cactusHeight + Math.sin(angle) * cactusWidth * 0.2;
                    ctx.beginPath();
                    ctx.arc(petalX, petalY, cactusWidth * 0.1, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                // 花蕊轮廓
                ctx.beginPath();
                ctx.arc(element.x, cactusBaseY - cactusHeight, cactusWidth * 0.05, 0, Math.PI * 2);
                ctx.stroke();
                
                break;
            case 'rock':
                // 岩石轻微晃动
                ctx.fillStyle = '#795548';
                ctx.beginPath();
                ctx.arc(element.x, element.y, element.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'tower':
                // 大型城堡，有多个相连的塔楼，在地上
                const castleX = element.x;
                // 确保城堡在地上，而不是空中
                const castleY = GAME_HEIGHT - element.size * 3 * 3;
                const castleSize = element.size * 2 * 3; // 增大城堡尺寸到原来的3倍
                
                // 绘制城堡底座（地面）
                ctx.fillStyle = '#795548';
                ctx.fillRect(castleX - castleSize * 2, GAME_HEIGHT - element.size * 0.5 * 3, castleSize * 4, element.size * 0.5 * 3);
                
                // 绘制主塔楼
                // 主塔楼底座
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(castleX - castleSize * 0.4, castleY + castleSize * 1.2, castleSize * 0.8, castleSize * 0.3);
                // 主塔塔身
                ctx.fillStyle = '#9E9E9E';
                ctx.fillRect(castleX - castleSize * 0.3, castleY, castleSize * 0.6, castleSize * 1.2);
                // 主塔塔窗
                ctx.fillStyle = '#616161';
                ctx.fillRect(castleX - castleSize * 0.15, castleY + castleSize * 0.3, castleSize * 0.1, castleSize * 0.2);
                ctx.fillRect(castleX + castleSize * 0.05, castleY + castleSize * 0.3, castleSize * 0.1, castleSize * 0.2);
                ctx.fillRect(castleX - castleSize * 0.15, castleY + castleSize * 0.7, castleSize * 0.1, castleSize * 0.2);
                ctx.fillRect(castleX + castleSize * 0.05, castleY + castleSize * 0.7, castleSize * 0.1, castleSize * 0.2);
                // 主塔塔顶（锥形）
                ctx.fillStyle = '#607D8B';
                ctx.beginPath();
                ctx.moveTo(castleX - castleSize * 0.35, castleY);
                ctx.lineTo(castleX + castleSize * 0.35, castleY);
                ctx.lineTo(castleX, castleY - castleSize * 0.5);
                ctx.closePath();
                ctx.fill();
                // 主塔塔顶装饰
                ctx.fillStyle = '#FFC107';
                ctx.beginPath();
                ctx.arc(castleX, castleY - castleSize * 0.5, castleSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
                // 主塔塔门
                ctx.fillStyle = '#616161';
                ctx.fillRect(castleX - castleSize * 0.1, castleY + castleSize * 1.2, castleSize * 0.2, castleSize * 0.3);
                
                // 绘制左侧塔楼
                const leftTowerX = castleX - castleSize * 1.2;
                // 左侧塔楼底座
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(leftTowerX - castleSize * 0.3, castleY + castleSize * 1.2, castleSize * 0.6, castleSize * 0.3);
                // 左侧塔塔身（稍小）
                ctx.fillStyle = '#757575';
                ctx.fillRect(leftTowerX - castleSize * 0.25, castleY + castleSize * 0.2, castleSize * 0.5, castleSize * 1);
                // 左侧塔塔窗
                ctx.fillStyle = '#424242';
                ctx.fillRect(leftTowerX - castleSize * 0.1, castleY + castleSize * 0.4, castleSize * 0.08, castleSize * 0.15);
                ctx.fillRect(leftTowerX + castleSize * 0.02, castleY + castleSize * 0.4, castleSize * 0.08, castleSize * 0.15);
                ctx.fillRect(leftTowerX - castleSize * 0.1, castleY + castleSize * 0.7, castleSize * 0.08, castleSize * 0.15);
                ctx.fillRect(leftTowerX + castleSize * 0.02, castleY + castleSize * 0.7, castleSize * 0.08, castleSize * 0.15);
                // 左侧塔塔顶（平顶）
                ctx.fillStyle = '#546E7A';
                ctx.fillRect(leftTowerX - castleSize * 0.3, castleY + castleSize * 0.1, castleSize * 0.6, castleSize * 0.1);
                // 左侧塔塔顶装饰
                ctx.fillStyle = '#FF9800';
                ctx.fillRect(leftTowerX - castleSize * 0.05, castleY, castleSize * 0.1, castleSize * 0.1);
                
                // 绘制右侧塔楼
                const rightTowerX = castleX + castleSize * 1.2;
                // 右侧塔楼底座
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(rightTowerX - castleSize * 0.3, castleY + castleSize * 1.2, castleSize * 0.6, castleSize * 0.3);
                // 右侧塔塔身（稍小）
                ctx.fillStyle = '#757575';
                ctx.fillRect(rightTowerX - castleSize * 0.25, castleY + castleSize * 0.2, castleSize * 0.5, castleSize * 1);
                // 右侧塔塔窗
                ctx.fillStyle = '#424242';
                ctx.fillRect(rightTowerX - castleSize * 0.1, castleY + castleSize * 0.4, castleSize * 0.08, castleSize * 0.15);
                ctx.fillRect(rightTowerX + castleSize * 0.02, castleY + castleSize * 0.4, castleSize * 0.08, castleSize * 0.15);
                ctx.fillRect(rightTowerX - castleSize * 0.1, castleY + castleSize * 0.7, castleSize * 0.08, castleSize * 0.15);
                ctx.fillRect(rightTowerX + castleSize * 0.02, castleY + castleSize * 0.7, castleSize * 0.08, castleSize * 0.15);
                // 右侧塔塔顶（尖顶）
                ctx.fillStyle = '#546E7A';
                ctx.beginPath();
                ctx.moveTo(rightTowerX - castleSize * 0.3, castleY + castleSize * 0.1);
                ctx.lineTo(rightTowerX + castleSize * 0.3, castleY + castleSize * 0.1);
                ctx.lineTo(rightTowerX, castleY - castleSize * 0.2);
                ctx.closePath();
                ctx.fill();
                // 右侧塔塔顶装饰
                ctx.fillStyle = '#FF9800';
                ctx.beginPath();
                ctx.arc(rightTowerX, castleY - castleSize * 0.2, castleSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制连接城墙
                // 主塔与左侧塔的城墙
                ctx.fillStyle = '#6D4C41';
                ctx.fillRect(castleX - castleSize * 0.4, castleY + castleSize * 1, castleSize * 0.8, castleSize * 0.2);
                ctx.fillRect(leftTowerX + castleSize * 0.25, castleY + castleSize * 1, castleSize * 0.95, castleSize * 0.2);
                // 主塔与右侧塔的城墙
                ctx.fillRect(rightTowerX - castleSize * 0.25, castleY + castleSize * 1, castleSize * 0.95, castleSize * 0.2);
                
                // 绘制城墙上的垛口
                // 左侧城墙垛口
                for (let i = 0; i < 5; i++) {
                    ctx.fillStyle = '#5D4037';
                    ctx.fillRect(leftTowerX + castleSize * 0.25 + i * castleSize * 0.2, castleY + castleSize * 0.9, castleSize * 0.1, castleSize * 0.1);
                }
                // 右侧城墙垛口
                for (let i = 0; i < 5; i++) {
                    ctx.fillStyle = '#5D4037';
                    ctx.fillRect(rightTowerX - castleSize * 1.2 + i * castleSize * 0.2, castleY + castleSize * 0.9, castleSize * 0.1, castleSize * 0.1);
                }
                
                break;
            case 'bubble':
                // 气泡上升效果，添加大小变化
                const bubbleSize = element.size * (1 + Math.sin(element.animationFrame) * 0.1);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(element.x, element.y, bubbleSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
            case 'fish':
                // 鱼游动效果，添加拖尾
                ctx.save();
                
                // 根据鱼的游动方向调整朝向
                if (element.fishDirection < 0) {
                    ctx.scale(-1, 1);
                    ctx.translate(-element.x * 2 - element.size * 2, 0);
                }
                
                // 绘制精致的鱼身
                const fishX = element.x;
                const fishY = element.y;
                const fishSize = element.size;
                
                // 绘制鱼身体（流线型）
                ctx.fillStyle = '#FF9800';
                ctx.beginPath();
                ctx.ellipse(fishX, fishY, fishSize * 0.6, fishSize * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制鱼头
                ctx.fillStyle = '#FF9800';
                ctx.beginPath();
                ctx.arc(fishX + fishSize * 0.5, fishY, fishSize * 0.25, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制鱼嘴
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(fishX + fishSize * 0.65, fishY, fishSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制鱼眼
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(fishX + fishSize * 0.45, fishY - fishSize * 0.05, fishSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(fishX + fishSize * 0.48, fishY - fishSize * 0.05, fishSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制鱼尾
                ctx.fillStyle = '#FF9800';
                ctx.beginPath();
                ctx.moveTo(fishX - fishSize * 0.6, fishY);
                ctx.lineTo(fishX - fishSize * 1, fishY - fishSize * 0.4);
                ctx.lineTo(fishX - fishSize * 1, fishY + fishSize * 0.4);
                ctx.closePath();
                ctx.fill();
                
                // 绘制鱼鳍
                ctx.fillStyle = '#FFA726';
                // 背鳍
                ctx.beginPath();
                ctx.moveTo(fishX + fishSize * 0.2, fishY - fishSize * 0.3);
                ctx.lineTo(fishX - fishSize * 0.2, fishY - fishSize * 0.6);
                ctx.lineTo(fishX - fishSize * 0.3, fishY - fishSize * 0.3);
                ctx.closePath();
                ctx.fill();
                // 胸鳍
                ctx.beginPath();
                ctx.moveTo(fishX + fishSize * 0.3, fishY + fishSize * 0.1);
                ctx.lineTo(fishX + fishSize * 0.5, fishY + fishSize * 0.4);
                ctx.lineTo(fishX + fishSize * 0.2, fishY + fishSize * 0.3);
                ctx.closePath();
                ctx.fill();
                
                // 添加鱼尾拖尾效果
                for (let i = 0; i < 5; i++) {
                    const trailAlpha = 0.5 - i * 0.1;
                    const trailOffset = i * 3;
                    ctx.fillStyle = `rgba(255, 152, 0, ${trailAlpha})`;
                    ctx.beginPath();
                    ctx.moveTo(fishX - fishSize * 0.6 - trailOffset, fishY);
                    ctx.quadraticCurveTo(
                        fishX - fishSize * 0.8 - trailOffset,
                        fishY - fishSize * 0.3 + Math.sin(element.animationFrame * 5 + i) * 2,
                        fishX - fishSize * 1 - trailOffset,
                        fishY
                    );
                    ctx.quadraticCurveTo(
                        fishX - fishSize * 0.8 - trailOffset,
                        fishY + fishSize * 0.3 + Math.sin(element.animationFrame * 5 + i) * 2,
                        fishX - fishSize * 0.6 - trailOffset,
                        fishY
                    );
                    ctx.closePath();
                    ctx.fill();
                }
                
                ctx.restore();
                break;
            case 'bird':
                // 飞鸟在空中飞翔
                ctx.save();
                
                // 根据飞鸟的飞翔方向调整朝向
                if (element.birdDirection < 0) {
                    ctx.scale(-1, 1);
                    ctx.translate(-element.x * 2 - element.size * 2, 0);
                }
                
                // 绘制飞鸟
                const birdX = element.x;
                const birdY = element.y;
                const birdSize = element.size;
                
                // 绘制鸟身体
                ctx.fillStyle = '#FFEB3B';
                ctx.beginPath();
                ctx.arc(birdX, birdY, birdSize * 0.4, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制鸟头
                ctx.fillStyle = '#FFEB3B';
                ctx.beginPath();
                ctx.arc(birdX + birdSize * 0.4, birdY - birdSize * 0.1, birdSize * 0.2, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制鸟嘴
                ctx.fillStyle = '#FF9800';
                ctx.beginPath();
                ctx.moveTo(birdX + birdSize * 0.55, birdY - birdSize * 0.1);
                ctx.lineTo(birdX + birdSize * 0.7, birdY - birdSize * 0.15);
                ctx.lineTo(birdX + birdSize * 0.65, birdY);
                ctx.closePath();
                ctx.fill();
                
                // 绘制鸟眼
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(birdX + birdSize * 0.45, birdY - birdSize * 0.15, birdSize * 0.05, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(birdX + birdSize * 0.47, birdY - birdSize * 0.15, birdSize * 0.02, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制翅膀（扇动动画效果，只绘制侧面一只翅膀）
                ctx.fillStyle = '#FFEB3B';
                
                // 翅膀扇动的角度，使用动画帧控制
                const wingAngle = Math.sin(element.animationFrame * 2) * Math.PI * 0.3;
                
                // 侧面翅膀（扇动效果）
                ctx.save();
                ctx.translate(birdX, birdY);
                ctx.rotate(wingAngle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(birdSize * 0.5, -birdSize * 0.4);
                ctx.lineTo(birdSize * 0.3, -birdSize * 0.1);
                ctx.closePath();
                ctx.fill();
                // 添加翅膀边缘线，使用与身体一致的颜色
                ctx.strokeStyle = '#FFEB3B';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
                
                // 绘制尾巴
                ctx.fillStyle = '#FFEB3B';
                ctx.beginPath();
                ctx.moveTo(birdX - birdSize * 0.4, birdY);
                ctx.lineTo(birdX - birdSize * 0.6, birdY - birdSize * 0.1);
                ctx.lineTo(birdX - birdSize * 0.6, birdY + birdSize * 0.1);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
                break;
            case 'seaweed':
                // 绘制海草，在水下背景的游戏屏幕底部
                ctx.fillStyle = '#4CAF50';
                
                // 海草固定在屏幕底部
                const seaweedBaseY = GAME_HEIGHT;
                const seaweedHeight = element.size * 2 * 2;
                const seaweedWidth = element.size * 0.3 * 2;
                
                // 绘制弯曲的海草
                ctx.beginPath();
                ctx.moveTo(element.x, seaweedBaseY);
                
                // 海草的弯曲路径，使用贝塞尔曲线
                const controlX1 = element.x + Math.sin(element.animationFrame * 0.3 + element.seaweedWaveOffset) * 10;
                const controlY1 = seaweedBaseY - seaweedHeight * 0.3;
                const controlX2 = element.x + Math.sin(element.animationFrame * 0.3 + element.seaweedWaveOffset + Math.PI) * 10;
                const controlY2 = seaweedBaseY - seaweedHeight * 0.7;
                const endX = element.x + Math.sin(element.animationFrame * 0.3 + element.seaweedWaveOffset + Math.PI * 2) * 5;
                const endY = seaweedBaseY - seaweedHeight;
                
                ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
                
                // 绘制海草的宽度
                const seaweedWidthVariation = Math.sin(element.animationFrame * 0.3 + element.seaweedWaveOffset) * 2;
                ctx.lineTo(endX + seaweedWidth + seaweedWidthVariation, endY);
                
                // 回程路径
                const controlX3 = element.x + Math.sin(element.animationFrame * 0.3 + element.seaweedWaveOffset + Math.PI) * 10 + seaweedWidth;
                const controlY3 = seaweedBaseY - seaweedHeight * 0.7;
                const controlX4 = element.x + Math.sin(element.animationFrame * 0.3 + element.seaweedWaveOffset) * 10 + seaweedWidth;
                const controlY4 = seaweedBaseY - seaweedHeight * 0.3;
                
                ctx.bezierCurveTo(controlX3, controlY3, controlX4, controlY4, element.x + seaweedWidth, seaweedBaseY);
                ctx.closePath();
                ctx.fill();
                
                // 添加海草的纹理
                ctx.strokeStyle = '#388E3C';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(element.x, seaweedBaseY);
                ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
                ctx.stroke();
                
                // 添加海草的分支
                ctx.strokeStyle = '#388E3C';
                ctx.lineWidth = 1;
                
                // 左侧分支
                ctx.beginPath();
                ctx.moveTo(element.x + seaweedWidth * 0.2, seaweedBaseY - seaweedHeight * 0.2);
                ctx.lineTo(element.x - seaweedWidth * 1.5, seaweedBaseY - seaweedHeight * 0.4);
                ctx.stroke();
                
                // 右侧分支
                ctx.beginPath();
                ctx.moveTo(element.x + seaweedWidth * 0.8, seaweedBaseY - seaweedHeight * 0.3);
                ctx.lineTo(element.x + seaweedWidth * 2, seaweedBaseY - seaweedHeight * 0.5);
                ctx.stroke();
                
                // 顶部分支
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX + seaweedWidth, endY - seaweedWidth * 1.5);
                ctx.stroke();
                
                break;
        }
        
        ctx.restore();
    }
}

// 播放收集宝石音效
function playCollectSound() {
    // 使用Web Audio API生成清脆的叮咚声
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // 创建振荡器
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // 连接节点
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 设置音效参数 - 更清脆的叮咚声
    oscillator.type = 'triangle'; // 三角波更清脆
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime); // 更高的起始频率
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2); // 更短的滑音时间
    
    // 设置音量 - 更短促的声音
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    // 播放音效
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2); // 更短的持续时间
}

// 播放碰撞音效
function playCollisionSound() {
    // 这里可以添加音效播放代码
    // 例如：const audio = new Audio('collision.mp3'); audio.play();
}

// 初始化游戏
window.onload = initGame;