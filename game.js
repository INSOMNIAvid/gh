document.addEventListener('DOMContentLoaded', function() {
    // Игровые переменные
    const player = {
        x: 0,
        y: 0,
        speed: 5,
        health: 100,
        weapons: {
            ak47: { ammo: 30, maxAmmo: 90, img: 'ak47.png' },
            awp: { ammo: 10, maxAmmo: 30, img: 'awp.png' },
            m4a4: { ammo: 30, maxAmmo: 90, img: 'm4a4.png' },
            deagle: { ammo: 7, maxAmmo: 35, img: 'deagle.png' },
            knife: { ammo: Infinity, maxAmmo: Infinity, img: 'knife.png' }
        },
        currentWeapon: 'ak47'
    };
    
    const keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false
    };
    
    // Элементы DOM
    const map = document.getElementById('map');
    const playerElement = document.getElementById('player');
    const currentWeaponImg = document.getElementById('current-weapon');
    const ammoDisplay = document.getElementById('ammo');
    const healthDisplay = document.getElementById('health-hud');
    const weaponElements = document.querySelectorAll('.weapon');
    const playerDot = document.getElementById('player-dot');
    
    // Инициализация игры
    function init() {
        updateWeaponDisplay();
        updateHealthDisplay();
        
        // Обработчики выбора оружия
        weaponElements.forEach(weapon => {
            weapon.addEventListener('click', function() {
                const weaponType = this.getAttribute('data-weapon');
                player.currentWeapon = weaponType;
                updateWeaponDisplay();
            });
        });
        
        // Обработчики клавиатуры
        document.addEventListener('keydown', function(e) {
            if (e.key.toLowerCase() in keys) {
                keys[e.key.toLowerCase()] = true;
            }
            
            // Переключение оружия цифрами
            if (e.key === '1') player.currentWeapon = 'ak47';
            if (e.key === '2') player.currentWeapon = 'awp';
            if (e.key === '3') player.currentWeapon = 'm4a4';
            if (e.key === '4') player.currentWeapon = 'deagle';
            if (e.key === '5') player.currentWeapon = 'knife';
            
            updateWeaponDisplay();
        });
        
        document.addEventListener('keyup', function(e) {
            if (e.key.toLowerCase() in keys) {
                keys[e.key.toLowerCase()] = false;
            }
        });
        
        // Обработчик стрельбы (клик мыши)
        document.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // Левая кнопка мыши
                shoot();
            }
        });
        
        // Запуск игрового цикла
        gameLoop();
    }
    
    // Игровой цикл
    function gameLoop() {
        updatePlayerPosition();
        requestAnimationFrame(gameLoop);
    }
    
    // Обновление позиции игрока
    function updatePlayerPosition() {
        if (keys.w) player.y -= player.speed;
        if (keys.s) player.y += player.speed;
        if (keys.a) player.x -= player.speed;
        if (keys.d) player.x += player.speed;
        
        // Ограничение движения (чтобы не выйти за пределы карты)
        const maxX = map.offsetWidth / 2;
        const maxY = map.offsetHeight / 2;
        player.x = Math.max(-maxX, Math.min(maxX, player.x));
        player.y = Math.max(-maxY, Math.min(maxY, player.y));
        
        // Обновление позиции карты (создает эффект движения игрока)
        map.style.transform = `translate(${player.x}px, ${player.y}px)`;
        
        // Обновление радара
        updateRadar();
    }
    
    // Обновление отображения оружия
    function updateWeaponDisplay() {
        const weapon = player.weapons[player.currentWeapon];
        currentWeaponImg.src = weapon.img;
        ammoDisplay.textContent = weapon.ammo === Infinity ? '∞' : `${weapon.ammo}/${weapon.maxAmmo}`;
        
        // Подсветка выбранного оружия
        weaponElements.forEach(el => {
            if (el.getAttribute('data-weapon') === player.currentWeapon) {
                el.style.backgroundColor = 'rgba(76, 175, 80, 0.5)';
                el.style.borderColor = 'rgba(76, 175, 80, 0.9)';
            } else {
                el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                el.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        });
    }
    
    // Обновление отображения здоровья
    function updateHealthDisplay() {
        healthDisplay.textContent = `HP: ${player.health}`;
        healthDisplay.style.color = player.health > 50 ? 'white' : 
                                  player.health > 20 ? 'orange' : 'red';
    }
    
    // Обновление радара
    function updateRadar() {
        // Просто вращаем точку игрока для имитации радара
        const angle = (Date.now() / 1000) * 360;
        playerDot.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateX(40px) rotate(-${angle}deg)`;
    }
    
    // Функция стрельбы
    function shoot() {
        const weapon = player.weapons[player.currentWeapon];
        
        if (weapon.ammo > 0) {
            weapon.ammo--;
            
            // Анимация отдачи
            currentWeaponImg.style.transform = 'translateY(5px)';
            setTimeout(() => {
                currentWeaponImg.style.transform = 'translateY(0)';
            }, 100);
            
            // Обновление боезапаса
            updateWeaponDisplay();
            
            // Звук выстрела (можно добавить)
            // new Audio('shot.mp3').play();
            
            // Проверка на попадание (здесь можно добавить логику)
        } else if (weapon.ammo === 0) {
            // Перезарядка
            weapon.ammo = weapon.maxAmmo;
            updateWeaponDisplay();
        }
    }
    
    // Запуск игры
    init();
});
