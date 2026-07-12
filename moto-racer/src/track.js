/**
 * Pseudo-3D Yol Tasarımı ve Projeksiyon Sınıfı
 */
class Track {
    constructor() {
        this.segmentLength = 200; // Her yol segmentinin uzunluğu (Z birimi)
        this.rumbleLength = 3;    // Yol kenarı kırmızı/beyaz tırtıklarının sıklığı
        this.roadWidth = 2000;    // Yolun genişliği
        this.cameraDepth = 0.8;   // Kamera bakış derinliği (focal length)
        this.drawDistance = 300;  // Çizilecek maksimum segment sayısı
        
        this.segments = [];
        this.trackLength = 0;
        
        // Parallax Arka Plan Katmanları
        this.skyOffset = 0;
        this.hillOffset = 0;
        this.treeOffset = 0;

        // Yol kenarı sprite listesi
        this.scenerySprites = {
            billboard: { xOffset: 1.5, scale: 0.6, color: '#ff2a5f' },
            tree: { xOffset: 1.6, scale: 0.8, color: '#39ff14' },
            lamp: { xOffset: 1.3, scale: 0.7, color: '#00f0ff' }
        };
    }

    // Seçilen piste göre yol üretimi (0: Sahil, 1: Dağ, 2: Metropol)
    buildTrack(trackId) {
        this.segments = [];
        
        // Yol tasarım tanımlamaları
        if (trackId === 0) {
            // SAHİL YOLU: Az virajlı, düz ve hızlı
            this.addStraight(200);
            this.addCurve(100, 2, 0); // Hafif sağa viraj
            this.addStraight(150);
            this.addCurve(80, -1.5, 10); // Tepe ve hafif sola viraj
            this.addStraight(200);
            this.addCurve(120, 3, -15); // İnişli keskin sağa viraj
            this.addStraight(300);
        } else if (trackId === 1) {
            // DAĞ GEÇİDİ: Çok tırmanmalı, inişli-çıkışlı ve virajlı
            this.addCurve(100, 3, 25);  // Tepe tırmanma, sağa viraj
            this.addCurve(80, -3, -20); // Sert iniş, sola viraj
            this.addStraight(100);
            this.addCurve(150, 4, 30);  // Yüksek tepe, sert sağa
            this.addCurve(100, -4, -30); // Sert iniş, sert sola
            this.addStraight(100);
            this.addCurve(120, 2, 10);
            this.addStraight(200);
        } else {
            // METROPOL: Kısa, ani ve ardışık keskin virajlar (S-eğrileri)
            this.addCurve(50, 4, 0);
            this.addCurve(50, -4, 0);
            this.addCurve(50, 5, 10);
            this.addCurve(50, -5, -10);
            this.addStraight(100);
            this.addCurve(80, 6, 20); // Aşırı keskin viraj ve tepe
            this.addStraight(80);
            this.addCurve(120, -5, -15);
            this.addStraight(150);
        }

        // Bitiş çizgisi segmenti
        this.segments[this.segments.length - 1].isFinish = true;
        this.trackLength = this.segments.length * this.segmentLength;
    }

    // Düz yol ekleme fonksiyonu
    addStraight(num) {
        for (let i = 0; i < num; i++) {
            this.addSegment(0, 0);
        }
    }

    // Virajlı ve engebeli yol ekleme fonksiyonu
    addCurve(num, curve, height) {
        for (let i = 0; i < num; i++) {
            // easing/yumuşak geçiş için sinüs dalgası
            const ease = Math.sin((i / num) * Math.PI / 2);
            this.addSegment(curve * ease, height * ease);
        }
    }

    // Tek bir yol segmenti oluşturma ve ekleme
    addSegment(curve, height) {
        const n = this.segments.length;
        const lastY = n > 0 ? this.segments[n - 1].p2.world.y : 0;
        
        const segment = {
            index: n,
            p1: { world: { x: 0, y: lastY, z: n * this.segmentLength }, screen: { x: 0, y: 0, w: 0 } },
            p2: { world: { x: 0, y: lastY + height, z: (n + 1) * this.segmentLength }, screen: { x: 0, y: 0, w: 0 } },
            curve: curve,
            sprites: [],
            color: {
                road: '#1e1e24',
                grass: (Math.floor(n / this.rumbleLength) % 2) ? '#101015' : '#0b0b0f', // Koyu fütüristik çim
                rumble: (Math.floor(n / this.rumbleLength) % 2) ? '#ff2a5f' : '#ffffff', // Neon pembe / beyaz kenarlar
                lane: (Math.floor(n / this.rumbleLength) % 2) ? '#00f0ff' : 'transparent' // Parlayan şerit çizgileri
            }
        };

        // Yol kenarına rastgele engeller/dekoratif nesneler yerleştirme
        if (n % 8 === 0 && Math.random() > 0.3) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const spriteType = Math.random() > 0.6 ? 'billboard' : (Math.random() > 0.5 ? 'lamp' : 'tree');
            const spec = this.scenerySprites[spriteType];
            
            segment.sprites.push({
                type: spriteType,
                xOffset: spec.xOffset * side,
                scale: spec.scale,
                color: spec.color
            });
        }

        this.segments.push(segment);
    }

    // Oyuncu hızına göre parallax arka plan kaydırma
    updateParallax(playerSpeed, playerX, currentCurve, dt) {
        const speedPercent = playerSpeed / 300;
        
        // Virajlarda ve oyuncu direksiyon kırdığında arka planı zıt yöne kaydır
        const steerFactor = playerX * 0.1;
        const curveFactor = currentCurve * 0.05;

        this.skyOffset = (this.skyOffset - (steerFactor + curveFactor) * 0.1 * dt) % 1;
        this.hillOffset = (this.hillOffset - (steerFactor + curveFactor) * 0.3 * dt) % 1;
        this.treeOffset = (this.treeOffset - (steerFactor + curveFactor) * 0.6 * dt) % 1;
    }

    // 3D nokta projeksiyonu (3D koordinatları 2D ekran koordinatlarına dönüştürme)
    project(p, cameraX, cameraY, cameraZ, width, height) {
        const worldX = p.world.x;
        const worldY = p.world.y;
        const worldZ = p.world.z;

        const transX = worldX - cameraX;
        const transY = worldY - cameraY;
        const transZ = worldZ - cameraZ;

        // Arkamızda kalan nesneleri projeksiyona dahil etme
        if (transZ <= 0) return;

        const scale = this.cameraDepth / transZ;

        p.screen.x = Math.round((width / 2) + (transX * scale * width / 2));
        p.screen.y = Math.round((height / 2) - (transY * scale * height / 2));
        p.screen.w = Math.round(scale * this.roadWidth * width / 2);
    }

    // Segmenti bulma fonksiyonu
    findSegment(z) {
        return this.segments[Math.floor(z / this.segmentLength) % this.segments.length];
    }

    // Yol kenarındaki nesnelerin (ağaçlar, tabelalar vb.) vektörel neon çizimi
    drawScenerySprite(ctx, width, height, segment, sprite, scale, destX, destY) {
        const size = 300 * sprite.scale * scale;
        const x = destX + (sprite.xOffset * scale * this.roadWidth * width / 2) - (size / 2);
        const y = destY - size;

        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = sprite.color;

        if (sprite.type === 'billboard') {
            // Reklam Tabelası
            ctx.fillStyle = '#0a0a0f';
            ctx.strokeStyle = sprite.color;
            ctx.lineWidth = Math.max(1, 3 * scale);
            ctx.fillRect(x, y, size * 1.5, size * 0.8);
            ctx.strokeRect(x, y, size * 1.5, size * 0.8);

            // Ayakları
            ctx.beginPath();
            ctx.moveTo(x + size * 0.3, y + size * 0.8);
            ctx.lineTo(x + size * 0.3, y + size);
            ctx.moveTo(x + size * 1.2, y + size * 0.8);
            ctx.lineTo(x + size * 1.2, y + size);
            ctx.stroke();

            // Neon Yazı
            ctx.fillStyle = sprite.color;
            ctx.font = `bold ${Math.max(6, 14 * scale)}px Orbitron`;
            ctx.textAlign = 'center';
            ctx.fillText("HYPER DRIVE", x + size * 0.75, y + size * 0.45);
        } else if (sprite.type === 'lamp') {
            // Sokak Lambası / Neon Işığı
            ctx.strokeStyle = sprite.color;
            ctx.lineWidth = Math.max(1, 4 * scale);
            
            ctx.beginPath();
            ctx.moveTo(x + size/2, y + size);
            ctx.lineTo(x + size/2, y + size * 0.2);
            ctx.arc(x + size/2 + size * 0.2, y + size * 0.2, size * 0.2, Math.PI, Math.PI * 1.5);
            ctx.stroke();

            // Yanan lamba kafası
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + size/2 + size * 0.2, y, size * 0.08, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Fütüristik Geometrik Ağaç
            ctx.strokeStyle = sprite.color;
            ctx.lineWidth = Math.max(1, 2 * scale);
            ctx.fillStyle = 'rgba(57, 255, 20, 0.1)';

            ctx.beginPath();
            ctx.moveTo(x + size/2, y);
            ctx.lineTo(x + size, y + size);
            ctx.lineTo(x, y + size);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Gövde
            ctx.beginPath();
            ctx.moveTo(x + size/2, y + size);
            ctx.lineTo(x + size/2, y + size * 1.2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Pseudo-3D Yolu Çizme Motoru
    draw(ctx, width, height, player, currentTrackId) {
        const startSegment = this.findSegment(player.z);
        const startPercent = (player.z % this.segmentLength) / this.segmentLength;

        // Yol tırmanma eğimine göre kamera Y yüksekliği
        const cameraY = startSegment.p1.world.y + 1500; 
        
        let maxy = height;
        let x = 0;
        let dx = -(startSegment.curve * startPercent);

        // Arka planı çiz
        this.drawBackground(ctx, width, height, currentTrackId);

        // Yol segmentlerini arkadan öne doğru projekte et ve çiz
        for (let i = 0; i < this.drawDistance; i++) {
            const segment = this.segments[(startSegment.index + i) % this.segments.length];
            const looped = segment.index < startSegment.index;
            
            const cameraZ = player.z - (looped ? this.trackLength : 0);

            // 3D projeksiyon yap
            this.project(segment.p1, player.x * this.roadWidth, cameraY, cameraZ, width, height);
            this.project(segment.p2, player.x * this.roadWidth - x, cameraY, cameraZ, width, height);

            x += dx;
            dx += segment.curve;

            // Görüş açısı dışındaysa veya ekran dışında kalıyorsa atla
            if (segment.p1.screen.y >= segment.p2.screen.y || segment.p1.screen.y >= maxy) {
                continue;
            }

            // Yol çizimi
            this.drawSegment(ctx, width, segment);
            maxy = segment.p1.screen.y;
        }

        // Nesneleri ve Kenar Sprite'larını Çiz (Önden arkaya çizilmeli ki arkadaki öndekinin altında kalsın)
        for (let i = this.drawDistance - 1; i > 0; i--) {
            const segment = this.segments[(startSegment.index + i) % this.segments.length];
            const scale = segment.p1.screen.w / this.roadWidth;
            
            segment.sprites.forEach(sprite => {
                this.drawScenerySprite(ctx, width, height, segment, sprite, scale, segment.p1.screen.x, segment.p1.screen.y);
            });

            // Bitiş çizgisi tabelası çizimi
            if (segment.isFinish) {
                const scale = segment.p1.screen.w / this.roadWidth;
                const size = 600 * scale;
                const x = segment.p1.screen.x - size/2;
                const y = segment.p1.screen.y - size * 0.8;
                
                ctx.save();
                ctx.fillStyle = '#000';
                ctx.strokeStyle = varColor('--primary');
                ctx.lineWidth = Math.max(1, 4 * scale);
                ctx.fillRect(x, y, size, size * 0.3);
                ctx.strokeRect(x, y, size, size * 0.3);

                // Ayaklar
                ctx.beginPath();
                ctx.moveTo(x + size*0.05, y + size*0.3);
                ctx.lineTo(x + size*0.05, segment.p1.screen.y);
                ctx.moveTo(x + size*0.95, y + size*0.3);
                ctx.lineTo(x + size*0.95, segment.p1.screen.y);
                ctx.stroke();

                // Yazı
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${Math.max(8, 20 * scale)}px Orbitron`;
                ctx.textAlign = 'center';
                ctx.fillText("FINISH", segment.p1.screen.x, y + size * 0.2);
                ctx.restore();
            }
        }
    }

    // Yol Şeritlerini, Kenarlarını (Rumbles) ve Çimi Çizen Fonksiyon
    drawSegment(ctx, width, segment) {
        const p1 = segment.p1.screen;
        const p2 = segment.p2.screen;

        // 1. Çim (Yol Dışı Zemin)
        ctx.fillStyle = segment.color.grass;
        ctx.fillRect(0, p2.y, width, p1.y - p2.y);

        // 2. Yol Kenar Tırtıkları (Rumbles)
        const rumbleW1 = p1.w * 0.12;
        const rumbleW2 = p2.w * 0.12;

        ctx.fillStyle = segment.color.rumble;
        // Sol Rumble
        ctx.beginPath();
        ctx.moveTo(p1.x - p1.w - rumbleW1, p1.y);
        ctx.lineTo(p1.x - p1.w, p1.y);
        ctx.lineTo(p2.x - p2.w, p2.y);
        ctx.lineTo(p2.x - p2.w - rumbleW2, p2.y);
        ctx.fill();
        // Sağ Rumble
        ctx.beginPath();
        ctx.moveTo(p1.x + p1.w, p1.y);
        ctx.lineTo(p1.x + p1.w + rumbleW1, p1.y);
        ctx.lineTo(p2.x + p2.w + rumbleW2, p2.y);
        ctx.lineTo(p2.x + p2.w, p2.y);
        ctx.fill();

        // 3. Yol Gövdesi (Asfalt)
        ctx.fillStyle = segment.color.road;
        ctx.beginPath();
        ctx.moveTo(p1.x - p1.w, p1.y);
        ctx.lineTo(p1.x + p1.w, p1.y);
        ctx.lineTo(p2.x + p2.w, p2.y);
        ctx.lineTo(p2.x - p2.w, p2.y);
        ctx.fill();

        // 4. Şerit Çizgileri (Orta Şerit)
        if (segment.color.lane !== 'transparent') {
            const laneW1 = p1.w * 0.02;
            const laneW2 = p2.w * 0.02;
            ctx.fillStyle = segment.color.lane;
            ctx.beginPath();
            ctx.moveTo(p1.x - laneW1, p1.y);
            ctx.lineTo(p1.x + laneW1, p1.y);
            ctx.lineTo(p2.x + laneW2, p2.y);
            ctx.lineTo(p2.x - laneW2, p2.y);
            ctx.fill();
        }
    }

    // Parallax Arka Plan Çizim Fonksiyonu (Telif riski olmayan modern çizgisel neon gradyanlar)
    drawBackground(ctx, width, height, trackId) {
        // Gökyüzü Degradesi (Synthwave tarzı)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height/2);
        skyGrad.addColorStop(0, '#020208');
        skyGrad.addColorStop(1, '#0e0921');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height/2);

        // Yıldızlar / Parıldayan Noktalar (Gökyüzü Katmanı)
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 40; i++) {
            const x = ((i * 127 + this.skyOffset * width) % width);
            const y = (i * 17) % (height / 3);
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1.0;

        // Tepeler / Dağlar Katmanı (Vektörel neon çizgileriyle derinlik)
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#1a1a2e';
        ctx.fillStyle = '#06060c';
        ctx.strokeStyle = '#1d1735';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(0, height/2);
        for (let i = 0; i <= width; i += 20) {
            const angle = ((i + this.hillOffset * width) / width) * Math.PI * 4;
            const y = (height/2 - 20) + Math.sin(angle) * 15;
            ctx.lineTo(i, y);
        }
        ctx.lineTo(width, height/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// Kolaylık sağlamak için CSS değişkeni okuyan yardımcı fonksiyon
function varColor(cssVarName) {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim() || '#ff2a5f';
}
