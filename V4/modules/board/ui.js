/**
 * modules/board/ui.js
 * Interface de l'éditeur tactique (Propriétés, Scènes, Outils, Exports).
 */
window.ORB = window.ORB || {};

window.ORB.ui = {

    init: function() {
        this.bindMainButtons();
        this.bindToolButtons();
        this.bindSceneControls();
        this.bindPropertiesPanel();
        this.bindExports(); 
        this.bindTheme();
        this.initColorPalettes();
        this.bindInputMode();
    },

    bindInputMode: function() {
        const btn = document.getElementById('input-mode-btn');
        const iconMouse = document.getElementById('icon-mode-mouse');
        const iconStylus = document.getElementById('icon-mode-stylus');
        
        if(!btn) return;

        const updateModeUI = () => {
            const mode = window.ORB.appState.inputMode;
            const isStylus = mode === 'stylus';
            if(iconMouse) iconMouse.classList.toggle('hidden', isStylus);
            if(iconStylus) iconStylus.classList.toggle('hidden', !isStylus);
            btn.classList.toggle('active', isStylus);
        };

        const savedMode = localStorage.getItem('inputMode');
        if (savedMode) window.ORB.appState.inputMode = savedMode;
        updateModeUI();

        btn.addEventListener('click', () => {
            const current = window.ORB.appState.inputMode;
            const newMode = current === 'mouse' ? 'stylus' : 'mouse';
            window.ORB.appState.inputMode = newMode;
            localStorage.setItem('inputMode', newMode);
            updateModeUI();
        });
    },

    bindMainButtons: function() {
        if(document.getElementById('action-undo')) document.getElementById('action-undo').addEventListener('click', () => window.ORB.undo());
        if(document.getElementById('action-redo')) document.getElementById('action-redo').addEventListener('click', () => window.ORB.redo());
        
        if(document.getElementById('action-mirror')) {
            document.getElementById('action-mirror').addEventListener('click', () => {
                const pbState = window.ORB.playbookState;
                const isHalf = document.body.classList.contains('view-half-court');
                const viewWidth = isHalf ? window.ORB.CONSTANTS.LOGICAL_WIDTH / 2 : window.ORB.CONSTANTS.LOGICAL_WIDTH;
                
                const currentScene = pbState.scenes[pbState.activeSceneIndex];
                currentScene.elements.forEach(el => {
                    if (typeof el.x !== 'undefined') el.x = viewWidth - el.x;
                    if (el.points) el.points.forEach(p => p.x = viewWidth - p.x);
                    if (el.type === 'zone') el.x -= el.width;
                    if (el.type === 'defender') el.rotation = (180 - el.rotation + 360) % 360;
                });
                window.ORB.commitState();
                window.ORB.renderer.redrawCanvas();
            });
        }

        if(document.getElementById("tool-clear")) {
            document.getElementById("tool-clear").addEventListener("click", () => {
                if (confirm("Voulez-vous effacer tous les éléments de CETTE SCÈNE ?")) {
                    window.ORB.playbookState.scenes[window.ORB.playbookState.activeSceneIndex].elements = [];
                    window.ORB.appState.selectedElement = null;
                    window.ORB.commitState();
                    this.updatePropertiesPanel();
                    window.ORB.renderer.redrawCanvas();
                }
            });
        }
        
        if(document.getElementById('play-name-input')) {
            document.getElementById('play-name-input').addEventListener('change', e => {
                window.ORB.playbookState.name = e.target.value;
                window.ORB.commitState();
            });
        }
    },

    bindToolButtons: function() {
        document.querySelectorAll(".tool-btn").forEach(button => {
            button.addEventListener("click", () => {
                if(!button.classList.contains('view-btn') && !button.id.includes('action') && !button.id.includes('clear')) {
                    if (window.ORB.interactions && typeof window.ORB.interactions.finalizeCurrentPath === 'function') {
                        window.ORB.interactions.finalizeCurrentPath();
                    }
                    document.querySelectorAll(".tool-btn:not(.view-btn)").forEach(btn => btn.classList.remove("active"));
                    button.classList.add("active");
                    window.ORB.appState.currentTool = button.id.split("-")[1];
                    window.ORB.appState.selectedElement = null;
                    window.ORB.appState.selectedScene = null;
                    this.updatePropertiesPanel();
                    window.ORB.renderer.redrawCanvas();
                }
            })
        });

        const viewFullBtn = document.getElementById('view-full-court-btn');
        const viewHalfBtn = document.getElementById('view-half-court-btn');
        
        const setView = (view) => {
            document.body.classList.remove("view-full-court", "view-half-court");
            document.body.classList.add(`view-${view}-court`);
            if(viewFullBtn) viewFullBtn.classList.toggle("active", view === "full");
            if(viewHalfBtn) viewHalfBtn.classList.toggle("active", view === "half");
            
            const courtSvg = document.getElementById('court-svg');
            if(courtSvg) {
                if (view === 'half') courtSvg.setAttribute('viewBox', '0 0 140 150');
                else courtSvg.setAttribute('viewBox', '0 0 280 150');
            }
            window.ORB.renderer.resizeCanvas();
        };

        if(viewFullBtn) viewFullBtn.addEventListener("click", () => setView("full"));
        if(viewHalfBtn) viewHalfBtn.addEventListener("click", () => setView("half"));
    },

    updateSceneListUI: function() {
        const sceneList = document.getElementById('scene-list');
        if(!sceneList) return;
        const pbState = window.ORB.playbookState;
        const appState = window.ORB.appState;

        sceneList.innerHTML = "";
        pbState.scenes.forEach((scene, index) => {
            const li = document.createElement("li");
            li.dataset.index = index;
            li.draggable = true;
            li.textContent = scene.name || `Scène ${index + 1}`;
    
            if (index === pbState.activeSceneIndex) li.classList.add("active");
            
            li.addEventListener("click", () => this.switchToScene(index));

            li.addEventListener("dragstart", e => {
                appState.draggedSceneIndex = index;
                e.target.classList.add("dragging");
            });
            li.addEventListener("dragend", e => {
                e.target.classList.remove("dragging");
                appState.draggedSceneIndex = null;
            });
            li.addEventListener("dragover", e => e.preventDefault());
            li.addEventListener("drop", e => {
                e.preventDefault();
                const liTarget = e.target.closest("li");
                if (appState.draggedSceneIndex === null || !liTarget) return;
                const droppedOnIndex = parseInt(liTarget.dataset.index, 10);
                if (appState.draggedSceneIndex !== droppedOnIndex) {
                    const [movedScene] = pbState.scenes.splice(appState.draggedSceneIndex, 1);
                    pbState.scenes.splice(droppedOnIndex, 0, movedScene);
                    pbState.activeSceneIndex = droppedOnIndex;
                    window.ORB.commitState();
                    this.switchToScene(droppedOnIndex);
                }
            });
            sceneList.appendChild(li);
        });
    },

    switchToScene: function(index, isUndoRedo = false) {
        const pbState = window.ORB.playbookState;
        if (index < 0 || index >= pbState.scenes.length) return;
        if (!isUndoRedo && window.ORB.interactions && typeof window.ORB.interactions.finalizeCurrentPath === 'function') {
            window.ORB.interactions.finalizeCurrentPath();
        }
        pbState.activeSceneIndex = index;
        window.ORB.appState.selectedElement = null;
        window.ORB.appState.selectedScene = pbState.scenes[index];
        
        const commentsTextarea = document.getElementById('comments-textarea');
        if (commentsTextarea && pbState.scenes[index]) {
            commentsTextarea.value = pbState.scenes[index].comments || "";
        }
        this.updateSceneListUI();
        this.updatePropertiesPanel();
        window.ORB.renderer.redrawCanvas();
    },

    bindSceneControls: function() {
        if(document.getElementById("add-scene-btn")) {
            document.getElementById("add-scene-btn").addEventListener("click", () => {
                const pbState = window.ORB.playbookState;
                const currentScene = pbState.scenes[pbState.activeSceneIndex];
                const newScene = JSON.parse(JSON.stringify(currentScene));
                newScene.comments = "";
                newScene.durationOverride = null;
                const newIndex = pbState.activeSceneIndex + 1;
                newScene.name = `Scène ${pbState.scenes.length + 1}`;
                pbState.scenes.splice(newIndex, 0, newScene);
                window.ORB.commitState();
                this.switchToScene(newIndex);
            });
        }

        if(document.getElementById("delete-scene-btn")) {
            document.getElementById("delete-scene-btn").addEventListener("click", () => {
                const pbState = window.ORB.playbookState;
                if (pbState.scenes.length <= 1) return alert("Impossible de supprimer la dernière scène.");
                if (confirm("Supprimer cette scène ?")) {
                    pbState.scenes.splice(pbState.activeSceneIndex, 1);
                    window.ORB.commitState();
                    this.switchToScene(Math.max(0, pbState.activeSceneIndex - 1));
                }
            });
        }

        if(document.getElementById('comments-textarea')) {
            document.getElementById('comments-textarea').addEventListener("change", e => {
                window.ORB.playbookState.scenes[window.ORB.playbookState.activeSceneIndex].comments = e.target.value;
                window.ORB.commitState();
            });
        }
        
        if(document.getElementById("animate-scene-btn")) {
            document.getElementById("animate-scene-btn").addEventListener("click", () => {
                const pbState = window.ORB.playbookState;
                const currentScene = pbState.scenes[pbState.activeSceneIndex];
                const newScene = JSON.parse(JSON.stringify(currentScene));
                newScene.comments = "";
                newScene.durationOverride = null;
                const consumedPathIds = new Set();
                const originalPlayers = currentScene.elements.filter(el => el.type === "player");
                
                currentScene.elements.filter(el => ["arrow", "dribble", "screen"].includes(el.type)).forEach(path => {
                    let closestPlayer = null;
                    let minDistance = window.ORB.CONSTANTS.PROXIMITY_THRESHOLD;
                    originalPlayers.forEach(player => {
                        const dist = Math.hypot(player.x - path.points[0].x, player.y - path.points[0].y);
                        if (dist < minDistance) { minDistance = dist; closestPlayer = player; }
                    });
                    if (closestPlayer) {
                        const playerToMove = newScene.elements.find(p => p.id === closestPlayer.id);
                        if (playerToMove) {
                            const pathEnd = path.points[path.points.length - 1];
                            playerToMove.x = pathEnd.x; playerToMove.y = pathEnd.y;
                        }
                        consumedPathIds.add(path.id);
                    }
                });

                const passPaths = currentScene.elements.filter(el => el.type === 'pass');
                const originalBalls = currentScene.elements.filter(el => el.type === 'ball');
                originalBalls.forEach(originalBall => {
                    if (!originalBall.linkedTo) return; 
                    const passer = originalPlayers.find(p => p.id === originalBall.linkedTo);
                    if (!passer) return;
                    const associatedPath = passPaths.find(path => !consumedPathIds.has(path.id) && Math.hypot(passer.x - path.points[0].x, passer.y - path.points[0].y) < window.ORB.CONSTANTS.PROXIMITY_THRESHOLD);
                    if (associatedPath) {
                        const pathEnd = associatedPath.points[associatedPath.points.length - 1];
                        const receiver = originalPlayers.find(p => p.id !== passer.id && Math.hypot(p.x - pathEnd.x, p.y - pathEnd.y) < window.ORB.CONSTANTS.PROXIMITY_THRESHOLD);
                        if (receiver) {
                            const ballInNewScene = newScene.elements.find(b => b.id === originalBall.id);
                            if (ballInNewScene) ballInNewScene.linkedTo = receiver.id;
                            consumedPathIds.add(associatedPath.id);
                        }
                    }
                });

                newScene.elements = newScene.elements.filter(el => !consumedPathIds.has(el.id));
                const newIndex = pbState.activeSceneIndex + 1;
                newScene.name = `Scène ${pbState.scenes.length + 1}`;
                pbState.scenes.splice(newIndex, 0, newScene);
                window.ORB.commitState();
                this.switchToScene(newIndex);
            });
        }

        if(document.getElementById('play-animation-btn')) {
            document.getElementById('play-animation-btn').addEventListener('click', () => {
                if(window.ORB.animation && typeof window.ORB.animation.play === 'function') {
                    window.ORB.animation.play(); 
                }
            });
        }
    },

    updatePropertiesPanel: function() {
        document.querySelectorAll('.prop-group').forEach(g => g.classList.add('hidden'));
        const noPropsMessage = document.getElementById('no-props-message');
        const el = window.ORB.appState.selectedElement;
        
        if (!el) {
            if(noPropsMessage) noPropsMessage.style.display = 'block';
            return;
        }
        if(noPropsMessage) noPropsMessage.style.display = 'none';

        const map = {
            'player': 'player-props', 'defender': 'defender-props', 'ball': 'ball-props',
            'cone': 'cone-props', 'hoop': 'hoop-props', 'basket': 'basket-props',
            'zone': 'zone-props', 'text': 'text-props'
        };
        let groupId = map[el.type];
        if (['arrow', 'pass', 'dribble', 'screen', 'pencil'].includes(el.type)) groupId = 'path-props';

        if (groupId) {
            const group = document.getElementById(groupId);
            if(group) {
                group.classList.remove('hidden');
                if (el.label && group.querySelector('input[id*="label"]')) group.querySelector('input[id*="label"]').value = el.label;
                if (el.color && group.querySelector('input[type="color"]')) group.querySelector('input[type="color"]').value = el.color;
                if (typeof el.rotation !== 'undefined' && group.querySelector('input[id*="rotation"]')) group.querySelector('input[id*="rotation"]').value = el.rotation;
                if (el.text && document.getElementById('text-content-input')) document.getElementById('text-content-input').value = el.text;
                if (el.size && document.getElementById('text-size-input')) document.getElementById('text-size-input').value = el.size;
                if (el.width && document.getElementById('path-width-input')) document.getElementById('path-width-input').value = el.width;
            }
        }
    },

    bindPropertiesPanel: function() {
        const panel = document.getElementById('prop-content');
        if(!panel) return;

        panel.addEventListener('change', e => {
            if (window.ORB.appState.selectedElement) {
                const val = e.target.value;
                const id = e.target.id;
                
                if (id.startsWith('text-content')) window.ORB.appState.selectedElement.text = val;
                else if (id.includes('color')) window.ORB.appState.selectedElement.color = val;
                else if (id.includes('label')) window.ORB.appState.selectedElement.label = val;
                else if (id.includes('size') || id.includes('width') || id.includes('rotation')) {
                    const parts = id.split('-');
                    const key = parts[1]; 
                    window.ORB.appState.selectedElement[key] = parseFloat(val);
                }
                window.ORB.commitState();
                window.ORB.renderer.redrawCanvas();
            } else if (window.ORB.appState.selectedScene) {
                if (e.target.id === 'scene-name-prop') {
                    window.ORB.appState.selectedScene.name = e.target.value;
                    this.updateSceneListUI();
                } else if (e.target.id === 'scene-duration-prop') {
                    const d = parseFloat(e.target.value);
                    window.ORB.appState.selectedScene.durationOverride = (d && d > 0) ? d * 1000 : null;
                }
                window.ORB.commitState();
            }
        });

        panel.addEventListener('input', e => {
             if (window.ORB.appState.selectedElement && (e.target.type === 'range' || e.target.type === 'color')) {
                 const parts = e.target.id.split('-');
                 const key = parts[1] === 'color' ? 'color' : parts[1];
                 if (key === 'color') window.ORB.appState.selectedElement.color = e.target.value;
                 else window.ORB.appState.selectedElement[key] = parseFloat(e.target.value);
                 window.ORB.renderer.redrawCanvas();
             }
        });
        
        panel.addEventListener('click', e => {
            if (e.target.classList.contains('color-swatch') && window.ORB.appState.selectedElement) {
                const color = e.target.dataset.color;
                window.ORB.appState.selectedElement.color = color;
                const input = e.target.closest('.prop-group').querySelector('input[type="color"]');
                if (input) input.value = color;
                window.ORB.commitState();
                window.ORB.renderer.redrawCanvas();
            }
        });
    },
    
    initColorPalettes: function() {
        const createPalette = (id, colors) => {
            const container = document.querySelector(`#${id} .color-palette`);
            if (!container) return;
            container.innerHTML = '';
            colors.forEach(c => {
                const d = document.createElement('div');
                d.className = 'color-swatch'; d.style.backgroundColor = c; d.dataset.color = c;
                container.appendChild(d);
            });
        };
        const elitePalette = ['#BFA98D', '#d1bc9f', '#FFFFFF', '#AAAAAA', '#444444', '#000000'];
        createPalette('player-props', elitePalette); createPalette('defender-props', elitePalette);
        createPalette('path-props', elitePalette); createPalette('text-props', elitePalette);
        createPalette('cone-props', elitePalette); createPalette('hoop-props', elitePalette);
        createPalette('zone-props', ['#BFA98D', '#444444', '#222222']);
        createPalette('basket-props', ['#BFA98D', '#000000']);
    },

    updateUndoRedoButtons: function() {
        const undoBtn = document.getElementById('action-undo');
        const redoBtn = document.getElementById('action-redo');
        if(undoBtn && window.ORB.history) undoBtn.disabled = window.ORB.history.length <= 1;
        if(redoBtn && window.ORB.redoStack) redoBtn.disabled = window.ORB.redoStack.length === 0;
    },

    // ==========================================
    // MODULE FICHIERS & EXPORTS (LA MODALE V4)
    // ==========================================
    bindExports: function() {
        const btnToggleMenu = document.getElementById('toggle-playbook-manager-btn');
        const modal = document.getElementById('play-manager-modal');
        const btnCloseModal = document.getElementById('close-play-manager-btn');
        
        const btnSaveLib = document.getElementById('save-to-library-btn');
        const btnSaveAsNew = document.getElementById('save-as-new-btn');
        
        if(btnToggleMenu && modal) {
            btnToggleMenu.onclick = () => {
                // Adapter les boutons si un exercice est déjà chargé
                if(window.ORB.appState.currentLoadedPlaybookId) {
                    if(btnSaveLib) btnSaveLib.textContent = "Mettre à jour l'exercice";
                    if(btnSaveAsNew) btnSaveAsNew.style.display = "block";
                } else {
                    if(btnSaveLib) btnSaveLib.textContent = "Enregistrer dans la bibliothèque";
                    if(btnSaveAsNew) btnSaveAsNew.style.display = "none";
                }
                modal.classList.remove('hidden');
            };
        }
        
        if(btnCloseModal && modal) btnCloseModal.onclick = () => modal.classList.add('hidden');

        // --- FONCTION PRINCIPALE DE SAUVEGARDE (Mise à jour ou Copie) ---
        const executeSave = async (isNewCopy) => {
            const name = document.getElementById('play-name-input').value || 'Schéma sans nom';
            const data = JSON.parse(JSON.stringify(window.ORB.playbookState));
            data.name = name;
            
            // Si c'est une copie, on met l'ID à null pour forcer la création. Sinon on garde l'ID existant.
            const targetId = isNewCopy ? null : window.ORB.appState.currentLoadedPlaybookId;

            // Si c'est une copie, on veut que le nouveau fichier hérite des tags de l'ancien
            if (isNewCopy && window.ORB.appState.currentLoadedPlaybookId) {
                try {
                    const original = await orbDB.getPlaybook(window.ORB.appState.currentLoadedPlaybookId);
                    if (original && original.tagIds) {
                        data.tagIds = original.tagIds;
                    }
                } catch(e) {}
            }
            
            window.ORB.renderer.redrawCanvas();
            const w = window.ORB.canvas.width; const h = window.ORB.canvas.height;
            const tempCanvas = document.createElement('canvas'); tempCanvas.width = w; tempCanvas.height = h;
            const tCtx = tempCanvas.getContext('2d');
            
            const svgElement = document.getElementById('court-svg');
            const xml = new XMLSerializer().serializeToString(svgElement);
            const svg64 = btoa(unescape(encodeURIComponent(xml)));
            
            const img = new Image();
            img.onload = async () => {
                tCtx.drawImage(img, 0, 0, w, h); tCtx.drawImage(window.ORB.canvas, 0, 0, w, h);
                tempCanvas.toBlob(async (blob) => {
                    try {
                        const newId = await orbDB.savePlaybook(data, blob, targetId);
                        window.ORB.appState.currentLoadedPlaybookId = newId; 
                        alert(isNewCopy ? '✅ Copie sauvegardée avec succès !' : '✅ Exercice mis à jour !');
                        if(modal) modal.classList.add('hidden');
                    } catch(e) { alert('Erreur de sauvegarde.'); }
                }, 'image/jpeg', 0.8);
            };
            img.src = 'data:image/svg+xml;base64,' + svg64;
        };

        if(btnSaveLib) btnSaveLib.onclick = () => executeSave(false);
        if(btnSaveAsNew) btnSaveAsNew.onclick = () => executeSave(true);


        // --- IMPORT / EXPORT JSON ---
        const btnExportJson = document.getElementById('save-file-btn');
        if(btnExportJson) {
            btnExportJson.onclick = async () => {
                const data = JSON.parse(JSON.stringify(window.ORB.playbookState));
                const name = document.getElementById('play-name-input').value || 'Playbook';
                data.name = name;

                // Intégrer les tags existants dans l'export JSON
                if (window.ORB.appState.currentLoadedPlaybookId) {
                     try {
                        const original = await orbDB.getPlaybook(window.ORB.appState.currentLoadedPlaybookId);
                        if (original && original.tagIds) {
                            data.tagIds = original.tagIds;
                        }
                    } catch(e) {}
                }

                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `${name}.json`;
                a.click(); URL.revokeObjectURL(url);
            };
        }

        const btnLoadJson = document.getElementById('load-file-btn');
        const fileInput = document.getElementById('import-file-input');
        if(btnLoadJson && fileInput) {
            btnLoadJson.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if(!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        let parsedData = JSON.parse(event.target.result);
                        if (parsedData.playbookData) parsedData = parsedData.playbookData; 
                        
                        window.ORB.playbookState = parsedData;
                        window.ORB.history = [];
                        window.ORB.redoStack = [];
                        window.ORB.commitState();

                        if(parsedData.name) document.getElementById('play-name-input').value = parsedData.name;
                        
                        window.ORB.appState.currentLoadedPlaybookId = null; 
                        if(modal) modal.classList.add('hidden');
                        window.ORB.renderer.redrawCanvas();
                        this.updateSceneListUI();
                    } catch(err) { alert('Fichier invalide.'); }
                };
                reader.readAsText(file);
            };
        }

        // --- EXPORTS MÉDIAS ---
        const btnExportVideo = document.getElementById('export-video-btn');
        if(btnExportVideo) {
            btnExportVideo.onclick = () => {
                if (window.ORB.animation && typeof window.ORB.animation.exportVideo === 'function') {
                    if(modal) modal.classList.add('hidden');
                    window.ORB.animation.exportVideo(); 
                } else {
                    alert("Module d'animation non prêt.");
                }
            };
        }

        const exportPdfBtn = document.getElementById('export-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.onclick = async () => {
                 if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') return alert("Erreur lib PDF.");
                 exportPdfBtn.textContent = "Génération..."; exportPdfBtn.disabled = true;

                 const { jsPDF } = window.jspdf;
                 const pbState = window.ORB.playbookState; 
                 const originalIndex = pbState.activeSceneIndex;
                 const doc = new jsPDF("landscape", "mm", "a4");
                 const playName = document.getElementById('play-name-input').value || "Playbook";
                 
                 const svgElement = document.getElementById('court-svg');
                 const xml = new XMLSerializer().serializeToString(svgElement);
                 const svg64 = btoa(unescape(encodeURIComponent(xml)));
                 const bgSrc = 'data:image/svg+xml;base64,' + svg64;

                 for (let i = 0; i < pbState.scenes.length; i++) {
                    if (i > 0) doc.addPage();
                    
                    doc.setFillColor('#BFA98D'); doc.rect(0, 0, 297, 25, 'F');
                    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor('#000000');
                    doc.text(playName.toUpperCase(), 148, 16, { align: "center" });

                    await this.switchToScene(i, true);
                    await new Promise(r => setTimeout(r, 50));
                    
                    const tempC = document.createElement('canvas');
                    tempC.width = 1120; tempC.height = 600;
                    const tCtx = tempC.getContext('2d');
                    
                    await new Promise(resolve => {
                        const img = new Image();
                        img.onload = () => {
                            tCtx.fillStyle = '#BFA98D'; tCtx.fillRect(0,0, tempC.width, tempC.height);
                            tCtx.drawImage(img, 0, 0, tempC.width, tempC.height);
                            tCtx.drawImage(window.ORB.canvas, 0, 0, tempC.width, tempC.height);
                            resolve();
                        };
                        img.src = bgSrc;
                    });

                    const imgData = tempC.toDataURL('image/jpeg', 0.95);
                    doc.addImage(imgData, 'JPEG', 20, 35, 257, 137);
                    
                    doc.setTextColor('#333333');
                    if(pbState.scenes[i].comments) {
                        doc.setFont("helvetica", "normal"); doc.setFontSize(12);
                        doc.text(doc.splitTextToSize(`Scène ${i+1} : ${pbState.scenes[i].comments}`, 250), 20, 185);
                    }
                 }
                 
                 doc.save(`${playName}.pdf`);
                 await this.switchToScene(originalIndex);
                 exportPdfBtn.textContent = "Fiche PDF"; exportPdfBtn.disabled = false;
                 if(modal) modal.classList.add('hidden');
            };
        }
    },

    bindTheme: function() {
        if (localStorage.getItem('teamMode') === 'crab') {
             document.body.classList.add('crab-mode');
        }
    }
};