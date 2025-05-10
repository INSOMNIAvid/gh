// Основной класс игры
class CSGOGame {
    constructor() {
        this.initGame();
        this.initPhysics();
        this.initWorld();
        this.initPlayer();
        this.initWeapons();
        this.initEnemies();
        this.initUI();
        this.initAudio();
        this.initEventListeners();
        
        this.gameLoop();
    }
    
    initGame() {
        // Настройки игры
        this.gameState = 'menu'; // menu, playing, paused, gameover
        this.score = 0;
        this.roundTime = 120; // 2 минуты на раунд
        
        // Создание Three.js сцены
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);
        
        // Камера
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.y = 1.7;
        
        // Рендерер
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Часы для отслеживания времени
        this.clock = new THREE.Clock();
        
        // Переменные управления
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            shift: false
        };
        
        this.mouse = {
            x: 0,
            y: 0,
            isShooting: false
        };
        
        // Физические параметры
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.82, 0);
        this.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
        this.physicsWorld.solver.iterations = 10;
        
        // Массивы объектов
        this.bullets = [];
        this.enemies = [];
        this.weapons = [];
        this.decals = [];
        this.particles = [];
    }
    
    initPhysics() {
        // Материалы для физики
        this.groundMaterial = new CANNON.Material("groundMaterial");
        this.playerMaterial = new CANNON.Material("playerMaterial");
        this.enemyMaterial = new CANNON.Material("enemyMaterial");
        
        // Контакты материалов
        const ground_player = new CANNON.ContactMaterial(
            this.groundMaterial,
            this.playerMaterial,
            { friction: 0.5, restitution: 0.3 }
        );
        
        const ground_enemy = new CANNON.ContactMaterial(
            this.groundMaterial,
            this.enemyMaterial,
            { friction: 0.5, restitution: 0.3 }
        );
        
        this.physicsWorld.addContactMaterial(ground_player);
        this.physicsWorld.addContactMaterial(ground_enemy);
    }
    
    initWorld() {
        // Освещение
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Небо
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        
        // Пол (Dust2)
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundTexture = new THREE.TextureLoader().load('assets/textures/dust2_ground.jpg');
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(10, 10);
        
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: groundTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);
        
        // Физическое тело для пола
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({
            mass: 0,
            shape: groundShape,
            material: this.groundMaterial
        });
        this.groundBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            -Math.PI / 2
        );
        this.physicsWorld.addBody(this.groundBody);
        
        // Стены и объекты карты
        this.createMapObjects();
    }
    
    createMapObjects() {
        // Создание стен Dust2
        const wallTexture = new THREE.TextureLoader().load('assets/textures/wall_concrete.jpg');
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(4, 4);
        
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            map: wallTexture,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Дальняя стена
        this.createWall(0, 5, -100, 200, 10, 2, wallMaterial);
        
        // Боковые стены
        this.createWall(-100, 5, 0, 2, 10, 200, wallMaterial);
        this.createWall(100, 5, 0, 2, 10, 200, wallMaterial);
        
        // Ближняя стена
        this.createWall(0, 5, 100, 200, 10, 2, wallMaterial);
        
        // Коробки на карте
        this.createBox(-30, 2.5, -30, 5, 5, 5); // Коробка A
        this.createBox(30, 2.5, -30, 5, 5, 5); // Коробка B
        this.createBox(0, 2.5, 0, 10, 5, 5); // Ящики на миду
        this.createBox(-50, 2.5, -50, 8, 8, 8); // Угловая коробка
        this.createBox(50, 2.5, -50, 8, 8, 8); // Угловая коробка
    }
    
    createWall(x, y, z, width, height, depth, material) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(x, y, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        
        // Физическое тело для стены
        const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(x, y, z)
        });
        this.physicsWorld.addBody(body);
        
        return wall;
    }
    
    createBox(x, y, z, width, height, depth) {
        const texture = new THREE.TextureLoader().load('assets/textures/box_wood.jpg');
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        const material = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const box = new THREE.Mesh(geometry, material);
        box.position.set(x, y, z);
        box.castShadow = true;
        box.receiveShadow = true;
        this.scene.add(box);
        
        // Физическое тело для коробки
        const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(x, y, z)
        });
        this.physicsWorld.addBody(body);
        
        return box;
    }
    
    initPlayer() {
        // Параметры игрока
        this.player = {
            health: 100,
            armor: 100,
            speed: 4,
            runSpeed: 6,
            jumpForce: 7,
            isJumping: false,
            isRunning: false,
            canShoot: true,
            lastShotTime: 0,
            lastHitTime: 0,
            weapons: [],
            currentWeaponIndex: 0,
            body: null,
            mesh: null
        };
        
        // Физическое тело игрока
        const radius = 0.3;
        const height = 1.7;
        const playerShape = new CANNON.Cylinder(
            radius, 
            radius, 
            height, 
            8
        );
        
        this.player.body = new CANNON.Body({
            mass: 5,
            shape: playerShape,
            position: new CANNON.Vec3(0, 2, 0),
            material: this.playerMaterial,
            fixedRotation: true
        });
        
        this.physicsWorld.addBody(this.player.body);
        
        // Модель игрока (простая)
        const playerGeometry = new THREE.CylinderGeometry(
            radius, 
            radius, 
            height, 
            8
        );
        const playerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FF00,
            wireframe: true,
            visible: false // Скрываем, так как это вид от первого лица
        });
        
        this.player.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.player.mesh.position.copy(this.player.body.position);
        this.player.mesh.quaternion.copy(this.player.body.quaternion);
        this.scene.add(this.player.mesh);
        
        // Камера прикреплена к игроку
        this.camera.position.y = height - 0.1;
        this.player.mesh.add(this.camera);
        
        // Инициализация оружия
        this.initPlayerWeapons();
    }
    
    initPlayerWeapons() {
        // Доступное оружие
        this.player.weapons = [
            {
                name: "knife",
                damage: 35,
                ammo: Infinity,
                maxAmmo: Infinity,
                fireRate: 500,
                reloadTime: 0,
                range: 1.5,
                img: "assets/weapons/knife.png",
                model: this.createWeaponModel(0x333333, 0.3, 0.1, 0.02)
            },
            {
                name: "deagle",
                damage: 50,
                ammo: 7,
                maxAmmo: 35,
                fireRate: 800,
                reloadTime: 1500,
                range: 100,
                img: "assets/weapons/deagle.png",
                model: this.createWeaponModel(0x333333, 0.5, 0.2, 0.1)
            },
            {
                name: "m4a4",
                damage: 20,
                ammo: 30,
                maxAmmo: 90,
                fireRate: 500,
                reloadTime: 1800,
                range: 200,
                img: "assets/weapons/m4a4.png",
                model: this.createWeaponModel(0x333333, 0.7, 0.3, 0.1)
            },
            {
                name: "ak47",
                damage: 25,
                ammo: 30,
                maxAmmo: 90,
                fireRate: 600,
                reloadTime: 2000,
                range: 200,
                img: "assets/weapons/ak47.png",
                model: this.createWeaponModel(0x333333, 0.8, 0.3, 0.1)
            },
            {
                name: "awp",
                damage: 100,
                ammo: 10,
                maxAmmo: 30,
                fireRate: 1500,
                reloadTime: 2500,
                range: 500,
                img: "assets/weapons/awp.png",
                model: this.createWeaponModel(0x333333, 1.2, 0.4, 0.1)
            }
        ];
        
        // Прикрепляем модели оружия к камере
        this.player.weapons.forEach(weapon => {
            weapon.model.position.set(0.5, -0.2, -0.5);
            this.camera.add(weapon.model);
            weapon.model.visible = false;
        });
        
        // Устанавливаем текущее оружие (AK-47)
        this.player.currentWeaponIndex = 3;
        this.player.weapons[this.player.currentWeaponIndex].model.visible = true;
    }
    
    createWeaponModel(color, length, width, height) {
        const group = new THREE.Group();
        
        // Основная часть оружия
        const geometry = new THREE.BoxGeometry(length, width, height);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
        
        // Ствол
        const barrelGeometry = new THREE.CylinderGeometry(
            0.03, 
            0.03, 
            length * 0.7, 
            8
        );
        barrelGeometry.rotateZ(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeometry, material);
        barrel.position.set(length * 0.35, 0, 0);
        group.add(barrel);
        
        // Приклад
        const stockGeometry = new THREE.BoxGeometry(
            length * 0.3, 
            width * 1.5, 
            height * 1.5
        );
        const stock = new THREE.Mesh(stockGeometry, material);
        stock.position.set(-length * 0.35, 0, 0);
        group.add(stock);
        
        return group;
    }
    
    initEnemies() {
        // Точки появления врагов
        const spawnPoints = [
            { x: -30, z: -80 }, // Точка A
            { x: 30, z: -80 },  // Точка B
            { x: -80, z: -30 }, // Точка A длинная
            { x: 80, z: -30 },  // Точка B длинная
            { x: 0, z: -90 }    // Мид
        ];
        
        // Создаем врагов
        spawnPoints.forEach(point => {
            this.createEnemy(point.x, point.z);
        });
    }
    
    createEnemy(x, z) {
        const enemy = {
            health: 100,
            speed: 0.02,
            damage: 5,
            attackRate: 1000,
            lastAttackTime: 0,
            body: null,
            mesh: null
        };
        
        // Физическое тело врага
        const radius = 0.3;
        const height = 1.8;
        const enemyShape = new CANNON.Cylinder(
            radius, 
            radius, 
            height, 
            8
        );
        
        enemy.body = new CANNON.Body({
            mass: 5,
            shape: enemyShape,
            position: new CANNON.Vec3(x, height/2, z),
            material: this.enemyMaterial,
            fixedRotation: true
        });
        
        this.physicsWorld.addBody(enemy.body);
        
        // Модель врага
        const enemyGeometry = new THREE.CylinderGeometry(
            radius, 
            radius, 
            height, 
            8
        );
        const enemyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000,
            roughness: 0.7,
            metalness: 0.3
        });
        
        enemy.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemy.mesh.castShadow = true;
        enemy.mesh.receiveShadow = true;
        this.scene.add(enemy.mesh);
        
        this.enemies.push(enemy);
    }
    
    initUI() {
        // Кнопки меню
        document.getElementById('start-game').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('controls').addEventListener('click', () => {
            alert("Управление:\nWASD - Движение\nSPACE - Прыжок\nSHIFT - Бег\n1-5 - Смена оружия\nЛКМ - Стрельба\nR - Перезарядка");
        });
        
        document.getElementById('exit-game').addEventListener('click', () => {
            if (confirm("Вы уверены, что хотите выйти?")) {
                window.close();
            }
        });
        
        // Обработчики выбора оружия
        document.querySelectorAll('.weapon-option').forEach((option, index) => {
            option.addEventListener('click', () => {
                this.selectWeapon(index);
            });
        });
    }
    
    initAudio() {
        // Звуки будут загружаться по мере необходимости
        this.audio = {
            shots: {
                ak47: new Audio('assets/sounds/ak47_shot.mp3'),
                m4a4: new Audio('assets/sounds/m4a4_shot.mp3'),
                awp: new Audio('assets/sounds/awp_shot.mp3'),
                deagle: new Audio('assets/sounds/deagle_shot.mp3'),
                knife: new Audio('assets/sounds/knife_slash.mp3')
            },
            reloads: {
                ak47: new Audio('assets/sounds/ak47_reload.mp3'),
                m4a4: new Audio('assets/sounds/m4a4_reload.mp3'),
                awp: new Audio('assets/sounds/awp_reload.mp3'),
                deagle: new Audio('assets/sounds/deagle_reload.mp3')
            },
            hits: {
                body: new Audio('assets/sounds/hit_body.mp3'),
                head: new Audio('assets/sounds/hit_head.mp3')
            },
            other: {
                jump: new Audio('assets/sounds/jump.mp3'),
                damage: new Audio('assets/sounds/player_damage.mp3'),
                death: new Audio('assets/sounds/player_death.mp3')
            }
        };
        
        // Устанавливаем громкость
        Object.values(this.audio.shots).forEach(sound => sound.volume = 0.3);
        Object.values(this.audio.reloads).forEach(sound => sound.volume = 0.4);
        Object.values(this.audio.hits).forEach(sound => sound.volume = 0.5);
        Object.values(this.audio.other).forEach(sound => sound.volume = 0.5);
    }
    
    initEventListeners() {
        // Обработчики клавиатуры
        document.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;
            
            switch(e.key.toLowerCase()) {
                case 'w': this.keys.w = true; break;
                case 'a': this.keys.a = true; break;
                case 's': this.keys.s = true; break;
                case 'd': this.keys.d = true; break;
                case ' ': this.keys.space = true; break;
                case 'shift': this.keys.shift = true; break;
                case 'r': this.reloadWeapon(); break;
                case '1': this.selectWeapon(0); break;
                case '2': this.selectWeapon(1); break;
                case '3': this.selectWeapon(2); break;
                case '4': this.selectWeapon(3); break;
                case '5': this.selectWeapon(4); break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': this.keys.w = false; break;
                case 'a': this.keys.a = false; break;
                case 's': this.keys.s = false; break;
                case 'd': this.keys.d = false; break;
                case ' ': this.keys.space = false; break;
                case 'shift': this.keys.shift = false; break;
            }
        });
        
        // Обработчики мыши
        document.addEventListener('mousedown', (e) => {
            if (this.gameState !== 'playing') return;
            
            if (e.button === 0) { // ЛКМ
                this.mouse.isShooting = true;
                this.shoot();
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.isShooting = false;
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            
            if (this.gameState === 'playing') {
                // Вращение игрока (горизонтальное)
                this.player.body.angularVelocity.y = -e.movementX * 0.0005;
                
                // Наклон камеры (вертикальное)
                const camera = this.camera;
                camera.rotation.x -= e.movementY * 0.002;
                camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camera.rotation.x));
            }
        });
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('game-menu').style.display = 'none';
        document.body.requestPointerLock = 
            document.body.requestPointerLock || 
            document.body.mozRequestPointerLock ||
            document.body.webkitRequestPointerLock;
        document.body.requestPointerLock();
        
        // Сброс параметров игрока
        this.player.health = 100;
        this.player.armor = 100;
        this.updateUI();
    }
    
    selectWeapon(index) {
        if (index < 0 || index >= this.player.weapons.length) return;
        
        // Скрываем текущее оружие
        this.player.weapons[this.player.currentWeaponIndex].model.visible = false;
        
        // Устанавливаем новое оружие
        this.player.currentWeaponIndex = index;
        this.player.weapons[index].model.visible = true;
        
        // Обновляем HUD
        this.updateWeaponHUD();
    }
    
    updateWeaponHUD() {
        const weapon = this.player.weapons[this.player.currentWeaponIndex];
        document.getElementById('current-weapon-img').src = weapon.img;
        document.getElementById('ammo-display').textContent = 
            weapon.ammo === Infinity ? '∞' : `${weapon.ammo}/${weapon.maxAmmo}`;
        
        // Обновляем выделение оружия
        document.querySelectorAll('.weapon-option').forEach((option, i) => {
            option.classList.toggle('selected', i === this.player.currentWeaponIndex);
        });
    }
    
    shoot() {
        const now = Date.now();
        const weapon = this.player.weapons[this.player.currentWeaponIndex];
        
        // Проверяем, можно ли стрелять
        if (!this.player.canShoot || weapon.ammo <= 0) {
            if (weapon.ammo === 0) {
                this.reloadWeapon();
            }
            return;
        }
        
        // Проверяем скорострельность
        if (now - this.player.lastShotTime < weapon.fireRate) {
            return;
        }
        
        this.player.lastShotTime = now;
        this.player.canShoot = false;
        weapon.ammo--;
        
        // Проигрываем звук выстрела
        this.audio.shots[weapon.name].currentTime = 0;
        this.audio.shots[weapon.name].play();
        
        // Анимация отдачи
        this.weaponRecoil();
        
        // Создаем пулю
        this.createBullet();
        
        // Обновляем HUD
        this.updateWeaponHUD();
        
        // Автоматическая стрельба для автоматического оружия
        if (weapon.fireRate < 500 && this.mouse.isShooting) {
            setTimeout(() => {
                this.player.canShoot = true;
                if (this.mouse.isShooting) {
                    this.shoot();
                }
            }, weapon.fireRate);
        } else {
            setTimeout(() => {
                this.player.canShoot = true;
            }, weapon.fireRate);
        }
    }
    
    weaponRecoil() {
        const weaponModel = this.player.weapons[this.player.currentWeaponIndex].model;
        
        // Анимация отдачи
        gsap.to(weaponModel.position, {
            z: weaponModel.position.z + 0.1,
            duration: 0.05,
            yoyo: true,
            repeat: 1
        });
        
        gsap.to(weaponModel.rotation, {
            x: weaponModel.rotation.x + 0.2,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });
    }
    
    createBullet() {
        const weapon = this.player.weapons[this.player.currentWeaponIndex];
        
        // Направление пули
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        
        // Добавляем случайное отклонение для реалистичности
        const spread = (5 - weapon.fireRate / 200) * 0.01;
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.normalize();
        
        // Создаем луч для проверки попадания
        const raycaster = new THREE.Raycaster();
        raycaster.set(this.camera.position, direction);
        
        // Проверяем пересечения
        const intersects = raycaster.intersectObjects(
            this.enemies.map(enemy => enemy.mesh)
        );
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const enemy = this.enemies.find(e => e.mesh === intersect.object);
            
            if (enemy) {
                // Наносим урон
                this.hitEnemy(enemy, intersect.point, weapon.damage);
                
                // Создаем декаль попадания
                this.createDecal(intersect.point, intersect.face.normal);
            }
        }
        
        // Создаем эффект дульного вспышки
        this.createMuzzleFlash();
    }
    
    hitEnemy(enemy, hitPoint, damage) {
        // Определяем попадание в голову (верхняя часть модели)
        const isHeadshot = hitPoint.y > enemy.body.position.y + 0.5;
        const totalDamage = isHeadshot ? damage * 2 : damage;
        
        enemy.health -= totalDamage;
        
        // Проигрываем звук попадания
        const hitSound = isHeadshot ? this.audio.hits.head : this.audio.hits.body;
        hitSound.currentTime = 0;
        hitSound.play();
        
        // Показываем маркер попадания
        this.showHitMarker(isHeadshot);
        
        // Создаем эффект крови
        this.createBloodEffect(hitPoint, isHeadshot);
        
        // Проверяем, убит ли враг
        if (enemy.health <= 0) {
            this.killEnemy(enemy);
        }
    }
    
    showHitMarker(isHeadshot) {
        const hitMarker = document.getElementById('hit-marker');
        hitMarker.style.opacity = '1';
        hitMarker.style.transform = 'translate(-50%, -50%) scale(1.5)';
        
        if (isHeadshot) {
            hitMarker.querySelector('line').style.stroke = '#ff0000';
        }
        
        setTimeout(() => {
            hitMarker.style.opacity = '0';
            hitMarker.style.transform = 'translate(-50%, -50%) scale(1)';
            
            if (isHeadshot) {
                setTimeout(() => {
                    hitMarker.querySelector('line').style.stroke = '#ffffff';
                }, 200);
            }
        }, 200);
    }
    
    createBloodEffect(position, isHeadshot) {
        // Создаем частицы крови
        const particleCount = isHeadshot ? 30 : 15;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 0.1 + 0.05;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x8A0303,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            // Случайное направление
            const angle = Math.random() * Math.PI * 2;
            const power = isHeadshot ? Math.random() * 0.3 + 0.2 : Math.random() * 0.2 + 0.1;
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.sin(angle) * power,
                    Math.random() * power,
                    Math.cos(angle) * power
                ),
                lifetime: 0
            };
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        this.particles.push(particles);
    }
    
    createDecal(position, normal) {
        // Создаем декаль (след от пули)
        const decalSize = new THREE.Vector3(0.1, 0.1, 0.1);
        const decalMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const decal = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            decalMaterial
        );
        
        decal.position.copy(position);
        decal.lookAt(
            position.x + normal.x,
            position.y + normal.y,
            position.z + normal.z
        );
        
        decal.translateZ(0.01); // Немного сдвигаем от поверхности
        this.scene.add(decal);
        this.decals.push(decal);
    }
    
    createMuzzleFlash() {
        // Создаем вспышку от выстрела
        const flash = new THREE.PointLight(0xFF6600, 2, 0.5);
        flash.position.set(0.5, -0.2, -0.8);
        this.camera.add(flash);
        
        // Анимация вспышки
        gsap.to(flash, {
            intensity: 0,
            duration: 0.1,
            onComplete: () => {
                this.camera.remove(flash);
            }
        });
    }
    
    killEnemy(enemy) {
        // Увеличиваем счет
        this.score++;
        
        // Удаляем врага
        this.physicsWorld.removeBody(enemy.body);
        this.scene.remove(enemy.mesh);
        this.enemies = this.enemies.filter(e => e !== enemy);
        
        // Обновляем счетчик врагов
        document.getElementById('enemy-count').textContent = this.enemies.length;
        
        // Добавляем сообщение в kill feed
        this.addKillMessage("Вы убили врага");
        
        // Проверяем окончание игры
        if (this.enemies.length === 0) {
            this.endGame(true);
        }
    }
    
    addKillMessage(message) {
        const killFeed = document.getElementById('kill-feed');
        const killMessage = document.createElement('div');
        killMessage.className = 'kill-message';
        killMessage.textContent = message;
        killFeed.appendChild(killMessage);
        
        // Удаляем сообщение через 5 секунд
        setTimeout(() => {
            killMessage.style.opacity = '0';
            setTimeout(() => {
                killFeed.removeChild(killMessage);
            }, 300);
        }, 5000);
        
        // Ограничиваем количество сообщений
        if (killFeed.children.length > 5) {
            killFeed.removeChild(killFeed.children[0]);
        }
    }
    
    reloadWeapon() {
        const weapon = this.player.weapons[this.player.currentWeaponIndex];
        
        // Проверяем, нужно ли перезаряжать
        if (weapon.ammo === weapon.maxAmmo || weapon.name === 'knife') {
            return;
        }
        
        this.player.canShoot = false;
        document.getElementById('ammo-display').textContent = 'Reloading...';
        
        // Проигрываем звук перезарядки
        this.audio.reloads[weapon.name].currentTime = 0;
        this.audio.reloads[weapon.name].play();
        
        // Анимация перезарядки
        const weaponModel = weapon.model;
        gsap.to(weaponModel.rotation, {
            x: weaponModel.rotation.x + Math.PI / 3,
            duration: weapon.reloadTime / 2000,
            yoyo: true,
            onComplete: () => {
                weapon.ammo = weapon.maxAmmo;
                this.player.canShoot = true;
                this.updateWeaponHUD();
            }
        });
    }
    
    updatePlayer(deltaTime) {
        const body = this.player.body;
        const velocity = body.velocity;
        const speed = this.keys.shift ? this.player.runSpeed : this.player.speed;
        
        // Движение вперед/назад
        if (this.keys.w || this.keys.s) {
            const forward = new CANNON.Vec3();
            body.vectorToWorldFrame(new CANNON.Vec3(0, 0, -1), forward);
            forward.normalize();
            forward.y = 0;
            
            const moveSpeed = this.keys.w ? speed : -speed * 0.7;
            velocity.x += forward.x * moveSpeed * deltaTime;
            velocity.z += forward.z * moveSpeed * deltaTime;
        }
        
        // Движение влево/вправо
        if (this.keys.a || this.keys.d) {
            const right = new CANNON.Vec3();
            body.vectorToWorldFrame(new CANNON.Vec3(1, 0, 0), right);
            right.normalize();
            right.y = 0;
            
            const moveSpeed = this.keys.d ? speed : -speed;
            velocity.x += right.x * moveSpeed * deltaTime * 0.8;
            velocity.z += right.z * moveSpeed * deltaTime * 0.8;
        }
        
        // Прыжок
        if (this.keys.space && !this.player.isJumping) {
            velocity.y = this.player.jumpForce;
            this.player.isJumping = true;
            this.audio.other.jump.currentTime = 0;
            this.audio.other.jump.play();
        }
        
        // Ограничение скорости
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const maxSpeed = this.keys.shift ? this.player.runSpeed : this.player.speed;
        
        if (horizontalSpeed > maxSpeed) {
            const ratio = maxSpeed / horizontalSpeed;
            velocity.x *= ratio;
            velocity.z *= ratio;
        }
        
        // Трение
        velocity.x *= 0.9;
        velocity.z *= 0.9;
        
        // Обновляем позицию модели игрока
        this.player.mesh.position.copy(body.position);
        this.player.mesh.quaternion.copy(body.quaternion);
    }
    
    updateEnemies(deltaTime) {
        const now = Date.now();
        const playerPos = this.player.body.position;
        
        this.enemies.forEach(enemy => {
            const enemyPos = enemy.body.position;
            
            // Движение к игроку
            const direction = new CANNON.Vec3();
            direction.x = playerPos.x - enemyPos.x;
            direction.z = playerPos.z - enemyPos.z;
            direction.normalize();
            
            enemy.body.velocity.x = direction.x * enemy.speed * 100 * deltaTime;
            enemy.body.velocity.z = direction.z * enemy.speed * 100 * deltaTime;
            
            // Враг смотрит на игрока
            enemy.body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(0, 1, 0),
                Math.atan2(
                    playerPos.x - enemyPos.x,
                    playerPos.z - enemyPos.z
                )
            );
            
            // Обновляем позицию модели врага
            enemy.mesh.position.copy(enemy.body.position);
            enemy.mesh.quaternion.copy(enemy.body.quaternion);
            
            // Атака игрока
            const distance = enemyPos.distanceTo(playerPos);
            if (distance < 2 && now - enemy.lastAttackTime > enemy.attackRate) {
                enemy.lastAttackTime = now;
                this.playerDamage(enemy.damage);
            }
        });
    }
    
    playerDamage(amount) {
        if (this.player.armor > 0) {
            const armorDamage = amount * 0.7;
            const healthDamage = amount * 0.3;
            
            this.player.armor = Math.max(0, this.player.armor - armorDamage);
            this.player.health = Math.max(0, this.player.health - healthDamage);
        } else {
            this.player.health = Math.max(0, this.player.health - amount);
        }
        
        // Проигрываем звук получения урона
        this.audio.other.damage.currentTime = 0;
        this.audio.other.damage.play();
        
        // Эффект крови на экране
        this.showBloodEffect();
        
        // Обновляем HUD
        this.updateUI();
        
        // Проверяем смерть игрока
        if (this.player.health <= 0) {
            this.endGame(false);
        }
    }
    
    showBloodEffect() {
        const bloodEffect = document.getElementById('blood-effect');
        bloodEffect.style.background = 'rgba(255,0,0,0.5)';
        
        setTimeout(() => {
            bloodEffect.style.background = 'rgba(255,0,0,0)';
        }, 300);
    }
    
    updateUI() {
        document.getElementById('health-value').textContent = Math.round(this.player.health);
        document.getElementById('armor-value').textContent = Math.round(this.player.armor);
        document.getElementById('enemy-count').textContent = this.enemies.length;
    }
    
    updateRadar() {
        const playerPos = this.player.body.position;
        const radarPlayer = document.getElementById('radar-player');
        
        // Обновляем позицию игрока на радаре
        const radarX = (playerPos.x / 200) * 60;
        const radarY = (playerPos.z / 200) * 60;
        radarPlayer.style.transform = `translate(${radarX}px, ${radarY}px)`;
        
        // Обновляем врагов на радаре
        const radarEnemies = document.getElementById('radar-enemies');
        radarEnemies.innerHTML = '';
        
        this.enemies.forEach(enemy => {
            const enemyPos = enemy.body.position;
            const enemyX = (enemyPos.x / 200) * 60;
            const enemyY = (enemyPos.z / 200) * 60;
            
            const enemyDot = document.createElement('div');
            enemyDot.className = 'radar-enemy';
            enemyDot.style.left = `${enemyX}px`;
            enemyDot.style.top = `${enemyY}px`;
            radarEnemies.appendChild(enemyDot);
        });
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particles = this.particles[i];
            
            particles.children.forEach(particle => {
                particle.position.x += particle.userData.velocity.x * deltaTime * 60;
                particle.position.y += particle.userData.velocity.y * deltaTime * 60;
                particle.position.z += particle.userData.velocity.z * deltaTime * 60;
                
                particle.userData.velocity.y -= 0.01 * deltaTime * 60;
                particle.userData.lifetime += deltaTime;
                
                if (particle.userData.lifetime > 0.5) {
                    particle.material.opacity = 1 - (particle.userData.lifetime - 0.5) * 2;
                }
            });
            
            if (particles.children[0]?.userData.lifetime > 1.5) {
                this.scene.remove(particles);
                this.particles.splice(i, 1);
            }
        }
    }
    
    cleanupDecals() {
        if (this.decals.length > 20) {
            const decal = this.decals.shift();
            this.scene.remove(decal);
        }
    }
    
    endGame(isWin) {
        this.gameState = 'gameover';
        
        if (isWin) {
            alert(`Поздравляем! Вы победили!\nВаш счет: ${this.score}`);
        } else {
            this.audio.other.death.currentTime = 0;
            this.audio.other.death.play();
            alert(`Игра окончена!\nВаш счет: ${this.score}`);
        }
        
        document.exitPointerLock = 
            document.exitPointerLock || 
            document.mozExitPointerLock ||
            document.webkitExitPointerLock;
        document.exitPointerLock();
        
        document.getElementById('game-menu').style.display = 'flex';
    }
    
    gameLoop() {
        const deltaTime = this.clock.getDelta();
        
        if (this.gameState === 'playing') {
            // Обновляем физику
            this.physicsWorld.step(1/60, deltaTime, 3);
            
            // Обновляем игрока
            this.updatePlayer(deltaTime);
            
            // Обновляем врагов
            this.updateEnemies(deltaTime);
            
            // Обновляем частицы
            this.updateParticles(deltaTime);
            
            // Обновляем радар
            this.updateRadar();
            
            // Очищаем старые декали
            this.cleanupDecals();
            
            // Автоматическая стрельба
            if (this.mouse.isShooting) {
                this.shoot();
            }
        }
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
        
        // Продолжаем цикл
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запускаем игру при загрузке страницы
window.addEventListener('load', () => {
    const game = new CSGOGame();
});
