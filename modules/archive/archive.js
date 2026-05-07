/**
 * modules/archive/archive.js
 */
const ArchiveModule = {
    currentTeamId: null,

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await orbDB.open(); 
        await this.loadArchivedTeams();
    },

    cacheDOM() {
        this.mainView = document.getElementById('main-view');
        this.detailView = document.getElementById('detail-view');
        this.archiveList = document.getElementById('archive-list');
        this.rosterList = document.getElementById('roster-list');
        this.detailTitle = document.getElementById('detail-title');
    },

    bindEvents() {
        document.getElementById('btn-back-archive').onclick = () => {
            this.currentTeamId = null;
            this.detailView.classList.add('hidden');
            this.mainView.classList.remove('hidden');
            this.loadArchivedTeams();
        };

        document.getElementById('btn-unarchive-team').onclick = () => this.unarchiveTeam();
    },

    async loadArchivedTeams() {
        const teams = await orbDB.getAllTeams();
        const archivedTeams = teams.filter(t => t.archived === true);
        
        this.archiveList.innerHTML = '';
        
        if (archivedTeams.length === 0) {
            this.archiveList.innerHTML = '<p style="text-align:center; opacity:0.7; grid-column: 1 / -1;">Aucune équipe n\'est actuellement archivée.</p>';
            return;
        }

        const players = await orbDB.getAllPlayers();

        archivedTeams.forEach(team => {
            const teamPlayersCount = players.filter(p => p.teamId === team.id).length;
            const card = document.createElement('div');
            card.className = 'archive-card';
            card.innerHTML = `
                <svg viewBox="0 0 24 24" style="width:40px; height:40px; fill:#F9AB00; margin-bottom:15px;">
                    <path d="M20,21H4V10H6V19H18V10H20V21M3,3H21V9H3V3M5,5V7H19V5H5Z"/>
                </svg>
                <h3 style="margin: 0 0 10px 0; color: var(--color-primary);">${team.name}</h3>
                <span style="opacity: 0.7;">${teamPlayersCount} Joueur(s)</span>
            `;
            
            card.onclick = () => this.openTeamDetail(team.id, team.name);
            this.archiveList.appendChild(card);
        });
    },

    async openTeamDetail(teamId, teamName) {
        this.currentTeamId = teamId;
        this.detailTitle.textContent = teamName;
        this.mainView.classList.add('hidden');
        this.detailView.classList.remove('hidden');
        await this.loadTeamRoster(teamId);
    },

    async unarchiveTeam() {
        if (!this.currentTeamId) return;
        if (confirm("Voulez-vous restaurer cette équipe ? Elle réapparaîtra dans la section Effectif et le Calendrier.")) {
            try {
                const teams = await orbDB.getAllTeams();
                const current = teams.find(t => t.id === this.currentTeamId);
                if (current) {
                    current.archived = false;
                    await orbDB.saveTeam(current);
                    // Retourner à la liste
                    document.getElementById('btn-back-archive').click();
                }
            } catch (error) {
                alert("Erreur lors de la restauration de l'équipe.");
            }
        }
    },

    async loadTeamRoster(teamId) {
        this.rosterList.innerHTML = '<p>Chargement...</p>';
        const [players, events] = await Promise.all([
            orbDB.getAllPlayers(),
            orbDB.getAllCalendarEvents()
        ]);

        const teamPlayers = players.filter(p => p.teamId === teamId);
        this.rosterList.innerHTML = '';

        if (teamPlayers.length === 0) {
            this.rosterList.innerHTML = '<p style="text-align:center; opacity:0.7;">Aucun joueur dans cette équipe.</p>';
            return;
        }

        const teamEvents = events.filter(e => 
            e.attendance && 
            Object.keys(e.attendance).length > 0 && 
            (e.teamId === teamId || (e.teamIds && e.teamIds.includes(teamId)))
        );

        const matchEvents = teamEvents.filter(e => e.type === 'match');
        const trainingEvents = teamEvents.filter(e => !e.type || e.type === 'training');

        const computeAtt = (pId, evts) => {
            let present = 0;
            let active = 0;
            evts.forEach(e => {
                const stat = e.attendance[pId];
                if (stat === 'present') { present++; active++; }
                else if (stat === 'absent') { active++; }
            });
            return active > 0 ? { perc: Math.round((present / active) * 100), str: `(${present}/${active})` } : null;
        };

        teamPlayers.forEach(p => {
            const globalAtt = computeAtt(p.id, teamEvents);
            const trainAtt = computeAtt(p.id, trainingEvents);
            const matchAtt = computeAtt(p.id, matchEvents);

            const formatAtt = (attObj) => attObj 
                ? `<span style="color:var(--color-primary); font-weight:bold;">${attObj.perc}%</span> <span style="opacity:0.7; font-size:0.85em;">${attObj.str}</span>`
                : `<span style="opacity:0.5; font-size:0.85em;">-</span>`;

            const card = document.createElement('div');
            card.className = 'roster-card';
            card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; opacity: 0.8;';
            
            card.innerHTML = `
                <div class="player-info" style="flex-grow: 1; min-width: 150px;">
                    <div class="player-name" style="font-weight: bold; font-size: 1.1em; color: var(--color-text);">${p.lastName.toUpperCase()} ${p.firstName}</div>
                    <div class="player-license" style="font-size: 0.9em; opacity: 0.7; margin-top: 5px;">Licence : ${p.license || '-'}</div>
                </div>
                
                <div style="display:flex; gap: 15px; flex-wrap: wrap; text-align: center;">
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--color-border); border-radius:6px; padding:8px 12px;">
                        <div style="font-size:0.7em; text-transform:uppercase; letter-spacing:1px; opacity:0.6; margin-bottom:5px;">Entraînements</div>
                        <div>${formatAtt(trainAtt)}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--color-border); border-radius:6px; padding:8px 12px;">
                        <div style="font-size:0.7em; text-transform:uppercase; letter-spacing:1px; opacity:0.6; margin-bottom:5px;">Matchs</div>
                        <div>${formatAtt(matchAtt)}</div>
                    </div>
                    <div style="background:var(--color-container); border:1px dashed var(--color-primary); border-radius:6px; padding:8px 12px;">
                        <div style="font-size:0.7em; text-transform:uppercase; letter-spacing:1px; opacity:0.6; margin-bottom:5px;">Global</div>
                        <div>${formatAtt(globalAtt)}</div>
                    </div>
                </div>
            `;
            // Pas de bouton supprimer ici, lecture seule
            this.rosterList.appendChild(card);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => ArchiveModule.init());
