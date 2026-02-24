/**
 * modules/planner/planner.js
 * V4 - Planificateur Pleine Page avec Tags connectés à la Bibliothèque
 */
const PlannerModule = {
    currentPlan: { id: null, name: '', notes: '', playbookIds: [] },
    allPlaybooks: [],
    allTags: [], // NOUVEAU: Stocke les vrais tags de la BDD
    currentTagId: null, // NOUVEAU: Filtre par ID de tag

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await orbDB.open();
        this.loadGrid();
    },

    cacheDOM() {
        this.grid = document.getElementById('planner-grid');
        this.mainView = document.getElementById('planner-main-view');
        this.editorView = document.getElementById('planner-editor-view');
        
        this.selectorList = document.getElementById('plan-selector-list');
        this.planList = document.getElementById('plan-playbooks-list');
        this.exoCount = document.getElementById('exo-count');
        this.filterContainer = document.getElementById('plan-selector-filters');
    },

    bindEvents() {
        document.getElementById('plan-editor-cancel-btn').onclick = () => this.closeEditor();
        document.getElementById('plan-editor-save-btn').onclick = () => this.savePlan();
        document.getElementById('plan-selector-search').oninput = (e) => this.renderSelector(e.target.value);
    },

    async loadGrid() {
        const plans = await orbDB.getAllPlans();
        this.grid.innerHTML = `
            <div class="card-new-plan" id="btn-new-plan">
                <svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
                Créer une Séance
            </div>`;
        
        plans.reverse().forEach(plan => {
            const card = document.createElement('div');
            card.className = 'plan-card';
            card.innerHTML = `
                <h3 style="margin-top:0; color:var(--color-primary); font-size:1.4em; border-bottom:1px solid var(--color-border); padding-bottom:10px;">${plan.name || 'Séance sans nom'}</h3>
                <p style="opacity:0.8; font-size:1em; margin: 15px 0;"><strong style="color:var(--color-text)">${plan.playbookIds.length}</strong> exercices inclus</p>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button class="btn-primary" style="flex:2; padding:10px;" onclick="PlannerModule.editPlan(${plan.id})">Modifier</button>
                    <button class="btn-primary" style="flex:1; padding:10px; background:transparent; border:1px solid var(--color-primary); color:var(--color-primary);" onclick="PlannerModule.exportPDF(${plan.id})">PDF</button>
                    <button class="danger" style="padding:10px; border-radius:6px;" onclick="PlannerModule.deletePlan(${plan.id})">
                        <svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:currentColor;"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2 2 0 0,0 8,21H16A2 2 0 0,0 18,19V7H6V19Z"/></svg>
                    </button>
                </div>
            `;
            this.grid.appendChild(card);
        });

        document.getElementById('btn-new-plan').onclick = () => this.openEditor();
    },

    closeEditor() {
        this.editorView.classList.add('hidden');
        this.mainView.classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    async openEditor(plan = null) {
        // CHARGE LES EXERCICES ET LES TAGS DE LA BIBLIOTHÈQUE
        this.allPlaybooks = await orbDB.getAllPlaybooks();
        this.allTags = await orbDB.getAllTags();
        
        this.currentPlan = plan ? { ...plan } : { id: null, name: '', notes: '', playbookIds: [] };
        
        const titleSpan = document.getElementById('editor-main-title');
        titleSpan.innerHTML = plan ? `ÉDITION <span class="highlight">SÉANCE</span>` : `NOUVELLE <span class="highlight">SÉANCE</span>`;

        document.getElementById('plan-editor-name').value = this.currentPlan.name;
        document.getElementById('plan-editor-notes').value = this.currentPlan.notes;
        
        this.currentTagId = null; 
        this.renderTags(); 
        this.renderSelector();
        this.renderPlanExos();
        
        this.mainView.classList.add('hidden');
        this.editorView.classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    // AFFICHE LES TAGS CRÉÉS DANS LA BIBLIOTHÈQUE
    renderTags() {
        if (!this.filterContainer) return;
        this.filterContainer.innerHTML = '';
        
        const btnAll = document.createElement('button');
        btnAll.className = `tag-filter-btn ${this.currentTagId === null ? 'active' : ''}`;
        btnAll.textContent = 'Tous';
        btnAll.onclick = () => {
            this.currentTagId = null;
            this.renderTags(); 
            this.renderSelector(document.getElementById('plan-selector-search').value);
        };
        this.filterContainer.appendChild(btnAll);

        // Ajoute un bouton pour chaque tag existant en BDD
        this.allTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `tag-filter-btn ${this.currentTagId === tag.id ? 'active' : ''}`;
            btn.textContent = tag.name;
            btn.onclick = () => {
                this.currentTagId = this.currentTagId === tag.id ? null : tag.id; 
                this.renderTags();
                this.renderSelector(document.getElementById('plan-selector-search').value);
            };
            this.filterContainer.appendChild(btn);
        });
    },

    renderSelector(filterText = '') {
        this.selectorList.innerHTML = '';
        this.allPlaybooks
            .filter(pb => {
                const searchLower = filterText.toLowerCase();
                const nameMatch = (pb.name || '').toLowerCase().includes(searchLower);
                
                // Vérifie si l'exercice possède le tag cliqué
                let tagMatch = true;
                if (this.currentTagId !== null) {
                    tagMatch = pb.tagIds && pb.tagIds.includes(this.currentTagId);
                }
                
                return nameMatch && tagMatch;
            })
            .forEach(pb => {
                const item = document.createElement('div');
                item.className = 'selector-item';
                
                let previewUrl = '';
                if (pb.preview instanceof Blob) {
                    try { previewUrl = URL.createObjectURL(pb.preview); } catch(e){}
                }

                item.innerHTML = `
                    ${previewUrl ? `<img src="${previewUrl}" alt="Aperçu">` : `<div style="width:80px; height:50px; background:var(--color-background); border:1px solid var(--color-border); border-radius:6px;"></div>`}
                    <div class="selector-item-content">
                        <span class="selector-item-title">${pb.name || 'Sans nom'}</span>
                        <span class="selector-item-add">+ Ajouter à la séance</span>
                    </div>
                `;
                item.onclick = () => {
                    this.currentPlan.playbookIds.push(pb.id);
                    this.renderPlanExos();
                };
                this.selectorList.appendChild(item);
        });
    },

    renderPlanExos() {
        this.planList.innerHTML = '';
        this.exoCount.textContent = this.currentPlan.playbookIds.length;

        if (this.currentPlan.playbookIds.length === 0) {
            this.planList.innerHTML = `
                <li style="opacity: 0.6; font-style: italic; border: 2px dashed var(--color-border); background: transparent; justify-content:center; padding: 40px; border-radius:12px; display:flex; flex-direction:column; align-items:center; gap:10px;">
                    <svg viewBox="0 0 24 24" style="width:40px; fill:var(--color-primary);"><path d="M13 19C13 15.69 15.69 13 19 13C20.1 13 21.12 13.3 22 13.81V6C22 4.89 21.1 4 20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.9 20 4 20H13.09C13.04 19.67 13 19.34 13 19M4 18V6H20V11.81C19.68 11.66 19.35 11.53 19 11.43V8H5V18H13.09C13.3 18.67 13.58 19.3 13.93 19.87L13.81 20H4M18 15V18H15V20H18V23H20V20H23V18H20V15H18Z" /></svg>
                    Piochez des exercices dans la bibliothèque à droite pour construire votre séance.
                </li>`;
            return;
        }

        this.currentPlan.playbookIds.forEach((id, index) => {
            const pb = this.allPlaybooks.find(p => p.id === id);
            if (!pb) return;
            
            const li = document.createElement('li');
            li.className = 'plan-item';
            li.draggable = true; 
            
            let previewUrl = '';
            if (pb.preview instanceof Blob) {
                try { previewUrl = URL.createObjectURL(pb.preview); } catch(e){}
            }

            li.innerHTML = `
                <div class="plan-item-left">
                    <span class="drag-handle" title="Maintenir pour déplacer">⣿</span>
                    <span style="font-weight:900; color:var(--color-primary); width:20px;">${index + 1}.</span>
                    ${previewUrl ? `<img src="${previewUrl}">` : `<div style="width:70px; height:40px; background:var(--color-background); border-radius:4px;"></div>`}
                    <span style="font-weight:bold; font-size:1.1em;">${pb.name || 'Sans nom'}</span>
                </div>
                <button class="btn-icon danger" onclick="PlannerModule.removeExo(${index})" style="padding:8px;" title="Retirer">
                    <svg viewBox="0 0 24 24" style="width:24px;"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                </button>
            `;

            li.ondragstart = (e) => { e.dataTransfer.setData('text/plain', index); li.style.opacity = '0.4'; };
            li.ondragend = () => { li.style.opacity = '1'; };
            li.ondragover = (e) => { e.preventDefault(); };
            li.ondrop = (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const toIndex = index;
                if (fromIndex !== toIndex) {
                    const item = this.currentPlan.playbookIds.splice(fromIndex, 1)[0];
                    this.currentPlan.playbookIds.splice(toIndex, 0, item);
                    this.renderPlanExos(); 
                }
            };

            this.planList.appendChild(li);
        });
    },

    removeExo(index) {
        this.currentPlan.playbookIds.splice(index, 1);
        this.renderPlanExos();
    },

    async savePlan() {
        try {
            const planToSave = {
                name: document.getElementById('plan-editor-name').value || "Séance du " + new Date().toLocaleDateString(),
                notes: document.getElementById('plan-editor-notes').value,
                playbookIds: this.currentPlan.playbookIds
            };
            
            if (this.currentPlan.id !== null && this.currentPlan.id !== undefined) {
                planToSave.id = this.currentPlan.id;
            }

            const savedId = await orbDB.savePlan(planToSave, this.currentPlan.id);
            this.closeEditor();
            this.loadGrid();
        } catch (error) {
            console.error("Erreur de sauvegarde de la séance:", error);
            alert("Erreur technique lors de la sauvegarde.");
        }
    },

    async editPlan(id) {
        const plan = await orbDB.getPlan(id);
        this.openEditor(plan);
    },

    async deletePlan(id) {
        if(confirm("Supprimer définitivement cette séance ?")) {
            await orbDB.deletePlan(id);
            this.loadGrid();
        }
    },

    async exportPDF(id) {
        if (typeof window.jspdf === 'undefined') return alert("Erreur: jsPDF non chargé.");
        
        const plan = await orbDB.getPlan(id);
        if (!plan) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFillColor('#BFA98D'); 
        doc.rect(0, 0, 210, 25, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor('#000000');
        doc.text((plan.name || 'Séance').toUpperCase(), 105, 16, { align: 'center' });

        doc.setFontSize(11); doc.setTextColor('#333333');
        if (plan.notes) {
            doc.text("OBJECTIFS :", 20, 35);
            doc.setFont("helvetica", "normal");
            doc.text(doc.splitTextToSize(plan.notes, 170), 20, 42);
        }

        let yPos = plan.notes ? 60 : 35;
        
        for (let i = 0; i < plan.playbookIds.length; i++) {
            const pbId = plan.playbookIds[i];
            const pb = await orbDB.getPlaybook(pbId);
            if (!pb) continue;

            if (yPos > 240) { doc.addPage(); yPos = 20; } 

            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor('#000000');
            doc.text(`${i + 1}. ${pb.name || 'Exercice'}`, 20, yPos);
            yPos += 8;

            if (pb.preview instanceof Blob) {
                const base64Img = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(pb.preview);
                });
                doc.addImage(base64Img, 'JPEG', 20, yPos, 100, 53); 
                yPos += 65;
            } else {
                yPos += 10;
            }
        }

        doc.save(`${plan.name || 'Plan_ORB'}.pdf`);
    }
};

document.addEventListener('DOMContentLoaded', () => PlannerModule.init());