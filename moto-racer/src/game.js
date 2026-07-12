/**
 * Ana Oyun Yönetim ve Döngü Sınıfı
 */
document.addEventListener("DOMContentLoaded", () => {
    const game = new Game();
});

class Game {
    constructor() {
        // Ekran Elemanları
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        
        this.speedCanvas = document.getElementById("speedometer-canvas");
        this.speedCtx = this.speedCanvas.getContext("2d");

        // Boyutlandırma
        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());

        // Modüller
        this.player = new Player();
        this.track = new Track();

        // Oyun Durumları (State Machine)
        // states: 'start', 'garage', 'track_select', 'playing', 'game_over'
        this.state = 'start';

        // Yarış Değişkenleri
        this.timeLimit = 60.0;    // Kalan zaman (saniye)
        this.timeElapsed = 0.0;   // Geçen süre
        this.score = 0;           // Toplam puan
        this.lap = 1;             // Mevcut tur
        this.totalLaps = 3;       // Toplam tur sayısı
        this.position = 8;        // Yarış pozisyonu (8. sıradan başlar)
        this.trackId = 0;         // Seçilen pist
        
        // AI Yarışçılar (Pozisyon simülasyonu için Z koordinatları)
        this.opponents = [];

        // Girdi Yönetimi
        this.input = { forward: false, backward: false, left: false, right: false };
        this.setupInput();

        // Arayüz Bağlantıları ve Butonlar
        this.setupUI();

        // Parallax yıldızlı arka plan animasyon döngüsü (Menüler için)
        this.menuBgOffset = 0;
        this.setupMenuBg();

        // Zaman Farkı Hesaplama (Delta Time)
        this.lastTime = 0;
        
        // Oyun döngüsünü başlat
        requestAnimationFrame((t) => this.loop(t));
    }

    // Ekranı pencere boyutuna göre ayarla
    resizeCanvas() {
        const container = document.getElementById("game-container");
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        // Mobil Algılama
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
        const mobileControls = document.getElementById("mobile-controls");
        if (this.isMobile) {
            mobileControls.classList.remove("hidden");
        } else {
            mobileControls.classList.add("hidden");
        }
    }

    setupInput() {
        // Klavye Kontrolleri
        const handleKey = (e, val) => {
            switch(e.key.toLowerCase()) {
                case 'arrowup':    case 'w': this.input.forward = val; break;
                case 'arrowdown':  case 's': this.input.backward = val; break;
                case 'arrowleft':  case 'a': this.input.left = val; break;
                case 'arrowright': case 'd': this.input.right = val; break;
            }
        };

        window.addEventListener("keydown", (e) => handleKey(e, true));
        window.addEventListener("keyup", (e) => handleKey(e, false));

        // Sanal Buton Kontrolleri (Mobil Cihazlar İçin)
        const setupTouchBtn = (id, action) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            
            const startHandler = (e) => {
                e.preventDefault();
                this.input[action] = true;
            };
            const endHandler = (e) => {
                e.preventDefault();
                this.input[action] = false;
            };

            btn.addEventListener("touchstart", startHandler);
            btn.addEventListener("touchend", endHandler);
            btn.addEventListener("mousedown", startHandler);
            btn.addEventListener("mouseup", endHandler);
            btn.addEventListener("mouseleave", endHandler);
        };

        setupTouchBtn("btn-left", "left");
        setupTouchBtn("btn-right", "right");
        setupTouchBtn("btn-gas", "forward");
        setupTouchBtn("btn-brake", "backward");
    }

    setupUI() {
        // Arayüz Geçiş Fonksiyonu
        const switchScreen = (screenId) => {
            document.querySelectorAll(".overlay").forEach(s => s.classList.add("hidden"));
            document.getElementById("hud").classList.add("hidden");
            
            if (screenId === "hud") {
                document.getElementById("hud").classList.remove("hidden");
            } else {
                document.getElementById(screenId).classList.remove("hidden");
            }
        };

        // --- ANA MENÜ BUTONLARI ---
        document.getElementById("btn-start").addEventListener("click", () => {
            this.state = 'garage';
            switchScreen("garage-menu");
        });
        
        document.getElementById("btn-garage").addEventListener("click", () => {
            this.state = 'garage';
            switchScreen("garage-menu");
        });

        document.getElementById("btn-help").addEventListener("click", () => {
            document.getElementById("help-modal").classList.remove("hidden");
        });

        document.getElementById("btn-help-close").addEventListener("click", () => {
            document.getElementById("help-modal").classList.add("hidden");
        });

        // --- GARAJ BUTONLARI ---
        const previewImg = document.getElementById("garage-bike-img");
        document.querySelectorAll(".bike-opt").forEach(btn => {
            btn.addEventListener("click", (e) => {
                document.querySelectorAll(".bike-opt").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                const color = e.target.getAttribute("data-color");
                
                this.player.setColor(color);
                
                // Garaj özellik barlarını güncelle
                const spec = this.player.bikeSpecs[color];
                document.getElementById("spec-speed").style.width = `${(spec.maxSpeed / 320) * 100}%`;
                document.getElementById("spec-accel").style.width = `${(spec.accel / 8) * 100}%`;
                document.getElementById("spec-handling").style.width = `${(spec.handling / 0.07) * 100}%`;
                
                // Resim önizlemeyi güncelle
                previewImg.src = `src/assets/bike_${color}_straight.jpg`;
            });
        });

        document.getElementById("btn-garage-back").addEventListener("click", () => {
            this.state = 'start';
            switchScreen("start-menu");
        });

        document.getElementById("btn-garage-select").addEventListener("click", () => {
            this.state = 'track_select';
            switchScreen("track-menu");
        });

        // --- PİST SEÇİM BUTONLARI ---
        document.querySelectorAll(".track-card").forEach(card => {
            card.addEventListener("click", (e) => {
                const targetCard = e.currentTarget;
                document.querySelectorAll(".track-card").forEach(c => c.classList.remove("active"));
                targetCard.classList.add("active");
                this.trackId = parseInt(targetCard.getAttribute("data-track"));
            });
        });

        document.getElementById("btn-track-back").addEventListener("click", () => {
            this.state = 'garage';
            switchScreen("garage-menu");
        });

        document.getElementById("btn-track-start").addEventListener("click", () => {
            this.startRace();
            switchScreen("hud");
        });

        // --- SONUÇ BUTONLARI ---
        document.getElementById("btn-retry").addEventListener("click", () => {
            this.startRace();
            switchScreen("hud");
        });

        document.getElementById("btn-menu").addEventListener("click", () => {
            this.state = 'start';
            switchScreen("start-menu");
        });
    }

    startRace() {
        this.state = 'playing';
        this.timeLimit = 60.0;
        this.timeElapsed = 0.0;
        this.score = 0;
        this.lap = 1;
        this.position = 8;
        this.player.reset();
        
        // Pist oluştur
        this.track.buildTrack(this.trackId);

        // Rakipleri konumlandır (Farklı Z mesafelerine yerleştir)
        this.opponents = [];
        const trackLength = this.track.trackLength;
        for (let i = 0; i < 7; i++) {
            this.opponents.push({
                z: (i + 1) * (trackLength / 12) + 2000, // Z yörüngesi
                speed: 180 + Math.random() * 40,
                xOffset: (Math.random() - 0.5) * 1.5    // Yol kenarı sapması
            });
        }
    }

    // Menü arkasında akan yıldız animasyonu
    setupMenuBg() {
        const bgCanvas = document.getElementById("bg-canvas");
        const bgCtx = bgCanvas.getContext("2d");
        
        const renderMenuBg = () => {
            if (this.state !== 'playing') {
                const w = bgCanvas.width = bgCanvas.parentElement.clientWidth;
                const h = bgCanvas.height = bgCanvas.parentElement.clientHeight;
                
                // Arka plan rengi
                bgCtx.fillStyle = '#06060f';
                bgCtx.fillRect(0, 0, w, h);

                // Kayan yıldızlar
                this.menuBgOffset += 0.2;
                bgCtx.fillStyle = '#ffffff';
                for (let i = 0; i < 60; i++) {
                    const x = (i * 123 + this.menuBgOffset) % w;
                    const y = (i * 17) % h;
                    const size = (i % 3) + 1;
                    bgCtx.globalAlpha = (i % 5 + 1) / 10;
                    bgCtx.fillRect(x, y, size, size);
                }
                bgCtx.globalAlpha = 1.0;
            }
            requestAnimationFrame(renderMenuBg);
        };
        renderMenuBg();
    }

    // Ana Oyun Döngüsü
    loop(time) {
        if (!this.lastTime) this.lastTime = time;
        // Saniye cinsinden geçen süre
        let dt = (time - this.lastTime) / 1000;
        
        // Tarayıcı sekme geçişlerinde büyük dt oluşmasını engelle
        if (dt > 0.1) dt = 0.1;
        this.lastTime = time;

        if (this.state === 'playing') {
            this.update(dt);
            this.draw();
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    // Mantıksal Değişiklikler ve Hesaplamalar
    update(dt) {
        this.timeElapsed += dt;
        this.timeLimit -= dt;

        // Süre bittiğinde yarış sonu
        if (this.timeLimit <= 0) {
            this.endRace(false);
            return;
        }

        // Oyuncu segmentini bul
        const currentSegment = this.track.findSegment(this.player.z);
        
        // Oyuncuyu güncelle (Tur tamamlama kontrolü)
        const lapFinished = this.player.update(dt, this.input, this.track.trackLength, currentSegment);
        
        if (lapFinished) {
            this.lap++;
            this.timeLimit += 25.0; // Her turda ek süre kazan
            this.score += 1000;     // Tur tamamlama bonusu
            
            if (this.lap > this.totalLaps) {
                this.endRace(true);
                return;
            }
        }

        // Rakipleri (AI) Güncelle ve Pozisyon Hesapla
        let activePosition = 8;
        this.opponents.forEach(op => {
            op.z = (op.z + op.speed * 2.5 * dt) % this.track.trackLength;
            
            // Eğer oyuncu rakibin Z koordinatını geçtiyse sıra yükselir
            if (this.player.z > op.z) {
                activePosition--;
            }
        });
        this.position = activePosition;

        // Arka Plan Parallax Kaymasını Güncelle
        this.track.updateParallax(this.player.speed, this.player.x, currentSegment.curve, dt);
        
        // Puan Kazanımı (Hızla orantılı olarak her saniye skor ekle)
        if (this.player.speed > 10) {
            this.score += Math.round((this.player.speed / 10) * dt * 5);
        }

        // Arayüz Değerlerini (HUD) Güncelle
        this.updateHUD();
    }

    // Arayüz HUD Güncellemesi
    updateHUD() {
        // Zaman formatı
        const pad = (num, size) => ('00' + num).substr(-size);
        const minutes = Math.floor(this.timeLimit / 60);
        const seconds = Math.floor(this.timeLimit % 60);
        const milliseconds = Math.floor((this.timeLimit % 1) * 100);
        
        document.getElementById("time-val").innerText = `${pad(minutes, 2)}:${pad(seconds, 2)}:${pad(milliseconds, 2)}`;
        document.getElementById("pos-val").innerText = `${this.position}/8`;
        document.getElementById("lap-val").innerText = `${Math.min(this.lap, this.totalLaps)}/${this.totalLaps}`;
        document.getElementById("speed-num").innerText = Math.round(this.player.speed);

        // Hız Göstergesi Çizimi
        this.drawSpeedometer();
    }

    // Çizim İşlemleri (Canvas Rendering)
    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.clearRect(0, 0, w, h);

        // Yolu Çiz
        this.track.draw(this.ctx, w, h, this.player, this.trackId);

        // Oyuncu Motorunu Çiz
        const scale = 1.0; // Ekrana göre motor ölçekleme
        this.player.draw(this.ctx, w, h, scale);
    }

    // Özel Vektörel Hız Göstergesi Kadran Çizimi (Neon Tasarım)
    drawSpeedometer() {
        const ctx = this.speedCtx;
        const w = this.speedCanvas.width;
        const h = this.speedCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = w / 2 - 10;

        ctx.clearRect(0, 0, w, h);

        // 1. Dış Hız Göstergesi Yay Çizgisi (Koyu Arkalık)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI * 0.75, Math.PI * 2.25);
        ctx.stroke();

        // 2. Aktif Hız Göstergesi Yayı (Neon Pembe Işıma Efektli)
        const speedPercent = this.player.speed / this.player.maxSpeed;
        const targetAngle = Math.PI * 0.75 + (Math.PI * 1.5 * speedPercent);
        
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff2a5f';
        ctx.strokeStyle = '#ff2a5f';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI * 0.75, targetAngle);
        ctx.stroke();
        ctx.restore();

        // 3. Kadran Bölmeleri (Hız Kertikleri)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 10; i++) {
            const angle = Math.PI * 0.75 + (Math.PI * 1.5 * (i / 10));
            const startX = cx + Math.cos(angle) * (radius - 6);
            const startY = cy + Math.sin(angle) * (radius - 6);
            const endX = cx + Math.cos(angle) * (radius + 2);
            const endY = cy + Math.sin(angle) * (radius + 2);
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        // 4. İbre (Kırmızı Dönüş İbresi)
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';
        ctx.strokeStyle = '#00f0ff'; // Mavi neon ibre
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(targetAngle) * (radius - 12), cy + Math.sin(targetAngle) * (radius - 12));
        ctx.stroke();

        // Merkez Yuvarlağı
        ctx.fillStyle = '#06060f';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Yarış Bittiğinde Çağrılan Fonksiyon
    endRace(completedSuccessfully) {
        this.state = 'game_over';
        
        // Arayüz geçişi
        document.getElementById("hud").classList.add("hidden");
        document.getElementById("game-over").classList.remove("hidden");

        const resultTitle = document.getElementById("result-title");
        if (completedSuccessfully) {
            resultTitle.innerText = "YARIŞ TAMAMLANDI!";
            resultTitle.style.color = "var(--accent-green)";
            this.score += Math.round(this.timeLimit * 200); // Kalan zaman bonusu
        } else {
            resultTitle.innerText = "SÜRENİZ BİTTİ!";
            resultTitle.style.color = "var(--primary)";
        }

        // Süre formatı
        const pad = (num, size) => ('00' + num).substr(-size);
        const minutes = Math.floor(this.timeElapsed / 60);
        const seconds = Math.floor(this.timeElapsed % 60);
        
        document.getElementById("result-time").innerText = `${pad(minutes, 2)}:${pad(seconds, 2)}`;
        document.getElementById("result-best-lap").innerText = completedSuccessfully ? `${pad(Math.floor((this.timeElapsed / 3) / 60), 2)}:${pad(Math.floor((this.timeElapsed / 3) % 60), 2)}` : "-";
        document.getElementById("result-pos").innerText = `${this.position}. SIRADA`;
        document.getElementById("result-score").innerText = this.score;
    }
}
