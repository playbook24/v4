/**
 * modules/roster/roster.js
 */
const RosterModule = {
    currentTeamId: null,

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await orbDB.open(); 
        await this.loadTeams();
    },

    cacheDOM() {
        this.teamSelect = document.getElementById('roster-team-select');
        this.listContainer = document.getElementById('roster-list');
        this.inputLastName = document.getElementById('roster-lastname');
        this.inputFirstName = document.getElementById('roster-firstname');
        this.inputLicense = document.getElementById('roster-license');
    },

    bindEvents() {
        this.teamSelect.addEventListener('change', (e) => {
            this.currentTeamId = parseInt(e.target.value, 10);
            this.loadRoster();
        });

        document.getElementById('btn-add-player').onclick = () => this.addPlayer();
        document.getElementById('btn-create-team').onclick = () => this.createTeam();
        
        // NOUVEAUX BOUTONS
        document.getElementById('btn-edit-team').onclick = () => this.editTeam();
        document.getElementById('btn-delete-team').onclick = () => this.deleteTeam();
    },

    async createTeam() {
        const name = prompt("Nom de la nouvelle équipe (ex: U15 Filles) :");
        if (name && name.trim() !== '') {
            try {
                const newId = await orbDB.saveTeam({ name: name.trim() });
                this.currentTeamId = newId;
                await this.loadTeams();
            } catch (error) {
                console.error("Erreur lors de la création de l'équipe:", error);
                alert("Erreur lors de la création de l'équipe.");
            }
        }
    },

    // NOUVELLE FONCTION : Modifier l'équipe
    async editTeam() {
        if (!this.currentTeamId) return alert("Aucune équipe sélectionnée.");
        const teams = await orbDB.getAllTeams();
        const current = teams.find(t => t.id === this.currentTeamId);
        if (!current) return;
        
        const newName = prompt("Nouveau nom pour l'équipe :", current.name);
        if (newName && newName.trim() !== '') {
            try {
                await orbDB.saveTeam({ id: this.currentTeamId, name: newName.trim() });
                await this.loadTeams();
            } catch (error) {
                alert("Erreur lors de la modification de l'équipe.");
            }
        }
    },

    // NOUVELLE FONCTION : Supprimer l'équipe
    async deleteTeam() {
        if (!this.currentTeamId) return alert("Aucune équipe sélectionnée.");
        if (confirm("Supprimer DÉFINITIVEMENT cette équipe ? (Ses joueurs ne seront plus affichés)")) {
            await orbDB.deleteTeam(this.currentTeamId);
            this.currentTeamId = null; // Réinitialise pour charger la suivante
            await this.loadTeams();
        }
    },

    async loadTeams() {
        const teams = await orbDB.getAllTeams();
        this.teamSelect.innerHTML = '';
        if (teams.length === 0) {
            const defaultId = await orbDB.saveTeam({ name: 'Équipe 1' });
            this.currentTeamId = defaultId;
            const opt = document.createElement('option');
            opt.value = defaultId;
            opt.textContent = 'Équipe 1';
            this.teamSelect.appendChild(opt);
        } else {
            if (!this.currentTeamId || !teams.find(t => t.id === this.currentTeamId)) {
                this.currentTeamId = teams[0].id;
            }
            teams.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                if(t.id === this.currentTeamId) opt.selected = true;
                this.teamSelect.appendChild(opt);
            });
        }
        this.loadRoster();
    },

    async loadRoster() {
        this.listContainer.innerHTML = '<p>Chargement...</p>';
        const [players, events] = await Promise.all([
            orbDB.getAllPlayers(),
            orbDB.getAllCalendarEvents()
        ]);

        const teamPlayers = players.filter(p => p.teamId === this.currentTeamId);
        this.listContainer.innerHTML = '';

        if (teamPlayers.length === 0) {
            this.listContainer.innerHTML = '<p>Aucun joueur dans cette équipe.</p>';
            return;
        }

        const teamEvents = events.filter(e => e.teamId === this.currentTeamId && e.attendance && Object.keys(e.attendance).length > 0);
        const totalSessions = teamEvents.length;

        teamPlayers.forEach(p => {
            let presentCount = 0;
            teamEvents.forEach(e => {
                if (e.attendance[p.id] === 'present') presentCount++;
            });

            let attendanceStr = "<span style='opacity: 0.5;'>Aucune donnée</span>";
            if (totalSessions > 0) {
                const percent = Math.round((presentCount / totalSessions) * 100);
                attendanceStr = `<span style="color: var(--color-primary); font-weight: bold; font-size: 1.2em;">${percent}%</span> <span style="opacity: 0.7;">(${presentCount}/${totalSessions})</span>`;
            }

            const card = document.createElement('div');
            card.className = 'roster-card';
            card.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
            
            card.innerHTML = `
                <div class="player-info" style="flex-grow: 1;">
                    <div class="player-name" style="font-weight: bold; font-size: 1.1em; color: var(--color-text);">${p.lastName.toUpperCase()} ${p.firstName}</div>
                    <div class="player-license" style="font-size: 0.9em; opacity: 0.7; margin-top: 5px;">Licence : ${p.license || '-'}</div>
                </div>
                <div style="text-align: right; margin-right: 25px;">
                    <div style="font-size: 0.8em; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6;">Présence</div>
                    <div>${attendanceStr}</div>
                </div>
                <button title="Supprimer ce joueur" style="background: transparent; border: none; cursor: pointer; color: var(--color-primary); padding: 5px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onclick="RosterModule.deletePlayer(${p.id})">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2 2 0 0,0 8,21H16A2 2 0 0,0 18,19V7H6V19Z"/></svg>
                </button>
            `;
            this.listContainer.appendChild(card);
        });
    },

    async addPlayer() {
        const lastName = this.inputLastName.value.trim();
        const firstName = this.inputFirstName.value.trim();
        if (!lastName || !firstName) return alert("Nom et prénom requis");

        await orbDB.savePlayer({
            lastName, firstName, 
            license: this.inputLicense.value,
            teamId: this.currentTeamId,
            createdAt: new Date()
        });
        
        this.inputLastName.value = '';
        this.inputFirstName.value = '';
        this.inputLicense.value = '';
        this.loadRoster();
    },

    async deletePlayer(id) {
        if(confirm("Supprimer définitivement ce joueur ?")) {
            await orbDB.deletePlayer(id);
            this.loadRoster();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => RosterModule.init());