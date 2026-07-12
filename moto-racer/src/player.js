/**
 * Motosiklet ve Oyuncu Fiziği Sınıfı
 */
class Player {
    constructor() {
        this.reset();
        
        // Motosiklet tipleri ve özellikleri (Hız, Hızlanma, Yol Tutuş)
        this.bikeSpecs = {
            red:    { maxSpeed: 280, accel: 6.0, handling: 0.05, label: "Ateş Kırmızısı" },
            blue:   { maxSpeed: 290, accel: 5.5, handling: 0.045, label: "Elektrik Mavisi" },
            green:  { maxSpeed: 270, accel: 7.0, handling: 0.055, label: "Asit Yeşili" },
            purple: { maxSpeed: 310, accel: 5.0, handling: 0.04, label: "Siber Mor" }
        };

        this.selectedColor = 'red';
        this.applySpecs();
        
        // Sprite görselleri
        this.sprites = {};
        this.loadSprites();
    }

    reset() {
        this.x = 0;              // Yolun ortasına göre konum (-1 sol sınır, 1 sağ sınır)
        this.y = 0;              // Dünya yüksekliği (tepeler için)
        this.z = 0;              // Yol boyu kat edilen mesafe
        this.speed = 0;          // Mevcut hız (km/s)
        this.handlingOffset = 0; // Dönüşlerde motorun yana yasma açısı (-1 tam sol, 1 tam sağ)
        this.isCrashed = false;
        this.crashTime = 0;
    }

    applySpecs() {
        const specs = this.bikeSpecs[this.selectedColor];
        this.maxSpeed = specs.maxSpeed;
        this.accel = specs.accel;
        this.handling = specs.handling;
    }

    setColor(color) {
        if (this.bikeSpecs[color]) {
            this.selectedColor = color;
            this.applySpecs();
            this.loadSprites();
        }
    }

    loadSprites() {
        this.sprites = {
            straight: new Image(),
            left: new Image(),
            right: new Image()
        };

        // Resim dosyalarının yolları
        this.sprites.straight.src = `src/assets/bike_${this.selectedColor}_straight.jpg`;
        this.sprites.left.src = `src/assets/bike_${this.selectedColor}_left.jpg`;
        this.sprites.right.src = `src/assets/bike_${this.selectedColor}_right.jpg`;

        // Hata durumunda kırmızı görsele düşme (diğer renkler henüz üretilmediyse)
        const fallbackColor = 'red';
        const handleError = (imgKey, suffix) => {
            return () => {
                if (this.selectedColor !== fallbackColor) {
                    this.sprites[imgKey].src = `src/assets/bike_${fallbackColor}_${suffix}.jpg`;
                }
            };
        };

        this.sprites.straight.onerror = handleError('straight', 'straight');
        this.sprites.left.onerror = handleError('left', 'left');
        this.sprites.right.onerror = handleError('right', 'right');
    }

    update(dt, input, trackLength, currentSegment) {
        if (this.isCrashed) {
            this.speed = Math.max(0, this.speed - 300 * dt); // Sert yavaşlama
            this.crashTime += dt;
            if (this.crashTime > 1.5) {
                this.isCrashed = false;
                this.x = 0; // Yola geri dön
            }
            return;
        }

        // --- GAZ & FREN HIZ KONTROLÜ ---
        const friction = 25; // Hava direnci/sürtünme
        
        if (input.forward) {
            // Hızlanma
            this.speed = this.speed + (this.accel * 10 - friction) * dt;
        } else if (input.backward) {
            // Fren
            this.speed = this.speed - (this.accel * 25 + friction) * dt;
        } else {
            // Boşta yavaşlama
            this.speed = this.speed - (friction * 1.5) * dt;
        }

        // Çim yavaşlatması (yoldan çıkış)
        const isOffroad = Math.abs(this.x) > 1.0;
        if (isOffroad) {
            const offroadLimit = 80; // Çimdeki max hız
            if (this.speed > offroadLimit) {
                this.speed = this.speed - 150 * dt; // Sert fren etkisi
            }
        }

        // Hız limitleri
        this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed));

        // --- DİREKSİYON & DÖNÜŞ KONTROLÜ ---
        const speedPercent = this.speed / this.maxSpeed;
        
        // Dönüş hızı motor hızına paralel değişir (çok hızlıyken veya dururken dönüş zordur)
        const steerPower = this.handling * (0.3 + 0.7 * speedPercent);

        if (input.left) {
            this.x -= steerPower * 40 * dt;
            this.handlingOffset = Math.max(-1.0, this.handlingOffset - 8 * dt);
        } else if (input.right) {
            this.x += steerPower * 40 * dt;
            this.handlingOffset = Math.min(1.0, this.handlingOffset + 8 * dt);
        } else {
            // Dönüş yapılmıyorsa motoru yavaşça dikleştir
            if (this.handlingOffset > 0) {
                this.handlingOffset = Math.max(0, this.handlingOffset - 6 * dt);
            } else if (this.handlingOffset < 0) {
                this.handlingOffset = Math.min(0, this.handlingOffset + 6 * dt);
            }
        }

        // Yolun kıvrım kuvveti (viraj merkezkaç kuvveti etkisi)
        // Eğer virajdaysak oyuncunun x pozisyonu merkezkaç ile savrulur
        if (this.speed > 0) {
            const curveStrength = currentSegment.curve;
            this.x -= curveStrength * 0.08 * speedPercent * (this.speed / 100) * dt * 30;
        }

        // İlerlemeyi güncelle (Z koordinatı)
        // Hızımıza ve zaman dilimine bağlı olarak yol boyu ilerliyoruz
        // Hızı z koordinatına eklemeden önce ölçeklendiriyoruz
        this.z += (this.speed * 2.5) * dt;

        // Pist sonuna ulaştığında başa sar veya tur tamamla
        if (this.z >= trackLength) {
            this.z -= trackLength;
            return true; // Tur bitti tetikleyicisi
        }
        
        // Çarpışma kontrolü (yol kenarındaki engellere çarpma)
        if (isOffroad && Math.abs(this.x) > 1.6) {
            // Yolun çok dışındaysa ve kenarda engel varsa çarpışma tetikle
            if (currentSegment.sprites && currentSegment.sprites.length > 0) {
                this.triggerCrash();
            }
        }

        return false;
    }

    triggerCrash() {
        if (!this.isCrashed) {
            this.isCrashed = true;
            this.crashTime = 0;
            this.speed = 10; // Hızı neredeyse sıfırla
        }
    }

    // Canvas üzerine motor çizimi
    draw(ctx, width, height, scale) {
        // Çizim boyutu ölçeklendirmesi
        const destW = 280 * scale;
        const destH = 280 * scale;
        
        // Ekranın alt ortasındaki konum (Motosiklet arkadan görünüm)
        const destX = (width / 2) - (destW / 2);
        const destY = height - destH - 10;

        let activeSprite = this.sprites.straight;
        
        // Sola veya sağa yatış spritelarını seç
        if (this.handlingOffset < -0.3) {
            activeSprite = this.sprites.left;
        } else if (this.handlingOffset > 0.3) {
            activeSprite = this.sprites.right;
        }

        if (activeSprite && activeSprite.complete && activeSprite.naturalWidth !== 0) {
            // Görseli siyah arka plandan arındırıp çizmek için Blend Mode kullanabiliriz
            // Veya canvas'ta maskeleme yapabiliriz. 
            // Burada en pratik ve performanslı yöntem: Motor görselinin siyah arka planını geçici olarak 'screen' blend moduyla transparan yapmak 
            // ya da daha iyisi piksel pikselsiz maske oluşturup çizmek.
            // Siyah arka planı transparan yapmak için "screen" blend modu retro neon oyunlarda harika çalışır!
            ctx.save();
            
            // Eğer sarsılıyorsak (kaza) titreme efekti ekle
            if (this.isCrashed) {
                ctx.translate((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
                ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            }

            // Resmi çiz (Siyah arka planlı resmi temiz çizme fonksiyonu)
            this.drawChromaKeyImage(ctx, activeSprite, destX, destY, destW, destH);
            
            ctx.restore();
        } else {
            // Yüklenene kadar basit bir vektörel motor çiz
            ctx.fillStyle = this.selectedColor;
            ctx.fillRect((width / 2) - 20, height - 120, 40, 80);
        }
    }

    // Görseldeki siyah (#000000) arka planı kesip transparan çizme fonksiyonu
    drawChromaKeyImage(ctx, img, x, y, w, h) {
        // Offscreen canvas ile siyah rengi temizleyelim
        const buffer = document.createElement('canvas');
        buffer.width = img.naturalWidth;
        buffer.height = img.naturalHeight;
        const bCtx = buffer.getContext('2d');
        bCtx.drawImage(img, 0, 0);

        try {
            const imgData = bCtx.getImageData(0, 0, buffer.width, buffer.height);
            const data = imgData.data;

            // Siyah pikselleri transparan yap (R, G, B < 35 ise)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r < 35 && g < 35 && b < 35) {
                    data[i + 3] = 0; // Alfa = 0 (Transparan)
                }
            }
            bCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(buffer, x, y, w, h);
        } catch (e) {
            // Herhangi bir güvenlik hatası durumunda (CORS vb.) normal çiz
            ctx.drawImage(img, x, y, w, h);
        }
    }
}
