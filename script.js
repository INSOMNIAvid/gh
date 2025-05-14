// Инициализация сцены, камеры и рендерера
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x87CEEB); // Цвет неба
document.body.appendChild(renderer.domElement);

// Физика
let physics;
const initPhysics = async () => {
    physics = await AmmoPhysics();
    return physics;
};

// Управление от первого лица
const controls = new THREE.FirstPersonControls(camera, renderer.domElement);
controls.movementSpeed = 5;
controls.lookSpeed = 0.1;
controls.lookVertical = true;
controls.noFly = true;

// Позиция камеры
camera.position.set(0, 1.6, 10);

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Текстуры
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(10, 10);

const wallTexture = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(4, 2);

// Создание карты Dust 2
function createMap() {
    // Земля
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        map: groundTexture,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Материалы
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        roughness: 0.7 
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0xAAAAAA,
        metalness: 0.8,
        roughness: 0.4
    });

    // Основные стены (внешний периметр)
    createWall(-25, 2.5, 0, 50, 5, 1, 0); // Нижняя стена
    createWall(25, 2.5, 0, 50, 5, 1, Math.PI/2); // Правая стена
    createWall(0, 2.5, 25, 50, 5, 1, 0); // Верхняя стена
    createWall(-25, 2.5, 0, 50, 5, 1, Math.PI/2); // Левая стена

    // Точка A
    createWall(-15, 2.5, -15, 20, 5, 1, Math.PI/4);
    createBombSite(-20, 0.1, -20, 5, 0xFF0000, 'A');

    // Точка B
    createWall(15, 2.5, -15, 20, 5, 1, -Math.PI/4);
    createBombSite(20, 0.1, -20, 5, 0x0000FF, 'B');

    // Туннель
    createTunnel(0, 1.5, 10, 5, 3, 10);

    // Двери
    createDoor(-10, 0, -5, 2, 4, 0.5);
    createDoor(10, 0, -5, 2, 4, 0.5);

    // Ящики
    createBox(-5, 0.5, 5, 2, 1, 2);
    createBox(5, 0.5, 5, 2, 1, 2);
    createBox(-15, 0.5, -10, 2, 1, 2);
    createBox(15, 0.5, -10, 2, 1, 2);

    // Оружие (модель)
    createWeapon(0, 1, 0);
}

function createWall(x, y, z, width, height, depth, rotationY) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        roughness: 0.7 
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, z);
    wall.rotation.y = rotationY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    
    // Добавляем физику
    if (physics) {
        physics.addMesh(wall, 0); // 0 = статический объект
    }
}

function createBombSite(x, y, z, size, color, letter) {
    const geometry = new THREE.CylinderGeometry(size/2, size/2, 0.1, 32);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const bombSite = new THREE.Mesh(geometry, material);
    bombSite.position.set(x, y, z);
    bombSite.rotation.x = Math.PI / 2;
    scene.add(bombSite);

    // Текст с буквой
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.font = '100px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshStandardMaterial({ 
        map: texture,
        transparent: true
    });
    const textGeometry = new THREE.PlaneGeometry(size/2, size/2);
    const text = new THREE.Mesh(textGeometry, textMaterial);
    text.position.set(x, y + 0.11, z);
    text.rotation.x = -Math.PI / 2;
    scene.add(text);
}

function createTunnel(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        roughness: 0.9
    });
    const tunnel = new THREE.Mesh(geometry, material);
    tunnel.position.set(x, y, z);
    tunnel.castShadow = true;
    tunnel.receiveShadow = true;
    scene.add(tunnel);
    
    if (physics) {
        physics.addMesh(tunnel, 0);
    }
}

function createDoor(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8
    });
    const door = new THREE.Mesh(geometry, material);
    door.position.set(x, y + height/2, z);
    door.castShadow = true;
    door.receiveShadow = true;
    scene.add(door);
    
    if (physics) {
        physics.addMesh(door, 0);
    }
}

function createBox(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8
    });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(x, y + height/2, z);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
    
    if (physics) {
        physics.addMesh(box, 0);
    }
}

function createWeapon(x, y, z) {
    // Упрощенная модель оружия
    const geometry = new THREE.BoxGeometry(1, 0.3, 0.1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.4
    });
    const weapon = new THREE.Mesh(geometry, material);
    weapon.position.set(x, y, z);
    weapon.castShadow = true;
    scene.add(weapon);
    
    // Можно заменить на загрузку GLTF модели
    // new GLTFLoader().load('ak47.glb', function(gltf) {
    //     const model = gltf.scene;
    //     model.position.set(x, y, z);
    //     model.scale.set(0.5, 0.5, 0.5);
    //     scene.add(model);
    // });
}

// Инициализация и анимация
initPhysics().then(() => {
    createMap();
    
    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        controls.handleResize();
    });

    // Анимация
    function animate() {
        requestAnimationFrame(animate);
        controls.update(0.016); // deltaTime примерно 60 FPS
        if (physics) physics.update();
        renderer.render(scene, camera);
    }

    animate();
});

// Обработка стрельбы
window.addEventListener('click', () => {
    // Эффект выстрела
    const shootEffect = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
    );
    shootEffect.position.copy(camera.position);
    scene.add(shootEffect);
    
    // Удаляем через 100мс
    setTimeout(() => {
        scene.remove(shootEffect);
    }, 100);
    
    // Обновляем HUD
    document.getElementById('ammo').textContent = 'Ammo: 29/90';
});
