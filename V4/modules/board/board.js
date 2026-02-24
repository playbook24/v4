/**
 * V4/modules/board/board.js
 * Cœur de l'éditeur tactique : Initialisation et gestion globale.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // =========================================================
    // 1. SÉCURITÉ ET INITIALISATION DE L'ÉTAT (window.ORB)
    // =========================================================
    if (!window.ORB) window.ORB = {};
    if (!window.ORB.history) window.ORB.history = [];
    if (!window.ORB.redoStack) window.ORB.redoStack = [];
    
    if (!window.ORB.commitState) {
        window.ORB.commitState = function() {
            window.ORB.history.push(JSON.parse(JSON.stringify(window.ORB.playbookState)));
        }
    }

    // =========================================================
    // 2. CONFIGURATION DU TERRAIN (Canvas)
    // =========================================================
    window.ORB.canvas = document.getElementById('basketball-court');
    window.ORB.ctx = window.ORB.canvas.getContext('2d');
    window.ORB.animCanvas = document.getElementById('animation-canvas');
    if (window.ORB.animCanvas) window.ORB.animCtx = window.ORB.animCanvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = window.ORB.canvas.getBoundingClientRect();
    window.ORB.canvas.width = rect.width * dpr;
    window.ORB.canvas.height = rect.height * dpr;
    window.ORB.ctx.scale(dpr, dpr);

    // =========================================================
    // 3. LANCEMENT DES SYSTÈMES ET MODULES
    // =========================================================
    if (typeof orbDB !== 'undefined' && typeof orbDB.open === 'function') {
        try { await orbDB.open(); } catch (e) { console.error("Erreur DB:", e); }
    }

    if (window.ORB.ui && typeof window.ORB.ui.init === 'function') window.ORB.ui.init();
    if (window.ORB.interactions && typeof window.ORB.interactions.init === 'function') window.ORB.interactions.init();

    window.ORB.commitState();
    
    const selectTool = document.getElementById("tool-select");
    if(selectTool) selectTool.click();
    
    if (window.ORB.renderer && typeof window.ORB.renderer.redrawCanvas === 'function') {
        window.ORB.renderer.redrawCanvas();
    }

    // =========================================================
    // 4. CONNEXION AVEC LA BIBLIOTHÈQUE (Chargement & Sauvegarde)
    // =========================================================
    window.addEventListener('loadPlaybook', (e) => {
        const playbookRecord = e.detail;
        
        // COMPATIBILITÉ V3 : On s'assure qu'on récupère bien les données au bon endroit
        let dataToLoad = playbookRecord.playbookData || playbookRecord; 

        if (dataToLoad && dataToLoad.scenes) {
            window.ORB.playbookState = JSON.parse(JSON.stringify(dataToLoad));
            window.ORB.appState.currentLoadedPlaybookId = playbookRecord.id || null;
            
            const nameInput = document.getElementById('play-name-input');
            if(nameInput) nameInput.value = window.ORB.playbookState.name || "";
            
            window.ORB.history = [];
            window.ORB.redoStack = [];
            window.ORB.commitState();
            
            if(window.ORB.ui) {
                window.ORB.ui.updateSceneListUI();
                window.ORB.ui.switchToScene(0, true);
            }
        }
    });

    const saveToLibraryBtn = document.getElementById('save-to-library-btn');
    if (saveToLibraryBtn) {
        saveToLibraryBtn.addEventListener('click', async () => {
            if (typeof html2canvas === 'undefined') return alert("Erreur: la librairie de capture d'écran n'est pas chargée.");

            try {
                const canvas = await html2canvas(document.getElementById('court-container'), { scale: 0.5 });
                canvas.toBlob(async (blob) => {
                    const dataToSave = JSON.parse(JSON.stringify(window.ORB.playbookState));
                    if(!dataToSave.name) dataToSave.name = document.getElementById('play-name-input').value || "Nouveau Système";
                    
                    const currentId = window.ORB.appState.currentLoadedPlaybookId;
                    
                    try {
                        const savedId = await orbDB.savePlaybook(dataToSave, blob, currentId);
                        window.ORB.appState.currentLoadedPlaybookId = savedId;
                        alert("Playbook sauvegardé dans la bibliothèque !");
                        
                        const playbookManagerContainer = document.getElementById('play-manager-container');
                        if (playbookManagerContainer) playbookManagerContainer.classList.add('hidden');
                    } catch (error) {
                        alert("Erreur lors de la sauvegarde.");
                    }
                }, 'image/jpeg', 0.8);
            } catch (err) {
                 alert("Erreur lors de la création de l'aperçu.");
            }
        });
    }

    // =========================================================
    // 5. GESTION DES FICHIERS LOCAUX (.JSON) ET EXPORTS
    // =========================================================
    const saveFileBtn = document.getElementById('save-file-btn');
    if (saveFileBtn) {
        saveFileBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(window.ORB.playbookState, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (window.ORB.playbookState.name || "Playbook") + ".json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    const loadFileBtn = document.getElementById('load-file-btn');
    const importFileInput = document.getElementById('import-file-input');
    if (loadFileBtn && importFileInput) {
        loadFileBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    let parsedData = JSON.parse(event.target.result);
                    
                    // COMPATIBILITÉ V3 : Si le JSON contient playbookData, on l'extrait
                    if (parsedData.playbookData) {
                        parsedData = parsedData.playbookData;
                    }

                    if (parsedData.scenes) {
                        window.ORB.playbookState = parsedData;
                        window.ORB.appState.currentLoadedPlaybookId = null; 
                        
                        document.getElementById('play-name-input').value = window.ORB.playbookState.name || "";
                        
                        window.ORB.history = [];
                        window.ORB.redoStack = [];
                        window.ORB.commitState();
                        window.ORB.ui.updateSceneListUI();
                        window.ORB.ui.switchToScene(0, true);
                        
                        const managerContainer = document.getElementById('play-manager-container');
                        if (managerContainer) managerContainer.classList.add('hidden');
                    } else {
                        alert("Ce fichier n'est pas un playbook valide.");
                    }
                } catch (err) {
                    alert("Erreur de format du fichier JSON.");
                }
            };
            reader.readAsText(file);
            e.target.value = ''; 
        });
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (window.ORB_UTILS && window.ORB_UTILS.exportToPDF) window.ORB_UTILS.exportToPDF();
            else alert("L'utilitaire PDF n'est pas chargé.");
        });
    }

    const exportVideoBtn = document.getElementById('export-video-btn');
    if (exportVideoBtn) {
        exportVideoBtn.addEventListener('click', () => {
            if (window.ORB_UTILS && window.ORB_UTILS.exportToVideo) window.ORB_UTILS.exportToVideo();
            else alert("L'utilitaire Vidéo n'est pas chargé.");
        });
    }

    // =========================================================
    // 6. AUTO-LOAD DEPUIS LE DASHBOARD (index.html)
    // =========================================================
    const pendingLoadId = localStorage.getItem('orb_pending_load_id');
    if (pendingLoadId) {
        localStorage.removeItem('orb_pending_load_id'); 
        setTimeout(async () => {
            try {
                const playbookRecord = await orbDB.getPlaybook(parseInt(pendingLoadId, 10));
                if (playbookRecord) {
                    const loadEvent = new CustomEvent('loadPlaybook', { detail: playbookRecord });
                    window.dispatchEvent(loadEvent);
                }
            } catch (e) {
                console.error("Erreur lors de l'auto-load:", e);
            }
        }, 300);
    }
});

window.addEventListener('resize', () => {
    if (window.ORB && window.ORB.renderer && typeof window.ORB.renderer.resizeCanvas === 'function') {
        window.ORB.renderer.resizeCanvas();
    }
});