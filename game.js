// Основные переменные
let scene, camera, renderer, world;
let player, weapon, bullets = [];
let ammo = 30, totalAmmo = 90, health = 100;
let isGameStarted = false;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let playerVelocity = new THREE.Vector3();
let playerDirection = new THREE.Vector3();
let moveForward = false, moveBackward = false;
let moveLeft = false, moveRight = false;
let canJump = true;
let clock = new THREE.Clock();
let sounds = {};
let enemies = [];
let kills = 0;

// Инициализация игры
async function init() {
    // Загрузка звуков
    loadSounds();
    
    // Сцена
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x999999, 0.002);
    
    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    resetPlayerPosition();
    
    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Физический мир
    world = new CANNON.World();
    world.gravity.set(0, -20, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    
    // Освещение
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Небо
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
    
    // Создание карты
    await createMap();
    
    // Создание оружия
    await createWeapon();
    
    // Создание врагов
    createEnemies(5);
    
    // Обработчики событий
    setupEventListeners();
    
    // Начальное состояние HUD
    updateHUD();
}

function resetPlayerPosition() {
    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
}

function loadSounds() {
    sounds = {
        shoot: new Howl({ src: ['https://assets.codepen.io/21542/howler-gunshot.mp3'], volume: 0.5 }),
        reload: new Howl({ src: ['https://assets.codepen.io/21542/howler-reload.mp3'], volume: 0.3 }),
        empty: new Howl({ src: ['https://assets.codepen.io/21542/howler-empty.mp3'], volume: 0.3 }),
        hit: new Howl({ src: ['https://assets.codepen.io/21542/howler-hit.mp3'], volume: 0.4 }),
        jump: new Howl({ src: ['https://assets.codepen.io/21542/howler-jump.mp3'], volume: 0.2 }),
        footsteps: new Howl({
            src: ['https://assets.codepen.io/21542/howler-footsteps.mp3'],
            volume: 0.1,
            loop: true,
            sprite: {
                step: [0, 500]
            }
        })
    };
}

// Создание карты (улучшенная de_dust2)
async function createMap() {
    // Текстуры
    const textureLoader = new THREE.TextureLoader();
    const floorTexture = await textureLoader.loadAsync('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    
    // Пол
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Физическое тело для пола
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(floorBody);
    
    // Основные стены
    const wallTexture = await textureLoader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg');
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(4, 2);
    
    const wallGeometry = new THREE.BoxGeometry(80, 10, 2);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        roughness: 0.7
    });
    
    // Длинные стены
    const longWall1 = new THREE.Mesh(wallGeometry, wallMaterial);
    longWall1.position.set(0, 5, -40);
    longWall1.castShadow = true;
    scene.add(longWall1);
    
    const longWall2 = new THREE.Mesh(wallGeometry, wallMaterial);
    longWall2.position.set(0, 5, 40);
    longWall2.castShadow = true;
    scene.add(longWall2);
    
    // Короткие стены
    const shortWallGeometry = new THREE.BoxGeometry(2, 10, 80);
    
    const shortWall1 = new THREE.Mesh(shortWallGeometry, wallMaterial);
    shortWall1.position.set(-40, 5, 0);
    shortWall1.castShadow = true;
    scene.add(shortWall1);
    
    const shortWall2 = new THREE.Mesh(shortWallGeometry, wallMaterial);
    shortWall2.position.set(40, 5, 0);
    shortWall2.castShadow = true;
    scene.add(shortWall2);
    
    // Добавляем физические тела для стен
    [longWall1, longWall2, shortWall1, shortWall2].forEach(wall => {
        const size = wall.geometry.parameters;
        const wallShape = new CANNON.Box(new CANNON.Vec3(
            size.width / 2,
            size.height / 2,
            size.depth / 2
        ));
        const wallBody = new CANNON.Body({ mass: 0 });
        wallBody.addShape(wallShape);
        wallBody.position.copy(wall.position);
        world.addBody(wallBody);
    });
    
    // Бомбовая площадка A
    createBombSite(-20, 0, 15, 15, 0x00ff00);
    
    // Бомбовая площадка B
    createBombSite(20, 0, -15, 15, 0xff0000);
    
    // Несколько коробок и препятствий
    const boxTexture = await textureLoader.loadAsync('https://threejs.org/examples/textures/crate.gif');
    
    const createBox = (x, z, width = 2, height = 2, depth = 2) => {
        const boxGeometry = new THREE.BoxGeometry(width, height, depth);
        const boxMaterial = new THREE.MeshStandardMaterial({ 
            map: boxTexture,
            roughness: 0.9
        });
        
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(x, height/2, z);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        
        // Физическое тело для коробки
        const boxShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const boxBody = new CANNON.Body({ mass: 0 });
        boxBody.addShape(boxShape);
        boxBody.position.copy(box.position);
        world.addBody(boxBody);
        
        return box;
    };
    
    // Создаем несколько коробок в рандомных местах
    const boxPositions = [
        [10, 10], [-10, 10], [15, -15], [-15, -15],
        [5, 20], [-5, -20], [25, 5], [-25, -5]
    ];
    
    boxPositions.forEach(pos => {
        createBox(pos[0], pos[1], 3, 2, 3);
    });
    
    // Большая коробка в середине
    createBox(0, 0, 10, 4, 10);
}

function createBombSite(x, z, sizeX, sizeZ, color) {
    const geometry = new THREE.PlaneGeometry(sizeX, sizeZ);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, 0.01, z);
    scene.add(plane);
    
    // Добавляем маркер
    const markerGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
    const markerMaterial = new THREE.MeshStandardMaterial({ color: color });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, 0.1, z);
    scene.add(marker);
}

// Создание оружия (AK-47 с улучшенной моделью)
async function createWeapon() {
    const weaponGroup = new THREE.Group();
    
    // Загрузка текстур
    const textureLoader = new THREE.TextureLoader();
    const metalTexture = await textureLoader.loadAsync('https://threejs.org/examples/textures/metal/metalplate_base.jpg');
    const woodTexture = await textureLoader.loadAsync('https://threejs.org/examples/textures/wood/wood_base.jpg');
    
    // Ствол
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 32);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
        map: metalTexture,
        roughness: 0.3,
        metalness: 0.8
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.4, -0.1, -0.5);
    
    // Корпус
    const bodyGeometry = new THREE.BoxGeometry(0.7, 0.15, 0.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        map: metalTexture,
        roughness: 0.4,
        metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, -0.05, -0.5);
    
    // Приклад
    const stockGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.5);
    const stockMaterial = new THREE.MeshStandardMaterial({ 
        map: woodTexture,
        roughness: 0.9
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(-0.15, 0, -0.5);
    
    // Магазин
    const magazineGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.4);
    const magazineMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.5
    });
    const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
    magazine.position.set(0, -0.15, -0.3);
    
    // Прицел
    const sightGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.1);
    const sightMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.set(0.45, 0, -0.5);
    
    weaponGroup.add(barrel);
    weaponGroup.add(body);
    weaponGroup.add(stock);
    weaponGroup.add(magazine);
    weaponGroup.add(sight);
    
    weaponGroup.position.set(0.5, -0.3, -1);
    camera.add(weaponGroup);
    weapon = weaponGroup;
}

// Создание врагов
function createEnemies(count) {
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const enemy = new THREE.Mesh(geometry, material);
        
        // Позиционируем врагов в случайных местах карты
        enemy.position.set(
            Math.random() * 60 - 30,
            0.9,
            Math.random() * 60 - 30
        );
        
        enemy.castShadow = true;
        scene.add(enemy);
        
        // Добавляем физическое тело
        const enemyShape = new CANNON.Box(new CANNON.Vec3(0.4, 0.9, 0.4));
        const enemyBody = new CANNON.Body({ mass: 1 });
        enemyBody.addShape(enemyShape);
        enemyBody.position.copy(enemy.position);
        world.addBody(enemyBody);
        
        enemies.push({
            mesh: enemy,
            body: enemyBody,
            health: 100,
            speed: 2 + Math.random() * 2
        });
    }
}

// Стрельба
function shoot() {
    if (ammo <= 0) {
        sounds.empty.play();
        return;
    }
    
    ammo--;
    updateHUD();
    sounds.shoot.play();
    
    // Создание пули
    raycaster.setFromCamera(mouse, camera);
    const bulletDirection = raycaster.ray.direction.clone().normalize();
    
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Начальная позиция пули перед стволом
    const startPosition = camera.position.clone().add(
        bulletDirection.multiplyScalar(1.5)
    );
    bulletMesh.position.copy(startPosition);
    
    scene.add(bulletMesh);
    
    // Физическое тело для пули
    const bulletShape = new CANNON.Sphere(0.05);
    const bulletBody = new CANNON.Body({
        mass: 0.1,
        shape: bulletShape,
        velocity: new CANNON.Vec3(
            bulletDirection.x * 100,
            bulletDirection.y * 100,
            bulletDirection.z * 100
        )
    });
    bulletBody.position.copy(startPosition);
    bulletBody.linearDamping = 0;
    world.addBody(bulletBody);
    
    bullets.push({
        mesh: bulletMesh,
        body: bulletBody,
        direction: bulletDirection.clone(),
        lifetime: 100
    });
    
    // Проверка попадания
    checkHit(bulletDirection);
    
    // Анимация отдачи
    weapon.position.z += 0.1;
    weapon.rotation.x += 0.1;
    setTimeout(() => {
        weapon.position.z -= 0.1;
        weapon.rotation.x -= 0.1;
    }, 100);
}

// Проверка попадания
function checkHit(direction) {
    // Проверяем попадание во врагов
    const origin = camera.position.clone();
    const farPoint = origin.clone().add(direction.clone().multiplyScalar(1000));
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);
        
        if (enemyBox.containsPoint(origin) || 
            raycaster.ray.intersectBox(enemyBox, new THREE.Vector3())) {
            // Попадание во врага
            enemy.health -= 25;
            sounds.hit.play();
            
            if (enemy.health <= 0) {
                // Уничтожение врага
                scene.remove(enemy.mesh);
                world.removeBody(enemy.body);
                enemies.splice(i, 1);
                kills++;
                addKillMessage('Вы убили врага');
                
                // Создаем нового врага через некоторое время
                setTimeout(() => {
                    createEnemies(1);
                }, 5000);
            }
            
            break;
        }
    }
}

// Перезарядка
function reload() {
    if (totalAmmo <= 0 || ammo === 30) return;
    
    const needed = 30 - ammo;
    const available = Math.min(needed, totalAmmo);
    
    sounds.reload.play();
    
    // Анимация перезарядки
    weapon.rotation.x = -0.5;
    setTimeout(() => {
        weapon.rotation.x = 0;
        ammo += available;
        totalAmmo -= available;
        updateHUD();
    }, 1000);
}

// Обновление HUD
function updateHUD() {
    document.getElementById('ammo').textContent = `${ammo} / ${totalAmmo}`;
    document.getElementById('health-text').textContent = `${health} HP`;
    document.getElementById('health-fill').style.width = `${health}%`;
}

// Добавление сообщения в kill feed
function addKillMessage(message) {
    const killFeed = document.getElementById('kill-feed');
    const killMessage = document.createElement('div');
    killMessage.className = 'kill-message';
    killMessage.textContent = message;
    killFeed.appendChild(killMessage);
    
    // Ограничиваем количество сообщений
    if (killFeed.children.length > 5) {
        killFeed.removeChild(killFeed.children[0]);
    }
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        if (killMessage.parentNode) {
            killFeed.removeChild(killMessage);
        }
    }, 5000);
}

// Обработчики событий
function setupEventListeners() {
    document.getElementById('play-btn').addEventListener('click', startGame);
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('exit-btn').addEventListener('click', exitGame);
    
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('click', onMouseClick, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
}

function onMouseMove(event) {
    if (!isGameStarted) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Ограничиваем движение камеры по вертикали
    const currentRotation = camera.rotation.x;
    const targetRotation = currentRotation - (event.movementY * 0.002);
    
    camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotation));
    camera.rotation.y -= event.movementX * 0.002;
}

function onMouseClick(event) {
    if (!isGameStarted) return;
    if (event.button === 0) { // ЛКМ
        shoot();
    }
}

function onMouseDown(event) {
    if (!isGameStarted) return;
    if (event.button === 2) { // ПКМ
        // Прицеливание
        weapon.position.z = -1.2;
        camera.fov = 45;
        camera.updateProjectionMatrix();
    }
}

function onKeyDown(event) {
    if (!isGameStarted) return;
    
    switch(event.key.toLowerCase()) {
        case 'r':
            reload();
            break;
        case 'w':
            moveForward = true;
            sounds.footsteps.play('step');
            break;
        case 'a':
            moveLeft = true;
            sounds.footsteps.play('step');
            break;
        case 's':
            moveBackward = true;
            sounds.footsteps.play('step');
            break;
        case 'd':
            moveRight = true;
            sounds.footsteps.play('step');
            break;
        case ' ':
            if (canJump) {
                playerVelocity.y = 10;
                canJump = false;
                sounds.jump.play();
            }
            break;
        case 'shift':
            // Бег
            break;
        case 'ctrl':
            // Приседание
            camera.position.y = 1.0;
            break;
    }
}

function onKeyUp(event) {
    switch(event.key.toLowerCase()) {
        case 'w':
            moveForward = false;
            sounds.footsteps.stop();
            break;
        case 'a':
            moveLeft = false;
            sounds.footsteps.stop();
            break;
        case 's':
            moveBackward = false;
            sounds.footsteps.stop();
            break;
        case 'd':
            moveRight = false;
            sounds.footsteps.stop();
            break;
        case 'ctrl':
            camera.position.y = 1.6;
            break;
        case 'shift':
            // Остановка бега
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function showSettings() {
    alert('Настройки будут добавлены в следующей версии!');
}

function exitGame() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        window.close();
    }
}

// Запуск игры
function startGame() {
    document.getElementById('menu').style.display = 'none';
    isGameStarted = true;
    updateHUD();
    
    // Захват указателя
    renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || 
                                           renderer.domElement.mozRequestPointerLock || 
                                           renderer.domElement.webkitRequestPointerLock;
    renderer.domElement.requestPointerLock();
    
    animate();
}

// Игровой цикл
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Движение игрока
    playerVelocity.x -= playerVelocity.x * 10.0 * delta;
    playerVelocity.z -= playerVelocity.z * 10.0 * delta;
    
    playerDirection.z = Number(moveForward) - Number(moveBackward);
    playerDirection.x = Number(moveRight) - Number(moveLeft);
    playerDirection.normalize();
    
    if (moveForward || moveBackward) {
        playerVelocity.z -= playerDirection.z * 10.0 * delta;
    }
    if (moveLeft || moveRight) {
        playerVelocity.x -= playerDirection.x * 10.0 * delta;
    }
    
    camera.translateX(playerVelocity.x * delta);
    camera.translateZ(playerVelocity.z * delta);
    
    // Гравитация
    playerVelocity.y -= 9.8 * delta;
    camera.position.y += playerVelocity.y * delta;
    
    // Проверка нахождения на земле
    if (camera.position.y < 1.6) {
        camera.position.y = 1.6;
        playerVelocity.y = 0;
        canJump = true;
    }
    
    // Обновление физики
    world.step(1/60);
    
    // Обновление пуль
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.mesh.position.copy(bullet.body.position);
        bullet.lifetime--;
        
        if (bullet.lifetime <= 0) {
            scene.remove(bullet.mesh);
            world.removeBody(bullet.body);
            bullets.splice(i, 1);
        }
    }
    
    // ИИ врагов
    updateEnemies(delta);
    
    renderer.render(scene, camera);
}

// Обновление поведения врагов
function updateEnemies(delta) {
    enemies.forEach(enemy => {
        // Простое преследование игрока
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, enemy.mesh.position).normalize();
        
        const moveSpeed = enemy.speed * delta;
        enemy.body.velocity.x = direction.x * moveSpeed;
        enemy.body.velocity.z = direction.z * moveSpeed;
        
        // Обновление позиции модели
        enemy.mesh.position.copy(enemy.body.position);
        
        // Проверка столкновения с игроком
        if (enemy.mesh.position.distanceTo(camera.position) < 1.5) {
            health -= 1 * delta * 10;
            updateHUD();
            
            if (health <= 0) {
                health = 0;
                updateHUD();
                alert(`Игра окончена! Убито врагов: ${kills}`);
                resetGame();
            }
        }
    });
}

function resetGame() {
    health = 100;
    ammo = 30;
    totalAmmo = 90;
    kills = 0;
    resetPlayerPosition();
    
    // Удаляем всех врагов
    enemies.forEach(enemy => {
        scene.remove(enemy.mesh);
        world.removeBody(enemy.body);
    });
    enemies = [];
    
    // Создаем новых врагов
    createEnemies(5);
    
    updateHUD();
}

// Инициализация при загрузке
window.onload = init;
