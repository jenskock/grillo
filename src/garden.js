export const app = {
            canvas: null,
            ctx: null,

            garden: {
                width: 17,
                depth: 21
            },

            house: {
                depth: 3.2
            },

            // Existing deck + side path at the house (from aerial photo)
            existingTerrace: {
                x: 1.0,
                y: 0,
                width: 10.0,
                depth: 3.4
            },

            sidePath: {
                x: 11.0,
                y: 0,
                width: 6.0,
                depth: 3.4
            },

            hedge: {
                thickness: 1.0
            },

            // Bottom-left: two dead hedge plants → wide gate for excavator access
            gate: {
                x: 1.0,
                width: 3.5,
                label: "Tor 3,5 m"
            },

            features: {
                tree: { x: 12.2, y: 11.5, r: 1.35 },
                shrub: { x: 11.0, y: 5.6, r: 0.7 }
            },

            view: {
                scale: 20,
                offsetX: 0,
                offsetY: 0,
                isDragging: false,
                dragStartX: 0,
                dragStartY: 0
            },

            terrace: {
                width: 6,
                height: 8,
                x: 11,
                y: 13
            },

            init() {
                this.canvas = document.getElementById("garden-canvas");
                this.ctx = this.canvas.getContext("2d");

                this.resizeCanvas();
                window.addEventListener("resize", () => this.resizeCanvas());

                this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
                this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
                this.canvas.addEventListener("mouseup", () => this.onMouseUp());
                this.canvas.addEventListener("mouseleave", () => this.onMouseUp());
                this.canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });

                this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
                this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
                this.canvas.addEventListener("touchend", (e) => this.onTouchEnd(e), { passive: false });

                this.resetView();
            },

            resizeCanvas() {
                const container = this.canvas.parentElement;
                const rect = container.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = Math.round(rect.width * dpr);
                this.canvas.height = Math.round(rect.height * dpr);
                this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                this.canvasStyleWidth = rect.width;
                this.canvasStyleHeight = rect.height;
                this.draw();
            },

            resetView() {
                const padX = 56;
                const padY = 48;
                const scaleX = (this.canvasStyleWidth - padX) / this.garden.width;
                const scaleY = (this.canvasStyleHeight - padY) / (this.garden.depth + this.house.depth);
                this.view.scale = Math.min(scaleX, scaleY);

                const contentW = this.garden.width * this.view.scale;
                const contentH = (this.garden.depth + this.house.depth) * this.view.scale;
                this.view.offsetX = (this.canvasStyleWidth - contentW) / 2;
                this.view.offsetY = (this.canvasStyleHeight - contentH) / 2 + this.house.depth * this.view.scale * 0.45;
                this.draw();
            },

            zoomIn() {
                this.zoomAt(this.canvasStyleWidth / 2, this.canvasStyleHeight / 2, 1.2);
            },

            zoomOut() {
                this.zoomAt(this.canvasStyleWidth / 2, this.canvasStyleHeight / 2, 1 / 1.2);
            },

            zoomAt(x, y, factor) {
                const worldX = (x - this.view.offsetX) / this.view.scale;
                const worldY = (y - this.view.offsetY) / this.view.scale;
                this.view.scale = Math.max(8, Math.min(80, this.view.scale * factor));
                this.view.offsetX = x - worldX * this.view.scale;
                this.view.offsetY = y - worldY * this.view.scale;
                this.draw();
            },

            toScreenX(x) {
                return x * this.view.scale + this.view.offsetX;
            },

            toScreenY(y) {
                return y * this.view.scale + this.view.offsetY;
            },

            toWorldX(x) {
                return (x - this.view.offsetX) / this.view.scale;
            },

            toWorldY(y) {
                return (y - this.view.offsetY) / this.view.scale;
            },

            clampTerrace() {
                const t = this.terrace;
                t.x = Math.max(0, Math.min(this.garden.width - t.width, t.x));
                t.y = Math.max(0, Math.min(this.garden.depth - t.height, t.y));
            },

            draw() {
                const ctx = this.ctx;
                const w = this.canvasStyleWidth;
                const h = this.canvasStyleHeight;
                ctx.clearRect(0, 0, w, h);

                this.drawLawn();
                this.drawHedges();
                this.drawFenceAndGate();
                this.drawHouse();
                this.drawExistingTerrace();
                this.drawSidePath();
                this.drawTree();
                this.drawShrub();
                this.drawTerrace();
                this.drawEdgeLabels();
                this.drawNorthArrow();
                this.drawScaleBar();
                this.drawLegend();
                this.updateTerraceInfo();
            },

            drawLawn() {
                const ctx = this.ctx;
                const x = this.toScreenX(0);
                const y = this.toScreenY(0);
                const w = this.garden.width * this.view.scale;
                const h = this.garden.depth * this.view.scale;

                const grad = ctx.createLinearGradient(x, y, x, y + h);
                grad.addColorStop(0, "#d7ebc8");
                grad.addColorStop(0.55, "#c5e0b4");
                grad.addColorStop(1, "#b4d4a1");

                ctx.save();
                ctx.fillStyle = grad;
                ctx.strokeStyle = "#5f8f4d";
                ctx.lineWidth = 2.5;
                this.roundRect(ctx, x, y, w, h, 6);
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = "rgba(70, 110, 60, 0.08)";
                ctx.lineWidth = 1;
                for (let i = 1; i < this.garden.width; i++) {
                    const gx = this.toScreenX(i);
                    ctx.beginPath();
                    ctx.moveTo(gx, y);
                    ctx.lineTo(gx, y + h);
                    ctx.stroke();
                }
                for (let j = 1; j < this.garden.depth; j++) {
                    const gy = this.toScreenY(j);
                    ctx.beginPath();
                    ctx.moveTo(x, gy);
                    ctx.lineTo(x + w, gy);
                    ctx.stroke();
                }
                ctx.restore();
            },

            drawHedges() {
                const ctx = this.ctx;
                const t = this.hedge.thickness;
                const s = this.view.scale;
                const g = this.gate;
                const grill = this.terrace;

                ctx.save();
                // West hedge (full length)
                this.paintHedgeBand(0, 0, t, this.garden.depth);

                // South hedge: gaps for gate (bottom-left) and grillecke (bottom-right)
                const hedgeY = this.garden.depth - t;
                const segments = [
                    { x: 0, w: g.x },
                    { x: g.x + g.width, w: grill.x - (g.x + g.width) },
                    // no hedge under grillecke (grill.x → garden.width)
                ];

                for (const seg of segments) {
                    if (seg.w > 0.05) {
                        this.paintHedgeBand(seg.x, hedgeY, seg.w, t);
                    }
                }

                ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
                ctx.font = `600 ${Math.max(11, s * 0.42)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.fillText("Hecke", this.toScreenX(t / 2), this.toScreenY(this.garden.depth / 2));
                const midSeg = segments[1];
                if (midSeg && midSeg.w > 2) {
                    ctx.fillText(
                        "Hecke",
                        this.toScreenX(midSeg.x + midSeg.w / 2),
                        this.toScreenY(this.garden.depth - t / 2)
                    );
                }
                ctx.restore();
            },

            drawFenceAndGate() {
                const ctx = this.ctx;
                const t = this.hedge.thickness;
                const g = this.gate;
                const grill = this.terrace;
                const fenceY = this.garden.depth - t * 0.35;
                const y = this.toScreenY(fenceY);
                const xLeft = this.toScreenX(0);
                const fenceEnd = this.toScreenX(grill.x); // stop before grillecke
                const gateX1 = this.toScreenX(g.x);
                const gateX2 = this.toScreenX(g.x + g.width);

                ctx.save();

                // Doppelstabmattenzaun along the south edge (not under grillecke)
                ctx.strokeStyle = "#5a6570";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(xLeft, y);
                ctx.lineTo(gateX1, y);
                ctx.moveTo(gateX2, y);
                ctx.lineTo(fenceEnd, y);
                ctx.stroke();

                // Vertical posts along fence
                ctx.lineWidth = 1.5;
                const postStep = Math.max(8, this.view.scale * 0.55);
                for (let px = xLeft; px <= fenceEnd; px += postStep) {
                    if (px > gateX1 && px < gateX2) continue;
                    ctx.beginPath();
                    ctx.moveTo(px, y - 5);
                    ctx.lineTo(px, y + 5);
                    ctx.stroke();
                }

                // Gate leaf in the opening (hinged suggestion)
                ctx.fillStyle = "rgba(90, 101, 112, 0.18)";
                ctx.strokeStyle = "#3d4650";
                ctx.lineWidth = 2.5;
                const gateH = Math.max(10, t * this.view.scale * 0.7);
                ctx.fillRect(gateX1, y - gateH / 2, gateX2 - gateX1, gateH);
                ctx.strokeRect(gateX1, y - gateH / 2, gateX2 - gateX1, gateH);

                // Center hinge / latch hint
                ctx.beginPath();
                ctx.moveTo((gateX1 + gateX2) / 2, y - gateH / 2);
                ctx.lineTo((gateX1 + gateX2) / 2, y + gateH / 2);
                ctx.stroke();

                ctx.fillStyle = "#2c333a";
                ctx.font = `700 ${Math.max(11, this.view.scale * 0.4)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(g.label, (gateX1 + gateX2) / 2, y - gateH / 2 - 6);

                ctx.font = `600 ${Math.max(10, this.view.scale * 0.32)}px "Source Sans 3", sans-serif`;
                ctx.fillStyle = "#5a6570";
                ctx.textBaseline = "top";
                const fenceLabelX = (gateX2 + fenceEnd) / 2;
                ctx.fillText("Doppelstabmattenzaun", fenceLabelX, y + 10);
                ctx.restore();
            },

            paintHedgeBand(x, y, w, h) {
                const ctx = this.ctx;
                const x1 = this.toScreenX(x);
                const y1 = this.toScreenY(y);
                const sw = w * this.view.scale;
                const sh = h * this.view.scale;

                const grad = ctx.createLinearGradient(x1, y1, x1 + sw, y1 + sh);
                grad.addColorStop(0, "#3d7d45");
                grad.addColorStop(0.5, "#2f6b3a");
                grad.addColorStop(1, "#458b4f");
                ctx.fillStyle = grad;
                ctx.fillRect(x1, y1, sw, sh);

                ctx.fillStyle = "rgba(180, 220, 150, 0.18)";
                const step = Math.max(4, this.view.scale * 0.22);
                for (let i = 0; i < sw; i += step) {
                    for (let j = 0; j < sh; j += step) {
                        if ((i + j) % (step * 2) === 0) {
                            ctx.beginPath();
                            ctx.arc(x1 + i + 1, y1 + j + 1, step * 0.28, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            },

            drawHouse() {
                const ctx = this.ctx;
                const x = this.toScreenX(0);
                const y = this.toScreenY(-this.house.depth);
                const w = this.garden.width * this.view.scale;
                const h = this.house.depth * this.view.scale;

                ctx.save();
                ctx.fillStyle = "#8a9096";
                ctx.strokeStyle = "#4d545b";
                ctx.lineWidth = 2;
                this.roundRect(ctx, x, y, w, h, 4);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#5c636a";
                ctx.fillRect(x, y, w, h * 0.28);

                ctx.fillStyle = "#ffffff";
                ctx.font = `700 ${Math.max(13, this.view.scale * 0.5)}px Fraunces, Georgia, serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("Haus", x + w / 2, y + h * 0.62);

                ctx.font = `600 ${Math.max(10, this.view.scale * 0.35)}px "Source Sans 3", sans-serif`;
                ctx.fillStyle = "rgba(255,255,255,0.85)";
                ctx.fillText("Norden · Pestalozzistraße", x + w / 2, y + h * 0.28 / 2);
                ctx.restore();
            },

            drawExistingTerrace() {
                const ctx = this.ctx;
                const t = this.existingTerrace;
                const x1 = this.toScreenX(t.x);
                const y1 = this.toScreenY(t.y);
                const w = t.width * this.view.scale;
                const h = t.depth * this.view.scale;

                ctx.save();
                ctx.fillStyle = "#d9c3a1";
                ctx.strokeStyle = "#9a7f58";
                ctx.lineWidth = 2;
                ctx.fillRect(x1, y1, w, h);
                ctx.strokeRect(x1, y1, w, h);

                ctx.strokeStyle = "rgba(90, 70, 40, 0.2)";
                ctx.lineWidth = 1;
                const plank = Math.max(4, this.view.scale * 0.25);
                for (let i = plank; i < w; i += plank) {
                    ctx.beginPath();
                    ctx.moveTo(x1 + i, y1 + 2);
                    ctx.lineTo(x1 + i, y1 + h - 2);
                    ctx.stroke();
                }

                ctx.fillStyle = "#5c4a2f";
                ctx.font = `600 ${Math.max(11, this.view.scale * 0.4)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("Bestehende Terrasse", x1 + w / 2, y1 + h / 2);
                ctx.restore();
            },

            drawSidePath() {
                const ctx = this.ctx;
                const p = this.sidePath;
                const x1 = this.toScreenX(p.x);
                const y1 = this.toScreenY(p.y);
                const w = p.width * this.view.scale;
                const h = p.depth * this.view.scale;

                ctx.save();
                ctx.fillStyle = "#cfc8bb";
                ctx.strokeStyle = "#8f887a";
                ctx.lineWidth = 2;
                ctx.fillRect(x1, y1, w, h);
                ctx.strokeRect(x1, y1, w, h);

                ctx.strokeStyle = "rgba(80, 75, 65, 0.15)";
                ctx.lineWidth = 1;
                const step = Math.max(5, this.view.scale * 0.3);
                for (let j = step; j < h; j += step) {
                    ctx.beginPath();
                    ctx.moveTo(x1 + 2, y1 + j);
                    ctx.lineTo(x1 + w - 2, y1 + j);
                    ctx.stroke();
                }

                ctx.fillStyle = "#5a5348";
                ctx.font = `600 ${Math.max(11, this.view.scale * 0.4)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("Weg", x1 + w / 2, y1 + h / 2);
                ctx.restore();
            },

            drawTree() {
                const ctx = this.ctx;
                const t = this.features.tree;
                const cx = this.toScreenX(t.x);
                const cy = this.toScreenY(t.y);
                const r = t.r * this.view.scale;

                ctx.save();
                ctx.fillStyle = "rgba(60, 90, 50, 0.12)";
                ctx.beginPath();
                ctx.ellipse(cx, cy + r * 0.15, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
                ctx.fill();

                const canopy = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
                canopy.addColorStop(0, "#7fad68");
                canopy.addColorStop(1, "#4f7d3f");
                ctx.fillStyle = canopy;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#6b4a2f";
                ctx.fillRect(cx - r * 0.08, cy, r * 0.16, r * 0.55);

                ctx.fillStyle = "#244028";
                ctx.font = `600 ${Math.max(11, this.view.scale * 0.38)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("Baum", cx, cy - r - 8);
                ctx.restore();
            },

            drawShrub() {
                const ctx = this.ctx;
                const s = this.features.shrub;
                const cx = this.toScreenX(s.x);
                const cy = this.toScreenY(s.y);
                const r = s.r * this.view.scale;

                ctx.save();
                const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 2, cx, cy, r);
                grad.addColorStop(0, "#78a85f");
                grad.addColorStop(1, "#3f7040");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#2f5632";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = "#244028";
                ctx.font = `600 ${Math.max(10, this.view.scale * 0.34)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("Strauch", cx, cy - r - 7);
                ctx.restore();
            },

            // Local meters → screen within terrace footprint
            terracePoint(lx, ly) {
                return {
                    x: this.toScreenX(this.terrace.x + lx),
                    y: this.toScreenY(this.terrace.y + ly)
                };
            },

            fillStrokeRoundRect(x, y, w, h, r, fill, stroke, lineWidth = 1.5) {
                const ctx = this.ctx;
                this.roundRect(ctx, x, y, w, h, r);
                if (fill) {
                    ctx.fillStyle = fill;
                    ctx.fill();
                }
                if (stroke) {
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();
                }
            },

            drawTerrace() {
                const ctx = this.ctx;
                ctx.save();
                this.drawTerraceDecks();
                this.drawGardenHochbeet();
                this.drawGrillKitchenDetailed();
                this.drawDiningSetDetailed();
                this.drawLoungePadDetailed();
                this.drawTerracePath();
                this.drawPergolaPosts();
                this.drawTerraceDimensionTicks();
                this.drawTerraceCaption();
                ctx.restore();
            },

            /**
             * Main deck flush to east + south boundaries.
             * Secondary lounge rectangle steps into the garden (NW).
             */
            paintStonePaving(x, y, w, h, radius, tileM = 0.55) {
                const ctx = this.ctx;
                const s = this.view.scale;
                ctx.save();
                this.roundRect(ctx, x, y, w, h, radius);
                ctx.clip();

                ctx.fillStyle = "#8f8a82";
                ctx.fillRect(x, y, w, h);

                const tile = Math.max(10, tileM * s);
                const grout = Math.max(1.5, s * 0.04);
                let row = 0;
                for (let py = y; py < y + h; py += tile, row++) {
                    const offset = row % 2 === 0 ? 0 : tile * 0.35;
                    for (let px = x - offset; px < x + w; px += tile) {
                        const shade = 150 + ((Math.floor(px) * 13 + Math.floor(py) * 7) % 35);
                        ctx.fillStyle = `rgb(${shade},${shade - 3},${shade - 10})`;
                        ctx.fillRect(px + grout, py + grout, tile - grout * 2, tile - grout * 2);
                        // stone speckles
                        ctx.fillStyle = "rgba(70,65,60,0.12)";
                        for (let i = 0; i < 4; i++) {
                            const nx = px + grout + 3 + ((i * 19) % Math.max(4, tile - 10));
                            const ny = py + grout + 3 + ((i * 11) % Math.max(4, tile - 10));
                            ctx.fillRect(nx, ny, 2, 1);
                        }
                    }
                }

                ctx.strokeStyle = "#6a655e";
                ctx.lineWidth = grout;
                for (let py = y; py <= y + h; py += tile) {
                    ctx.beginPath();
                    ctx.moveTo(x, py);
                    ctx.lineTo(x + w, py);
                    ctx.stroke();
                }
                for (let px = x; px <= x + w; px += tile) {
                    ctx.beginPath();
                    ctx.moveTo(px, y);
                    ctx.lineTo(px, y + h);
                    ctx.stroke();
                }
                ctx.restore();

                ctx.strokeStyle = "#5a564f";
                ctx.lineWidth = 2;
                this.roundRect(ctx, x, y, w, h, radius);
                ctx.stroke();
            },

            drawTerraceDecks() {
                const ctx = this.ctx;
                const s = this.view.scale;

                // --- Main stone terrace: flush right (x=6) & bottom (y=8) ---
                const main = {
                    x: 0.9,
                    y: 2.4,
                    w: 5.1,
                    h: 5.6
                };
                const m0 = this.terracePoint(main.x, main.y);
                const mw = main.w * s;
                const mh = main.h * s;

                ctx.fillStyle = "rgba(40, 30, 20, 0.12)";
                this.roundRect(ctx, m0.x + 3, m0.y + 4, mw, mh, 2);
                ctx.fill();

                this.paintStonePaving(m0.x, m0.y, mw, mh, 2, 0.5);

                // Straight boundary edges emphasized (east + south)
                ctx.strokeStyle = "#3f3c38";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.terracePoint(6, main.y).x, this.terracePoint(6, main.y).y);
                ctx.lineTo(this.terracePoint(6, 8).x, this.terracePoint(6, 8).y);
                ctx.lineTo(this.terracePoint(main.x, 8).x, this.terracePoint(main.x, 8).y);
                ctx.stroke();

                // --- Secondary lounge pad into the garden (NW) ---
                const pad = { x: 0.15, y: 0.15, w: 3.35, h: 2.55 };
                const p0 = this.terracePoint(pad.x, pad.y);
                const pw = pad.w * s;
                const ph = pad.h * s;

                ctx.fillStyle = "rgba(40, 30, 20, 0.1)";
                this.roundRect(ctx, p0.x + 2, p0.y + 3, pw, ph, 14);
                ctx.fill();

                this.paintStonePaving(p0.x, p0.y, pw, ph, 14, 0.45);

                // Connector step between pad and main terrace
                const c0 = this.terracePoint(1.1, 2.35);
                this.paintStonePaving(c0.x, c0.y, 2.4 * s, 0.35 * s, 3, 0.4);

                ctx.fillStyle = "rgba(40, 40, 38, 0.75)";
                ctx.font = `600 ${Math.max(9, s * 0.28)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "left";
                ctx.fillText("Lounge (Stein)", p0.x + 8, p0.y + 14);
                ctx.fillText("Haupterrasse (Stein)", m0.x + 8, m0.y + 14);
            },

            drawGardenHochbeet() {
                const ctx = this.ctx;
                const s = this.view.scale;

                // Raised bed wrapping the garden-facing (west) edge — curved outer face
                const bedPath = () => {
                    const a = this.terracePoint(0.05, 0.05);
                    const b = this.terracePoint(0.05, 7.55);
                    const c = this.terracePoint(0.85, 7.55);
                    const d = this.terracePoint(0.85, 2.55);
                    const e = this.terracePoint(0.05, 2.55);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(e.x, e.y);
                    ctx.lineTo(d.x, d.y);
                    ctx.quadraticCurveTo(
                        this.terracePoint(0.95, 5.0).x,
                        this.terracePoint(0.95, 5.0).y,
                        c.x,
                        c.y
                    );
                    ctx.lineTo(b.x, b.y);
                    ctx.quadraticCurveTo(
                        this.terracePoint(-0.15, 4.0).x,
                        this.terracePoint(-0.15, 4.0).y,
                        a.x,
                        a.y
                    );
                    ctx.closePath();
                };

                // Also a curved bed along the north face of the lounge pad
                const northBed = {
                    x: 0.15,
                    y: -0.05,
                    w: 3.35,
                    h: 0.45
                };

                bedPath();
                const corten = ctx.createLinearGradient(
                    this.terracePoint(0, 0).x,
                    this.terracePoint(0, 0).y,
                    this.terracePoint(1, 8).x,
                    this.terracePoint(1, 8).y
                );
                corten.addColorStop(0, "#a65b32");
                corten.addColorStop(0.5, "#8a4524");
                corten.addColorStop(1, "#6e3418");
                ctx.fillStyle = corten;
                ctx.fill();
                ctx.strokeStyle = "#4a2410";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Soil + planting on west bed
                ctx.save();
                bedPath();
                ctx.clip();
                ctx.fillStyle = "#3a2a1a";
                ctx.fillRect(
                    this.terracePoint(0.1, 0.15).x,
                    this.terracePoint(0.1, 0.15).y,
                    0.65 * s,
                    7.2 * s
                );
                this.drawPlantCluster(0.35, 0.8, 6);
                this.drawPlantCluster(0.4, 2.2, 5);
                this.drawPlantCluster(0.38, 3.8, 7);
                this.drawPlantCluster(0.42, 5.4, 5);
                this.drawPlantCluster(0.35, 6.8, 4);
                ctx.restore();

                // North hochbeet (rounded face into lawn)
                const n0 = this.terracePoint(northBed.x, northBed.y);
                this.fillStrokeRoundRect(
                    n0.x,
                    n0.y,
                    northBed.w * s,
                    northBed.h * s,
                    10,
                    "#8a4524",
                    "#4a2410",
                    1.4
                );
                ctx.fillStyle = "#2f4a28";
                this.roundRect(ctx, n0.x + 3, n0.y + 3, northBed.w * s - 6, northBed.h * s - 6, 8);
                ctx.fill();
                this.drawPlantCluster(0.6, 0.15, 3);
                this.drawPlantCluster(1.5, 0.12, 4);
                this.drawPlantCluster(2.5, 0.18, 3);
                this.drawPlantCluster(3.1, 0.14, 2);

                // Small south-facing herb trough on main deck edge (not on boundary)
                const herb = this.terracePoint(1.2, 7.35);
                this.fillStrokeRoundRect(herb.x, herb.y, 2.2 * s, 0.45 * s, 4, "#8a4524", "#4a2410", 1.2);
                ctx.fillStyle = "#334f2c";
                this.roundRect(ctx, herb.x + 2, herb.y + 2, 2.2 * s - 4, 0.45 * s - 4, 3);
                ctx.fill();
                this.drawHerbRow(1.35, 7.5, 8);

                ctx.fillStyle = "#3a2412";
                ctx.font = `600 ${Math.max(9, s * 0.28)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                const hl = this.terracePoint(0.45, 4.2);
                ctx.save();
                ctx.translate(hl.x, hl.y);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText("Hochbeet Corten", 0, 0);
                ctx.restore();
            },

            drawPlantCluster(lx, ly, count) {
                const ctx = this.ctx;
                const s = this.view.scale;
                const base = this.terracePoint(lx, ly);
                const colors = ["#3f7a3a", "#4f8f48", "#2f6b38", "#6aa35a", "#25532a"];
                for (let i = 0; i < count; i++) {
                    const ox = ((i * 17) % 11) - 5;
                    const oy = ((i * 13) % 9) - 4;
                    const r = Math.max(2.5, s * (0.07 + (i % 3) * 0.025));
                    const cx = base.x + ox * (s * 0.04);
                    const cy = base.y + oy * (s * 0.04);
                    // leaf pair
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.beginPath();
                    ctx.ellipse(cx - r * 0.4, cy, r * 0.7, r * 1.15, -0.5, 0, Math.PI * 2);
                    ctx.ellipse(cx + r * 0.4, cy, r * 0.7, r * 1.15, 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "rgba(20, 50, 20, 0.25)";
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy + r);
                    ctx.lineTo(cx, cy - r * 1.1);
                    ctx.stroke();
                }
            },

            drawHerbRow(lx, ly, n) {
                const ctx = this.ctx;
                const s = this.view.scale;
                for (let i = 0; i < n; i++) {
                    const p = this.terracePoint(lx + i * 0.24, ly);
                    ctx.strokeStyle = "#4a7a3a";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y + s * 0.06);
                    ctx.quadraticCurveTo(p.x - s * 0.05, p.y - s * 0.02, p.x, p.y - s * 0.1);
                    ctx.quadraticCurveTo(p.x + s * 0.05, p.y - s * 0.02, p.x, p.y + s * 0.06);
                    ctx.stroke();
                    ctx.fillStyle = "#6b9a4a";
                    ctx.beginPath();
                    ctx.ellipse(p.x - s * 0.03, p.y - s * 0.02, s * 0.04, s * 0.07, -0.4, 0, Math.PI * 2);
                    ctx.ellipse(p.x + s * 0.03, p.y - s * 0.02, s * 0.04, s * 0.07, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            },

            drawGrillKitchenDetailed() {
                const ctx = this.ctx;
                const s = this.view.scale;

                // Freestanding kitchen near south edge (gap to neighbor garage)
                const kx = 1.1;
                const ky = 6.7;
                const kw = 4.6;
                const kh = 0.9;
                const p = this.terracePoint(kx, ky);
                const w = kw * s;
                const h = kh * s;

                // Cabinet body
                const body = ctx.createLinearGradient(p.x, p.y, p.x + w, p.y);
                body.addColorStop(0, "#5e5a56");
                body.addColorStop(1, "#3f3c39");
                this.fillStrokeRoundRect(p.x, p.y, w, h, 3, body, "#2a2826", 1.5);

                // Door seams
                ctx.strokeStyle = "rgba(255,255,255,0.12)";
                ctx.lineWidth = 1;
                for (let i = 1; i < 3; i++) {
                    const y = p.y + (h * i) / 3;
                    ctx.beginPath();
                    ctx.moveTo(p.x + 4, y);
                    ctx.lineTo(p.x + w - 4, y);
                    ctx.stroke();
                }
                // Handles
                ctx.fillStyle = "#c0b8a8";
                for (let i = 0; i < 3; i++) {
                    const y = p.y + h * (i + 0.5) / 3;
                    ctx.fillRect(p.x + w * 0.35, y - 1, w * 0.3, 3);
                }

                // Stone countertop overhang
                ctx.fillStyle = "#b8b3aa";
                ctx.fillRect(p.x - 3, p.y - 4, w + 6, s * 0.16);
                ctx.strokeStyle = "#8a857c";
                ctx.strokeRect(p.x - 3, p.y - 4, w + 6, s * 0.16);
                // Countertop grain
                ctx.strokeStyle = "rgba(60,55,50,0.15)";
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.moveTo(p.x - 2, p.y - 2 + i * 2);
                    ctx.lineTo(p.x + w + 2, p.y - 2 + i * 2);
                    ctx.stroke();
                }

                // Built-in grill module
                const g = this.terracePoint(4.9, 3.3);
                const gw = 0.95 * s;
                const gh = 1.35 * s;
                this.fillStrokeRoundRect(g.x, g.y, gw, gh, 4, "#1a1a1a", "#000", 1.5);
                // Lid / grate
                ctx.fillStyle = "#2e2e2e";
                this.roundRect(ctx, g.x + 4, g.y + 4, gw - 8, gh * 0.55, 3);
                ctx.fill();
                ctx.strokeStyle = "#555";
                ctx.lineWidth = 1;
                for (let i = 1; i < 6; i++) {
                    const y = g.y + 8 + i * ((gh * 0.55 - 10) / 6);
                    ctx.beginPath();
                    ctx.moveTo(g.x + 8, y);
                    ctx.lineTo(g.x + gw - 8, y);
                    ctx.stroke();
                }
                // Control knobs
                ctx.fillStyle = "#888";
                for (let i = 0; i < 3; i++) {
                    const kx2 = g.x + 12 + i * (gw - 24) / 2;
                    ctx.beginPath();
                    ctx.arc(kx2, g.y + gh * 0.78, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "#222";
                    ctx.stroke();
                }
                // Warm ember glow under grate
                const glow = ctx.createRadialGradient(
                    g.x + gw / 2,
                    g.y + gh * 0.35,
                    2,
                    g.x + gw / 2,
                    g.y + gh * 0.35,
                    s * 0.7
                );
                glow.addColorStop(0, "rgba(255, 110, 30, 0.4)");
                glow.addColorStop(1, "rgba(255, 80, 0, 0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(g.x + gw / 2, g.y + gh * 0.35, s * 0.7, 0, Math.PI * 2);
                ctx.fill();

                // Side burner / prep niche
                const prep = this.terracePoint(4.9, 4.85);
                this.fillStrokeRoundRect(prep.x, prep.y, 0.95 * s, 0.7 * s, 3, "#2a2a2a", "#111", 1);
                ctx.fillStyle = "#444";
                ctx.beginPath();
                ctx.arc(prep.x + 0.48 * s, prep.y + 0.35 * s, s * 0.16, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#777";
                ctx.stroke();

                // Wood storage niche under south end of counter
                const wood = this.terracePoint(4.9, 5.7);
                this.fillStrokeRoundRect(wood.x, wood.y, 0.95 * s, 0.5 * s, 2, "#3a2a1c", "#1e140e", 1);
                ctx.strokeStyle = "#6b4a2f";
                ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                    const y = wood.y + 6 + i * 4;
                    ctx.beginPath();
                    ctx.moveTo(wood.x + 6, y);
                    ctx.lineTo(wood.x + 0.95 * s - 6, y);
                    ctx.stroke();
                }

                // Label
                ctx.fillStyle = "#1a1a1a";
                ctx.font = `700 ${Math.max(10, s * 0.32)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                const label = this.terracePoint(5.55, 6.55);
                ctx.fillText("Grillküche", label.x, label.y);
            },

            drawDiningSetDetailed() {
                const ctx = this.ctx;
                const s = this.view.scale;

                // Rectangular teak dining table (top view)
                const tx = 2.15;
                const ty = 4.35;
                const tw = 1.9;
                const th = 1.05;
                const t0 = this.terracePoint(tx, ty);

                ctx.fillStyle = "rgba(40,30,20,0.12)";
                this.roundRect(ctx, t0.x + 2, t0.y + 3, tw * s, th * s, 4);
                ctx.fill();

                const tableFill = ctx.createLinearGradient(t0.x, t0.y, t0.x, t0.y + th * s);
                tableFill.addColorStop(0, "#b88955");
                tableFill.addColorStop(1, "#8f6435");
                this.fillStrokeRoundRect(t0.x, t0.y, tw * s, th * s, 4, tableFill, "#5c3d1f", 1.5);

                // Tabletop slats
                ctx.strokeStyle = "rgba(60, 40, 20, 0.22)";
                ctx.lineWidth = 1;
                for (let i = 1; i < 5; i++) {
                    const y = t0.y + (th * s * i) / 5;
                    ctx.beginPath();
                    ctx.moveTo(t0.x + 4, y);
                    ctx.lineTo(t0.x + tw * s - 4, y);
                    ctx.stroke();
                }

                // Place settings
                for (let i = 0; i < 3; i++) {
                    for (let side = 0; side < 2; side++) {
                        const px = t0.x + tw * s * (0.22 + i * 0.28);
                        const py = t0.y + (side === 0 ? th * s * 0.28 : th * s * 0.72);
                        ctx.strokeStyle = "rgba(255,255,255,0.35)";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px - 4, py - 3, 8, 6);
                    }
                }

                // Bench along south of table
                const b1 = this.terracePoint(2.2, 5.55);
                this.fillStrokeRoundRect(b1.x, b1.y, 1.8 * s, 0.38 * s, 3, "#9a7048", "#5c3d1f", 1.2);
                ctx.fillStyle = "#c4784a";
                this.roundRect(ctx, b1.x + 3, b1.y + 3, 1.8 * s - 6, 0.38 * s - 6, 2);
                ctx.fill();

                // Bench along north of table
                const b2 = this.terracePoint(2.2, 3.85);
                this.fillStrokeRoundRect(b2.x, b2.y, 1.8 * s, 0.38 * s, 3, "#9a7048", "#5c3d1f", 1.2);
                ctx.fillStyle = "#c4784a";
                this.roundRect(ctx, b2.x + 3, b2.y + 3, 1.8 * s - 6, 0.38 * s - 6, 2);
                ctx.fill();

                // Two end chairs (drawn as chair plan shapes, not circles)
                this.drawPlanChair(1.55, 4.7, 0);
                this.drawPlanChair(4.2, 4.7, Math.PI);

                ctx.fillStyle = "#5c3d1f";
                ctx.font = `600 ${Math.max(10, s * 0.3)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("Essplatz", t0.x + tw * s / 2, t0.y + th * s / 2 + 1);
            },

            drawPlanChair(lx, ly, rot) {
                const ctx = this.ctx;
                const s = this.view.scale;
                const p = this.terracePoint(lx, ly);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(rot);
                // seat
                this.fillStrokeRoundRect(-0.22 * s, -0.2 * s, 0.44 * s, 0.4 * s, 3, "#a87848", "#5c3d1f", 1);
                // backrest
                this.fillStrokeRoundRect(-0.22 * s, -0.28 * s, 0.44 * s, 0.1 * s, 2, "#8a6238", "#5c3d1f", 1);
                // armrests
                ctx.fillStyle = "#8a6238";
                ctx.fillRect(-0.26 * s, -0.15 * s, 0.06 * s, 0.3 * s);
                ctx.fillRect(0.2 * s, -0.15 * s, 0.06 * s, 0.3 * s);
                ctx.restore();
            },

            drawLoungePadDetailed() {
                const ctx = this.ctx;
                const s = this.view.scale;

                // Built-in L-bench on lounge pad (garden-facing)
                // Horizontal arm
                const h0 = this.terracePoint(0.35, 0.35);
                this.fillStrokeRoundRect(h0.x, h0.y, 2.7 * s, 0.5 * s, 4, "#8b6238", "#5c3d1f", 1.3);
                ctx.fillStyle = "#d4895a";
                this.roundRect(ctx, h0.x + 3, h0.y + 3, 2.7 * s - 6, 0.5 * s - 6, 3);
                ctx.fill();
                // Cushion seams
                ctx.strokeStyle = "rgba(90,40,20,0.25)";
                for (let i = 1; i < 3; i++) {
                    const x = h0.x + (2.7 * s * i) / 3;
                    ctx.beginPath();
                    ctx.moveTo(x, h0.y + 4);
                    ctx.lineTo(x, h0.y + 0.5 * s - 4);
                    ctx.stroke();
                }

                // Vertical arm
                const v0 = this.terracePoint(0.35, 0.35);
                this.fillStrokeRoundRect(v0.x, v0.y, 0.5 * s, 2.0 * s, 4, "#8b6238", "#5c3d1f", 1.3);
                ctx.fillStyle = "#d4895a";
                this.roundRect(ctx, v0.x + 3, v0.y + 3, 0.5 * s - 6, 2.0 * s - 6, 3);
                ctx.fill();

                // Low rectangular coffee table with tray detail
                const ct = this.terracePoint(1.35, 1.15);
                this.fillStrokeRoundRect(ct.x, ct.y, 1.2 * s, 0.75 * s, 3, "#6e4a2a", "#3d2814", 1.3);
                ctx.strokeStyle = "rgba(255,255,255,0.12)";
                ctx.strokeRect(ct.x + 5, ct.y + 5, 1.2 * s - 10, 0.75 * s - 10);
                // Book / tray
                ctx.fillStyle = "#c4b49a";
                ctx.fillRect(ct.x + 0.25 * s, ct.y + 0.2 * s, 0.45 * s, 0.3 * s);
                ctx.fillStyle = "#8a3a2a";
                ctx.fillRect(ct.x + 0.75 * s, ct.y + 0.25 * s, 0.25 * s, 0.25 * s);

                // Fire table (rectangular corten, not a circle)
                const ft = this.terracePoint(2.55, 1.15);
                this.fillStrokeRoundRect(ft.x, ft.y, 0.7 * s, 0.9 * s, 3, "#6e3418", "#3a1a0c", 1.4);
                // Glass stones / burner slot
                const flame = ctx.createLinearGradient(ft.x, ft.y, ft.x + 0.7 * s, ft.y + 0.9 * s);
                flame.addColorStop(0, "rgba(255, 190, 80, 0.85)");
                flame.addColorStop(0.5, "rgba(255, 100, 30, 0.75)");
                flame.addColorStop(1, "rgba(180, 40, 10, 0.35)");
                ctx.fillStyle = flame;
                this.roundRect(ctx, ft.x + 6, ft.y + 8, 0.7 * s - 12, 0.9 * s - 16, 2);
                ctx.fill();
                // Ember lines
                ctx.strokeStyle = "rgba(255,220,120,0.55)";
                ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    const y = ft.y + 14 + i * 5;
                    ctx.beginPath();
                    ctx.moveTo(ft.x + 10, y);
                    ctx.lineTo(ft.x + 0.7 * s - 10, y - 2);
                    ctx.stroke();
                }

                ctx.fillStyle = "#5c3d1f";
                ctx.font = `600 ${Math.max(10, s * 0.3)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("Lounge", this.terracePoint(1.8, 2.35).x, this.terracePoint(1.8, 2.35).y);
            },

            drawTerracePath() {
                const ctx = this.ctx;
                const s = this.view.scale;
                // Rectangular stepping pads from lawn onto lounge podest
                const pads = [
                    [1.5, -0.55],
                    [2.1, -0.55],
                    [2.7, -0.55]
                ];
                for (const [lx, ly] of pads) {
                    const p = this.terracePoint(lx, ly);
                    this.fillStrokeRoundRect(
                        p.x,
                        p.y,
                        0.45 * s,
                        0.35 * s,
                        2,
                        "#b9b2a6",
                        "#7d766a",
                        1
                    );
                    ctx.strokeStyle = "rgba(60,55,50,0.15)";
                    ctx.strokeRect(p.x + 3, p.y + 3, 0.45 * s - 6, 0.35 * s - 6);
                }
            },

            drawPergolaPosts() {
                const ctx = this.ctx;
                const s = this.view.scale;

                // Freestanding canopy over kitchen (set back from garage)
                const nw = this.terracePoint(1.0, 6.2);
                const se = this.terracePoint(5.8, 7.8);

                ctx.fillStyle = "rgba(70, 68, 64, 0.2)";
                ctx.fillRect(nw.x, nw.y, se.x - nw.x, se.y - nw.y);
                ctx.strokeStyle = "#3f3c39";
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(nw.x, nw.y, se.x - nw.x, se.y - nw.y);
                ctx.setLineDash([]);

                for (const [lx, ly] of [
                    [1.15, 6.35],
                    [5.65, 6.35],
                    [1.15, 7.65],
                    [5.65, 7.65]
                ]) {
                    const p = this.terracePoint(lx, ly);
                    this.fillStrokeRoundRect(p.x - 3, p.y - 3, 6, 6, 1, "#3f3c39", "#1a1a1a", 1);
                }

                ctx.fillStyle = "#3f3c39";
                ctx.font = `600 ${Math.max(9, s * 0.28)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("Freistehende Küchenpergola", this.terracePoint(3.4, 6.0).x, this.terracePoint(3.4, 6.0).y);
            },

            drawTerraceDimensionTicks() {
                const ctx = this.ctx;
                const s = this.view.scale;
                ctx.save();
                ctx.strokeStyle = "#8a3a2a";
                ctx.fillStyle = "#8a3a2a";
                ctx.lineWidth = 1.5;
                ctx.font = `700 ${Math.max(10, s * 0.32)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";

                // South edge 6 m
                const s1 = this.terracePoint(0.9, 8.15);
                const s2 = this.terracePoint(6, 8.15);
                ctx.beginPath();
                ctx.moveTo(s1.x, s1.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.moveTo(s1.x, s1.y - 4);
                ctx.lineTo(s1.x, s1.y + 4);
                ctx.moveTo(s2.x, s2.y - 4);
                ctx.lineTo(s2.x, s2.y + 4);
                ctx.stroke();
                ctx.fillText("6,00 m", (s1.x + s2.x) / 2, s1.y + 14);

                // East edge 8 m
                const e1 = this.terracePoint(6.2, 0);
                const e2 = this.terracePoint(6.2, 8);
                ctx.beginPath();
                ctx.moveTo(e1.x, e1.y);
                ctx.lineTo(e2.x, e2.y);
                ctx.moveTo(e1.x - 4, e1.y);
                ctx.lineTo(e1.x + 4, e1.y);
                ctx.moveTo(e2.x - 4, e2.y);
                ctx.lineTo(e2.x + 4, e2.y);
                ctx.stroke();
                ctx.save();
                ctx.translate(e1.x + 12, (e1.y + e2.y) / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText("8,00 m", 0, 0);
                ctx.restore();
                ctx.restore();
            },

            drawTerraceCaption() {
                const ctx = this.ctx;
                const s = this.view.scale;
                const p = this.terracePoint(2.7, 6.55);
                ctx.fillStyle = "rgba(255, 248, 235, 0.9)";
                ctx.strokeStyle = "rgba(120, 80, 40, 0.25)";
                ctx.lineWidth = 1;
                this.roundRect(ctx, p.x - s * 1.55, p.y - s * 0.5, s * 3.1, s * 1.0, 8);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#6b3d18";
                ctx.font = `700 ${Math.max(12, s * 0.4)}px Fraunces, Georgia, serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("Grillecke", p.x, p.y - s * 0.18);
                ctx.font = `600 ${Math.max(9, s * 0.28)}px "Source Sans 3", sans-serif`;
                ctx.fillStyle = "#8a5a2f";
                ctx.fillText("Steinboden · Podest + Hochbeet zum Garten", p.x, p.y + s * 0.18);
            },

            drawEdgeLabels() {
                const ctx = this.ctx;
                ctx.save();
                ctx.fillStyle = "#b23b2f";
                ctx.font = `700 ${Math.max(12, this.view.scale * 0.48)}px "Source Sans 3", sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.fillText("17,00 m", this.toScreenX(this.garden.width / 2), this.toScreenY(0) - 16);
                ctx.fillText("17,00 m", this.toScreenX(this.garden.width / 2), this.toScreenY(this.garden.depth) + 18);

                ctx.save();
                ctx.translate(this.toScreenX(0) - 22, this.toScreenY(this.garden.depth / 2));
                ctx.rotate(-Math.PI / 2);
                ctx.fillText("21,00 m", 0, 0);
                ctx.restore();

                ctx.save();
                ctx.translate(this.toScreenX(this.garden.width) + 22, this.toScreenY(this.garden.depth / 2));
                ctx.rotate(-Math.PI / 2);
                ctx.fillText("21,00 m", 0, 0);
                ctx.restore();
                ctx.restore();
            },

            drawNorthArrow() {
                const ctx = this.ctx;
                const x = this.canvasStyleWidth - 52;
                const y = 48;

                ctx.save();
                ctx.translate(x, y);
                ctx.fillStyle = "rgba(255,253,248,0.9)";
                ctx.strokeStyle = "#1c2a22";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, 22, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, -14);
                ctx.lineTo(6, 8);
                ctx.lineTo(0, 4);
                ctx.lineTo(-6, 8);
                ctx.closePath();
                ctx.fillStyle = "#1f6f4a";
                ctx.fill();

                ctx.fillStyle = "#1c2a22";
                ctx.font = '700 11px "Source Sans 3", sans-serif';
                ctx.textAlign = "center";
                ctx.fillText("N", 0, -26);
                ctx.restore();
            },

            drawScaleBar() {
                const ctx = this.ctx;
                const meters = 5;
                const barW = meters * this.view.scale;
                const x = 22;
                const y = this.canvasStyleHeight - 28;

                ctx.save();
                ctx.fillStyle = "rgba(255,253,248,0.88)";
                ctx.fillRect(x - 8, y - 18, barW + 16, 34);
                ctx.strokeStyle = "#1c2a22";
                ctx.fillStyle = "#1c2a22";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + barW, y);
                ctx.moveTo(x, y - 5);
                ctx.lineTo(x, y + 5);
                ctx.moveTo(x + barW, y - 5);
                ctx.lineTo(x + barW, y + 5);
                ctx.stroke();
                ctx.font = '600 12px "Source Sans 3", sans-serif';
                ctx.textAlign = "center";
                ctx.fillText(`${meters} m`, x + barW / 2, y - 8);
                ctx.restore();
            },

            drawLegend() {
                const ctx = this.ctx;
                const items = [
                    { color: "#8a9096", label: "Haus" },
                    { color: "#d9c3a1", label: "Bestehende Terrasse" },
                    { color: "#cfc8bb", label: "Weg" },
                    { color: "#9a958c", label: "Grillecke (Stein)" },
                    { color: "#2f6b3a", label: "Hecke" },
                    { color: "#5a6570", label: "Zaun / Tor 3,5 m" }
                ];
                const x = 22;
                const y = 22;
                const boxH = 28 + items.length * 16;

                ctx.save();
                ctx.fillStyle = "rgba(255,253,248,0.92)";
                ctx.strokeStyle = "rgba(28,42,34,0.12)";
                ctx.lineWidth = 1;
                this.roundRect(ctx, x, y, 172, boxH, 10);
                ctx.fill();
                ctx.stroke();

                ctx.font = '700 12px "Source Sans 3", sans-serif';
                ctx.fillStyle = "#1c2a22";
                ctx.textAlign = "left";
                ctx.fillText("Legende", x + 12, y + 20);

                items.forEach((item, i) => {
                    const iy = y + 38 + i * 16;
                    ctx.fillStyle = item.color;
                    ctx.fillRect(x + 12, iy - 7, 12, 12);
                    ctx.fillStyle = "#5a6b60";
                    ctx.font = '600 12px "Source Sans 3", sans-serif';
                    ctx.fillText(item.label, x + 32, iy + 2);
                });
                ctx.restore();
            },

            roundRect(ctx, x, y, w, h, r) {
                const radius = Math.min(r, w / 2, h / 2);
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.arcTo(x + w, y, x + w, y + h, radius);
                ctx.arcTo(x + w, y + h, x, y + h, radius);
                ctx.arcTo(x, y + h, x, y, radius);
                ctx.arcTo(x, y, x + w, y, radius);
                ctx.closePath();
            },

            updateTerraceInfo() {
                const t = this.terrace;
                const fmt = (n) => n.toFixed(2).replace(".", ",");
                document.getElementById("terrace-width").textContent = `${fmt(t.width)} m`;
                document.getElementById("terrace-depth").textContent = `${fmt(t.height)} m`;
                document.getElementById("terrace-area").textContent = `${fmt(t.width * t.height)} m²`;
            },

            pointerPos(clientX, clientY) {
                const rect = this.canvas.getBoundingClientRect();
                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            },

            onMouseDown(e) {
                const { x, y } = this.pointerPos(e.clientX, e.clientY);
                this.view.isDragging = true;
                this.view.dragStartX = x;
                this.view.dragStartY = y;
                this.canvas.parentElement.classList.add("panning");
            },

            onMouseMove(e) {
                const { x, y } = this.pointerPos(e.clientX, e.clientY);

                if (this.view.isDragging) {
                    this.view.offsetX += x - this.view.dragStartX;
                    this.view.offsetY += y - this.view.dragStartY;
                    this.view.dragStartX = x;
                    this.view.dragStartY = y;
                    this.draw();
                    return;
                }

                this.canvas.style.cursor = "grab";
            },

            onMouseUp() {
                this.view.isDragging = false;
                this.canvas.parentElement.classList.remove("panning");
            },

            onWheel(e) {
                e.preventDefault();
                const { x, y } = this.pointerPos(e.clientX, e.clientY);
                this.zoomAt(x, y, e.deltaY < 0 ? 1.1 : 1 / 1.1);
            },

            onTouchStart(e) {
                e.preventDefault();
                if (e.touches.length !== 1) return;
                const touch = e.touches[0];
                const { x, y } = this.pointerPos(touch.clientX, touch.clientY);
                this.view.isDragging = true;
                this.view.dragStartX = x;
                this.view.dragStartY = y;
            },

            onTouchMove(e) {
                e.preventDefault();
                if (e.touches.length !== 1) return;
                const touch = e.touches[0];
                const { x, y } = this.pointerPos(touch.clientX, touch.clientY);

                if (this.view.isDragging) {
                    this.view.offsetX += x - this.view.dragStartX;
                    this.view.offsetY += y - this.view.dragStartY;
                    this.view.dragStartX = x;
                    this.view.dragStartY = y;
                    this.draw();
                }
            },

            onTouchEnd(e) {
                e.preventDefault();
                this.view.isDragging = false;
            }
        };
