<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>MotoRacer - Retro Pseudo-3D Motosiklet Yarış Oyunu</title>
    <link rel="stylesheet" href="style.css">
    <!-- Google Fonts: Orbitron for futuristic HUD, Outfit for UI -->
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
</head>
<body>
    <div id="game-container">
        <!-- Canvas for Pseudo-3D Game Rendering -->
        <canvas id="game-canvas"></canvas>
        <!-- Dynamic Parallax Starry Sky Canvas Background (For menus) -->
        <canvas id="bg-canvas"></canvas>
        <!-- ==================== SPLASH & START MENU ==================== -->
        <div id="start-menu" class="overlay active">
            <div class="menu-content">
                <div class="logo-container">
                    <h1 class="game-title">MOTO<span class="highlight">RACER</span></h1>
                    <p class="game-subtitle">RETRO HYPER DRIVE</p>
                </div>
                <div class="menu-buttons">
                    <button id="btn-start" class="btn-primary">YARIŞA BAŞLA</button>
                    <button id="btn-garage" class="btn-secondary">GARAJ</button>
                    <button id="btn-help" class="btn-secondary">NASIL OYNANIR?</button>
                </div>
            </div>
        </div>
        <!-- ==================== GARAGE / BIKE SELECT ==================== -->
        <div id="garage-menu" class="overlay hidden">
            <div class="menu-content garage-content">
                <h2>MOTOSİKLET SEÇİMİ</h2>
                <div class="garage-showcase">
                    <div class="bike-preview-box">
                        <img id="garage-bike-img" src="src/assets/bike_red_straight.jpg" alt="Motosiklet Önizleme">
                    </div>
                    <div class="bike-specs">
                        <h3>ÖZELLİKLER</h3>
                        <div class="spec-bar">
                            <span class="spec-label">Maks. Hız</span>
                            <div class="bar-container"><div id="spec-speed" class="bar-fill" style="width: 80%;"></div></div>
                        </div>
                        <div class="spec-bar">
                            <span class="spec-label">Hızlanma</span>
                            <div class="bar-container"><div id="spec-accel" class="bar-fill" style="width: 75%;"></div></div>
                        </div>
                        <div class="spec-bar">
                            <span class="spec-label">Yol Tutuş</span>
                            <div class="bar-container"><div id="spec-handling" class="bar-fill" style="width: 85%;"></div></div>
                        </div>
                    </div>
                </div>
                <div class="bike-selector">
                    <button class="bike-opt active" data-color="red" style="--btn-color: #ff3838;">KIRMIZI</button>
                    <button class="bike-opt" data-color="blue" style="--btn-color: #3867ff;">MAVİ</button>
                    <button class="bike-opt" data-color="green" style="--btn-color: #38ff67;">YEŞİL</button>
                    <button class="bike-opt" data-color="purple" style="--btn-color: #b538ff;">SİBER MOR</button>
                </div>
                <div class="menu-buttons">
                    <button id="btn-garage-back" class="btn-secondary">GERİ</button>
                    <button id="btn-garage-select" class="btn-primary">SEÇ VE DEVAM ET</button>
                </div>
            </div>
        </div>
        <!-- ==================== TRACK SELECT ==================== -->
        <div id="track-menu" class="overlay hidden">
            <div class="menu-content track-content">
                <h2>PİST SEÇİMİ</h2>
                <div class="track-list">
                    <div class="track-card active" data-track="0">
                        <div class="track-img-container">
                            <img src="src/assets/levels.png" class="track-sprite" style="object-position: 0 0;" alt="Pist 1">
                        </div>
                        <div class="track-info">
                            <h3>SAHİL YOLU (KOLAY)</h3>
                            <p>Uzun düzlükler ve yumuşak virajlar.</p>
                        </div>
                    </div>
                    <div class="track-card" data-track="1">
                        <div class="track-img-container">
                            <img src="src/assets/levels.png" class="track-sprite" style="object-position: 0 -20%;" alt="Pist 2">
                        </div>
                        <div class="track-info">
                            <h3>DAĞ GEÇİDİ (ORTA)</h3>
                            <p>Keskin virajlar ve ani iniş çıkışlar.</p>
                        </div>
                    </div>
                    <div class="track-card" data-track="2">
                        <div class="track-img-container">
                            <img src="src/assets/levels.png" class="track-sprite" style="object-position: 0 -40%;" alt="Pist 3">
                        </div>
                        <div class="track-info">
                            <h3>METROPOL (ZOR)</h3>
                            <p>Dar sokaklar ve ardışık ters virajlar.</p>
                        </div>
                    </div>
                </div>
                <div class="menu-buttons">
                    <button id="btn-track-back" class="btn-secondary">GERİ</button>
                    <button id="btn-track-start" class="btn-primary">YARIŞI BAŞLAT</button>
                </div>
            </div>
        </div>
        <!-- ==================== GAMEPLAY HUD ==================== -->
        <div id="hud" class="hidden">
            <div class="hud-top">
                <div class="hud-box" id="hud-time">
                    <span class="hud-title">ZAMAN</span>
                    <span class="hud-value font-hud" id="time-val">00:00:00</span>
                </div>
                <div class="hud-box" id="hud-pos">
                    <span class="hud-title">POZİSYON</span>
                    <span class="hud-value font-hud" id="pos-val">1/8</span>
                </div>
                <div class="hud-box" id="hud-lap">
                    <span class="hud-title">TUR</span>
                    <span class="hud-value font-hud" id="lap-val">1/3</span>
                </div>
            </div>
            <!-- Custom Speedometer Overlay (Analog & Digital) -->
            <div class="hud-bottom-right">
                <div class="speedometer-container">
                    <canvas id="speedometer-canvas" width="160" height="160"></canvas>
                    <div class="digital-speed">
                        <span id="speed-num" class="font-hud">0</span>
                        <span class="speed-unit">KM/H</span>
                    </div>
                </div>
            </div>
            <!-- Virtual Controls for Mobile Devices -->
            <div id="mobile-controls" class="hidden">
                <div class="control-left">
                    <button id="btn-left" class="ctrl-btn">◀</button>
                    <button id="btn-right" class="ctrl-btn">▶</button>
                </div>
                <div class="control-right">
                    <button id="btn-brake" class="ctrl-btn btn-red">FREN</button>
                    <button id="btn-gas" class="ctrl-btn btn-green">GAZ</button>
                </div>
            </div>
        </div>
        <!-- ==================== HELP MODAL ==================== -->
        <div id="help-modal" class="overlay hidden">
            <div class="menu-content help-content">
                <h2>NASIL OYNANIR?</h2>
                <div class="help-text">
                    <p><strong>Yön Tuşları (veya WASD):</strong> Direksiyonu Kontrol Eder.</p>
                    <ul>
                        <li><span class="key">▲</span> / <span class="key">W</span> : Gaz (Hızlanma)</li>
                        <li><span class="key">▼</span> / <span class="key">S</span> : Fren / Geri</li>
                        <li><span class="key">◀</span> / <span class="key">A</span> : Sola Yatış / Dönüş</li>
                        <li><span class="key">▶</span> / <span class="key">D</span> : Sağa Yatış / Dönüş</li>
                    </ul>
                    <p>Pistteki virajlara girerken hızınızı ayarlamayı unutmayın! Yoldan çıkarsanız çimler sizi yavaşlatır.</p>
                </div>
                <button id="btn-help-close" class="btn-primary">KAPAT</button>
            </div>
        </div>
        <!-- ==================== GAME OVER / SUCCESS SCREEN ==================== -->
        <div id="game-over" class="overlay hidden">
            <div class="menu-content results-content">
                <h2 id="result-title">OYNATILDI</h2>
                <div class="results-stats">
                    <div class="stat-row">
                        <span>Toplam Süre:</span>
                        <span id="result-time" class="font-hud">-</span>
                    </div>
                    <div class="stat-row">
                        <span>En İyi Tur:</span>
                        <span id="result-best-lap" class="font-hud">-</span>
                    </div>
                    <div class="stat-row">
                        <span>Pozisyon:</span>
                        <span id="result-pos" class="font-hud">-</span>
                    </div>
                    <div class="stat-row">
                        <span>Kazanılan Skor:</span>
                        <span id="result-score" class="font-hud">-</span>
                    </div>
                </div>
                <div class="menu-buttons">
                    <button id="btn-retry" class="btn-primary">TEKRAR DENE</button>
                    <button id="btn-menu" class="btn-secondary">ANA MENÜ</button>
                </div>
            </div>
        </div>
    </div>
    <!-- Script imports -->
    <script src="src/player.js"></script>
    <script src="src/track.js"></script>
    <script src="src/game.js"></script>
</body>
</html>
