// Инициализация сцены, камеры и рендерера
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB); // Цвет неба
document.body.appendChild(renderer.domElement);

// Управление от первого лица
const controls = new THREE.FirstPersonControls(camera, renderer.domElement);
controls.movementSpeed = 5;
controls.lookSpeed = 0.1;
controls.lookVertical = true;

// Позиция камеры
camera.position.y = 1.6; // Высота глаз персонажа
camera.position.z = 5;

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 5);
scene.add(directionalLight);

// Создание карты Dust 2
function createMap() {
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // коричневый цвет земли
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Стены и здания (упрощенная версия Dust 2)
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xC0C0C0, 
        roughness: 0.7 
    });

    // Длинная стена (как на Dust 2)
    const longWallGeometry = new THREE.BoxGeometry(30, 5, 0.5);
    const longWall = new THREE.Mesh(longWallGeometry, wallMaterial);
    longWall.position.set(0, 2.5, -15);
    scene.add(longWall);

    // Короткие стены
    const shortWallGeometry = new THREE.BoxGeometry(10, 5, 0.5);
    const shortWall1 = new THREE.Mesh(shortWallGeometry, wallMaterial);
    shortWall1.position.set(-10, 2.5, -5);
    shortWall1.rotation.y = Math.PI / 2;
    scene.add(shortWall1);

    const shortWall2 = new THREE.Mesh(shortWallGeometry, wallMaterial);
    shortWall2.position.set(10, 2.5, -5);
    shortWall2.rotation.y = Math.PI / 2;
    scene.add(shortWall2);

    // Бомба А (упрощенная)
    const bombASpot = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.2, 3),
        new THREE.MeshStandardMaterial({ color: 0xFF0000 })
    );
    bombASpot.position.set(-5, 0.1, -10);
    scene.add(bombASpot);

    // Бомба B (упрощенная)
    const bombBSpot = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.2, 3),
        new THREE.MeshStandardMaterial({ color: 0x0000FF })
    );
    bombBSpot.position.set(5, 0.1, -10);
    scene.add(bombBSpot);

    // Туннель (упрощенный)
    const tunnelGeometry = new THREE.BoxGeometry(5, 3, 10);
    const tunnel = new THREE.Mesh(tunnelGeometry, wallMaterial);
    tunnel.position.set(0, 1.5, 10);
    scene.add(tunnel);
}

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
    renderer.render(scene, camera);
}

animate();
