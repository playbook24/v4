/**
 * modules/calendar/calendar.js
 * V4 - Calendrier avec option "Aucune équipe" et icônes Noires.
 */
const CalendarModule = {
    currentDate: new Date(),
    selectedDateStr: null,
    currentEvent: null,

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await orbDB.open();
        this.render();
    },

    cacheDOM() {
        this.grid = document.getElementById('calendar-grid');
        this.monthDisplay = document.getElementById('cal-month-display');
        this.modal = document.getElementById('event-editor-modal');
        this.teamSelect = document.getElementById('event-team-select');
        
        this.planPickerModal = document.getElementById('plan-picker-modal');
        this.planPickerList = document.getElementById('plan-picker-list');
        this.eventPlanEmpty = document.getElementById('event-plan-empty');
        this.eventPlanSelected = document.getElementById('event-plan-selected');
        
        this.viewerModal = document.getElementById('snapshot-viewer-modal');
        this.viewerList = document.getElementById('viewer-list');
        this.viewerTitle = document.getElementById('viewer-title');
        
        this.attendanceModal = document.getElementById('attendance-modal');
        this.attendanceList = document.getElementById('attendance-list');
        this.attendanceSummary = document.getElementById('attendance-summary');
    },

    bindEvents() {
        document.getElementById('cal-prev-btn').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.render(); };
        document.getElementById('cal-next-btn').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.render(); };
        document.getElementById('cal-today-btn').onclick = () => { this.currentDate = new Date(); this.render(); };
        
        document.getElementById('event-modal-close-btn').onclick = () => this.modal.classList.add('hidden');
        document.getElementById('btn-save-event').onclick = () => this.saveEvent();
        document.getElementById('btn-delete-event').onclick = () => this.deleteEvent();

        document.getElementById('btn-open-plan-picker').onclick = () => this.openPlanPicker();
        document.getElementById('plan-picker-close-btn').onclick = () => this.planPickerModal.classList.add('hidden');
        document.getElementById('btn-remove-snapshot').onclick = () => {
            this.currentEvent.planSnapshot = null;
            this.updatePlanUI();
        };

        document.getElementById('btn-view-snapshot-plan').onclick = () => this.viewPlanDetails();
        document.getElementById('viewer-close-btn').onclick = () => this.viewerModal.classList.add('hidden');

        document.getElementById('btn-manage-attendance').onclick = () => this.openAttendanceModal();
        document.getElementById('attendance-close-btn').onclick = () => this.attendanceModal.classList.add('hidden');
        document.getElementById('btn-save-attendance').onclick = () => this.saveAttendance();

        const repeatCheckbox = document.getElementById('event-repeat-checkbox');
        if (repeatCheckbox) {
            repeatCheckbox.onchange = (e) => {
                document.getElementById('event-repeat-until').disabled = !e.target.checked;
            };
        }
    },

    async render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let monthStr = this.currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        this.monthDisplay.textContent = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
        
        this.grid.innerHTML = '';

        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        days.forEach(d => {
            const h = document.createElement('div');
            h.className = 'calendar-header'; h.textContent = d;
            this.grid.appendChild(h);
        });

        let emptyDays = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = 0; i < emptyDays; i++) {
            this.grid.appendChild(document.createElement('div'));
        }

        const events = await orbDB.getAllCalendarEvents();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            dayCell.innerHTML = `<div class="day-number" style="${isToday ? 'color:var(--color-primary); font-size:1.2em;' : ''}">${d}</div>`;
            
            events.filter(e => e.date === dateStr).forEach(e => {
                const chip = document.createElement('div');
                chip.className = 'event-chip';
                chip.style.display = 'flex';
                chip.style.justifyContent = 'space-between';
                chip.style.alignItems = 'center';
                
                const hasPlan = !!(e.planSnapshot);
                const hasAttendance = e.attendance && Object.keys(e.attendance).length > 0;
                
                // CORRECTION : Icônes NOIRES pour contraster avec le bandeau or (#000000)
                let iconsHtml = '';
                if (hasPlan) iconsHtml += `<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:#000000; flex-shrink:0;" title="Entraînement lié"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z"/></svg>`;
                if (hasAttendance) iconsHtml += `<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:#000000; flex-shrink:0;" title="Appel effectué"><path d="M21.1,12.5L22.5,13.91L15.97,20.5L12.5,17L13.9,15.59L15.97,17.67L21.1,12.5M10,17L13,20H3V18C3,15.79 6.58,14 10.5,14C10.89,14 11.27,14 11.64,14.07L10.59,15.12C10.56,15.11 10.53,15.11 10.5,15.11C8.25,15.11 5.37,16.05 4.88,17H10M10.5,12C8.57,12 6.69,10.43 6.69,8.5C6.69,6.57 8.57,5 10.5,5C12.43,5 14.31,6.57 14.31,8.5C14.31,10.43 12.43,12 10.5,12M10.5,10.11C11.5,10.11 12.41,9.25 12.41,8.5C12.41,7.75 11.5,6.89 10.5,6.89C9.5,6.89 8.59,7.75 8.59,8.5C8.59,9.25 9.5,10.11 10.5,10.11Z"/></svg>`;

                chip.innerHTML = `
                    <span style="flex: 1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${e.title || 'Séance'}</span>
                    <div style="flex: 0 0 auto; display:flex; align-items:center; gap:5px; margin-left: 5px;">${iconsHtml}</div>
                `;
                
                chip.onclick = (event) => { event.stopPropagation(); this.openEditor(dateStr); };
                dayCell.appendChild(chip);
            });

            dayCell.onclick = () => this.openEditor(dateStr);
            this.grid.appendChild(dayCell);
        }
    },

    async openEditor(dateStr) {
        this.selectedDateStr = dateStr;
        const formattedDate = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        document.getElementById('event-date-display').textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        
        const teams = await orbDB.getAllTeams();
        
        // NOUVEAU : Option par défaut "Aucune équipe"
        let selectHtml = `<option value="">-- Aucune équipe --</option>`;
        selectHtml += teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        this.teamSelect.innerHTML = selectHtml;
        
        const events = await orbDB.getAllCalendarEvents();
        const existingEvent = events.find(e => e.date === dateStr);

        const repeatContainer = document.getElementById('event-repeat-container');
        const repeatCheckbox = document.getElementById('event-repeat-checkbox');
        const repeatInput = document.getElementById('event-repeat-until');

        if (existingEvent) {
            this.currentEvent = { ...existingEvent };
            if(!this.currentEvent.attendance) this.currentEvent.attendance = {};
            if (repeatContainer) repeatContainer.style.display = 'none';
        } else {
            this.currentEvent = {
                id: null, date: dateStr, title: '', teamId: null, notes: '', planSnapshot: null, attendance: {}
            };
            if (repeatContainer) {
                repeatContainer.style.display = 'flex';
                repeatCheckbox.checked = false;
                repeatInput.disabled = true;
                repeatInput.value = '';
            }
        }

        document.getElementById('event-title').value = this.currentEvent.title;
        document.getElementById('event-notes').value = this.currentEvent.notes || '';
        this.teamSelect.value = this.currentEvent.teamId || ""; // Sélectionne "Aucune" si c'est null

        await this.updatePlanUI();
        this.updateAttendanceSummary();

        this.modal.classList.remove('hidden');
    },

    async updatePlanUI() {
        if (this.currentEvent.planSnapshot) {
            document.getElementById('snapshot-plan-name').textContent = this.currentEvent.planSnapshot.name || "Séance liée";
            this.eventPlanEmpty.classList.add('hidden');
            this.eventPlanSelected.classList.remove('hidden');
        } else {
            this.eventPlanEmpty.classList.remove('hidden');
            this.eventPlanSelected.classList.add('hidden');
        }
    },

    async openPlanPicker() {
        const plans = await orbDB.getAllPlans();
        this.planPickerList.innerHTML = '';
        if (plans.length === 0) {
            this.planPickerList.innerHTML = '<p style="text-align:center; opacity:0.6;">Aucun plan disponible. Créez-en un dans le Planificateur.</p>';
        } else {
            plans.reverse().forEach(plan => {
                const div = document.createElement('div');
                div.style.cssText = "padding: 15px; border: 1px solid var(--color-border); border-radius: 8px; margin-bottom: 10px; cursor: pointer; background: var(--color-background); transition: all 0.2s;";
                div.innerHTML = `<h4 style="margin:0; color:var(--color-primary);">${plan.name}</h4><p style="margin:5px 0 0 0; font-size:0.85em; opacity:0.7;">${plan.playbookIds.length} exercices</p>`;
                div.onmouseover = () => div.style.borderColor = "var(--color-primary)";
                div.onmouseout = () => div.style.borderColor = "var(--color-border)";
                
                div.onclick = async () => {
                    const fullPlan = await orbDB.getPlan(plan.id);
                    if (fullPlan) {
                        const snapshot = {
                            name: fullPlan.name,
                            notes: fullPlan.notes,
                            playbooks: []
                        };
                        for (let pbId of fullPlan.playbookIds) {
                            const pb = await orbDB.getPlaybook(pbId);
                            if (pb) snapshot.playbooks.push(pb);
                        }
                        this.currentEvent.planSnapshot = snapshot;
                        this.updatePlanUI();
                        this.planPickerModal.classList.add('hidden');
                    }
                };
                this.planPickerList.appendChild(div);
            });
        }
        this.planPickerModal.classList.remove('hidden');
    },

    async viewPlanDetails() {
        if (!this.currentEvent.planSnapshot) return;
        const snap = this.currentEvent.planSnapshot;

        this.viewerTitle.textContent = `Détails : ${snap.name}`;
        this.viewerList.innerHTML = '';

        if (!snap.playbooks || snap.playbooks.length === 0) {
            this.viewerList.innerHTML = '<p style="opacity:0.6; text-align:center;">Aucun exercice dans cet entraînement.</p>';
        } else {
            snap.playbooks.forEach((pb, i) => {
                let previewUrl = '';
                if (pb.preview instanceof Blob) {
                    try { previewUrl = URL.createObjectURL(pb.preview); } catch(e){}
                }

                const div = document.createElement('div');
                div.style.cssText = "display: flex; align-items: center; gap: 15px; padding: 10px; border: 1px solid var(--color-border); border-radius: 8px; background: rgba(255,255,255,0.02);";
                div.innerHTML = `
                    <div style="font-weight: 900; color: var(--color-primary); font-size: 1.2em; min-width: 25px;">${i + 1}.</div>
                    ${previewUrl ? `<img src="${previewUrl}" style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border);">` : `<div style="width: 100px; height: 60px; background: var(--color-background); border-radius: 4px; border: 1px solid var(--color-border);"></div>`}
                    <div style="font-weight: bold; font-size: 1.1em; color: var(--color-text);">${pb.name || 'Sans nom'}</div>
                `;
                this.viewerList.appendChild(div);
            });
        }
        this.viewerModal.classList.remove('hidden');
    },

    async openAttendanceModal() {
        const teamId = parseInt(this.teamSelect.value, 10);
        // NOUVEAU : Blocage si aucune équipe sélectionnée
        if (isNaN(teamId) || !teamId) return alert("Veuillez d'abord sélectionner une équipe dans la liste déroulante pour pouvoir faire l'appel.");
        
        this.currentEvent.teamId = teamId; 

        const players = await orbDB.getAllPlayers();
        const teamPlayers = players.filter(p => p.teamId === teamId);
        
        this.attendanceList.innerHTML = '';
        
        if(teamPlayers.length === 0) {
            this.attendanceList.innerHTML = '<p style="text-align:center; opacity:0.6;">Aucun joueur dans cette équipe. Ajoutez-en via le menu Effectif.</p>';
        } else {
            teamPlayers.forEach(p => {
                const status = this.currentEvent.attendance[p.id] || 'absent'; 
                const isChecked = status === 'present' ? 'checked' : '';
                
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid var(--color-border);';
                
                div.innerHTML = `
                    <span style="font-weight: bold; font-size: 1.1em; color: var(--color-text);">${p.lastName.toUpperCase()} ${p.firstName}</span>
                    <label style="cursor:pointer; display:flex; align-items:center; gap:10px; font-weight:bold; color:var(--color-primary); background:rgba(255,255,255,0.05); padding:8px 15px; border-radius:8px; border:1px solid var(--color-border);">
                        <input type="checkbox" class="att-checkbox" data-id="${p.id}" style="width:20px; height:20px; accent-color:var(--color-primary);" ${isChecked}>
                        Présent
                    </label>
                `;
                this.attendanceList.appendChild(div);
            });
        }
        this.attendanceModal.classList.remove('hidden');
    },

    saveAttendance() {
        const checkboxes = this.attendanceList.querySelectorAll('.att-checkbox');
        const newAttendance = {};
        
        checkboxes.forEach(chk => {
            newAttendance[chk.dataset.id] = chk.checked ? 'present' : 'absent';
        });
        
        this.currentEvent.attendance = newAttendance;
        this.updateAttendanceSummary();
        this.attendanceModal.classList.add('hidden');
    },

    updateAttendanceSummary() {
        const att = this.currentEvent.attendance || {};
        const total = Object.keys(att).length;
        if(total === 0) {
            this.attendanceSummary.textContent = "Appel non effectué.";
            return;
        }
        const present = Object.values(att).filter(v => v === 'present').length;
        const absent = Object.values(att).filter(v => v === 'absent').length;
        
        this.attendanceSummary.innerHTML = `<span style="color:var(--color-primary); font-weight:bold;">${present} Présent(s)</span> | <span style="opacity:0.6">${absent} Absent(s)</span>`;
    },

    async saveEvent() {
        this.currentEvent.title = document.getElementById('event-title').value;
        const selectedVal = this.teamSelect.value;
        this.currentEvent.teamId = selectedVal ? parseInt(selectedVal, 10) : null;
        this.currentEvent.notes = document.getElementById('event-notes').value;
        
        if (!this.currentEvent.title) return alert("Le titre est obligatoire.");

        const repeatContainer = document.getElementById('event-repeat-container');
        const repeatCheckbox = document.getElementById('event-repeat-checkbox');
        const repeatUntilValue = document.getElementById('event-repeat-until').value;

        try {
            await orbDB.saveCalendarEvent(this.currentEvent);

            if (repeatContainer && repeatContainer.style.display !== 'none' && repeatCheckbox && repeatCheckbox.checked && repeatUntilValue) {
                const endDate = new Date(repeatUntilValue);
                let nextDate = new Date(this.currentEvent.date);
                nextDate.setDate(nextDate.getDate() + 7); 

                while (nextDate <= endDate) {
                    const nextDateStr = nextDate.toISOString().split('T')[0];
                    const clonedEvent = {
                        ...this.currentEvent,
                        id: null, 
                        date: nextDateStr,
                        attendance: {} 
                    };
                    
                    if (this.currentEvent.planSnapshot) {
                        clonedEvent.planSnapshot = JSON.parse(JSON.stringify(this.currentEvent.planSnapshot));
                    }
                    
                    await orbDB.saveCalendarEvent(clonedEvent);
                    nextDate.setDate(nextDate.getDate() + 7);
                }
            }

            this.modal.classList.add('hidden');
            this.render();
        } catch (error) {
            console.error("Erreur de sauvegarde:", error);
            alert("Erreur lors de la sauvegarde de l'événement.");
        }
    },

    async deleteEvent() {
        if (this.currentEvent.id && confirm("Supprimer cet événement du calendrier ?")) {
            await orbDB.deleteCalendarEvent(this.currentEvent.id);
            this.modal.classList.add('hidden');
            this.render();
        } else if (!this.currentEvent.id) {
            this.modal.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => CalendarModule.init());